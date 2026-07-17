from __future__ import annotations
import asyncio
import io
import json
import os
import wave
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

SAMPLE_RATE   = 16000
WAVEFORM_BINS = 256   # downsampled samples sent per chunk for waveform display
SPECTRUM_BINS = 128   # FFT bins sent for spectrum display

_librosa_available = False

# Caps concurrent Groq transcription calls.
_infer_sem = asyncio.Semaphore(2)


def _check_librosa() -> bool:
    global _librosa_available
    try:
        import librosa  # noqa: F401
        _librosa_available = True
    except ImportError:
        _librosa_available = False
    return _librosa_available


# ── Pitch ────────────────────────────────────────────────────────────────
def estimate_pitch(pcm: np.ndarray, sr: int = SAMPLE_RATE) -> dict:
    """Autocorrelation pitch estimate — no librosa required."""
    if len(pcm) < 512:
        return {"hz": 0.0, "confidence": 0.0}

    frame = pcm[-2048:] if len(pcm) >= 2048 else pcm
    frame = frame * np.hanning(len(frame))
    corr  = np.correlate(frame, frame, mode="full")
    corr  = corr[len(corr) // 2:]

    lo = int(sr / 600)
    hi = int(sr / 80)
    if hi >= len(corr):
        return {"hz": 0.0, "confidence": 0.0}

    peak_idx   = np.argmax(corr[lo:hi]) + lo
    hz         = sr / peak_idx if peak_idx > 0 else 0.0
    confidence = float(corr[peak_idx] / (corr[0] + 1e-9))

    return {"hz": round(float(hz), 1), "confidence": round(min(confidence, 1.0), 3)}


# ── Formants (LPC via librosa) ───────────────────────────────────────────
def estimate_formants(pcm: np.ndarray, sr: int = SAMPLE_RATE) -> dict:
    """LPC-based F1/F2/F3 formant estimation using librosa."""
    if not _librosa_available or len(pcm) < 512:
        return {"f1": 0, "f2": 0, "f3": 0}

    try:
        import librosa

        # Use a 30 ms frame centred at the end of the buffer
        frame_len = int(sr * 0.030)
        frame = pcm[-frame_len:] if len(pcm) >= frame_len else pcm
        frame = frame * np.hanning(len(frame))
        frame = frame.astype(np.float64)

        order = 10  # 2 × expected formants (F1–F3) + 2
        lpc   = librosa.lpc(frame, order=order)

        # Roots of LPC polynomial → formant frequencies
        roots  = np.roots(lpc)
        roots  = roots[np.imag(roots) >= 0]
        angles = np.arctan2(np.imag(roots), np.real(roots))
        freqs  = sorted([a * sr / (2 * np.pi) for a in angles if a > 0])

        # Keep only plausible speech formant range (200–4000 Hz)
        formants = [round(f) for f in freqs if 200 < f < 4000]
        return {
            "f1": formants[0] if len(formants) > 0 else 0,
            "f2": formants[1] if len(formants) > 1 else 0,
            "f3": formants[2] if len(formants) > 2 else 0,
        }
    except Exception:
        return {"f1": 0, "f2": 0, "f3": 0}


# ── Spectrum (FFT) ───────────────────────────────────────────────────────
def compute_spectrum(pcm: np.ndarray, n_bins: int = SPECTRUM_BINS) -> list:
    """Normalised FFT magnitude for the low-frequency speech band (0–4 kHz)."""
    frame = pcm[-2048:] if len(pcm) >= 2048 else pcm
    frame = frame * np.hanning(len(frame))
    mag   = np.abs(np.fft.rfft(frame, n=2048))[:n_bins]
    max_v = mag.max() + 1e-9
    return [round(float(v / max_v), 3) for v in mag]


# ── Waveform (downsampled time-domain) ──────────────────────────────────
def compute_waveform(pcm: np.ndarray, n_out: int = WAVEFORM_BINS) -> list:
    """Downsample chunk to n_out points, normalised −1→1."""
    if len(pcm) == 0:
        return [0.0] * n_out
    step = max(1, len(pcm) // n_out)
    samples = pcm[::step][:n_out]
    # Pad if shorter
    if len(samples) < n_out:
        samples = np.pad(samples, (0, n_out - len(samples)))
    peak = max(np.abs(samples).max(), 1e-6)
    return [round(float(v / peak), 4) for v in samples]


# ── Transcription — Groq-hosted Whisper only (no local fallback) ───────────
def _pcm_to_wav_bytes(pcm: np.ndarray, sr: int = SAMPLE_RATE) -> bytes:
    pcm16 = np.clip(pcm * 32767, -32768, 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


def _transcribe_cloud(pcm: np.ndarray, api_key: str) -> dict:
    from groq import Groq
    client = Groq(api_key=api_key)
    wav_bytes = _pcm_to_wav_bytes(pcm)
    result = client.audio.transcriptions.create(
        file=("chunk.wav", wav_bytes),
        model="whisper-large-v3-turbo",
    )
    text = (result.text or "").strip()
    return {"text": text, "language": getattr(result, "language", "unknown") or "unknown", "language_prob": 1.0}


async def transcribe_chunk(pcm: np.ndarray) -> dict:
    if len(pcm) < SAMPLE_RATE * 0.3:
        return {}

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY is not set on the server."}

    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(None, _transcribe_cloud, pcm, api_key)
    except Exception as exc:
        print(f'[audio] Groq transcription failed ({exc})')
        return {"error": f"Groq transcription is unreachable ({exc})."}


# ── WebSocket endpoint ───────────────────────────────────────────────────
async def _send(ws: WebSocket, payload: dict) -> bool:
    """Send JSON; returns False if the client is gone."""
    try:
        await ws.send_text(json.dumps(payload))
        return True
    except Exception:
        return False


@router.websocket("/ws/audio")
async def audio_ws(ws: WebSocket):
    await ws.accept()
    _check_librosa()

    # Transcription needs GROQ_API_KEY — no local fallback, to keep memory flat.
    whisper_available = bool(os.getenv("GROQ_API_KEY"))
    if not await _send(ws, {"type": "ready", "whisper": whisper_available, "librosa": _librosa_available}):
        return

    pitch_buffer:      list[np.ndarray] = []
    transcribe_buffer: list[np.ndarray] = []
    transcribe_samples = 0
    TRANSCRIBE_EVERY   = SAMPLE_RATE * 2   # 2 s — batches fewer, more worthwhile Groq calls

    try:
        while True:
            data = await ws.receive()

            if data.get("type") == "websocket.disconnect":
                break

            if "bytes" in data and data["bytes"]:
                pcm_bytes = data["bytes"]
            elif "text" in data:
                msg = json.loads(data["text"])
                if msg.get("type") == "stop":
                    break
                continue
            else:
                continue

            chunk = np.frombuffer(pcm_bytes, dtype=np.float32)
            if len(chunk) == 0:
                continue

            # Rolling pitch buffer (~1 s)
            pitch_buffer.append(chunk)
            if len(pitch_buffer) > 10:
                pitch_buffer.pop(0)
            pcm_pitch = np.concatenate(pitch_buffer)

            # Per-chunk analysis — everything the frontend needs
            pitch    = estimate_pitch(pcm_pitch)
            formants = estimate_formants(pcm_pitch)
            spectrum = compute_spectrum(chunk)
            waveform = compute_waveform(chunk)
            rms      = float(np.sqrt(np.mean(chunk ** 2)))
            db       = round(float(max(-60.0, 20 * np.log10(rms + 1e-9))), 1)

            if not await _send(ws, {
                "type": "chunk", "pitch": pitch, "formants": formants,
                "spectrum": spectrum, "waveform": waveform, "db": db,
            }):
                break

            # Transcription every 2 s (see TRANSCRIBE_EVERY)
            transcribe_buffer.append(chunk)
            transcribe_samples += len(chunk)
            if transcribe_samples >= TRANSCRIBE_EVERY:
                pcm_full = np.concatenate(transcribe_buffer)
                async with _infer_sem:
                    transcript = await transcribe_chunk(pcm_full)
                if transcript.get("error"):
                    if not await _send(ws, {"type": "transcript_error", "message": transcript["error"]}):
                        break
                elif transcript.get("text"):
                    if not await _send(ws, {"type": "transcript", **transcript}):
                        break
                transcribe_buffer  = []
                transcribe_samples = 0

    except (WebSocketDisconnect, RuntimeError):
        pass
