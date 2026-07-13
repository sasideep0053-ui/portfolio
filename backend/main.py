from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import telematics, vision, audio, drone, galton, chat, rag

app = FastAPI(title="Portfolio Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telematics.router)
app.include_router(vision.router)
app.include_router(audio.router)
app.include_router(drone.router)
app.include_router(galton.router)
app.include_router(chat.router)
app.include_router(rag.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
