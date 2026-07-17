# Portfolio — sasideep.com

Personal portfolio site for Sasideep Kakumani, Senior Full-Stack Engineer. Vite + React frontend deployed on Vercel, with a FastAPI backend on Render powering a set of real-time/AI engineering demos.

**Live:** [sasideep.com](https://sasideep.com)

## Tech stack

**Frontend** — React 18, TypeScript, Vite, D3.js, Three.js, AG Grid / AG Charts, Recharts, react-grid-layout. No CSS framework — hand-written CSS with theme-driven custom properties.

**Backend** — FastAPI (Python), WebSockets, served via Docker on Render. RAG pipeline uses ChromaDB, BM25 (`rank-bm25`), Voyage AI (hosted embeddings + reranker), and Groq for LLM inference. Audio demo uses Groq-hosted Whisper with a `faster-whisper` fallback.

## Project structure

```
src/
  components/     UI components (Hero, About, EngineeringLab, LabPage, demos/, etc.)
  contexts/       Theme, Locale, Navigation, Router, Console providers
  data/           Resume content, i18n strings
  hooks/          Shared React hooks
  lib/            Small client-side utilities (e.g. devLog)

backend/
  main.py         FastAPI app, CORS, router registration
  routers/        One module per demo: telematics, audio, drone, galton, chat, rag
  scripts/        RAG corpus fetch + index build scripts
  rag_db/         Prebuilt Chroma + BM25 index (committed so cold starts don't rebuild it)
```

## Engineering Lab demos

- **Docs RAG Assistant** — hybrid vector + BM25 retrieval, reciprocal rank fusion, Voyage AI reranking, Groq-streamed answers over React/TypeScript/Vite/FastAPI docs.
- **Speech Visualizer** — Web Audio API waveform/frequency visualization with Whisper transcription (Groq-hosted, faster-whisper fallback).
- **Recommendation Engine** — user-based KNN recommendations, client-side.
- **Drive Score Simulator** — WebSocket-driven physics simulation with a live telemetry console.
- **Drone PID Controller** — PID control loop rendered on Canvas 2D, driven over WebSocket.
- **Galton Board** — probability/binomial-distribution simulation on Canvas 2D.

Plus a **UI Toolkit** section (`/components`) with accessible D3 charts (drill-down, donut, pivot table, bar/line) and a drag-and-resize dashboard builder.

## Local development

### Frontend

```bash
npm install
npm run dev          # http://localhost:5173
```

Copy `.env.example` to `.env` and point `VITE_API_BASE_URL` at your backend (defaults to `http://localhost:7860`).

```bash
npm run build         # tsc + vite build
npm run preview       # preview the production build
```

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 7860
```

Set `GROQ_API_KEY` and `VOYAGE_API_KEY` in the environment (or a `backend/.env` file) to enable the RAG assistant and chat demos.

To rebuild the RAG index from scratch:

```bash
python scripts/fetch_docs.py
python scripts/build_rag_index.py
```

Or build straight from the Dockerfile used in production:

```bash
docker build -t portfolio-backend .
docker run -p 7860:7860 -e GROQ_API_KEY=... portfolio-backend
```

## Deployment

- **Frontend** — Vercel, auto-deployed from `main` (`vercel.json` handles the SPA rewrite).
- **Backend** — Render, built from `backend/Dockerfile`. Embedding/reranking is offloaded to Voyage AI and LLM inference to Groq — no local models loaded, keeping the container's memory footprint small on the free tier.
