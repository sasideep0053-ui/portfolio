import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import { devLog } from '../../lib/devLog'
import { API_HTTP_BASE, API_WS_BASE } from '../../lib/apiConfig'

const WS_URL     = `${API_WS_BASE}/ws/telematics`
const HEALTH_URL = `${API_HTTP_BASE}/health`
const DURATION_S = 15
const TICK_MS    = 50   // physics + WS send rate
const GRAVITY    = 9.81
const MPH_TO_MS  = 0.44704

type Phase = 'idle' | 'running' | 'ended'
type Pt    = { t: number; speed: number; g_force: number; lateral_g: number }
type Report = {
  peak_speed_mph: number; peak_decel_g: number; peak_lateral_g: number
  harsh_events: number; rate_per_min: number
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH'; premium_delta: number; duration_s: number
}
type DriveRecord = Report & { driveNum: number }

// ── Local g-force fallback (used when backend is offline) ──────────────
function localGForce(speedMph: number, prevSpeedMph: number, steer: number, dt: number) {
  const dv      = (speedMph - prevSpeedMph) * MPH_TO_MS
  const longG   = Math.max(-3, Math.min(3, dv / (GRAVITY * dt)))  // cap ±3g
  const speedMs = speedMph * MPH_TO_MS
  const latG    = speedMs > 2
    ? Math.max(-1.0, Math.min(1.0, steer * speedMs ** 2 / (GRAVITY * Math.max(100, speedMs * 5))))  // effective radius grows with speed: gentle at highway, tight at city
    : 0
  return { g_force: +longG.toFixed(3), lateral_g: +latG.toFixed(3) }
}

// ── Gauge component ────────────────────────────────────────────────────
function ArcGauge({
  value, min, max, label, unit, accent, warnAt, dangerAt, colorValue,
}: {
  value: number; min: number; max: number
  label: string; unit: string; accent: string
  warnAt?: number; dangerAt?: number
  colorValue?: number  // if set, drives color zone independently of display value
}) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const W = 160, H = 106, r = 64, cx = W / 2, cy = 90
    const startAngle = -Math.PI * 0.85
    const endAngle   =  Math.PI * 0.85
    const arc = d3.arc<void>().innerRadius(r - 13).outerRadius(r)
      .startAngle(startAngle).endAngle(endAngle)
    const pct   = Math.max(0, Math.min(1, (value - min) / (max - min)))
    const angle = startAngle + pct * (endAngle - startAngle)
    const fillArc = d3.arc<void>().innerRadius(r - 13).outerRadius(r)
      .startAngle(startAngle).endAngle(angle)

    const cv = colorValue ?? value
    let fillColor = accent
    if (warnAt !== undefined || dangerAt !== undefined) {
      if (dangerAt !== undefined && cv >= dangerAt)   fillColor = '#ef4444'
      else if (warnAt !== undefined && cv >= warnAt)  fillColor = '#f59e0b'
      else                                             fillColor = '#86efac'
    }

    svg.attr('viewBox', `0 0 ${W} ${H}`)
    svg.append('path').attr('d', arc as never).attr('fill', 'rgba(255,255,255,0.06)')
      .attr('transform', `translate(${cx},${cy})`)
    svg.append('path').attr('d', fillArc as never)
      .attr('fill', fillColor)
      .attr('transform', `translate(${cx},${cy})`)
    svg.append('text').attr('x', cx).attr('y', cy - 10).attr('text-anchor', 'middle')
      .attr('font-size', 26).attr('font-weight', 700)
      .attr('font-family', 'Inter, sans-serif').attr('fill', 'var(--text)')
      .text(typeof value === 'number' ? value.toFixed(value >= 10 ? 0 : 2) : value)
    svg.append('text').attr('x', cx).attr('y', cy + 10).attr('text-anchor', 'middle')
      .attr('font-size', 10).attr('font-family', 'Inter, sans-serif').attr('fill', 'var(--text-3)')
      .text(`${unit} · ${label}`)
  }, [value, min, max, accent, warnAt, dangerAt, colorValue, label, unit])
  return <svg ref={ref} style={{ width: 160, height: 106 }} />
}

