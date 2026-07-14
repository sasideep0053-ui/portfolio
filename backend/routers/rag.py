from __future__ import annotations

import asyncio
import json
import math
import os
import time
from collections import defaultdict
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

router = APIRouter()

# ── Rate limiting ─────────────────────────────────────────────────────────────
_hits: dict[str, list[float]] = defaultdict(list)


def _rate_ok(ip: str, limit: int = 20, window: int = 60) -> bool:
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < window]
    if len(_hits[ip]) >= limit:
        return False
    _hits[ip].append(now)
    return True


# ── Pipeline config ───────────────────────────────────────────────────────────
DB_DIR           = os.path.join(os.path.dirname(__file__), '..', 'rag_db')
COLLECTION_NAME  = 'rag_docs'
EMBED_MODEL      = 'all-MiniLM-L6-v2'
GROQ_MODEL       = 'llama-3.1-8b-instant'
RERANK_MODEL     = 'cross-encoder/ms-marco-TinyBERT-L-2-v2'

RETRIEVE_K            = 20
RERANK_K              = 20
FINAL_K               = 6
RRF_K                 = 45
CHUNK_MIN_CONFIDENCE  = 0.30
ANSWER_MIN_CONFIDENCE = 0.25

# ── Singletons ────────────────────────────────────────────────────────────────
_collection = None
_bm25       = None
_reranker   = None
_embedder   = None
_all_ids:   list[str]  = []
_all_docs:  list[str]  = []
_all_metas: list[dict] = []


def _load_index() -> None:
    global _collection, _bm25, _reranker, _embedder, _all_ids, _all_docs, _all_metas

    try:
        import chromadb
        from rank_bm25 import BM25Okapi
        from sentence_transformers import SentenceTransformer, CrossEncoder
    except ImportError as e:
        raise RuntimeError(
            f'Missing dependency: {e}. '
            'Run: pip install chromadb rank-bm25 sentence-transformers'
        )

    if not os.path.exists(DB_DIR):
        raise RuntimeError(
            'RAG index not found. '
            'Run: python backend/scripts/fetch_docs.py && python backend/scripts/build_rag_index.py'
        )

    import chromadb as _chromadb
    from rank_bm25 import BM25Okapi
    from sentence_transformers import SentenceTransformer, CrossEncoder

    client      = _chromadb.PersistentClient(path=DB_DIR)
    _collection = client.get_collection(COLLECTION_NAME)

    total    = _collection.count()
    all_data = _collection.get(limit=total, include=['documents', 'metadatas'])
    _all_ids   = all_data['ids']
    _all_docs  = all_data['documents']
    _all_metas = all_data['metadatas']

    tokenised = [doc.lower().split() for doc in _all_docs]
    _bm25     = BM25Okapi(tokenised)

    print(f'[rag] Loading embedder: {EMBED_MODEL}...')
    _embedder = SentenceTransformer(EMBED_MODEL)

    print(f'[rag] Loading reranker: {RERANK_MODEL}...')
    _reranker = CrossEncoder(RERANK_MODEL)

    print(f'[rag] Ready — {total} chunks (vector + BM25 + cross-encoder reranker).')


def _get_resources():
    if _collection is None:
        _load_index()
    return _collection, _bm25, _reranker, _embedder


# Guards against two concurrent cold requests both triggering _load_index() —
# doubling the embedder+reranker load at once is exactly the scenario that
# tips the free-tier container into OOM.
_load_lock = asyncio.Lock()


async def _get_resources_async():
    if _collection is None:
        async with _load_lock:
            if _collection is None:
                await run_in_threadpool(_load_index)
    return _collection, _bm25, _reranker, _embedder


# ── SSE helpers ───────────────────────────────────────────────────────────────
def _step(phase: str, msg: str, detail: str = '') -> str:
    """Emit a pipeline trace event the UI renders as a live step."""
    return f'data: [STEP]{json.dumps({"phase": phase, "msg": msg, "detail": detail})}\n\n'


# ── RRF merge ─────────────────────────────────────────────────────────────────
def _rrf_merge(ranked_lists: list[list[str]], k: int = RRF_K) -> list[str]:
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for rank, chunk_id in enumerate(ranked, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=lambda cid: scores[cid], reverse=True)


# ── Re-ranking ────────────────────────────────────────────────────────────────
def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _rerank_chunks(question: str, chunk_ids: list[str],
                   id_to_doc: dict[str, str]) -> tuple[list[str], list[float]]:
    if not chunk_ids:
        return [], []
    pairs  = [(question, id_to_doc[cid]) for cid in chunk_ids if cid in id_to_doc]
    confs  = [_sigmoid(s) for s in _reranker.predict(pairs)]
    ranked = sorted(zip(chunk_ids, confs), key=lambda x: x[1], reverse=True)
    return [cid for cid, _ in ranked], [c for _, c in ranked]


