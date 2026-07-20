import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { devLog } from '../../lib/devLog'
import { API_WS_BASE } from '../../lib/apiConfig'

const WS_URL   = `${API_WS_BASE}/ws/drone`
const MAX_H    = 10.0
const MASS     = 0.5
const GRAVITY  = 9.81
const HOVER_T  = MASS * GRAVITY        // ~4.905 N — perfectly balances gravity
const NC_T     = HOVER_T * 1.12       // open-loop: 12% above hover → slow uncontrolled climb
const MAX_T    = HOVER_T * 4
const DRAG     = 0.4
const DT       = 0.05

// Open-loop drone reaches ceiling in ~10 s, then bounces — no awareness of target
const NC_BOUNCE = 0.25                 // energy retained on ceiling/floor hit

type Pt = { t: number; h: number; ncH: number; err: number; p: number; i: number; d: number; thrust: number }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// ── JS fallback PID ──────────────────────────────────────────────────────────
class LocalPID {
  integral = 0; prevErr = 0
  reset() { this.integral = 0; this.prevErr = 0 }
  step(sp: number, pv: number, kp: number, ki: number, kd: number, dt: number) {
    const err = sp - pv
    this.integral = clamp(this.integral + err * dt, -10, 10)
    const deriv = dt > 0 ? (err - this.prevErr) / dt : 0
    this.prevErr = err
    const p = kp * err, i = ki * this.integral, d = kd * deriv
    return { out: p + i + d, p, i, d, err }
  }
}

