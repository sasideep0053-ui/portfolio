#!/usr/bin/env python3
"""
Build ChromaDB index for React / TypeScript / Vite docs.

Hybrid chunking strategy (ported from datapark-ui/scripts/build_index.py):
  1. Section-based split on ##/### headings (primary)
  2. Semantic chunking (centroid comparison) for long prose sections
  3. Character fallback for structured content (tables, bullet lists)

Embeddings: sentence-transformers all-MiniLM-L6-v2 (runs locally, no API key)

Requirements:
    pip install chromadb sentence-transformers numpy

Run after fetch_docs.py:
    python backend/scripts/build_rag_index.py
"""

import os
import re
from typing import Dict, List, Optional, Tuple
import numpy as np
import chromadb
from sentence_transformers import SentenceTransformer

DOCS_DIR        = os.path.join(os.path.dirname(__file__), '..', 'docs')
DB_DIR          = os.path.join(os.path.dirname(__file__), '..', 'rag_db')
COLLECTION_NAME = 'rag_docs'
EMBED_MODEL     = 'all-MiniLM-L6-v2'

MAX_SECTION_CHARS      = 1200
SEMANTIC_THRESHOLD     = 0.75
MIN_SEMANTIC_CHUNK_CHARS = 300
FALLBACK_CHUNK_SIZE    = 800
FALLBACK_OVERLAP       = 150

_embedder: Optional[SentenceTransformer] = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        print(f'Loading embedding model: {EMBED_MODEL}...')
        _embedder = SentenceTransformer(EMBED_MODEL)
    return _embedder


def embed(text: str) -> List[float]:
    return get_embedder().encode(text, normalize_embeddings=True).tolist()


def is_structured(text: str) -> bool:
    has_table   = bool(re.search(r'^\|', text, re.MULTILINE))
    bullet_count = len(re.findall(r'^[-*]\s', text, re.MULTILINE))
    return has_table or bullet_count > 6


def split_sentences(text: str) -> List[str]:
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in raw if len(s.strip()) > 25]


def character_chunks(text: str, size: int = FALLBACK_CHUNK_SIZE,
                     overlap: int = FALLBACK_OVERLAP) -> List[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + size])
        start += size - overlap
    return chunks


def semantic_chunks(text: str, title_prefix: str = '') -> list[str]:
    """
    Group sentences into chunks using centroid comparison.
    A topic shift is detected when the incoming sentence diverges from
    the running mean embedding of the current group.
    """
    sentences = split_sentences(text)
    if len(sentences) <= 3:
        return [title_prefix + text]

    print(f'      semantic split: {len(sentences)} sentences...')
    embs = get_embedder().encode(sentences, normalize_embeddings=True)

    chunks: List[str] = []
    group_sents = [sentences[0]]
    group_embs  = [embs[0]]
    group_len   = len(sentences[0])

    for i in range(1, len(sentences)):
        centroid = np.mean(group_embs, axis=0)
        sim      = float(np.dot(centroid, embs[i]))  # both normalized → dot = cosine

        group_len += len(sentences[i])
        topic_shift = sim < SEMANTIC_THRESHOLD and group_len >= MIN_SEMANTIC_CHUNK_CHARS
        too_long    = group_len >= FALLBACK_CHUNK_SIZE

        if topic_shift or too_long:
            chunks.append(title_prefix + ' '.join(group_sents))
            group_sents = [sentences[i]]
            group_embs  = [embs[i]]
            group_len   = len(sentences[i])
        else:
            group_sents.append(sentences[i])
            group_embs.append(embs[i])

    if group_sents:
        chunks.append(title_prefix + ' '.join(group_sents))
    return chunks


def chunk_document(text: str) -> List[str]:
    title_match  = re.match(r'^#\s+(.+)', text, re.MULTILINE)
    title_prefix = f"# {title_match.group(1)}\n\n" if title_match else ''

    parts = re.split(r'(?=^#{2,3}\s)', text, flags=re.MULTILINE)

    all_chunks: List[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if re.match(r'^#\s+', part) and not re.match(r'^#{2,3}\s', part):
            continue

        content = title_prefix + part

        if len(content) <= MAX_SECTION_CHARS:
            all_chunks.append(content)
        elif is_structured(content):
            all_chunks.extend(character_chunks(content))
        else:
            all_chunks.extend(semantic_chunks(content, title_prefix))

    return all_chunks


def load_docs() -> List[Tuple[str, str, str]]:
    docs: List[Tuple[str, str, str]] = []
    for source in ('react', 'typescript', 'vite'):
        source_dir = os.path.join(DOCS_DIR, source)
        if not os.path.exists(source_dir):
            print(f'  [skip] {source}: run fetch_docs.py first')
            continue
        for fname in sorted(os.listdir(source_dir)):
            if not fname.endswith('.md'):
                continue
            with open(os.path.join(source_dir, fname), 'r', encoding='utf-8') as f:
                content = f.read()
            if len(content) < 100:
                continue
            docs.append((fname.replace('.md', ''), content, source))
    return docs


def build_index():
    docs = load_docs()
    if not docs:
        print('No docs found. Run fetch_docs.py first.')
        return

    print(f'Loaded {len(docs)} documents\n')

    client = chromadb.PersistentClient(path=DB_DIR)
    try:
        client.delete_collection(COLLECTION_NAME)
        print('Dropped existing collection.')
    except Exception:
        pass
    collection = client.create_collection(COLLECTION_NAME)

    ids: List[str]  = []
    texts: List[str] = []
    metas: List[Dict] = []

    for name, full_text, source in docs:
        chunks = chunk_document(full_text)
        print(f'  [{source}] {name}: {len(chunks)} chunks')
        for i, chunk in enumerate(chunks):
            ids.append(f'{source}__{name}__chunk{i}')
            texts.append(chunk)
            metas.append({'source': name, 'doc_source': source, 'chunk': i})

    print(f'\nEmbedding {len(texts)} chunks with {EMBED_MODEL}...')
    embedder    = get_embedder()
    embeddings  = embedder.encode(texts, normalize_embeddings=True,
                                  show_progress_bar=True, batch_size=64)

    collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=metas,
    )
    print(f'\nDone. {collection.count()} chunks indexed.')
    print(f'Saved to: {DB_DIR}')


if __name__ == '__main__':
    build_index()
