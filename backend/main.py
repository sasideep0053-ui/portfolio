import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import telematics, audio, drone, galton, chat, rag

app = FastAPI(title="Portfolio Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174", "http://localhost:3000",
        "https://sasideep.com", "https://www.sasideep.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telematics.router)
app.include_router(audio.router)
app.include_router(drone.router)
app.include_router(galton.router)
app.include_router(chat.router)
app.include_router(rag.router)


@app.on_event("startup")
async def _start_idle_watchdog():
    asyncio.create_task(rag.idle_watchdog())
    # librosa's first import is slow (numpy/scipy/numba) and would otherwise
    # block the event loop on a real user's first /ws/audio connection —
    # pay that cost once here instead, before the app takes traffic.
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, audio._check_librosa)


@app.get("/health")
async def health():
    return {"status": "ok"}