# ── System prompts ────────────────────────────────────────────────────────────
_PROMPTS = {
    'react': (
        'You are a concise assistant answering questions about the React JavaScript library. '
        'Answer using ONLY the provided context. '
        'If the answer is not in the context, say exactly: '
        '"I don\'t have that information in the React docs." '
        'Answer directly — never say "based on the context" or "the docs say". '
        'Use accurate React terminology. '
        'For lists, each item on its own line starting with "- ". '
        'End every sentence with a period. '
        'No filler openers.'
    ),
    'typescript': (
        'You are a concise assistant answering questions about TypeScript. '
        'Answer using ONLY the provided context. '
        'If the answer is not in the context, say exactly: '
        '"I don\'t have that information in the TypeScript docs." '
        'Answer directly — never say "based on the context" or "the docs say". '
        'Use accurate TypeScript terminology: types, interfaces, generics, narrowing, utility types. '
        'For lists, each item on its own line starting with "- ". '
        'End every sentence with a period. '
        'No filler openers.'
    ),
    'vite': (
        'You are a concise assistant answering questions about Vite, the frontend build tool. '
        'Answer using ONLY the provided context. '
        'If the answer is not in the context, say exactly: '
        '"I don\'t have that information in the Vite docs." '
        'Answer directly — never say "based on the context" or "the docs say". '
        'Be specific about config options, plugins, and .env conventions. '
        'For lists, each item on its own line starting with "- ". '
        'End every sentence with a period. '
        'No filler openers.'
    ),
    'fastapi': (
        'You are a concise assistant answering questions about FastAPI, the Python web framework. '
        'Answer using ONLY the provided context. '
        'If the answer is not in the context, say exactly: '
        '"I don\'t have that information in the FastAPI docs." '
        'Answer directly — never say "based on the context" or "the docs say". '
        'Use accurate FastAPI/Pydantic terminology. '
        'For lists, each item on its own line starting with "- ". '
        'End every sentence with a period. '
        'No filler openers.'
    ),
}