// ── Canvas helpers ───────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawDrone(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  thrustRatio: number,
  color: string,
  wind: number,
  running: boolean,
  variant: 'open' | 'pid',
) {
  const armLen = 38
  const rotorR = 14
  const bodyW  = 54, bodyH = 10
  const tilt   = clamp(wind * 0.025, -0.18, 0.18)
  const now    = Date.now()

  // Per-variant body colour scheme
  const bodyTop  = variant === 'open' ? '#3d2020' : '#1c1c44'
  const bodyBot  = variant === 'open' ? '#1e1010' : '#0c0c26'
  const armFill  = variant === 'open' ? '#5a3030' : '#2a2a5a'
  const frameRim = variant === 'open' ? '#8a4444' : '#3a3a8a'
  const motorCol = variant === 'open' ? '#3a2020' : '#20203c'

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)

  // ── Propwash downwash glow ──────────────────────────────────────────────
  if (thrustRatio > 0.05) {
    for (const rx of [-armLen, armLen]) {
      const grd = ctx.createRadialGradient(rx, 10, 2, rx, 18, 24)
      grd.addColorStop(0, `${color}40`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.ellipse(rx, 15, 20, 11, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Arms (horizontal bar + vertical spine) ─────────────────────────────
  // Horizontal main beam
  const armBarH = 6
  ctx.fillStyle = armFill
  rrect(ctx, -(armLen + rotorR - 3), -armBarH / 2, (armLen + rotorR - 3) * 2, armBarH, 3)
  ctx.fill()
  ctx.strokeStyle = frameRim
  ctx.lineWidth = 0.8
  ctx.stroke()
  // Cross spine
  rrect(ctx, -4, -8, 8, 16, 2)
  ctx.fillStyle = armFill
  ctx.fill()
  // Arm ribbing texture
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  for (let x = -armLen + 4; x < armLen; x += 8) {
    ctx.beginPath()
    ctx.moveTo(x, -armBarH / 2)
    ctx.lineTo(x, armBarH / 2)
    ctx.stroke()
  }

  // ── Motor nacelles + rotors ────────────────────────────────────────────
  for (const rx of [-armLen, armLen]) {
    // Nacelle cylinder
    ctx.beginPath()
    ctx.arc(rx, 0, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = motorCol
    ctx.fill()
    ctx.strokeStyle = frameRim
    ctx.lineWidth = 1
    ctx.stroke()
    // Inner ring detail
    ctx.beginPath()
    ctx.arc(rx, 0, 4, 0, Math.PI * 2)
    ctx.strokeStyle = `${color}33`
    ctx.lineWidth = 0.8
    ctx.stroke()

    // Rotor disc
    if (thrustRatio > 0.03) {
      const spd = thrustRatio
      // Blur disc
      ctx.beginPath()
      ctx.ellipse(rx, 0, rotorR * (0.65 + spd * 0.35), 3, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(195,215,255,${0.07 + spd * 0.22})`
      ctx.fill()

      // Individual blade hints (fade out as speed rises)
      const bladeA = Math.max(0, (0.7 - spd) * 0.65)
      if (bladeA > 0.02) {
        const dir = rx < 0 ? 1 : -1
        const baseAngle = ((now * 0.004 * dir) % (Math.PI * 2))
        for (let b = 0; b < 2; b++) {
          const angle = baseAngle + b * Math.PI * 0.5
          ctx.save()
          ctx.translate(rx, 0)
          ctx.rotate(angle)
          const bg = ctx.createLinearGradient(-(rotorR - 2), 0, rotorR - 2, 0)
          bg.addColorStop(0,   `rgba(205,220,240,${bladeA * 0.4})`)
          bg.addColorStop(0.45, `rgba(225,238,255,${bladeA})`)
          bg.addColorStop(1,   `rgba(205,220,240,${bladeA * 0.2})`)
          ctx.fillStyle = bg
          rrect(ctx, -(rotorR - 2), -2.2, (rotorR - 2) * 2, 4.4, 2)
          ctx.fill()
          ctx.restore()
        }
      }

      // Disc edge ring
      const edgeA = Math.round(Math.min(255, (0.25 + spd * 0.55) * 255))
      ctx.beginPath()
      ctx.ellipse(rx, 0, rotorR, 2.8, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `${color}${edgeA.toString(16).padStart(2, '0')}`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Motor shaft top cap
    ctx.beginPath()
    ctx.arc(rx, 0, 2.8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(30,30,50,0.95)'
    ctx.fill()

    // LED
    const ledPulse = running ? 0.45 + Math.sin(now / 200 + (rx > 0 ? Math.PI : 0)) * 0.55 : 0.18
    ctx.beginPath()
    ctx.arc(rx, 0, 2, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = ledPulse
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // ── Central body plate ─────────────────────────────────────────────────
  const bodyGrad = ctx.createLinearGradient(0, -bodyH / 2, 0, bodyH / 2)
  bodyGrad.addColorStop(0, bodyTop)
  bodyGrad.addColorStop(1, bodyBot)
  rrect(ctx, -bodyW / 2, -bodyH / 2, bodyW, bodyH, 5)
  ctx.fillStyle = bodyGrad
  ctx.fill()
  ctx.strokeStyle = frameRim
  ctx.lineWidth = 1
  ctx.stroke()

  // Carbon-fibre weave texture
  ctx.save()
  ctx.beginPath()
  rrect(ctx, -bodyW / 2, -bodyH / 2, bodyW, bodyH, 5)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 0.7
  for (let x = -bodyW / 2; x <= bodyW / 2; x += 6) {
    ctx.beginPath(); ctx.moveTo(x, -bodyH / 2); ctx.lineTo(x, bodyH / 2); ctx.stroke()
  }
  ctx.restore()

  // Front direction nub
  ctx.fillStyle = `${color}88`
  ctx.beginPath()
  ctx.moveTo(bodyW / 2,      0)
  ctx.lineTo(bodyW / 2 + 5, -2.5)
  ctx.lineTo(bodyW / 2 + 5,  2.5)
  ctx.closePath()
  ctx.fill()

  // Centre status LED
  const cLed = running ? 0.4 + Math.sin(now / 450) * 0.6 : 0.14
  ctx.beginPath()
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.globalAlpha = cLed
  ctx.fill()
  ctx.globalAlpha = 1

  // ── Camera gimbal pod ──────────────────────────────────────────────────
  const camY = bodyH / 2 + 5
  ctx.beginPath()
  ctx.arc(0, camY, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#0a0a18'
  ctx.fill()
  ctx.strokeStyle = 'rgba(130,150,210,0.28)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, camY, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(70,120,210,0.5)'
  ctx.fill()
  // Lens glint
  ctx.beginPath()
  ctx.arc(-0.8, camY - 0.8, 0.8, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()

  // ── Landing gear ──────────────────────────────────────────────────────
  ctx.strokeStyle = armFill
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (const sx of [-15, 15]) {
    ctx.beginPath()
    ctx.moveTo(sx, bodyH / 2)
    ctx.lineTo(sx, bodyH / 2 + 8)
    ctx.lineTo(sx > 0 ? sx + 10 : sx - 10, bodyH / 2 + 8)
    ctx.stroke()
  }

  ctx.restore()
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  accent: string,
  pidH: number,
  thrustVal: number,
  errorVal: number,
  targetVal: number,
  windVal: number,
  ncH: number,
  running: boolean,
  bgColor: string,
) {
  const groundH = 24, topPad = 22
  const sceneH  = H - groundH - topPad
  const toY     = (wh: number) => H - groundH - (clamp(wh, 0, MAX_H) / MAX_H) * sceneH

  // Sky — tinted with theme bg color
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0,   bgColor)
  bg.addColorStop(0.5, bgColor)
  bg.addColorStop(1,   bgColor)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Altitude grid — minor every 1 m, labelled every 2 m
  ctx.font = '7px monospace'
  ctx.textAlign = 'left'
  for (let m = 0; m <= MAX_H; m++) {
    const gy    = toY(m)
    const minor = m % 2 !== 0
    ctx.fillStyle = minor ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)'
    ctx.fillRect(20, gy, W - 20, 1)
    if (!minor) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillText(`${m}m`, 3, gy + 3)
    }
  }

  // Ground
  const gg = ctx.createLinearGradient(0, H - groundH, 0, H)
  gg.addColorStop(0, '#181828')
  gg.addColorStop(1, '#101018')
  ctx.fillStyle = gg
  ctx.fillRect(0, H - groundH, W, groundH)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(0, H - groundH, W, 1)

  // Centre divider
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(W / 2, topPad)
  ctx.lineTo(W / 2, H - groundH)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // Column header labels
  ctx.font = '8px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,110,80,0.75)'
  ctx.fillText('OPEN LOOP', W / 4, topPad - 7)
  ctx.fillStyle = accent + 'cc'
  ctx.fillText('PID ACTIVE', W * 3 / 4, topPad - 7)

  // Target line
  const targetY = toY(targetVal)
  ctx.save()
  ctx.strokeStyle = accent + 'aa'
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 5])
  ctx.beginPath()
  ctx.moveTo(20, targetY)
  ctx.lineTo(W, targetY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
  ctx.fillStyle = accent + '99'
  ctx.font = '7px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(`target ${targetVal.toFixed(1)}m`, W - 3, targetY - 3)

  // Open-loop drone — error line
  const displayNcH = running ? ncH : 0.5
  const ncY = toY(displayNcH)
  const ncErr = targetVal - displayNcH
  if (Math.abs(ncErr) > 0.2 && running) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,110,80,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(W / 4, ncY)
    ctx.lineTo(W / 4, targetY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
  drawDrone(ctx, W / 4, ncY, running ? NC_T / MAX_T : 0, '#ff6e50', windVal, running, 'open')

  // PID drone — error line
  const displayPidH = running ? pidH : 0.5
  const pidY = toY(displayPidH)
  if (Math.abs(errorVal) > 0.1 && running) {
    ctx.save()
    ctx.strokeStyle = errorVal > 0 ? '#22c55e44' : '#f8717144'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(W * 3 / 4, pidY)
    ctx.lineTo(W * 3 / 4, targetY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
  drawDrone(ctx, W * 3 / 4, pidY, running ? thrustVal / MAX_T : 0, accent, windVal, running, 'pid')

  // Wind indicator
  if (Math.abs(windVal) > 0.3) {
    const wDir = windVal > 0 ? 1 : -1
    const alpha = Math.min(1, Math.abs(windVal) / 3) * 0.75
    ctx.save()
    ctx.font = '9px monospace'
    ctx.fillStyle = `rgba(255,200,80,${alpha})`
    ctx.textAlign = 'center'
    const arrows = Math.abs(windVal) > 2 ? (wDir > 0 ? '→→ wind' : 'wind ←←') : (wDir > 0 ? '→ wind' : 'wind ←')
    ctx.fillText(arrows, W / 2, H / 2 - 10)
    ctx.restore()
  }
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  accent: string,
  hist: Pt[],
  targetVal: number,
  bgColor: string,
) {
  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  if (hist.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Launch to compare altitude trajectories', W / 2, H / 2 + 4)
    return
  }

  const PAD_L = 28, PAD_T = 8, PAD_B = 16
  const plotW = W - PAD_L
  const plotH = H - PAD_T - PAD_B

  const toX  = (i: number) => PAD_L + (i / (hist.length - 1)) * plotW
  const toY  = (v: number) => PAD_T + plotH - (clamp(v, 0, MAX_H) / MAX_H) * plotH

  // Y-axis ticks
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let m = 0; m <= MAX_H; m += 2) {
    const y = toY(m)
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W, y); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.20)'
    ctx.font = '7px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${m}`, PAD_L - 3, y + 3)
  }

  // Target line
  const ty = toY(targetVal)
  ctx.save()
  ctx.strokeStyle = `${accent}55`
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(PAD_L, ty); ctx.lineTo(W, ty); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  const line = (color: string, fn: (p: Pt) => number, lw: number, dash?: number[]) => {
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    if (dash) ctx.setLineDash(dash)
    ctx.beginPath()
    hist.forEach((p, i) => {
      const x = toX(i), y = toY(fn(p))
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.setLineDash([])
  }

  line('rgba(255,110,80,0.65)',  p => p.ncH, 1.5, [4, 3])  // open-loop — red dashed
  line(accent,                   p => p.h,   2.5)            // PID — accent solid

  // Legend
  ctx.font = '8px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,110,80,0.8)';  ctx.fillText('open loop', PAD_L + 4, H - 4)
  ctx.fillStyle = accent;                  ctx.fillText('PID', PAD_L + 72, H - 4)
  ctx.fillStyle = `${accent}66`;           ctx.fillText(`target ${targetVal.toFixed(1)}m`, PAD_L + 100, H - 4)

  // Live readout
  const last = hist[hist.length - 1]
  ctx.textAlign = 'right'
  ctx.fillStyle = accent
  ctx.fillText(`PID ${last.h.toFixed(2)}m`, W - 4, PAD_T + 9)
  ctx.fillStyle = 'rgba(255,110,80,0.8)'
  ctx.fillText(`NC ${last.ncH.toFixed(2)}m`, W - 4, PAD_T + 19)
}

// ── Tooltip helper ───────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 60,
          background: 'var(--card)', border: '1px solid var(--border-mid)',
          borderRadius: 8, padding: '7px 10px',
          fontSize: '0.625rem', lineHeight: 1.5, color: 'var(--text-2)',
          width: '11rem', whiteSpace: 'normal',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none', textAlign: 'left',
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

// ── Slider helper component ──────────────────────────────────────────────────
function PIDStepper({
  label, value, min, max, step, color, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  color: string; onChange: (v: number) => void
}) {
  const dec = () => onChange(Math.max(min, +parseFloat((value - step).toFixed(4))))
  const inc = () => onChange(Math.min(max, +parseFloat((value + step).toFixed(4))))
  const btn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-mid)',
    background: 'var(--surface)', color, fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, transition: 'background 0.1s', flexShrink: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color, width: 20, flexShrink: 0 }}>{label}</span>}
      <button onClick={dec} style={btn}>−</button>
      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color, width: 42, textAlign: 'center', flexShrink: 0 }}>
        {value < 1 ? value.toFixed(2) : value.toFixed(1)}
      </span>
      <button onClick={inc} style={btn}>+</button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
const DEMO_BTN_BASE: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 7, border: 'none',
  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font)', letterSpacing: '0.04em',
}

