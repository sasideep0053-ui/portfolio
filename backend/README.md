# Backend

FastAPI backend for sasideep.com — WebSocket telemetry demos, Whisper audio streaming, and a RAG pipeline (vector + BM25 + cross-encoder rerank → Groq LLM).

See the [root README](../README.md) for the full project overview, local setup, and deployment notes.

## Routers

| Module | Demo |
|---|---|
| `telematics.py` | Drive Score Simulator (WebSocket physics) |
| `audio.py` | Speech Visualizer (Whisper transcription) |
| `drone.py` | Drone PID Controller (WebSocket) |
| `galton.py` | Galton Board |
| `chat.py` | "Sasi's Assistant" chat widget |
| `rag.py` | Docs RAG Assistant |

## Environment variables

| Variable | Required for |
|---|---|
| `GROQ_API_KEY` | RAG assistant + chat widget LLM calls |
| `PORT` | Set automatically by Render; defaults to `7860` |