# ── Full streaming pipeline ───────────────────────────────────────────────────
async def _stream(question: str, doc_source: str) -> AsyncGenerator[str, None]:
    collection, bm25, _, embedder = await _get_resources_async()

    # ── Step 1: Embed the question ────────────────────────────────────────────
    yield _step('embed', f'Embedding question', f'model: {EMBED_MODEL}')
    embedding = await run_in_threadpool(embedder.encode, question, normalize_embeddings=True)
    query_emb = embedding.tolist()

    # ── Step 2: Vector search ─────────────────────────────────────────────────
    yield _step('vector', f'Vector search', f'over {doc_source} index')
    vec_results = await run_in_threadpool(
        collection.query,
        query_embeddings=[query_emb],
        n_results=RETRIEVE_K,
        where={'doc_source': doc_source},
        include=['documents', 'metadatas'],
    )
    vec_ids = vec_results['ids'][0]
    vec_sources = list({vec_results['metadatas'][0][i]['source'] for i in range(len(vec_ids))})
    yield _step('vector', f'Vector search — {len(vec_ids)} candidates',
                f'top sources: {", ".join(vec_sources[:3])}')

    # ── Step 3: BM25 keyword search ───────────────────────────────────────────
    yield _step('bm25', 'BM25 keyword search', f'tokenising: "{question[:40]}"')
    tokens         = question.lower().split()
    bm25_scores    = bm25.get_scores(tokens)
    src_indices    = [i for i, m in enumerate(_all_metas) if m.get('doc_source') == doc_source]
    top_src_idx    = sorted(src_indices, key=lambda i: bm25_scores[i], reverse=True)[:RETRIEVE_K]
    bm25_ids       = [_all_ids[i] for i in top_src_idx]
    bm25_sources   = list({_all_metas[i]['source'] for i in top_src_idx[:5]})
    yield _step('bm25', f'BM25 — {len(bm25_ids)} candidates',
                f'top sources: {", ".join(bm25_sources[:3])}')

    # ── Step 4: RRF merge ─────────────────────────────────────────────────────
    yield _step('rrf', 'Reciprocal Rank Fusion', f'merging vector + BM25 lists (k={RRF_K})')
    merged       = _rrf_merge([vec_ids, bm25_ids])
    unique_count = len(merged)
    overlap      = len(set(vec_ids) & set(bm25_ids))
    yield _step('rrf', f'RRF merged — {unique_count} unique chunks',
                f'{overlap} chunks appeared in both lists (boosted in ranking)')

    # ── Step 5: Cross-encoder reranking ───────────────────────────────────────
    yield _step('rerank', f'Cross-encoder reranking top {min(RERANK_K, len(merged))} chunks',
                f'model: {RERANK_MODEL}')
    id_to_doc  = dict(zip(_all_ids, _all_docs))
    id_to_meta = dict(zip(_all_ids, _all_metas))
    candidates = merged[:RERANK_K]

    reranked_ids, reranked_confs = await run_in_threadpool(_rerank_chunks, question, candidates, id_to_doc)

    top5_detail = '  |  '.join(
        f'{id_to_meta[cid]["source"]} {conf:.2f}'
        for cid, conf in zip(reranked_ids[:5], reranked_confs[:5])
        if cid in id_to_meta
    )
    yield _step('rerank', f'Reranked — scores computed for {len(candidates)} chunks', top5_detail)

    # ── Step 6: Confidence filtering ─────────────────────────────────────────
    filtered = [
        (cid, conf) for cid, conf in zip(reranked_ids, reranked_confs)
        if conf >= CHUNK_MIN_CONFIDENCE
    ][:FINAL_K]

    top_conf = filtered[0][1] if filtered else 0.0
    top_ids  = [cid for cid, _ in filtered]

    yield _step('filter', f'Filtered to {len(filtered)} chunks (threshold: {CHUNK_MIN_CONFIDENCE})',
                f'best confidence: {top_conf:.2f}  |  dropped: {len(candidates) - len(filtered)} low-signal chunks')

    if top_conf < ANSWER_MIN_CONFIDENCE or not top_ids:
        msg = f"I don't have reliable information on that in the {doc_source.capitalize()} docs."
        yield _step('generate', 'Confidence too low — skipping LLM to avoid hallucination',
                    f'best chunk confidence {top_conf:.2f} < threshold {ANSWER_MIN_CONFIDENCE}')
        for ch in msg:
            yield f'data: {json.dumps(ch)}\n\n'
        yield f'data: [CONFIDENCE]{json.dumps(round(top_conf, 3))}\n\n'
        yield 'data: [SOURCES]{json.dumps([])}\n\n'
        yield 'data: [DONE]\n\n'
        return

    docs    = [id_to_doc[cid]  for cid in top_ids if cid in id_to_doc]
    metas   = [id_to_meta[cid] for cid in top_ids if cid in id_to_meta]
    sources = list({m['source'] for m in metas})

    # ── Step 7: LLM generation ────────────────────────────────────────────────
    yield _step('generate', f'Generating answer with {GROQ_MODEL}',
                f'context: {len(docs)} chunks from {", ".join(sources[:3])}')

    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        for ch in 'GROQ_API_KEY is not set on the server.':
            yield f'data: {json.dumps(ch)}\n\n'
        yield 'data: [DONE]\n\n'
        return

    context = '\n\n---\n\n'.join(docs)
    system  = _PROMPTS.get(doc_source, _PROMPTS['react'])
    prompt  = f'{system}\n\nContext:\n{context}\n\nQuestion: {question}\nAnswer:'

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        stream = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=600,
            stream=True,
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ''
            for ch in token:
                yield f'data: {json.dumps(ch)}\n\n'
    except Exception as exc:
        for ch in f'Error: {exc}':
            yield f'data: {json.dumps(ch)}\n\n'

    yield f'data: [CONFIDENCE]{json.dumps(round(top_conf, 3))}\n\n'
    yield f'data: [SOURCES]{json.dumps(sources)}\n\n'
    yield 'data: [DONE]\n\n'


# ── Pydantic models ───────────────────────────────────────────────────────────
class RagRequest(BaseModel):
    question:   str
    doc_source: str  # 'react' | 'typescript' | 'vite'


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get('/api/rag/status')
def rag_status():
    try:
        col, _, _, _ = _get_resources()
        count = col.count()
        by_source: dict[str, int] = {}
        for m in _all_metas:
            src = m.get('doc_source', 'unknown')
            by_source[src] = by_source.get(src, 0) + 1
        return {
            'status':        'ready',
            'chunks':        count,
            'by_source':     by_source,
            'pipeline':      'vector + BM25 → RRF → cross-encoder rerank → Groq LLM',
            'embed_model':   EMBED_MODEL,
            'rerank_model':  RERANK_MODEL,
        }
    except RuntimeError as e:
        return {'status': 'not_indexed', 'detail': str(e)}


@router.post('/api/rag/query/stream')
def rag_query_stream(req: RagRequest, request: Request):
    ip = request.client.host if request.client else 'unknown'
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail='Too many requests — try again in a minute.')

    doc_source = req.doc_source.lower()
    if doc_source not in ('react', 'typescript', 'vite', 'fastapi'):
        raise HTTPException(status_code=400, detail='doc_source must be react, typescript, or vite.')

    question = req.question.strip()
    if not question:
        def _empty():
            yield 'data: [DONE]\n\n'
        return StreamingResponse(_empty(), media_type='text/event-stream')

    return StreamingResponse(
        _stream(question, doc_source),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