export default function DroneDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [running,  setRunning]  = useState(false)
  const [showHow,  setShowHow]  = useState(false)
  const [kp,       setKp]       = useState(2.0)
  const [ki,       setKi]       = useState(0.1)
  const [kd,       setKd]       = useState(1.5)
  const [targetH,  setTargetH]  = useState(5.0)
  const [liveH,    setLiveH]    = useState(0.0)
  const [liveNcH,  setLiveNcH]  = useState(0.0)
  const [liveErr,  setLiveErr]  = useState(0.0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<HTMLCanvasElement>(null)

  // PID drone physics refs
  const hRef    = useRef(0.0)
  const velRef  = useRef(0.0)
  const thrRef  = useRef(HOVER_T)
  const errRef  = useRef(0.0)
  const pRef    = useRef(0.0)
  const iRef    = useRef(0.0)
  const dRef    = useRef(0.0)
  const windRef = useRef(0.0)
  const tRef    = useRef(0.0)

  // Open-loop drone physics refs (always local)
  const ncHRef   = useRef(0.0)
  const ncVelRef = useRef(0.0)

  const histRef   = useRef<Pt[]>([])
  const targetRef = useRef(5.0)
  const kpRef     = useRef(2.0)
  const kiRef     = useRef(0.1)
  const kdRef     = useRef(1.5)
  const accentRef = useRef(accent)
  const runRef    = useRef(false)

  const pidLocal   = useRef(new LocalPID())
  const localTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const gustTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef     = useRef(0)

  const { status, lastMessage, connect, send } = useWebSocket(WS_URL)
  const wsOnline = status === 'connected'

  useEffect(() => { accentRef.current = accent }, [accent])
  useEffect(() => { targetRef.current = targetH }, [targetH])
  useEffect(() => { kpRef.current = kp; kiRef.current = ki; kdRef.current = kd }, [kp, ki, kd])

  // Step the open-loop drone one physics tick (always runs locally)
  const stepNC = useCallback((wind: number) => {
    const net = NC_T - MASS * GRAVITY - DRAG * ncVelRef.current + wind
    ncVelRef.current += (net / MASS) * DT
    ncHRef.current    = clamp(ncHRef.current + ncVelRef.current * DT, 0, MAX_H)
    if (ncHRef.current <= 0 || ncHRef.current >= MAX_H) {
      ncVelRef.current *= -NC_BOUNCE
    }
    setLiveNcH(+ncHRef.current.toFixed(2))
  }, [])

  // Parse WebSocket state messages; also step NC drone locally
  useEffect(() => {
    if (!lastMessage) return
    try {
      const msg = JSON.parse(lastMessage)
      if (msg.type !== 'state') return
      hRef.current    = msg.height
      velRef.current  = msg.velocity
      thrRef.current  = msg.thrust
      errRef.current  = msg.error
      pRef.current    = msg.p_term
      iRef.current    = msg.i_term
      dRef.current    = msg.d_term
      windRef.current = msg.wind ?? 0
      tRef.current    = msg.t
      stepNC(windRef.current)
      histRef.current = [...histRef.current.slice(-400), {
        t: msg.t, h: msg.height, ncH: ncHRef.current,
        err: msg.error, p: msg.p_term, i: msg.i_term, d: msg.d_term, thrust: msg.thrust,
      }]
      setLiveH(+msg.height.toFixed(2))
      setLiveErr(+msg.error.toFixed(3))
    } catch { /* ignore parse errors */ }
  }, [lastMessage, stepNC])

  // Local physics tick (runs when backend is offline)
  const localTick = useCallback(() => {
    if (!runRef.current) return
    windRef.current *= 0.92

    // PID drone
    const { out, p, i, d, err } = pidLocal.current.step(
      targetRef.current, hRef.current,
      kpRef.current, kiRef.current, kdRef.current, DT,
    )
    const thrust = clamp(HOVER_T + out, 0, MAX_T)
    const net    = thrust - MASS * GRAVITY - DRAG * velRef.current + windRef.current
    velRef.current = velRef.current + (net / MASS) * DT
    hRef.current   = clamp(hRef.current + velRef.current * DT, 0, MAX_H)
    thrRef.current = thrust
    errRef.current = err; pRef.current = p; iRef.current = i; dRef.current = d
    tRef.current  += DT

    // Open-loop drone (same wind)
    stepNC(windRef.current)

    histRef.current = [...histRef.current.slice(-400), {
      t: tRef.current, h: hRef.current, ncH: ncHRef.current,
      err, p, i, d, thrust,
    }]
    setLiveH(+hRef.current.toFixed(2))
    setLiveErr(+err.toFixed(3))
  }, [stepNC])

  const applyGust = useCallback(() => {
    const sign  = Math.random() > 0.5 ? 1 : -1
    const force = sign * (1.5 + Math.random() * 2.5)
    windRef.current += force
    if (wsOnline) send({ type: 'wind_gust', force: Math.abs(force) })
    devLog('DRONE', `wind gust ${force > 0 ? '+' : ''}${force.toFixed(1)} N`)
  }, [wsOnline, send])

  const scheduleAutoGust = useCallback(() => {
    if (gustTimer.current) clearTimeout(gustTimer.current)
    gustTimer.current = setTimeout(() => {
      if (!runRef.current) return
      applyGust()
      scheduleAutoGust()
    }, 7000 + Math.random() * 6000)
  }, [applyGust])

  const start = useCallback(() => {
    hRef.current    = 0
    velRef.current  = 0
    thrRef.current  = HOVER_T
    errRef.current  = 0
    windRef.current = 0
    ncHRef.current  = 0
    ncVelRef.current = 0
    histRef.current = []
    tRef.current    = 0
    pidLocal.current.reset()
    runRef.current  = true
    setRunning(true)
    setLiveH(0); setLiveNcH(0); setLiveErr(0)

    if (wsOnline) {
      send({ type: 'start', height: 0, target: targetRef.current,
        kp: kpRef.current, ki: kiRef.current, kd: kdRef.current })
      devLog('DRONE', `started via WS — target=${targetRef.current}m`)
    } else {
      if (localTimer.current) clearInterval(localTimer.current)
      localTimer.current = setInterval(localTick, DT * 1000)
      devLog('DRONE', `started offline — target=${targetRef.current}m`)
    }

    scheduleAutoGust()
  }, [wsOnline, send, localTick, scheduleAutoGust])

  const stop = useCallback(() => {
    runRef.current = false
    setRunning(false)
    if (localTimer.current) { clearInterval(localTimer.current); localTimer.current = null }
    if (gustTimer.current)  { clearTimeout(gustTimer.current);   gustTimer.current  = null }
    if (wsOnline) send({ type: 'stop' })
    devLog('DRONE', 'stopped')
  }, [wsOnline, send])

  const windGust = useCallback(() => { applyGust() }, [applyGust])

  const handleKp = useCallback((v: number) => {
    setKp(v); kpRef.current = v
    if (wsOnline && runRef.current) send({ type: 'update_gains', kp: v, ki: kiRef.current, kd: kdRef.current })
  }, [wsOnline, send])

  const handleKi = useCallback((v: number) => {
    setKi(v); kiRef.current = v
    if (wsOnline && runRef.current) send({ type: 'update_gains', kp: kpRef.current, ki: v, kd: kdRef.current })
  }, [wsOnline, send])

  const handleKd = useCallback((v: number) => {
    setKd(v); kdRef.current = v
    if (wsOnline && runRef.current) send({ type: 'update_gains', kp: kpRef.current, ki: kiRef.current, kd: v })
  }, [wsOnline, send])

  const handleTarget = useCallback((v: number) => {
    setTargetH(v); targetRef.current = v
    if (wsOnline && runRef.current) send({ type: 'update_target', height: v })
    if (!wsOnline) pidLocal.current.integral = 0
  }, [wsOnline, send])

  useEffect(() => {
    connect()
    return () => {
      runRef.current = false
      if (localTimer.current) clearInterval(localTimer.current)
      if (gustTimer.current)  clearTimeout(gustTimer.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [connect])

  // Canvas RAF loop
  useEffect(() => {
    const canvas = canvasRef.current
    const chart  = chartRef.current
    if (!canvas || !chart) return
    const ctx  = canvas.getContext('2d')!
    const cctx = chart.getContext('2d')!

    // Clamp DPR — retina phones (3x) would otherwise triple the pixel-shading
    // cost of both canvases for no visible quality gain at this size.
    const dpr = Math.min(devicePixelRatio, 2)
    let lastW = -1, lastH = -1, lastCW = -1, lastCH = -1
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      const cw = chart.offsetWidth, ch = chart.offsetHeight
      if (w === lastW && h === lastH && cw === lastCW && ch === lastCH) return
      lastW = w; lastH = h; lastCW = cw; lastCH = ch
      canvas.width  = w * dpr
      canvas.height = h * dpr
      chart.width   = cw * dpr
      chart.height  = ch * dpr
      ctx.scale(dpr, dpr)
      cctx.scale(dpr, dpr)
    }
    resize()
    // Layout reflows (sidebar height settling, font load, orientation change)
    // can fire ResizeObserver several times in quick succession — debounce so
    // that burst collapses into a single bitmap reset instead of several.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 120)
    })
    ro.observe(canvas); ro.observe(chart)

    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      const CW = chart.offsetWidth,  CH = chart.offsetHeight
      const root    = document.querySelector('.theme-root') as HTMLElement | null
      const style   = root ? getComputedStyle(root) : null
      const bgColor = style?.getPropertyValue('--bg').trim() || '#03050d'
      drawScene(ctx, W, H, accentRef.current,
        hRef.current, thrRef.current, errRef.current,
        targetRef.current, windRef.current, ncHRef.current, runRef.current, bgColor)
      drawChart(cctx, CW, CH, accentRef.current, histRef.current.slice(-300), targetRef.current, bgColor)
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <div style={{ fontFamily: 'var(--font)', maxWidth: 860 }}>

      {/* Header tabs + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowHow(false)} style={{
            ...DEMO_BTN_BASE, padding: '3px 10px',
            background: !showHow ? accent : 'var(--surface)',
            color: !showHow ? '#000' : 'var(--text-2)',
          }}>Demo</button>
          <button onClick={() => setShowHow(true)} style={{
            ...DEMO_BTN_BASE, padding: '3px 10px',
            background: showHow ? accent : 'var(--surface)',
            color: showHow ? '#000' : 'var(--text-2)',
          }}>How it works</button>
        </div>
        {wsOnline && (
          <span style={{
            fontSize: '0.625rem', padding: '2px 8px', borderRadius: 99,
            background: `${accent}22`, border: `1px solid ${accent}`, color: accent,
          }}>● LIVE</span>
        )}
      </div>

      {showHow ? (
        <div className="demo-how">
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>
            Drone hover stabilisation — PID control theory
          </p>
          <p>
            Two drones launch simultaneously. The <span style={{ color: 'rgba(255,110,80,0.9)' }}>open-loop</span> drone
            has fixed thrust — it slowly drifts past the target and can't recover from wind.
            The <span style={{ color: accent }}>PID drone</span> measures its error every 50 ms and adjusts thrust to
            hold the target height exactly.
          </p>
          <pre className="code-block">{`// ── Open loop (left drone) ───────────────────────────────
thrust = HOVER_T × 1.12             // constant, no feedback
// Slowly overshoots target, can't recover from wind gusts

// ── PID closed loop (right drone, 20 Hz tick) ────────────
error      = target_height − current_height

P = Kp × error                      // react to current gap
I = Ki × Σ(error × dt)              // correct long-term drift
        clamp(I, −10, +10)          // anti-windup limit
D = Kd × Δerror / dt                // damp oscillation

pid_output = P + I + D
thrust = clamp(HOVER_T + pid_output, 0, max_thrust)

// ── Shared physics (both drones) ─────────────────────────
wind_force  *= 0.92                 // decays each tick
net_force   = thrust − mass×g − drag×velocity + wind_force
velocity    += (net_force / mass) × dt
height      += velocity × dt

// ── Why each gain matters ─────────────────────────────────
// Kp too low   → sluggish climb, can't reach target
// Kp too high  → oscillates wildly (unstable)
// Ki needed    → corrects gravity bias / steady-state error
// Kd needed    → damps overshoot, smooth landing at target`}</pre>
          <p className="demo-stack-note">
            Stack: React · Canvas 2D · requestAnimationFrame · WebSocket (FastAPI/Python) — full offline JS fallback
          </p>
        </div>
      ) : (
        <div className="demo-two-col" style={{ minHeight: 'calc(100vh - 300px)' }}>

          {/* ── Left: canvas + chart + telemetry ─────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', flex: '1 1 320px', display: 'block',
                borderRadius: '8px 8px 0 0', background: `${accent}0a`,
                border: '1px solid var(--border)', borderBottom: 'none' }}
              aria-label="Drone altitude simulation — open loop left, PID right"
              role="img"
            />
            <canvas
              ref={chartRef}
              style={{ width: '100%', height: 90, display: 'block', background: `${accent}10`,
                borderRadius: '0 0 8px 8px',
                border: '1px solid var(--border)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
              aria-label="Altitude trajectory comparison chart"
              role="img"
            />
            {/* Telemetry row */}
            <div style={{ display: 'flex', background: `${accent}0a`, marginTop: 6,
              border: '1px solid var(--border)', borderRadius: 8 }}>
              {[
                { label: 'OPEN LOOP', value: `${liveNcH.toFixed(2)} m`, color: 'rgba(255,110,80,0.9)' },
                { label: 'PID',       value: `${liveH.toFixed(2)} m`,   color: accent },
                { label: 'ERROR',     value: `${liveErr >= 0 ? '+' : ''}${liveErr.toFixed(3)} m`,
                  color: Math.abs(liveErr) < 0.05 ? '#22c55e' : Math.abs(liveErr) < 0.5 ? '#f59e0b' : '#ef4444' },
                { label: 'TARGET',    value: `${targetH.toFixed(1)} m`,  color: 'var(--text)' },
              ].map(({ label, value, color }, i) => (
                <div key={label} style={{
                  flex: 1, padding: '8px 10px',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <div style={{ fontSize: '0.5rem', fontFamily: 'monospace', letterSpacing: '0.1em',
                    color: 'rgba(255,255,255,0.38)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: controls sidebar ───────────────────────────── */}
          <div className="demo-two-col__sidebar--narrow" style={{
            background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-mid)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Launch / Stop */}
            <div style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              {running ? (
                <button onClick={stop} style={{ ...DEMO_BTN_BASE, width: '100%', padding: '10px 0',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#ef4444' }}>
                  ⏹ Stop
                </button>
              ) : (
                <button onClick={start} style={{ ...DEMO_BTN_BASE, width: '100%', padding: '12px 0',
                  background: accent, color: '#000', fontSize: '0.8125rem', fontWeight: 800,
                  boxShadow: `0 0 16px ${accent}55` }}>
                  ▶ Launch
                </button>
              )}
              <button onClick={windGust} disabled={!running} style={{
                ...DEMO_BTN_BASE, width: '100%', padding: '7px 0',
                background: 'transparent',
                border: `1px solid ${running ? '#f59e0b' : 'var(--border-mid)'}`,
                color: running ? '#f59e0b' : 'var(--text-2)',
                cursor: running ? 'pointer' : 'default',
                opacity: running ? 1 : 0.6,
              }}>
                💨 Gust
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }} />

            {/* Target */}
            <div style={{ padding: '10px 12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: '0.5625rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>Target height</span>
                <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 700, color: accent }}>{targetH.toFixed(1)} m</span>
              </div>
              <input type="range" min={1} max={9} step={0.5} value={targetH}
                onChange={e => handleTarget(+e.target.value)}
                style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
                aria-label={`Target height: ${targetH} metres`}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }} />

            {/* Kp / Ki / Kd — each section gets flex: 1 to fill remaining height evenly */}
            {[
              { key: 'kp', label: 'Kp', sub: 'How hard it corrects', color: 'var(--text)',
                val: kp, min: 0, max: 5, step: 0.1, onChange: handleKp,
                tip: 'Proportional — reacts to current error. Higher = stronger correction; too high causes oscillation.' },
              { key: 'ki', label: 'Ki', sub: 'Corrects slow drift', color: 'rgba(80,180,255,0.9)',
                val: ki, min: 0, max: 1, step: 0.01, onChange: handleKi,
                tip: 'Integral — corrects steady drift by accumulating error over time. Too high = slow wobble.' },
              { key: 'kd', label: 'Kd', sub: 'Stops overshooting', color: 'rgba(255,175,50,0.9)',
                val: kd, min: 0, max: 4, step: 0.1, onChange: handleKd,
                tip: 'Derivative — damps overshoot by braking when error shrinks. Too high = jittery response.' },
            ].map(({ key, label, sub, color, val, min, max, step, onChange, tip }, i) => (
              <div key={key} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center',
                borderTop: i > 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                padding: '0 12px',
              }}>
                <Tooltip text={tip}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontFamily: 'monospace', fontWeight: 700, color, lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
                  </div>
                </Tooltip>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PIDStepper label="" value={val} min={min} max={max} step={step} color={color} onChange={onChange} />
                </div>
              </div>
            ))}

          </div>

        </div>
      )}

    </div>
  )
}