// ── Live chart (Recharts) ──────────────────────────────────────────────
function LiveChart({ history, accent, sessionStart }: { history: Pt[]; accent: string; sessionStart: number }) {
  const display = history.slice(-300).map(p => ({
    t:        p.t,
    speed:    +p.speed.toFixed(1),
    g_force:  +p.g_force.toFixed(3),
    lateral_g: +p.lateral_g.toFixed(3),
  }))

  if (display.length < 2) {
    return (
      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Waiting for data…</span>
      </div>
    )
  }

  const baseT  = sessionStart
  const domainEnd = baseT + DURATION_S * 1000
  const ticks  = Array.from({ length: 16 }, (_, i) => baseT + i * 1000)
  const tickFormatter = (val: number) => `${((val - baseT) / 1000).toFixed(0)}s`

  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={display} margin={{ top: 8, right: 44, bottom: 4, left: 28 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="t" type="number" domain={[baseT, domainEnd]} ticks={ticks} tickFormatter={tickFormatter} tick={{ fontSize: '0.625rem', fill: '#a1a1a6' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
        <YAxis yAxisId="speed" domain={[0, 105]} tick={{ fontSize: '0.625rem', fill: accent }} tickLine={false} axisLine={false} width={28} />
        <YAxis yAxisId="g"     domain={[-2.2, 2.2]} orientation="right" tick={{ fontSize: '0.625rem', fill: '#ef4444' }} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border-mid)', borderRadius: 8, fontSize: '0.75rem' }}
          labelFormatter={v => `${((+v - baseT) / 1000).toFixed(1)}s`}
          formatter={(val, name) => [
            name === 'speed' ? `${val} mph` : `${val}g`,
            name === 'speed' ? 'Speed' : name === 'g_force' ? 'Long. G-force' : 'Lat. G-force',
          ]}
        />
        <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#a1a1a6' }}
          formatter={(name) => name === 'speed' ? 'Speed' : name === 'g_force' ? 'Long. G-force' : 'Lat. G-force'}
        />
        <Area yAxisId="speed" type="monotone" dataKey="speed" stroke={accent} fill={`${accent}18`} strokeWidth={2} dot={false} name="speed" isAnimationActive={false} />
        <Line  yAxisId="g"     type="monotone" dataKey="g_force" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 2" dot={false} name="g_force" isAnimationActive={false} />
        <Line  yAxisId="g"     type="monotone" dataKey="lateral_g" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 3" dot={false} name="lateral_g" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Drive history ──────────────────────────────────────────────────────
const RISK_COLOR = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' } as const

function DriveHistory({ history }: { history: DriveRecord[] }) {
  if (history.length === 0) return null
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.08em', marginBottom: 8 }}>
        LAST {history.length} DRIVE{history.length > 1 ? 'S' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {history.map(r => (
          <div key={r.driveNum} style={{
            display: 'grid', gridTemplateColumns: '24px 60px 1fr 1fr 48px',
            gap: 6, alignItems: 'center', padding: '6px 10px',
            background: 'var(--surface)', borderRadius: 6,
            border: `1px solid var(--border)`, fontSize: '0.75rem',
          }}>
            <span style={{ color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.625rem' }}>#{r.driveNum}</span>
            <span style={{ fontWeight: 700, color: RISK_COLOR[r.risk_category], fontFamily: 'monospace', fontSize: '0.625rem' }}>
              {r.risk_category}
            </span>
            <span style={{ color: 'var(--text-2)', fontFamily: 'monospace' }}>{r.peak_speed_mph} mph</span>
            <span style={{ color: 'var(--text-2)', fontFamily: 'monospace' }}>{r.harsh_events} harsh</span>
            <span style={{ color: RISK_COLOR[r.risk_category], fontFamily: 'monospace', textAlign: 'right', fontWeight: 600 }}>
              {r.premium_delta > 0 ? `+${r.premium_delta}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Risk donut ─────────────────────────────────────────────────────────
function RiskDonut({ category }: { category: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const ref = useRef<SVGSVGElement>(null)
  const score = category === 'LOW' ? 22 : category === 'MEDIUM' ? 58 : 88
  const color = RISK_COLOR[category]
  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const W = 112, H = 112, r = 42, cx = W / 2, cy = H / 2
    // D3 arc: 0 = 12 o'clock, positive = clockwise
    const fullArc = d3.arc<void>().innerRadius(r - 11).outerRadius(r)
      .startAngle(0).endAngle(Math.PI * 2)
    const fillArc = d3.arc<void>().innerRadius(r - 11).outerRadius(r)
      .startAngle(0).endAngle((score / 100) * Math.PI * 2)
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    svg.append('path').attr('d', fullArc as never).attr('fill', 'rgba(255,255,255,0.06)').attr('transform', `translate(${cx},${cy})`)
    svg.append('path').attr('d', fillArc as never).attr('fill', color).attr('transform', `translate(${cx},${cy})`)
    svg.append('text').attr('x', cx).attr('y', cy + 6).attr('text-anchor', 'middle')
      .attr('font-size', 12).attr('font-weight', 800).attr('font-family', 'monospace').attr('fill', color)
      .text(category)
    svg.append('text').attr('x', cx).attr('y', cy + 19).attr('text-anchor', 'middle')
      .attr('font-size', 9).attr('font-family', 'Inter, sans-serif').attr('fill', 'var(--text-3)')
      .text(`${score} / 100`)
  }, [category, color, score])
  return <svg ref={ref} style={{ width: 112, height: 112 }} />
}
function ReportCard({ report, accent, onReset }: { report: Report; accent: string; onReset: () => void }) {
  const riskColor = RISK_COLOR[report.risk_category]
  const rows = [
    { label: 'Peak Speed',    value: `${report.peak_speed_mph} mph` },
    { label: 'Peak Long. G',   value: `${report.peak_decel_g.toFixed(2)}g` },
    { label: 'Peak Lat. G',    value: `${report.peak_lateral_g.toFixed(2)}g` },
    { label: 'Harsh Events',  value: String(report.harsh_events) },
    { label: 'Event Rate',    value: `${report.rate_per_min}/min` },
    { label: 'Session Time',  value: `${report.duration_s}s` },
  ]
  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both' }}>

      {/* ── Top row: donut left, stats grid right ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 14 }}>

        {/* Donut + risk label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <RiskDonut category={report.risk_category} />
          <div style={{ fontSize: '1rem', fontWeight: 800, color: riskColor, letterSpacing: '0.08em', fontFamily: 'monospace', marginTop: 4, whiteSpace: 'nowrap' }}>
            {report.risk_category} RISK
          </div>
          {report.premium_delta > 0 && (
            <div style={{ fontSize: '0.625rem', color: 'var(--text-3)', marginTop: 2 }}>
              <span style={{ color: riskColor, fontWeight: 700 }}>+{report.premium_delta}%</span> premium
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', flexShrink: 0 }} />

        {/* Stats grid */}
        <div style={{ flex: '0 0 auto', display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 32px' }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-2)', minWidth: 72, flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onReset} style={{
        display: 'block', margin: '0 auto', maxWidth: 220,
        padding: '10px 28px', borderRadius: 8, border: `1px solid ${accent}`,
        background: 'none', color: accent, fontSize: '0.875rem', fontWeight: 600,
        fontFamily: 'var(--font)', cursor: 'pointer', letterSpacing: '0.04em',
      }}>
        ↺ Drive Again
      </button>
    </div>
  )
}

// ── Control button ─────────────────────────────────────────────────────
function CtrlBtn({
  label, sublabel, color, active, onDown, onUp, wide,
}: {
  label: string; sublabel?: string; color: string; active: boolean
  onDown: () => void; onUp: () => void; wide?: boolean
}) {
  return (
    <button
      onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={e => { e.preventDefault(); onDown() }} onTouchEnd={onUp}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); onDown() } }}
      onKeyUp={e =>   { if  (e.key === 'Enter' || e.key === ' ')               { e.preventDefault(); onUp()   } }}
      style={{
        padding: wide ? '12px 0' : '10px 0', borderRadius: 10, border: `1.5px solid ${active ? color : 'var(--border)'}`,
        background: active ? `${color}20` : 'var(--surface)', color: active ? color : 'var(--text-2)',
        fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font)', cursor: 'pointer',
        transition: 'all 0.08s', userSelect: 'none', touchAction: 'none',
        width: wide ? '100%' : undefined, flex: wide ? undefined : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      }}
    >
      <span>{label}</span>
      {sublabel && <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>{sublabel}</span>}
    </button>
  )
}

// ── Main demo ──────────────────────────────────────────────────────────
export default function TelematicsDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [phase,        setPhase]        = useState<Phase>('idle')
  const [showHow,      setShowHow]      = useState(false)
  const [timeLeft,     setTimeLeft]     = useState(DURATION_S)
  const [speed,        setSpeed]        = useState(0)
  const [history,      setHistory]      = useState<Pt[]>([])
  const [lastEvent,    setLastEvent]    = useState<string | null>(null)
  const [report,       setReport]       = useState<Report | null>(null)
  const [gForce,       setGForce]       = useState(0)
  const [latG,         setLatG]         = useState(0)
  const [driveHistory, setDriveHistory] = useState<DriveRecord[]>([])
  const [sessionStartMs, setSessionStartMs] = useState(0)

  const { status, lastMessage, connect, send } = useWebSocket(WS_URL)
  // Badge: LIVE once WS is actually connected during a drive, otherwise poll /health
  const [backendReachable, setBackendReachable] = useState(false)
  const backendOnline    = status === 'connected' || backendReachable
  const backendOnlineRef = useRef(false)
  backendOnlineRef.current = status === 'connected'

  // HTTP health-check on mount — no WS connection until drive starts
  useEffect(() => {
    let cancelled = false
    fetch(HEALTH_URL).then(r => { if (!cancelled && r.ok) setBackendReachable(true) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Remove the WS probe on mount (replaced by HTTP health check above)

  // Physics refs — all values the RAF loop needs, no stale closures
  const gasRef       = useRef(false)
  const brakeRef     = useRef(false)
  const steerRef     = useRef(0)
  const speedRef     = useRef(0)
  const prevSpeedRef = useRef(0)   // fix: separate prev-speed from current
  const gForceRef    = useRef(0)   // fix: write here from both WS and local
  const latGRef      = useRef(0)
  const eventsRef    = useRef<Pt[]>([])  // fix: accumulate for offline report
  const phaseRef     = useRef<Phase>('idle')
  const startRef     = useRef(0)
  const rafRef       = useRef(0)
  const prevTsRef    = useRef(0)
  const lastSendRef   = useRef(0)   // throttle WS sends to 20Hz
  const driveCountRef = useRef(0)
  const prevHarshRef  = useRef(false) // debounce: only count harsh event onset

  const [gasActive,   setGasActive]   = useState(false)
  const [brakeActive, setBrakeActive] = useState(false)
  const [steerLeft,   setSteerLeft]   = useState(false)
  const [steerRight,  setSteerRight]  = useState(false)

  // ── Handle WS messages — update refs immediately, state for render ──
  useEffect(() => {
    if (!lastMessage) return
    const msg = JSON.parse(lastMessage)
    if (msg.type === 'telemetry') {
      gForceRef.current = msg.g_force
      latGRef.current   = msg.lateral_g
      setGForce(msg.g_force)
      setLatG(msg.lateral_g)
      if (msg.event) setLastEvent(msg.event)
    } else if (msg.type === 'report') {
      setReport(msg)
      setPhase('ended')
      phaseRef.current = 'ended'
    }
  }, [lastMessage])

  // Track each completed report in drive history (max 5)
  useEffect(() => {
    if (!report) return
    driveCountRef.current += 1
    const record: DriveRecord = { ...report, driveNum: driveCountRef.current }
    setDriveHistory(h => [record, ...h].slice(0, 5))
  }, [report])

  // ── Physics + WS send loop ──
  const tick = useCallback((ts: number) => {
    if (phaseRef.current !== 'running') return
    // Floor dt at 8ms to prevent astronomic G on back-to-back RAF ticks
    const dt = prevTsRef.current
      ? Math.max(0.008, Math.min((ts - prevTsRef.current) / 1000, 0.1))
      : TICK_MS / 1000
    prevTsRef.current = ts

    // Physics — save prev speed BEFORE updating
    const prevSpeed = speedRef.current
    let next = prevSpeed
    if (gasRef.current)        next += 18 * dt                              // constant 0.82G; 0–60 in ~3.3s
    else if (brakeRef.current) next -= (5 + 0.18 * next) * dt            // speed-dependent: ~1G@100mph
    else                       next -= (0.4 + 0.012 * next) * dt         // rolling resistance + aero drag (real-world ~0.04–0.07G)
    next = Math.max(0, Math.min(100, next))
    prevSpeedRef.current = prevSpeed   // store before overwrite
    speedRef.current     = next
    setSpeed(+next.toFixed(1))

    // Time left
    const elapsed = (ts - startRef.current) / 1000
    const left    = Math.max(0, DURATION_S - elapsed)
    setTimeLeft(+left.toFixed(1))

    // Local g-force (offline) — uses prevSpeed, not the already-updated ref
    if (!backendOnlineRef.current) {
      const { g_force, lateral_g } = localGForce(next, prevSpeed, steerRef.current, dt)
      gForceRef.current = g_force
      latGRef.current   = lateral_g
      setGForce(g_force)
      setLatG(lateral_g)
      const isHarsh = g_force < -0.9 || Math.abs(lateral_g) > 0.9
      if (isHarsh && !prevHarshRef.current) {
        const evtType = g_force < -0.9 ? 'HARSH_BRAKE' : 'HARSH_TURN'
        setLastEvent(evtType)
        devLog('DRIVE', `${evtType} — long_g=${g_force.toFixed(2)}g  lat_g=${lateral_g.toFixed(2)}g  speed=${next.toFixed(0)}mph`)
      }
      prevHarshRef.current = isHarsh
    }

    const now = Date.now()

    // Capture every physics tick into the buffer, unthrottled — this is what the
    // end-of-drive report's peak-G/harsh-event stats are computed from, so it must
    // never drop samples. A ref push is O(1) and stays cheap even at 100Hz+ ingestion.
    const pt: Pt = { t: now, speed: next, g_force: gForceRef.current, lateral_g: latGRef.current }
    eventsRef.current.push(pt)

    // Paint (chart re-render) and the WS send are throttled to 20Hz independently of
    // capture — neither the eye nor the network needs every tick, only the buffer does.
    if (now - lastSendRef.current >= 50) {
      lastSendRef.current = now
      setHistory(h => [...h.slice(-300), pt])
      send({ type: 'update', speed: next, steer: steerRef.current, timestamp: now })
    }

    if (left <= 0) {
      phaseRef.current = 'ended'
      send({ type: 'end_session' })
      if (!backendOnlineRef.current) {
        // Compute real report from accumulated events (recorded at 20Hz)
        const evs     = eventsRef.current
        const gForces = evs.map(e => e.g_force)
        const latGs   = evs.map(e => e.lateral_g)
        const peakDecel   = evs.length ? Math.min(...gForces) : 0
        const peakLateral = evs.length ? Math.max(...latGs.map(Math.abs)) : 0
        const peakSpd     = evs.length ? Math.max(...evs.map(e => e.speed)) : 0

        // Count harsh event onsets only (transition from non-harsh to harsh)
        let harshCount = 0
        let wasHarsh = false
        for (const e of evs) {
          const isHarsh = e.g_force < -0.9 || Math.abs(e.lateral_g) > 0.9
          if (isHarsh && !wasHarsh) harshCount++
          wasHarsh = isHarsh
        }
        const ratePerMin = harshCount / DURATION_S * 60

        let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
        let premiumDelta = 0
        if (peakDecel < -1.0 || ratePerMin > 8)       { risk = 'HIGH';   premiumDelta = 25 }
        else if (peakDecel < -0.8 || ratePerMin > 4)  { risk = 'MEDIUM'; premiumDelta = 10 }

        setReport({
          peak_speed_mph: +peakSpd.toFixed(1),
          peak_decel_g:   +peakDecel.toFixed(3),
          peak_lateral_g: +peakLateral.toFixed(3),
          harsh_events:   harshCount,
          rate_per_min:   +ratePerMin.toFixed(1),
          risk_category:  risk,
          premium_delta:  premiumDelta,
          duration_s:     DURATION_S,
        })
        devLog('DRIVE', `session ended — risk=${risk}  peak_speed=${peakSpd.toFixed(0)}mph  harsh=${harshCount}  premium_delta=${premiumDelta > 0 ? '+' + premiumDelta : 0}%`)
        setPhase('ended')
      }
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [send])  // no stale state deps — everything via refs

  const startDrive = useCallback(() => {
    const now = Date.now()
    connect()
    setPhase('running')
    phaseRef.current  = 'running'
    eventsRef.current = []
    setHistory([])
    setReport(null)
    setLastEvent(null)
    setSpeed(0); setGForce(0); setLatG(0)
    setTimeLeft(DURATION_S)
    setSessionStartMs(now)
    speedRef.current     = 0
    prevSpeedRef.current = 0
    gForceRef.current    = 0
    latGRef.current      = 0
    prevHarshRef.current = false
    lastSendRef.current  = 0
    startRef.current     = performance.now()
    prevTsRef.current    = 0
    devLog('DRIVE', `session started — ${DURATION_S}s · physics: lateral_g = v²/(9.81×100m)`)
    rafRef.current = requestAnimationFrame(tick)
  }, [connect, tick])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Global keyboard controls: WASD / arrow keys while drive is active
  useEffect(() => {
    const GAS_KEYS   = ['ArrowUp',    'w', 'W']
    const BRAKE_KEYS = ['ArrowDown',  's', 'S']
    const LEFT_KEYS  = ['ArrowLeft',  'a', 'A']
    const RIGHT_KEYS = ['ArrowRight', 'd', 'D']

    const down = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'running') return
      if (e.repeat) return
      if (GAS_KEYS.includes(e.key)) {
        e.preventDefault()
        gasRef.current = true; brakeRef.current = false
        setGasActive(true); setBrakeActive(false)
      } else if (BRAKE_KEYS.includes(e.key)) {
        e.preventDefault()
        brakeRef.current = true; gasRef.current = false
        setBrakeActive(true); setGasActive(false)
      } else if (LEFT_KEYS.includes(e.key)) {
        e.preventDefault()
        steerRef.current = -1; setSteerLeft(true)
      } else if (RIGHT_KEYS.includes(e.key)) {
        e.preventDefault()
        steerRef.current = 1; setSteerRight(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (GAS_KEYS.includes(e.key))   { gasRef.current   = false; setGasActive(false)   }
      if (BRAKE_KEYS.includes(e.key)) { brakeRef.current = false; setBrakeActive(false) }
      if (LEFT_KEYS.includes(e.key))  { steerRef.current = 0;     setSteerLeft(false)   }
      if (RIGHT_KEYS.includes(e.key)) { steerRef.current = 0;     setSteerRight(false)  }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const timerColor = timeLeft < 3 ? '#ef4444' : timeLeft < 6 ? '#f59e0b' : accent

  return (
    <div style={{ fontFamily: 'var(--font)', maxWidth: 860 }}>

      {/* Header — connection status + tab toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowHow(false)}
            style={{
              fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: !showHow ? accent : 'var(--surface)',
              color: !showHow ? '#000' : 'var(--text-2)',
              fontWeight: 600, fontFamily: 'var(--font)', letterSpacing: '0.04em',
            }}
          >Demo</button>
          <button
            onClick={() => setShowHow(true)}
            style={{
              fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: showHow ? accent : 'var(--surface)',
              color: showHow ? '#000' : 'var(--text-2)',
              fontWeight: 600, fontFamily: 'var(--font)', letterSpacing: '0.04em',
            }}
          >How it works</button>
        </div>
        {backendOnline && (
          <span style={{
            fontSize: '0.625rem', padding: '2px 8px', borderRadius: 99,
            background: `${accent}22`, border: `1px solid ${accent}`, color: accent,
          }}>● LIVE</span>
        )}
      </div>

      {showHow ? (
        <div className="demo-how">
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>
            Telematics Risk Scoring — how the simulation works
          </p>
          <p>
            The demo runs a real-time physics loop at 60 fps. Each frame computes speed, Long G (braking/acceleration),
            and Lat G (cornering) from your gas/brake/steer inputs, then streams that data over WebSocket to a
            Python backend that scores your driving.
          </p>
          <pre className="code-block">{`// ── Physics loop (60 fps) ──────────────────────────────
each frame(dt):
  if gas_held:   speed += 18 × dt              // constant ~0.82G; 0–60 in ~3.3s  (sports car)
  elif brake_held: speed -= (5 + 0.18×speed) × dt
                                           // speed-dependent braking:
                                           //   100 mph → 23 mph/s → ~1.05G (harsh)
                                           //    80 mph → 19 mph/s → ~0.88G (harsh)
                                           //    60 mph → 16 mph/s → ~0.72G (firm, not harsh)
                                           //    25 mph →  9 mph/s → ~0.42G (normal)
  else:          speed -= (0.4 + 0.012×speed) × dt
                                           // rolling resistance + aero drag
                                           //   60 mph → 1.1 mph/s → ~0.05G  (realistic highway coast)
                                           //  100 mph → 1.6 mph/s → ~0.07G
  speed = clamp(speed, 0, 100)

  longitudinal_g = Δspeed / (dt × 9.81)   // positive = accel, negative = decel
  longitudinal_g = clamp(long_g, −3, +3)

  // Lateral G from centripetal acceleration
  // effective turn radius scales with speed (simulates lighter steering at highway speeds)
  // r = max(100m, speed_ms × 5)  →  100m city, ~134m@60mph, ~179m@80mph, ~224m@100mph
  speed_ms       = speed × 0.447           // mph → m/s
  r              = max(100, speed_ms × 5)
  lateral_g      = speed_ms² / (9.81 × r) × steer_input
  lateral_g      = clamp(lat_g, −1.0, +1.0)  // street-car grip limit

// ── Harsh-event detection ──────────────────────────────
each sample (20 Hz):
  harsh = long_g < −0.9                   // emergency brake  (>0.9G, ~85+ mph braking)
       || |lat_g| > 0.9                   // sharp corner (>0.9G lateral, ~93+ mph full steer)

  if harsh && !was_harsh: harsh_count++   // count onsets only
  was_harsh = harsh

// ── Risk scoring (end of session) ─────────────────────
rate_per_min = harsh_count / duration × 60

if peak_decel < −1.0 || rate_per_min > 8:  risk = HIGH   (+25%)
elif peak_decel < −0.8 || rate_per_min > 4: risk = MEDIUM (+10%)
else:                                        risk = LOW    (+0%)`}</pre>
          <p>
            When the backend is reachable the raw telemetry is sent via WebSocket and the server returns
            the final <code>report</code> object. When offline the same scoring
            logic runs entirely in the browser from the accumulated 20 Hz event log.
          </p>
          <p className="demo-stack-note">
            Stack: React · requestAnimationFrame physics · WebSocket (FastAPI/Python) · D3 sparkline · inline SVG arc gauges
          </p>
        </div>
      ) : (
        <>
          {phase === 'ended' && report ? (
            <>
              {/* Session chart preserved above report */}
              <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 4px', marginBottom: 16 }}>
                <LiveChart history={history} accent={accent} sessionStart={sessionStartMs} />
              </div>
              <ReportCard report={report} accent={accent} onReset={startDrive} />
            </>
          ) : (
        <div className="demo-two-col">

          {/* Left: gauges + event flash + chart */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Gauges — cockpit card */}
            <div style={{
              background: 'rgba(0,0,0,0.28)', borderRadius: 14,
              border: '1px solid var(--border)', padding: '14px 8px 6px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <ArcGauge value={speed}            min={0} max={100} label="Speed"  unit="mph" accent={accent} warnAt={75}  dangerAt={90}  />
                <ArcGauge value={gForce < 0 ? Math.abs(gForce) : 0} min={0} max={1.2} label="Long. G-force" unit="G"   accent={accent} warnAt={0.5} dangerAt={0.8} />
                <ArcGauge value={Math.abs(latG)}   min={0} max={1.0} label="Lat. G-force"  unit="G"   accent={accent} warnAt={0.5} dangerAt={0.9} />
              </div>
            </div>

            {/* Event flash */}
            <div style={{
              height: 22, textAlign: 'center',
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
              color: '#ef4444', fontFamily: 'monospace',
              opacity: lastEvent ? 1 : 0, transition: 'opacity 0.3s',
            }}>
              {lastEvent ? `⚠ ${lastEvent.replace('_', ' ')}` : ''}
            </div>

            {/* Live chart */}
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 4px' }}>
              <LiveChart history={history} accent={accent} sessionStart={sessionStartMs} />
            </div>

          </div>

          {/* Right: controls sidebar */}
          <div className="demo-two-col__sidebar" style={{ justifyContent: 'center' }}>
            {phase === 'idle' ? (
              <>
                <div style={{
                  fontSize: '0.625rem', fontFamily: 'monospace', letterSpacing: '0.06em',
                  color: 'var(--text-3)', textAlign: 'center', marginBottom: 6,
                }}>
                  15-second session
                </div>
                <button onClick={startDrive} style={{
                  padding: '14px 0', borderRadius: 10, width: '100%',
                  background: accent, border: 'none', color: '#000',
                  fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  letterSpacing: '0.08em', fontFamily: 'var(--font)',
                  boxShadow: `0 0 28px ${accent}55`,
                }}>
                  ▶ Start Drive
                </button>
              </>
            ) : (
              <>
                {/* Session countdown — inside controls, not floating in header */}
                <div style={{
                  textAlign: 'center', fontFamily: 'monospace',
                  fontSize: '1.75rem', fontWeight: 800,
                  color: timerColor, transition: 'color 0.3s',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {timeLeft.toFixed(1)}s
                </div>
                <CtrlBtn label="⬆ GAS" sublabel="hold" color={accent} active={gasActive}
                  onDown={() => { gasRef.current = true; brakeRef.current = false; setGasActive(true); setBrakeActive(false) }}
                  onUp={()   => { gasRef.current = false; setGasActive(false) }}
                  wide
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <CtrlBtn label="◀ LEFT" color={accent} active={steerLeft}
                    onDown={() => { steerRef.current = -1; setSteerLeft(true) }}
                    onUp={()   => { steerRef.current = 0; setSteerLeft(false) }}
                  />
                  <CtrlBtn label="RIGHT ▶" color={accent} active={steerRight}
                    onDown={() => { steerRef.current = 1; setSteerRight(true) }}
                    onUp={()   => { steerRef.current = 0; setSteerRight(false) }}
                  />
                </div>
                <CtrlBtn label="⬇ BRAKE" sublabel="hold" color="#ef4444" active={brakeActive}
                  onDown={() => { brakeRef.current = true; gasRef.current = false; setBrakeActive(true); setGasActive(false) }}
                  onUp={()   => { brakeRef.current = false; setBrakeActive(false) }}
                  wide
                />
                <p className="a11y-note" style={{ marginTop: 4, textAlign: 'center',
                  fontSize: '0.625rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Keyboard: W/↑ gas<br/>S/↓ brake · A/D steer
                </p>
              </>
            )}
          </div>

        </div>
          )}
          <DriveHistory history={driveHistory} />
        </>
      )}
    </div>
  )
}
