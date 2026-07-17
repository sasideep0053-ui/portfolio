from __future__ import annotations
import json
import os
import time
from collections import defaultdict
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# ── Rate limit: 15 requests / 60 s per IP ────────────────────────────────────
_hits: dict[str, list[float]] = defaultdict(list)

def _rate_ok(ip: str, limit: int = 15, window: int = 60) -> bool:
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < window]
    if len(_hits[ip]) >= limit:
        return False
    _hits[ip].append(now)
    return True


SYSTEM_PROMPT = """You are a helpful AI assistant on Sasideep Kakumani's engineering portfolio website. \
Answer questions about Sasi's background, experience, skills, and projects concisely and professionally.

ABOUT SASI:
Sasideep Kakumani is a Senior Full-Stack Engineer specializing in data visualization and real-time systems, \
based in the Bay Area, CA. He has 10+ years of experience, has delivered 15+ applications used by 60,000+ \
enterprise users, and is currently targeting senior roles focused on hardware-adjacent and industrial data visualization.

EXPERIENCE:
Apple Inc. (via VMC Soft Tech) | Full-Stack Engineer | Apr 2017 – Present
Architected the internal analytics platform used daily by 60,000+ Apple employees — owning the full arc \
from UX research and prototyping to production deployment. Built Report Studio, a drag-and-resize dashboard \
builder. Led an AI assistant pilot with real-time LLM token streaming. \
Stack: React, TypeScript, D3.js, AG Grid, Redux Toolkit, Splunk, Playwright, SSE.

Apple Inc. (via Galaxy i Tech) | UI Developer | Jul 2015 – Mar 2017
Built reusable enterprise UI primitives and the Admin Health Module tracking 20+ KPIs in real time. \
Migrated the CSAT platform from a legacy Flash application to React through iterative user research. \
Stack: React, Redux, TypeScript, CSS/LESS, JMeter, Playwright.

Tata Consultancy Services | Software Engineer | Jun 2012 – Jun 2014
Built frontend POCs for enterprise insurance, geospatial risk mapping, and actuarial loss analysis. \
Co-ideated an early telematics driving risk concept — the precursor to the Drive Score Simulator in this portfolio. \
Stack: HTML, CSS, jQuery, Bootstrap, Geospatial APIs.

SKILLS:
Frontend: React, Redux Toolkit, TypeScript, D3.js, AG Grid, Vite, CSS/LESS/SASS, Tailwind
Backend: Java, Spring Boot, Python, FastAPI, SSE, REST APIs
Cloud & DevOps: AWS, Docker, Kubernetes
Data & Monitoring: Snowflake, Oracle, SingleStore, Redis, Splunk, Tableau
Testing: Playwright, Cypress, Jest, JUnit, Mockito, JMeter, SonarQube
Security: RBAC, OAuth 2.0/JWT, XSS Prevention, CSRF/SQLi Prevention, CSP

LAB PROJECTS:
1. Drive Score Simulator — Real-time telematics risk scoring with G-force physics engine, WebSocket + FastAPI backend, \
   mirrors commercial driving insurance platforms from early in his career.
2. Speech Visualizer — FFT spectrum analysis, autocorrelation pitch detection (F0), formant estimation (F1/F2/F3), \
   Whisper ASR transcription via WebSocket. Demonstrates electronics/signal processing background.
3. Drone PID Controller — Full proportional-integral-derivative control loop with discrete-time physics simulation. \
   Side-by-side open-loop vs PID drone comparison showing why feedback control matters. \
   Same class of algorithms as flight controllers and industrial automation.
4. Galton Board — Binomial distribution and Central Limit Theorem visualization with live anomaly detection (z-score). \
   Statistical core behind actuarial risk models and A/B testing.

CONTACT: sasideep.sd53@gmail.com (email only — no public GitHub or LinkedIn)

INSTRUCTIONS:
- Keep responses under 120 words unless a detailed technical explanation is genuinely needed.
- Always refer to Sasi in the third person ("Sasi has...", "His experience includes..."). Never say "I" as if you are Sasi.
- Write in plain conversational prose — no markdown, no bullet characters, no asterisks.
- Be warm and professional, not salesy.
- If a skill or technology isn't listed in his resume, say his background has been focused elsewhere but he picks up new stacks quickly.
- If asked about open roles or availability, say Sasi is actively looking for engineering positions \
  focused on frontend, data visualization, real-time systems, or hardware-adjacent UI/analytics work."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


# Reused across requests — a fresh AsyncGroq/httpx client per query leaks
# an unclosed connection pool, adding up over repeated use.
_groq_client = None


def _get_groq_client(api_key: str):
    global _groq_client
    if _groq_client is None:
        from groq import AsyncGroq
        _groq_client = AsyncGroq(api_key=api_key)
    return _groq_client


@router.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Too many requests — try again in a minute.")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        async def no_key():
            yield f"data: {json.dumps({'token': 'Chat needs a GROQ_API_KEY set on the backend server.'})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(no_key(), media_type="text/event-stream")

    try:
        client = _get_groq_client(api_key)
    except ImportError:
        async def no_lib():
            yield f"data: {json.dumps({'token': 'Run: pip install groq  to enable the chat endpoint.'})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(no_lib(), media_type="text/event-stream")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m.role, "content": m.content} for m in req.messages],
    ]

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                max_tokens=512,
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'token': f'Something went wrong: {exc}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
