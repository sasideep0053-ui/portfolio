import { useState, useRef, useCallback, useEffect } from 'react'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { devLog } from '../../lib/devLog'
import { API_HTTP_BASE, API_WS_BASE } from '../../lib/apiConfig'

const WS_URL       = `${API_WS_BASE}/ws/audio`
const HEALTH_URL   = `${API_HTTP_BASE}/health`
const SAMPLE_RATE  = 16000
const CHUNK_SIZE   = 2048
const MAX_DURATION = 10
const HZ_MIN = 80
const HZ_MAX = 400

type PitchPt = { t: number; hz: number }

function crtStroke(ctx: CanvasRenderingContext2D, color: string, fn: () => void) {
  ctx.shadowColor = color
  ctx.shadowBlur  = 10
  fn()
  ctx.shadowBlur  = 0
}

export default function SpeechVisualizerDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent
  const accentRef = useRef(accent)
  useEffect(() => { accentRef.current = accent }, [accent])

  const [recording,    setRecording]    = useState(false)
  const [showHow,      setShowHow]      = useState(false)
  const [timeLeft,     setTimeLeft]     = useState(MAX_DURATION)
  const [displayText,  setDisplayText]  = useState('')
  const [backendReady, setBackendReady] = useState(false)
  const [backendReachable, setBackendReachable] = useState(false)
  const [micError,     setMicError]     = useState<string | null>(null)

  // Health check on mount — backend required, no offline fallback
  useEffect(() => {
    let cancelled = false
    fetch(HEALTH_URL).then(r => { if (!cancelled && r.ok) setBackendReachable(true) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const waveformRef = useRef<HTMLCanvasElement>(null)
  const spectrumRef = useRef<HTMLCanvasElement>(null)
  const pitchCanRef = useRef<HTMLCanvasElement>(null)
  const formantRef2 = useRef<HTMLCanvasElement>(null)
  const dbMeterRef  = useRef<HTMLCanvasElement>(null)

  const waveformBufRef  = useRef<number[]>(new Array(256).fill(0))
  const spectrumBufRef  = useRef<number[]>(new Array(128).fill(0))
  const pitchHistRef    = useRef<PitchPt[]>([])
  const formantDataRef  = useRef({ f1: 0, f2: 0, f3: 0 })
  const dbValueRef      = useRef(-60)
  const dbHistRef       = useRef<number[]>([])
  const recordingRef    = useRef(false)
  const transcriptEventsRef = useRef<{ t: number; text: string }[]>([])

  const accumulatedRef = useRef('')
  const typingIdxRef   = useRef(0)
  const targetTxtRef   = useRef('')
  const typingRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTRef      = useRef(0)

  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const rafRef       = useRef(0)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  const { status, lastMessage, connect, disconnect, wsRef } = useWebSocket(WS_URL)
  const wsOnline = status === 'connected'

  useEffect(() => {
    if (!lastMessage) return
    const msg = JSON.parse(lastMessage)
    if (msg.type === 'ready') {
      setBackendReady(true)
      devLog('SPEECH', 'backend ready — Whisper model loaded')
    } else if (msg.type === 'chunk') {
      waveformBufRef.current = msg.waveform
      spectrumBufRef.current = msg.spectrum
      dbValueRef.current     = msg.db
      dbHistRef.current      = [...dbHistRef.current.slice(-80), msg.db]
      formantDataRef.current = msg.formants
      if (msg.pitch.hz > 60 && msg.pitch.confidence > 0.05) {
        const t = +((Date.now() - startTRef.current) / 1000).toFixed(2)
        pitchHistRef.current = [...pitchHistRef.current.slice(-300), { t, hz: Math.round(msg.pitch.hz) }]
        if (pitchHistRef.current.length % 30 === 0) {
          devLog('PITCH', `F₀ ${msg.pitch.hz.toFixed(0)} Hz · dBFS ${Math.round(msg.db)} · F1=${msg.formants.f1} F2=${msg.formants.f2}`)
        }
      }
    } else if (msg.type === 'transcript' && msg.text?.trim()) {
      const elapsed = +(( Date.now() - startTRef.current) / 1000).toFixed(2)
      const trimmed = msg.text.trim()
      transcriptEventsRef.current.push({ t: elapsed, text: trimmed })
      devLog('WHISPER', `transcript at ${elapsed.toFixed(1)}s: "${trimmed}"`)
      const newSegment = trimmed
      const sep = accumulatedRef.current ? ' ' : ''
      accumulatedRef.current += sep + newSegment
      targetTxtRef.current   = accumulatedRef.current
      const startIdx = accumulatedRef.current.length - newSegment.length
      typingIdxRef.current   = startIdx
      if (typingRef.current) clearInterval(typingRef.current)
      typingRef.current = setInterval(() => {
        typingIdxRef.current = Math.min(typingIdxRef.current + 3, targetTxtRef.current.length)
        setDisplayText(targetTxtRef.current.slice(0, typingIdxRef.current))
        if (typingIdxRef.current >= targetTxtRef.current.length) {
          clearInterval(typingRef.current!)
          typingRef.current = null
        }
      }, 25)
    }
  }, [lastMessage])

  const sizeCanvases = () => {
    const dpr = window.devicePixelRatio || 1
    for (const ref of [waveformRef, spectrumRef, pitchCanRef, formantRef2, dbMeterRef]) {
      const c = ref.current
      if (!c) continue
      const w = c.offsetWidth, h = c.offsetHeight
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr; c.height = h * dpr
        const ctx = c.getContext('2d')
        if (ctx) ctx.scale(dpr, dpr)
      }
    }
  }

  const startRAF = useCallback(() => {
    const draw = () => {
      const a   = accentRef.current
      const rec = recordingRef.current

      // ── Waveform: CRT oscilloscope ─────────────────────────────────
      const wc = waveformRef.current
      if (wc) {
        const ctx = wc.getContext('2d')!
        const { width: w, height: h } = wc
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fillRect(0, 0, w, h)
        const data = waveformBufRef.current
        ctx.beginPath()
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w
          const y = (-data[i] * h * 0.44) + h / 2
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        crtStroke(ctx, a, () => {
          ctx.strokeStyle = a; ctx.lineWidth = rec ? 1.8 : 1; ctx.stroke()
        })
        if (!rec) {
          ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
          ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()
        }
      }

      // ── Spectrum: FFT equalizer bars ───────────────────────────────
      const sc = spectrumRef.current
      if (sc) {
        const ctx = sc.getContext('2d')!
        const { width: w, height: h } = sc
        ctx.clearRect(0, 0, w, h)
        const data = spectrumBufRef.current
        const barW = w / data.length
        for (let i = 0; i < data.length; i++) {
          const v = data[i], barH = v * h
          ctx.globalAlpha = rec ? 0.2 + v * 0.8 : 0.08
          ctx.fillStyle = a
          ctx.fillRect(i * barW, h - barH, Math.max(1, barW - 1), barH)
        }
        ctx.globalAlpha = 1
      }

      // ── Pitch: rolling line ────────────────────────────────────────
      const pc = pitchCanRef.current
      if (pc) {
        const ctx = pc.getContext('2d')!
        const { width: w, height: h } = pc
        ctx.clearRect(0, 0, w, h)
        ctx.setLineDash([3, 6]); ctx.lineWidth = 1
        ;[100, 200, 300].forEach(hz => {
          const y = h - ((hz - HZ_MIN) / (HZ_MAX - HZ_MIN)) * h
          ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'
          ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
        })
        ctx.setLineDash([])
        const data = pitchHistRef.current
        if (data.length < 2) {
          ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(rec ? 'tracking…' : 'start recording', w / 2, h / 2 + 3)
        } else {
          const toY = (hz: number) =>
            h - ((Math.min(Math.max(hz, HZ_MIN), HZ_MAX) - HZ_MIN) / (HZ_MAX - HZ_MIN)) * h
          ctx.beginPath()
          data.forEach((pt, i) => {
            const x = (pt.t / MAX_DURATION) * w
            i === 0 ? ctx.moveTo(x, toY(pt.hz)) : ctx.lineTo(x, toY(pt.hz))
          })
          const last = data[data.length - 1]
          ctx.lineTo((last.t / MAX_DURATION) * w, h)
          ctx.lineTo((data[0].t / MAX_DURATION) * w, h)
          ctx.closePath(); ctx.fillStyle = `${a}1a`; ctx.fill()
          ctx.beginPath(); ctx.lineWidth = 2; ctx.lineJoin = 'round'
          data.forEach((pt, i) => {
            const x = (pt.t / MAX_DURATION) * w
            i === 0 ? ctx.moveTo(x, toY(pt.hz)) : ctx.lineTo(x, toY(pt.hz))
          })
          crtStroke(ctx, a, () => { ctx.strokeStyle = a; ctx.stroke() })

          // ── Word markers: vertical line + rotated label at transcript time ──
          transcriptEventsRef.current.forEach(ev => {
            const mx = (ev.t / MAX_DURATION) * w
            ctx.strokeStyle = `${a}55`; ctx.lineWidth = 1; ctx.setLineDash([2, 4])
            ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, h); ctx.stroke()
            ctx.setLineDash([])
            ctx.save()
            ctx.translate(mx + 3, h - 4)
            ctx.rotate(-Math.PI / 2)
            ctx.fillStyle = `${a}cc`; ctx.font = '7px monospace'
            ctx.fillText(ev.text.slice(0, 12), 0, 0)
            ctx.restore()
          })
        }
      }

      // ── Formants: F1/F2/F3 bars ────────────────────────────────────
      const fc = formantRef2.current
      if (fc) {
        const ctx = fc.getContext('2d')!
        const { width: w, height: h } = fc
        ctx.clearRect(0, 0, w, h)
        const { f1, f2, f3 } = formantDataRef.current
        const formants = [
          { label: 'F1', hz: f1, range: [200, 900]   },
          { label: 'F2', hz: f2, range: [700, 2500]  },
          { label: 'F3', hz: f3, range: [1500, 3500] },
        ]
        const rowH = h / 3, labelW = 20, barMaxW = w - labelW - 42
        formants.forEach(({ label, hz, range }, i) => {
          const y = i * rowH, cY = y + rowH / 2
          const norm = hz > 0 ? Math.max(0, Math.min(1, (hz - range[0]) / (range[1] - range[0]))) : 0
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px monospace'; ctx.textAlign = 'left'
          ctx.fillText(label, 0, cY + 3)
          ctx.fillStyle = 'rgba(255,255,255,0.06)'
          if (ctx.roundRect) ctx.roundRect(labelW, cY - 3, barMaxW, 7, 2)
          else ctx.rect(labelW, cY - 3, barMaxW, 7)
          ctx.fill()
          if (hz > 0 && rec) {
            ctx.fillStyle = `${a}cc`
            if (ctx.roundRect) ctx.roundRect(labelW, cY - 3, barMaxW * norm, 7, 2)
            else ctx.rect(labelW, cY - 3, barMaxW * norm, 7)
            ctx.fill()
          }
          ctx.fillStyle = hz > 0 ? a : 'rgba(255,255,255,0.2)'
          ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left'
          ctx.fillText(hz > 0 ? `${hz}` : '—', labelW + barMaxW + 4, cY + 3)
        })
      }

      // ── Level: Rolling dBFS history bars ──────────────────────────
      const dc = dbMeterRef.current
      if (dc) {
        const ctx = dc.getContext('2d')!
        const { width: w, height: h } = dc
        ctx.clearRect(0, 0, w, h)

        const hist = dbHistRef.current
        const DB_MIN = -50, DB_MAX = -10
        const N = 80
        const barW = w / N

        for (let i = 0; i < hist.length; i++) {
          const norm = Math.max(0, Math.min(1, (hist[i] - DB_MIN) / (DB_MAX - DB_MIN)))
          const barH = norm * (h - 6)
          const age  = i / hist.length
          ctx.globalAlpha = rec ? 0.25 + age * 0.75 : 0.12
          ctx.fillStyle   = norm > 0.88 ? '#ef4444' : norm > 0.68 ? '#f59e0b' : a
          ctx.fillRect(i * barW, h - barH, Math.max(1, barW - 1), barH)
        }
        ctx.globalAlpha = 1

        // Reference lines at -40 and -20 dBFS
        const mkY = (db: number) => h - Math.max(0, Math.min(1, (db - DB_MIN) / (DB_MAX - DB_MIN))) * (h - 6)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4])
        ctx.beginPath(); ctx.moveTo(0, mkY(-40)); ctx.lineTo(w, mkY(-40)); ctx.stroke()
        ctx.strokeStyle = 'rgba(255,180,0,0.30)'
        ctx.beginPath(); ctx.moveTo(0, mkY(-20)); ctx.lineTo(w, mkY(-20)); ctx.stroke()
        ctx.setLineDash([])

        // Current value label
        const curDb = hist[hist.length - 1] ?? -60
        ctx.fillStyle = rec && hist.length > 0 ? '#cccccc' : 'rgba(255,255,255,0.20)'
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right'
        ctx.fillText(rec && hist.length > 0 ? `${Math.round(curDb)} dBFS` : '—', w - 2, 10)

        // Word markers at transcript arrival times
        transcriptEventsRef.current.forEach(ev => {
          const mx = (ev.t / MAX_DURATION) * w
          ctx.strokeStyle = `${a}55`; ctx.lineWidth = 1; ctx.setLineDash([2, 4])
          ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, h); ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = `${a}bb`; ctx.font = '7px monospace'; ctx.textAlign = 'left'
          ctx.fillText(ev.text.slice(0, 8), mx + 2, 9)
        })
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [])

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    processorRef.current?.disconnect(); processorRef.current = null
    audioCtxRef.current?.close();       audioCtxRef.current  = null
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null }
    if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null }
    transcriptEventsRef.current = []
  }, [])

  const stop = useCallback(() => {
    teardown()
    recordingRef.current = false
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'stop' }))
    disconnect()
    setRecording(false)
    setTimeLeft(MAX_DURATION)
    setBackendReady(false)
    devLog('SPEECH', 'recording stopped')
  }, [teardown, disconnect, wsRef])

  const stopRef = useRef(stop)
  stopRef.current = stop
  useEffect(() => () => stopRef.current(), [])

  const start = useCallback(async () => {
    if (recording) return
    setMicError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (_) {
      setMicError('Microphone access denied. Please allow mic access and try again.')
      return
    }
    streamRef.current = stream
    connect()
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const proc   = ctx.createScriptProcessor(CHUNK_SIZE, 1, 1)
    processorRef.current = proc
    proc.onaudioprocess = e => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      ws.send(new Float32Array(e.inputBuffer.getChannelData(0)).buffer)
    }
    source.connect(proc); proc.connect(ctx.destination)
    startTRef.current       = Date.now()
    pitchHistRef.current    = []
    formantDataRef.current  = { f1: 0, f2: 0, f3: 0 }
    waveformBufRef.current  = new Array(256).fill(0)
    spectrumBufRef.current  = new Array(128).fill(0)
    dbValueRef.current      = -60
    dbHistRef.current       = []
    accumulatedRef.current  = ''
    recordingRef.current = true
    setDisplayText(''); setRecording(true); setTimeLeft(MAX_DURATION)
    devLog('SPEECH', `recording started — ${SAMPLE_RATE}Hz · ${CHUNK_SIZE} samples/chunk`)
    setTimeout(() => { sizeCanvases(); startRAF() }, 60)
    let remaining = MAX_DURATION
    timerRef.current = setInterval(() => {
      remaining -= 1
      setTimeLeft(remaining)
      if (remaining <= 0) stop()
    }, 1000)
  }, [connect, wsRef, stop, startRAF])

  const timerColor = timeLeft <= 3 ? '#ef4444' : timeLeft <= 6 ? '#f59e0b' : accent

  // shared panel style
  const panel = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)',
    padding: '6px 8px', overflow: 'hidden', ...extra,
  })
  const lbl = (): React.CSSProperties => ({
    fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.10em',
    fontFamily: 'monospace', color: accent,
  })
  const sub = (): React.CSSProperties => ({
    fontSize: '0.5625rem', color: 'var(--text-3)', fontFamily: 'monospace',
  })

  return (
    <div style={{ fontFamily: 'var(--font)', maxWidth: 860 }}>

      {/* Top bar: tabs + backend status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowHow(false)}
            style={{
              fontSize: '0.6875rem', padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: !showHow ? accent : 'var(--surface)',
              color: !showHow ? '#000' : 'var(--text-3)',
              fontWeight: 600, fontFamily: 'var(--font)', letterSpacing: '0.04em',
            }}
          >Demo</button>
          <button
            onClick={() => setShowHow(true)}
            style={{
              fontSize: '0.6875rem', padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: showHow ? accent : 'var(--surface)',
              color: showHow ? '#000' : 'var(--text-3)',
              fontWeight: 600, fontFamily: 'var(--font)', letterSpacing: '0.04em',
            }}
          >How it works</button>
        </div>
        <span style={{
          fontSize: '0.625rem', padding: '2px 8px', borderRadius: 99,
          background: wsOnline ? `${accent}22` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${wsOnline && backendReady ? accent : backendReachable ? 'var(--border)' : '#ef444455'}`,
          color: wsOnline && backendReady ? accent : backendReachable ? 'var(--text-2)' : '#ef4444',
        }}>
          {wsOnline && backendReady ? '● backend ready' : wsOnline ? '○ connecting…' : backendReachable ? '○ offline' : '○ backend required'}
        </span>
      </div>

      {showHow ? (
        <div className="demo-how">
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>
            Speech Visualizer — how the analysis works
          </p>
          <p>
            Your microphone stream is split into three parallel pipelines running at 60 fps.
            Raw audio chunks are also forwarded over WebSocket to a Python backend running Whisper for transcription.
          </p>
          <pre className="code-block">{`// ── Audio capture ─────────────────────────────────────
getUserMedia({ audio: true })
  → AudioContext.createScriptProcessor(bufferSize=4096)
  → onaudioprocess fires at ~93 Hz (4096 / 44100)

// ── Waveform (oscilloscope) ────────────────────────────
raw PCM samples → draw as sine wave on canvas
  amplitude shows volume; shape shows voice vs. noise

// ── Frequency spectrum (FFT) ───────────────────────────
AnalyserNode(fftSize=256) → getByteFrequencyData()
  → 128 bins from 0–22 kHz, painted as vertical bars
  vowels show strong low bins; consonants scatter high

// ── Pitch detection (autocorrelation) ─────────────────
for lag in range(minPeriod, maxPeriod):
  r[lag] = Σ x[i] × x[i + lag]          // correlation
peak_lag → fundamental frequency F₀ (Hz)
confidence = r[peak] / r[0]             // 0–1

typical ranges: speech 85–255 Hz, singing 100–1000 Hz

// ── Formant estimation (LPC approximation) ────────────
// F1 ≈ vowel openness (low=closed like /i/, high=open /a/)
// F2 ≈ tongue frontness (low=back /u/, high=front /i/)
// F3 ≈ lip rounding / voice quality
peak-pick FFT smoothed envelope → F1, F2, F3 Hz

// ── dBFS meter ────────────────────────────────────────
rms = sqrt(mean(x²))
dBFS = 20 × log10(rms)                  // 0 = clipping
  −60: silence    −30: quiet    −12: loud speech

// ── Transcription (backend) ───────────────────────────
16-bit PCM chunks → WebSocket → FastAPI (buffered ~2s)
  → Groq-hosted Whisper (whisper-large-v3-turbo), falling back to
    a local faster-whisper (base, int8) model if Groq is unreachable
  → sent back as { type: "transcript", text: "...", language: "..." }
  → animated typewriter effect in the transcript box`}</pre>
          <p className="demo-stack-note">
            Stack: React · Web Audio API · ScriptProcessorNode · WebSocket (FastAPI/Python) · Groq Whisper API (faster-whisper fallback) · Canvas 2D
          </p>
        </div>
      ) : (
        <>
          {/* ── Studio record button ─────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 20, marginBottom: 16, marginTop: 4,
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {recording && (
                <span style={{
                  position: 'absolute', width: 72, height: 72, borderRadius: '50%',
                  border: '2px solid #ef4444',
                  animation: 'pulseRing 1.4s ease-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
              <button
                onClick={recording ? stop : start}
                disabled={!recording && !backendReachable}
                aria-label={recording ? 'Stop recording' : 'Start 10 second recording'}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: recording ? 'rgba(239,68,68,0.12)' : backendReachable ? `${accent}18` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${recording ? '#ef4444' : backendReachable ? accent : 'var(--border)'}`,
                  color: recording ? '#ef4444' : backendReachable ? accent : 'var(--text-3)',
                  fontSize: '1.375rem', cursor: backendReachable || recording ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: recording ? '0 0 24px rgba(239,68,68,0.3)' : backendReachable ? `0 0 16px ${accent}28` : 'none',
                  transition: 'all 0.2s', opacity: !recording && !backendReachable ? 0.45 : 1,
                }}
              >
                {recording ? '⏹' : '🎤'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
              {recording ? (
                <>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.875rem', fontWeight: 800, color: timerColor, lineHeight: 1, transition: 'color 0.3s' }}>
                    {timeLeft}s
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: '#ef4444', letterSpacing: '0.1em' }}>
                    ● RECORDING
                  </span>
                </>
              ) : backendReachable ? (
                <>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: accent, letterSpacing: '0.06em', fontWeight: 700 }}>
                    START RECORDING
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: 'var(--text-2)' }}>
                    10 second session
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.04em' }}>
                    BACKEND OFFLINE
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.5625rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    Requires FastAPI + Whisper
                  </span>
                </>
              )}
            </div>
          </div>

          {micError && (
            <div role="alert" style={{ fontSize: '0.6875rem', color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>
              {micError}
            </div>
          )}

          {/* ── Canvas panels ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>

            {/* Waveform — primary, full width */}
            <div style={panel()}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                <span style={lbl()}>WAVEFORM</span>
                <span style={sub()}>oscilloscope · raw mic signal</span>
              </div>
              <canvas
                ref={waveformRef}
                style={{ width: '100%', height: 100, display: 'block' }}
                aria-label="Waveform oscilloscope"
              />
            </div>

            {/* Spectrum — full width */}
            <div style={panel()}>
              <div style={{ marginBottom: 3 }}>
                <span style={lbl()}>SPECTRUM</span>
                <span style={{ ...sub(), display: 'block' }}>0–2 kHz · FFT bins</span>
              </div>
              <canvas ref={spectrumRef} style={{ width: '100%', height: 72, display: 'block' }}
                aria-label="FFT spectrum" />
            </div>

            {/* 3-column: Pitch · Level · Formants */}
            <div style={{ display: 'flex', gap: 6 }}>

              <div style={{ ...panel(), flex: 5, minWidth: 0 }}>
                <div style={{ marginBottom: 3 }}>
                  <span style={lbl()}>PITCH F₀</span>
                  <span style={{ ...sub(), display: 'block' }}>80–400 Hz</span>
                </div>
                <canvas ref={pitchCanRef} style={{ width: '100%', height: 88, display: 'block' }}
                  aria-label="Fundamental frequency pitch track" />
              </div>

              <div style={{ ...panel(), flex: 3, minWidth: 0 }}>
                <div style={{ marginBottom: 3 }}>
                  <span style={lbl()}>LEVEL</span>
                  <span style={{ ...sub(), display: 'block' }}>dBFS history</span>
                </div>
                <canvas ref={dbMeterRef} style={{ width: '100%', height: 88, display: 'block' }}
                  aria-label="dBFS level history" />
              </div>

              <div style={{ ...panel(), flex: 4, minWidth: 0 }}>
                <div style={{ marginBottom: 3 }}>
                  <span style={lbl()}>FORMANTS</span>
                  <span style={{ ...sub(), display: 'block' }}>F1 · F2 · F3</span>
                </div>
                <canvas ref={formantRef2} style={{ width: '100%', height: 88, display: 'block' }}
                  aria-label="Vowel formant frequencies F1 F2 F3" />
              </div>

            </div>
          </div>

          {/* Transcript */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', fontFamily: 'monospace' }}>
              TRANSCRIPT
            </span>
            <span style={{ fontSize: '0.5625rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
              {recording ? '● Whisper · every 2s' : accumulatedRef.current ? 'session complete' : ''}
            </span>
          </div>
          <div
            role="log"
            aria-live="polite"
            aria-label="Whisper transcription"
            style={{
              minHeight: 52, padding: '9px 12px',
              background: 'var(--surface)', borderRadius: 8,
              fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            {displayText ? (
              <>
                {displayText}
                {recording && (
                  <span style={{
                    display: 'inline-block', width: 2, height: '1em',
                    background: accent, marginLeft: 2, verticalAlign: 'text-bottom',
                    animation: 'blink 1s step-end infinite',
                  }} />
                )}
              </>
            ) : (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                {recording ? 'Processing… speak now' : 'Transcription will appear here'}
              </span>
            )}
          </div>

        </>
      )}

    </div>
  )
}
