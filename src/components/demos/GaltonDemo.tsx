import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme, COLOR_THEMES } from '../../contexts/ThemeContext'
import { devLog } from '../../lib/devLog'
import { API_HTTP_BASE } from '../../lib/apiConfig'

const API_URL      = `${API_HTTP_BASE}/api/galton/stats`
const ROWS_DEF     = 12
const BEAD_R       = 6     // smaller — pegs (diamonds) visually read larger at same radius
const PEG_R        = 7
const DROP_MS_BASE = 5000
const BIAS_COLOR   = '#fb923c'   // orange — biased ball type

type BeadPath = {
  born: number
  progress: number    // 0..1, incremented per RAF frame; avoids batch-land on speed change
  waypoints: { x: number; y: number }[]
  bin: number
  biased: boolean
  choices: boolean[]
  prevSegIdx: number  // last segment index — used to detect peg crossings each frame
}

type Stats = { total: number; mean: number; variance: number; stdDev: number }
type TheoPoint = { bin: number; freq: number }
type AnomalyItem = { bin: number; z: number }

// UI labels stay as-is; internals remapped so each step feels perceptibly different
function remapSpeed(s: number): number {
  const map: Record<number, number> = { 0.5: 0.6, 1: 1.0, 2: 1.7, 4: 2.5 }
  return map[s] ?? s
}

// ── Maths helpers ────────────────────────────────────────────────────────────
function pegX(r: number, rows: number, c: number, binW: number): number {
  return (c + (rows - r) / 2 + 0.5) * binW
}

function binomialProb(n: number, k: number, p = 0.5): number {
  if (k < 0 || k > n) return 0
  if (p <= 0) return k === 0 ? 1 : 0
  if (p >= 1) return k === n ? 1 : 0
  let logC = 0
  const m = Math.min(k, n - k)
  for (let i = 0; i < m; i++) logC += Math.log(n - i) - Math.log(i + 1)
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p))
}

function mkTheo(rows: number, p: number): TheoPoint[] {
  return Array.from({ length: rows + 1 }, (_, k) => ({ bin: k, freq: binomialProb(rows, k, p) }))
}

function mkWaypoints(
  rows: number, choices: boolean[],
  W: number, topY: number, pegAreaH: number, histTopY: number,
): { x: number; y: number }[] {
  const binW = W / (rows + 1)
  const rowH = pegAreaH / (rows + 1)
  const pts: { x: number; y: number }[] = []

  pts.push({ x: W / 2, y: topY - BEAD_R - 2 })  // spawn at funnel mouth, not funnel top

  let c = 0
  for (let r = 0; r < rows; r++) {
    const px = pegX(r, rows, c, binW)
    const pyCtr = topY + (r + 1) * rowH
    pts.push({ x: px, y: pyCtr - PEG_R - BEAD_R })
    if (choices[r]) c++
  }

  pts.push({ x: (c + 0.5) * binW, y: histTopY + 6 })
  return pts
}

function gravityT(t: number): number {
  return t * t
}

function calcStats(counts: number[]): Stats {
  const total = counts.reduce((s, v) => s + v, 0)
  if (total === 0) return { total: 0, mean: 0, variance: 0, stdDev: 0 }
  const mean = counts.reduce((s, v, i) => s + v * i, 0) / total
  const variance = counts.reduce((s, v, i) => s + v * (i - mean) ** 2, 0) / total
  return { total, mean, variance, stdDev: Math.sqrt(variance) }
}

function calcAnomalies(counts: number[], stats: Stats): AnomalyItem[] {
  if (stats.stdDev === 0 || stats.total < 20) return []
  return counts.flatMap((cnt, i) => {
    const z = (i - stats.mean) / stats.stdDev
    return Math.abs(z) >= 2.5 && cnt > 0 ? [{ bin: i, z }] : []
  })
}

// ── Canvas helpers ───────────────────────────────────────────────────────────
function drawSphere(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number, r: number, color: string,
  glowRadius = r * 1.4,
) {
  // Outer glow (tighter than before)
  if (glowRadius > 0) {
    const glow = ctx.createRadialGradient(bx, by, 0, bx, by, glowRadius)
    glow.addColorStop(0, color + '55')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(bx, by, glowRadius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.save()
  ctx.beginPath()
  ctx.arc(bx, by, r, 0, Math.PI * 2)
  ctx.clip()
  // Base colour fill
  ctx.fillStyle = color
  ctx.fillRect(bx - r, by - r, r * 2, r * 2)
  // Shadow (bottom-right)
  const shadow = ctx.createRadialGradient(bx + r * 0.28, by + r * 0.32, r * 0.15, bx, by, r)
  shadow.addColorStop(0, 'transparent')
  shadow.addColorStop(0.5, 'transparent')
  shadow.addColorStop(1, 'rgba(0,0,0,0.68)')
  ctx.fillStyle = shadow
  ctx.fillRect(bx - r, by - r, r * 2, r * 2)
  // Primary specular (top-left)
  const sx = bx - r * 0.3, sy = by - r * 0.3
  const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.55)
  spec.addColorStop(0, 'rgba(255,255,255,0.95)')
  spec.addColorStop(0.4, 'rgba(255,255,255,0.30)')
  spec.addColorStop(1, 'transparent')
  ctx.fillStyle = spec
  ctx.fillRect(bx - r, by - r, r * 2, r * 2)
  // Secondary rim light (bottom-left, subtle)
  const rx2 = bx - r * 0.55, ry2 = by + r * 0.5
  const rim = ctx.createRadialGradient(rx2, ry2, 0, rx2, ry2, r * 0.4)
  rim.addColorStop(0, 'rgba(255,255,255,0.18)')
  rim.addColorStop(1, 'transparent')
  ctx.fillStyle = rim
  ctx.fillRect(bx - r, by - r, r * 2, r * 2)
  ctx.restore()
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  pts: TheoPoint[],
  color: string,
  dash: number[],
  binW: number,
  histTopY: number,
  histAreaH: number,
  barMaxH: number,
  maxFreq: number,
) {
  if (pts.length < 3 || maxFreq === 0) return
  ctx.save()
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash(dash)
  pts.forEach(({ bin, freq }, i) => {
    const bx = (bin + 0.5) * binW
    const cy = histTopY + histAreaH - 14 - (freq / maxFreq) * barMaxH
    i === 0 ? ctx.moveTo(bx, cy) : ctx.lineTo(bx, cy)
  })
  ctx.stroke()
  ctx.setLineDash([])
  pts.forEach(({ bin, freq }) => {
    const bx = (bin + 0.5) * binW
    const cy = histTopY + histAreaH - 14 - (freq / maxFreq) * barMaxH
    ctx.beginPath()
    ctx.arc(bx, cy, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = color.slice(0, 7) + 'aa'
    ctx.fill()
  })
  ctx.restore()
}

// ── Main draw function ───────────────────────────────────────────────────────
function drawBoard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  rows: number,
  fairCounts: number[],
  biasCounts: number[],
  bias: number,
  beads: BeadPath[],
  accent: string,
  stats: Stats | null,
  biasStats: Stats | null,
  theoretical: TheoPoint[],
  biasCurve: TheoPoint[],
  anomalies: AnomalyItem[],
  pegHitTimes: number[][],
  hitNow: number,
  bgColor: string,
  surfaceColor: string,
) {
  const compareMode = bias !== 0.5
  const topPad    = 52
  const botPad    = 22
  const usableH   = H - topPad - botPad
  const pegAreaH  = usableH * 0.60
  const histAreaH = usableH * 0.40
  const histTopY  = topPad + pegAreaH
  const histBotY  = histTopY + histAreaH
  const binCount  = rows + 1
  const binW      = W / binCount

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  // Peg field bg
  const pegBg = ctx.createLinearGradient(0, topPad, 0, histTopY)
  pegBg.addColorStop(0, 'rgba(255,255,255,0.008)')
  pegBg.addColorStop(1, 'rgba(255,255,255,0.015)')
  ctx.fillStyle = pegBg
  ctx.fillRect(0, topPad, W, pegAreaH)

  // ── Histogram area ──────────────────────────────────────────────────────
  ctx.fillStyle = surfaceColor
  ctx.fillRect(0, histTopY, W, histAreaH + botPad)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillRect(0, histTopY, W, 1)

  // Bin dividers
  for (let b = 1; b < binCount; b++) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)'
    ctx.fillRect(b * binW, histTopY, 1, histAreaH - 10)
  }

  // Bars
  const maxCount = compareMode
    ? Math.max(1, ...fairCounts, ...biasCounts)
    : Math.max(1, ...fairCounts)
  const barMaxH  = histAreaH - 18
  const anomalySet = new Set(anomalies.map(a => a.bin))

  for (let b = 0; b < binCount; b++) {
    if (compareMode) {
      const subW = (binW - 3) / 2
      const bx = b * binW

      const fairCnt = fairCounts[b] ?? 0
      if (fairCnt > 0) {
        const barH = (fairCnt / maxCount) * barMaxH
        const by = histTopY + histAreaH - 14 - barH
        ctx.fillStyle = accent + 'bb'
        ctx.fillRect(bx + 1, by, subW, barH)
        ctx.fillStyle = accent
        ctx.fillRect(bx + 1, by, subW, 2)
      }

      const biasCnt = biasCounts[b] ?? 0
      if (biasCnt > 0) {
        const barH = (biasCnt / maxCount) * barMaxH
        const by = histTopY + histAreaH - 14 - barH
        ctx.fillStyle = BIAS_COLOR + 'aa'
        ctx.fillRect(bx + 1 + subW + 1, by, subW, barH)
        ctx.fillStyle = BIAS_COLOR
        ctx.fillRect(bx + 1 + subW + 1, by, subW, 2)
      }
    } else {
      const cnt = fairCounts[b] ?? 0
      if (cnt === 0) continue
      const barH = (cnt / maxCount) * barMaxH
      const bx = b * binW
      const by = histTopY + histAreaH - 14 - barH
      const isAnomaly = anomalySet.has(b)
      ctx.fillStyle = isAnomaly ? 'rgba(248,113,113,0.70)' : accent + 'bb'
      ctx.fillRect(bx + 1, by, binW - 2, barH)
      ctx.fillStyle = isAnomaly ? '#f87171' : accent
      ctx.fillRect(bx + 1, by, binW - 2, 2)
    }
  }

  // Theoretical curves — only once beads have landed
  const hasData = fairCounts.some(c => c > 0)
  if (hasData) {
    const maxTheoFair = theoretical.length ? Math.max(...theoretical.map(t => t.freq)) : 1
    const maxTheoAll  = compareMode
      ? Math.max(maxTheoFair, ...biasCurve.map(t => t.freq))
      : maxTheoFair
    drawCurve(ctx, theoretical, accent + 'cc', [],       binW, histTopY, histAreaH, barMaxH, maxTheoAll)
    if (compareMode) {
      drawCurve(ctx, biasCurve, BIAS_COLOR + 'cc', [4, 3], binW, histTopY, histAreaH, barMaxH, maxTheoAll)
    }
  }

  // Legend (compare mode)
  if (compareMode) {
    const lx = W - 8
    const ly = histTopY + 10
    ctx.save()
    ctx.font = '8px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = accent
    ctx.fillRect(lx - 24, ly - 6, 16, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('p=0.50', lx - 28, ly)
    ctx.fillStyle = BIAS_COLOR
    ctx.fillRect(lx - 24, ly + 8, 16, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(`p=${bias.toFixed(2)}`, lx - 28, ly + 14)
    ctx.restore()
  }

  // Bin labels
  ctx.font = '9px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let b = 0; b < binCount; b++) {
    ctx.fillText(`${b}`, (b + 0.5) * binW, H - 5)
  }
  // Axis label
  ctx.font = '7px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fillText('BIN', 3, H - 5)

  // Mean marker — fair
  if (stats && stats.total >= 10) {
    const meanX = (stats.mean + 0.5) * binW
    ctx.save()
    ctx.strokeStyle = '#f59e0b88'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(meanX, histTopY + 6)
    ctx.lineTo(meanX, histBotY - 10)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#f59e0b'
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`μ=${stats.mean.toFixed(1)}`, meanX, histTopY + 14)
    ctx.restore()
  }

  // Mean marker — biased
  if (compareMode && biasStats && biasStats.total >= 10) {
    const meanX = (biasStats.mean + 0.5) * binW
    ctx.save()
    ctx.strokeStyle = BIAS_COLOR + '88'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(meanX, histTopY + 6)
    ctx.lineTo(meanX, histBotY - 10)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = BIAS_COLOR
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`μ=${biasStats.mean.toFixed(1)}`, meanX, histTopY + 24)
    ctx.restore()
  }

  // ── Count badge per bin — flat circle with count ─────────────────────
  if (!compareMode) {
    const badgeR = Math.max(9, Math.min(14, Math.floor(binW * 0.25)))
    for (let b = 0; b < binCount; b++) {
      const cnt = fairCounts[b] ?? 0
      if (cnt === 0) continue
      const bx = (b + 0.5) * binW
      const by = histBotY - 14 - badgeR
      ctx.save()
      ctx.beginPath()
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fill()
      ctx.strokeStyle = accent + 'cc'
      ctx.lineWidth = 1.5
      ctx.stroke()
      const fontSize = Math.round(badgeR * (cnt >= 100 ? 0.55 : cnt >= 10 ? 0.72 : 0.88))
      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = accent
      ctx.fillText(`${cnt}`, bx, by)
      ctx.textBaseline = 'alphabetic'
      ctx.restore()
    }
  }

  // ── Funnel ────────────────────────────────────────────────────────────
  const funnelTopY = 4
  const funnelBotY = topPad - 2
  const halfTopW   = Math.min(W * 0.22, 90)
  const halfBotW   = BEAD_R + 3

  ctx.beginPath()
  ctx.moveTo(W / 2 - halfTopW, funnelTopY)
  ctx.lineTo(W / 2 + halfTopW, funnelTopY)
  ctx.lineTo(W / 2 + halfBotW, funnelBotY)
  ctx.lineTo(W / 2 - halfBotW, funnelBotY)
  ctx.closePath()
  ctx.fillStyle = accent + '14'
  ctx.fill()

  ctx.strokeStyle = accent + '80'
  ctx.lineWidth   = 1.5
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.beginPath()
  ctx.moveTo(W / 2 - halfTopW, funnelTopY)
  ctx.lineTo(W / 2 - halfBotW, funnelBotY)
  ctx.moveTo(W / 2 + halfTopW, funnelTopY)
  ctx.lineTo(W / 2 + halfBotW, funnelBotY)
  ctx.stroke()

  // ── Active beads in flight ────────────────────────────────────────────
  for (const bead of beads) {
    const t = bead.progress
    const nSeg = bead.waypoints.length - 1
    if (nSeg < 1) continue
    const tScaled = gravityT(t) * nSeg
    const segIdx  = Math.min(Math.floor(tScaled), nSeg - 1)
    const segT    = tScaled - segIdx
    const wp0 = bead.waypoints[segIdx]
    const wp1 = bead.waypoints[segIdx + 1]
    const col = bead.biased ? BIAS_COLOR : accent

    // Quadratic bezier: peg-to-peg = bounce arc (ctrl up), entry/exit = fall arc (ctrl down)
    const midX    = (wp0.x + wp1.x) / 2
    const midY    = (wp0.y + wp1.y) / 2
    const segH    = Math.abs(wp1.y - wp0.y)
    const isPegToPeg = segIdx > 0 && segIdx < nSeg - 1
    const ctrlY   = isPegToPeg ? midY - segH * 0.12 : midY + segH * 0.42
    const u = 1 - segT
    const bx = u*u * wp0.x + 2*u*segT * midX  + segT*segT * wp1.x
    const by = u*u * wp0.y + 2*u*segT * ctrlY + segT*segT * wp1.y

    drawSphere(ctx, bx, by, BEAD_R, col)
  }

  // ── Pegs drawn last — always on top ──────────────────────────────────
  const rowH = pegAreaH / (rows + 1)
  for (let r = 0; r < rows; r++) {
    const pyCtr = topPad + (r + 1) * rowH
    for (let c = 0; c <= r; c++) {
      const px = pegX(r, rows, c, binW)

      // Hit flash — ring burst that radiates outward from behind/around the peg
      const hitAge = hitNow - (pegHitTimes[r]?.[c] ?? -Infinity)
      if (hitAge >= 0 && hitAge < 260) {
        const fadeIn  = hitAge < 30 ? hitAge / 30 : 1
        const fadeOut = 1 - hitAge / 260
        const alpha   = fadeIn * fadeOut * 0.32
        const flashR  = PEG_R * (1.8 + (hitAge / 260) * 3.0)
        // Ring: transparent inside peg, soft blue-tinted rim, fades outward
        const flash   = ctx.createRadialGradient(px, pyCtr, PEG_R * 0.7, px, pyCtr, flashR)
        flash.addColorStop(0,    'transparent')
        flash.addColorStop(0.15, `rgba(180,210,255,${alpha})`)
        flash.addColorStop(0.5,  `rgba(140,185,255,${alpha * 0.45})`)
        flash.addColorStop(1,    'transparent')
        ctx.fillStyle = flash
        ctx.beginPath()
        ctx.arc(px, pyCtr, flashR, 0, Math.PI * 2)
        ctx.fill()
      }

      // Peg glow (subtle, reduced radius)
      const pegGlow = ctx.createRadialGradient(px, pyCtr, 0, px, pyCtr, PEG_R + 3)
      pegGlow.addColorStop(0,   'rgba(180,200,255,0.18)')
      pegGlow.addColorStop(1,   'transparent')
      ctx.fillStyle = pegGlow
      ctx.beginPath()
      ctx.arc(px, pyCtr, PEG_R + 3, 0, Math.PI * 2)
      ctx.fill()

      // Diamond body — metallic gradient
      ctx.beginPath()
      ctx.moveTo(px,          pyCtr - PEG_R)
      ctx.lineTo(px + PEG_R,  pyCtr)
      ctx.lineTo(px,          pyCtr + PEG_R)
      ctx.lineTo(px - PEG_R,  pyCtr)
      ctx.closePath()
      const pegGrad = ctx.createLinearGradient(px - PEG_R, pyCtr - PEG_R, px + PEG_R * 0.4, pyCtr + PEG_R * 0.6)
      pegGrad.addColorStop(0,   '#d8e4ff')
      pegGrad.addColorStop(0.35, '#b8c8f0')
      pegGrad.addColorStop(0.7,  '#7090c8')
      pegGrad.addColorStop(1,    '#3a5088')
      ctx.fillStyle = pegGrad
      ctx.fill()
      // Edge rim
      ctx.strokeStyle = 'rgba(160,190,255,0.55)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Specular highlight (top-left facet)
      ctx.beginPath()
      ctx.moveTo(px,            pyCtr - PEG_R)
      ctx.lineTo(px + PEG_R * 0.55, pyCtr - PEG_R * 0.05)
      ctx.lineTo(px,            pyCtr - PEG_R * 0.15)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fill()

      // Small specular dot
      ctx.beginPath()
      ctx.arc(px - PEG_R * 0.18, pyCtr - PEG_R * 0.32, PEG_R * 0.18, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.80)'
      ctx.fill()
    }
  }
}

// ── Main component ───────────────────────────────────────────────────────────
const DEMO_BTN_BASE: React.CSSProperties = {
  padding: '0.375rem 0.875rem', borderRadius: '0.4375rem', border: 'none',
  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font)', letterSpacing: '0.04em',
}

export default function GaltonDemo() {
  const { colorTheme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  const [showHow,     setShowHow]     = useState(false)
  const [rows,        setRows]        = useState(ROWS_DEF)
  const [speed,       setSpeed]       = useState(1.0)
  const [beadRate,    setBeadRate]    = useState(2)
  const [bias,        setBias]        = useState(0.5)
  const [dropping,    setDropping]    = useState(false)
  const [stats,       setStats]       = useState<Stats>({ total: 0, mean: 0, variance: 0, stdDev: 0 })
  const [biasStats,   setBiasStats]   = useState<Stats>({ total: 0, mean: 0, variance: 0, stdDev: 0 })
  const [anomalies,   setAnomalies]   = useState<AnomalyItem[]>([])
  const [theoretical, setTheoretical] = useState<TheoPoint[]>(() => mkTheo(ROWS_DEF, 0.5))
  const [biasCurve,   setBiasCurve]   = useState<TheoPoint[]>(() => mkTheo(ROWS_DEF, 0.5))

  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef(0)
  const beadsRef       = useRef<BeadPath[]>([])
  const fairCountsRef  = useRef<number[]>(new Array(ROWS_DEF + 1).fill(0))
  const biasCountsRef  = useRef<number[]>(new Array(ROWS_DEF + 1).fill(0))
  const accentRef      = useRef(accent)
  const rowsRef        = useRef(ROWS_DEF)
  const speedRef       = useRef(1.0)
  const beadRateRef    = useRef(2)   // kept in sync with beadRate state
  const biasRef        = useRef(0.5)
  const droppingRef    = useRef(false)
  const spawnTimer     = useRef<ReturnType<typeof setInterval> | null>(null)
  const spawnNext      = useRef<'fair' | 'biased'>('fair')
  const statsRef       = useRef<Stats>({ total: 0, mean: 0, variance: 0, stdDev: 0 })
  const biasStatsRef   = useRef<Stats>({ total: 0, mean: 0, variance: 0, stdDev: 0 })
  const theoreticalRef = useRef(theoretical)
  const biasCurveRef   = useRef(biasCurve)
  const anomaliesRef   = useRef<AnomalyItem[]>([])
  const lastStatCall   = useRef(0)
  const pegHitTimesRef = useRef<number[][]>(
    Array.from({ length: 16 }, () => new Array(16).fill(-Infinity))
  )

  useEffect(() => { accentRef.current   = accent    }, [accent])
  useEffect(() => { speedRef.current    = speed     }, [speed])
  useEffect(() => { beadRateRef.current = beadRate  }, [beadRate])

  useEffect(() => {
    const theo = mkTheo(rows, 0.5)
    theoreticalRef.current = theo
    setTheoretical(theo)
    const bc = mkTheo(rows, biasRef.current)
    biasCurveRef.current = bc
    setBiasCurve(bc)
  }, [rows])

  useEffect(() => {
    biasRef.current = bias
    const bc = mkTheo(rowsRef.current, bias)
    biasCurveRef.current = bc
    setBiasCurve(bc)
    // Reset biased counts when p changes so comparison starts fresh
    biasCountsRef.current = new Array(rowsRef.current + 1).fill(0)
    biasStatsRef.current  = { total: 0, mean: 0, variance: 0, stdDev: 0 }
    setBiasStats({ total: 0, mean: 0, variance: 0, stdDev: 0 })
    spawnNext.current = 'fair'
  }, [bias])

  const fetchStats = useCallback(async (counts: number[], rowCount: number) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts, rows: rowCount }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.theoretical?.length) {
        theoreticalRef.current = data.theoretical
        setTheoretical(data.theoretical)
      }
      devLog('GALTON', `backend stats: μ=${data.mean} σ=${data.std_dev}`)
    } catch { /* backend offline — use local stats */ }
  }, [])

  const landBead = useCallback((bin: number, biased: boolean) => {
    if (biased) {
      biasCountsRef.current[bin] = (biasCountsRef.current[bin] ?? 0) + 1
      const s = calcStats(biasCountsRef.current)
      biasStatsRef.current = s
      setBiasStats(s)
    } else {
      fairCountsRef.current[bin] = (fairCountsRef.current[bin] ?? 0) + 1
      const s = calcStats(fairCountsRef.current)
      statsRef.current = s
      setStats(s)
      const anoms = calcAnomalies(fairCountsRef.current, s)
      anomaliesRef.current = anoms
      setAnomalies(anoms)
      if (s.total - lastStatCall.current >= 30) {
        lastStatCall.current = s.total
        fetchStats([...fairCountsRef.current], rowsRef.current)
      }
    }
  }, [fetchStats])

  const spawnBead = useCallback(() => {
    if (!droppingRef.current) return
    // Dynamic cap: enough beads to keep steady flow without crowding
    // = ceil(fallDuration × rate) + 1 safety slot, hard-capped at 12
    const dropMs   = DROP_MS_BASE / remapSpeed(speedRef.current)
    const maxBeads = Math.min(12, Math.ceil(dropMs * beadRateRef.current / 1000) + 1)
    if (beadsRef.current.length >= maxBeads) return
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const pegAreaH = (H - 74) * 0.60   // must match drawBoard: topPad(52) + botPad(22)
    const histTopY = 52 + pegAreaH

    const isBiased = biasRef.current !== 0.5 && spawnNext.current === 'biased'
    if (biasRef.current !== 0.5) {
      spawnNext.current = spawnNext.current === 'fair' ? 'biased' : 'fair'
    }
    const p = isBiased ? biasRef.current : 0.5
    const choices = Array.from({ length: rowsRef.current }, () => Math.random() < p)
    const bin = choices.filter(Boolean).length
    const wps = mkWaypoints(rowsRef.current, choices, W, 52, pegAreaH, histTopY)

    beadsRef.current = [
      ...beadsRef.current,
      { born: performance.now(), progress: 0, waypoints: wps, bin, biased: isBiased, choices, prevSegIdx: 0 },
    ]
    devLog('GALTON', `bead → bin ${bin} (p=${p})`)
  }, [])

  // RAF loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let lastW = -1, lastH = -1
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      if (w === lastW && h === lastH) return  // avoid redundant bitmap reset/clear
      lastW = w; lastH = h
      canvas.width  = w * devicePixelRatio
      canvas.height = h * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let prevRafTs = 0

    const draw = (rafNow: DOMHighResTimeStamp) => {
      const dt     = prevRafTs > 0 ? Math.min(rafNow - prevRafTs, 80) : 16.67  // cap at 80ms
      prevRafTs    = rafNow
      const W      = canvas.offsetWidth
      const H      = canvas.offsetHeight
      const dropMs = DROP_MS_BASE / remapSpeed(speedRef.current)

      const root       = document.querySelector('.theme-root') as HTMLElement | null
      const style      = root ? getComputedStyle(root) : null
      const bgColor    = style?.getPropertyValue('--bg').trim()      || '#03050d'
      const surfaceColor = style?.getPropertyValue('--surface').trim() || '#070b14'

      const stillFlying: BeadPath[] = []
      for (const bead of beadsRef.current) {
        bead.progress = Math.min(1, bead.progress + dt / dropMs)
        if (bead.progress >= 1) {
          landBead(bead.bin, bead.biased)
        } else {
          // Detect which peg(s) the bead just crossed this frame
          const nSeg    = bead.waypoints.length - 1
          const tScaled = gravityT(bead.progress) * nSeg
          const segIdx  = Math.min(Math.floor(tScaled), nSeg - 1)
          if (segIdx > bead.prevSegIdx) {
            for (let k = bead.prevSegIdx + 1; k <= segIdx; k++) {
              if (k >= 1 && k <= rowsRef.current) {
                const pegRow = k - 1
                let pegCol = 0
                for (let i = 0; i < pegRow; i++) { if (bead.choices[i]) pegCol++ }
                pegHitTimesRef.current[pegRow][pegCol] = rafNow
              }
            }
            bead.prevSegIdx = segIdx
          }
          stillFlying.push(bead)
        }
      }
      beadsRef.current = stillFlying

      drawBoard(
        ctx, W, H, rowsRef.current,
        fairCountsRef.current, biasCountsRef.current, biasRef.current,
        beadsRef.current, accentRef.current,
        statsRef.current, biasStatsRef.current,
        theoreticalRef.current, biasCurveRef.current,
        anomaliesRef.current,
        pegHitTimesRef.current, rafNow,
        bgColor, surfaceColor,
      )

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [landBead])

  const startDropping = useCallback(() => {
    droppingRef.current = true
    setDropping(true)
    if (spawnTimer.current) clearInterval(spawnTimer.current)
    spawnBead()  // spawn one immediately so there's no initial dead wait
    spawnTimer.current = setInterval(spawnBead, 1000 / beadRate)
  }, [spawnBead, beadRate])

  const stopDropping = useCallback(() => {
    droppingRef.current = false
    setDropping(false)
    if (spawnTimer.current) { clearInterval(spawnTimer.current); spawnTimer.current = null }
  }, [])

  const reset = useCallback(() => {
    stopDropping()
    beadsRef.current      = []
    fairCountsRef.current = new Array(rowsRef.current + 1).fill(0)
    biasCountsRef.current = new Array(rowsRef.current + 1).fill(0)
    pegHitTimesRef.current = Array.from({ length: 16 }, () => new Array(16).fill(-Infinity))
    statsRef.current      = { total: 0, mean: 0, variance: 0, stdDev: 0 }
    biasStatsRef.current  = { total: 0, mean: 0, variance: 0, stdDev: 0 }
    anomaliesRef.current  = []
    lastStatCall.current  = 0
    spawnNext.current     = 'fair'
    setStats({ total: 0, mean: 0, variance: 0, stdDev: 0 })
    setBiasStats({ total: 0, mean: 0, variance: 0, stdDev: 0 })
    setAnomalies([])
  }, [stopDropping])

  const handleRows = useCallback((v: number) => {
    rowsRef.current = v
    setRows(v)
    reset()
  }, [reset])

  const handleBeadRate = useCallback((v: number) => {
    setBeadRate(v)
    if (droppingRef.current) {
      if (spawnTimer.current) clearInterval(spawnTimer.current)
      spawnTimer.current = setInterval(spawnBead, 1000 / v)
    }
  }, [spawnBead])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (spawnTimer.current) clearInterval(spawnTimer.current)
  }, [])

  const compareMode = bias !== 0.5

  const tiles = compareMode
    ? [
        { label: 'COUNT (p=0.5)',             value: stats.total.toLocaleString(),                           color: accent },
        { label: `COUNT (p=${bias.toFixed(2)})`, value: biasStats.total.toLocaleString(),                    color: BIAS_COLOR },
        { label: 'MEAN  (fair)',              value: stats.total > 0 ? stats.mean.toFixed(2) : '—',          color: '#f59e0b' },
        { label: 'MEAN  (bias)',              value: biasStats.total > 0 ? biasStats.mean.toFixed(2) : '—',  color: BIAS_COLOR },
      ]
    : [
        { label: 'COUNT',    value: stats.total.toLocaleString(),                        color: accent },
        { label: 'MEAN',     value: stats.total > 0 ? stats.mean.toFixed(2) : '—',      color: '#f59e0b' },
        { label: 'STD DEV',  value: stats.total > 0 ? stats.stdDev.toFixed(2) : '—',    color: 'rgba(80,180,255,0.9)' },
        { label: 'VARIANCE', value: stats.total > 0 ? stats.variance.toFixed(2) : '—',  color: 'rgba(255,175,50,0.8)' },
      ]

  return (
    <div style={{ fontFamily: 'var(--font)', maxWidth: 860 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
        <button onClick={() => setShowHow(false)} style={{
          ...DEMO_BTN_BASE, padding: '0.1875rem 0.625rem',
          background: !showHow ? accent : 'var(--surface)',
          color: !showHow ? '#000' : 'var(--text-2)',
        }}>Demo</button>
        <button onClick={() => setShowHow(true)} style={{
          ...DEMO_BTN_BASE, padding: '0.1875rem 0.625rem',
          background: showHow ? accent : 'var(--surface)',
          color: showHow ? '#000' : 'var(--text-2)',
        }}>How it works</button>
      </div>

      {showHow ? (
        <div className="demo-how">
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>
            Galton Board — Binomial distribution to normal curve
          </p>
          <p>
            Each bead hits a peg and bounces left or right with probability <em>p</em>.
            With a fair split (p=0.5) the result is a symmetric <strong>Binomial(n, 0.5)</strong>.
            Change the bias and the distribution shifts — showing exactly how a skewed process
            breaks the bell curve assumption used in A/B tests and actuarial models.
          </p>
          <pre className="code-block">{`// ── Per bead ─────────────────────────────────────────────
choices = [rand() < p for _ in range(rows)]        // p = bias
bin     = sum(choices)                              // 0 … rows

// ── Fair split  (p = 0.5) ────────────────────────────────
P(k) = C(n,k) × 0.5^n          mean = n/2,  var = n/4

// ── Biased split (p ≠ 0.5) ───────────────────────────────
P(k) = C(n,k) × p^k × (1-p)^(n-k)
mean = n·p             var = n·p·(1-p)
// Higher p → distribution shifts right, narrows slightly
// Lower  p → shifts left, same narrowing effect

// ── Anomaly detection ────────────────────────────────────
z_score(bin) = (bin − mean) / std_dev
// |z| ≥ 2.5 → bin highlighted red (outlier)`}</pre>
          <p className="demo-stack-note">
            Stack: React · Canvas 2D · requestAnimationFrame · FastAPI stats endpoint (optional)
          </p>
        </div>
      ) : (
        <div className="demo-two-col">

          {/* ── Canvas ───────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, maxWidth: 580, display: 'flex', flexDirection: 'column' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', flex: '1 1 0', height: 'calc(100svh - 17rem)', display: 'block', borderRadius: '0.5rem',
                border: '1px solid var(--border)', background: 'var(--bg)' }}
              aria-label="Galton board simulation"
              role="img"
            />
          </div>

          {/* ── Right sidebar ────────────────────────────────────── */}
          <div className="demo-two-col__sidebar" style={{ maxHeight: 'calc(100svh - 17rem)', overflowY: 'hidden' }}>

            {/* ── Action buttons — top ──────────────────────────────── */}
            <div className="demo-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flexShrink: 0 }}>
              {dropping ? (
                <button onClick={stopDropping} style={{ ...DEMO_BTN_BASE, width: '100%', padding: '0.625rem 0',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#ef4444' }}>
                  ⏹ Stop
                </button>
              ) : (
                <button onClick={startDropping} style={{ ...DEMO_BTN_BASE, width: '100%', padding: '0.75rem 0',
                  background: accent, color: '#000', fontSize: '0.8125rem', fontWeight: 800,
                  boxShadow: `0 0 1rem ${accent}44` }}>
                  ▶ Drop Beads
                </button>
              )}
              <button onClick={reset} style={{ ...DEMO_BTN_BASE, width: '100%', padding: '0.4375rem 0',
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                ↺ Reset
              </button>
            </div>

            {/* ── CONTROLS card — parameters, grows to fill ──────── */}
            <div style={{
              flex: 1,
              background: 'var(--surface)', borderRadius: '0.625rem',
              border: '1px solid var(--border-mid)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '0.4375rem 0.75rem 0.375rem', borderBottom: '1px solid var(--border)' }}>
                <span className="demo-card-header">CONTROLS</span>
              </div>

              <div style={{ padding: '0.625rem 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

                {/* Rows */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1875rem' }}>
                    <span className="demo-controls__label">Rows</span>
                    <span className="demo-controls__value">{rows}</span>
                  </div>
                  <input type="range" min={6} max={15} step={1} value={rows}
                    onChange={e => handleRows(+e.target.value)}
                    style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
                    aria-label={`Rows: ${rows}`}
                  />
                </div>

                {/* Speed + Drop/s */}
                {([
                  { label: 'Speed',  options: [0.5, 1, 2, 4]   as number[], val: speed,    set: setSpeed },
                  { label: 'Drop/s', options: [1, 2, 3, 5]   as number[], val: beadRate, set: (v: number) => handleBeadRate(v) },
                ] as const).map(({ label, options, val, set }) => (
                  <div key={label}>
                    <div className="demo-controls__label" style={{ marginBottom: '0.3125rem' }}>{label}</div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {(options as readonly number[]).map(v => (
                        <button key={v} onClick={() => set(v as never)} style={{
                          flex: 1, padding: '0.25rem 0', borderRadius: '0.3125rem', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                          border: `1px solid ${val === v ? accent : 'var(--border)'}`,
                          background: val === v ? `${accent}22` : 'var(--card)',
                          color: val === v ? accent : 'var(--text-2)',
                          transition: 'all 0.1s',
                        }}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Bias p */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1875rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.625rem',
                      color: compareMode ? BIAS_COLOR : 'var(--text-2)' }}>Bias (p)</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 600,
                      color: compareMode ? BIAS_COLOR : 'var(--text)' }}>
                      {bias === 0.5 ? '0.50 (fair)' : bias.toFixed(2)}
                    </span>
                  </div>
                  <input type="range" min={0.30} max={0.70} step={0.05} value={bias}
                    onChange={e => setBias(+e.target.value)}
                    style={{ width: '100%', accentColor: compareMode ? BIAS_COLOR : accent, cursor: 'pointer' }}
                    aria-label={`Bias probability (p): ${bias}`}
                  />
                </div>

                {compareMode && (
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
                    <span style={{ color: accent }}>■</span> p=0.5 vs{' '}
                    <span style={{ color: BIAS_COLOR }}>■</span> p={bias.toFixed(2)} —{' '}
                    {bias > 0.5
                      ? `${((bias - 0.5) * 100).toFixed(0)}% right`
                      : `${((0.5 - bias) * 100).toFixed(0)}% left`}
                  </p>
                )}
              </div>
            </div>

            {/* ── OUTPUT card — stats ──────────────────────────────── */}
            <div style={{
              background: '#07071a', borderRadius: '0.625rem',
              border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{ padding: '0.4375rem 0.75rem 0.375rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="demo-card-header">OUTPUT</span>
              </div>
              <div style={{ padding: '0.625rem 0.75rem 0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.375rem' }}>
                  {tiles.map(({ label, value, color }) => (
                    <div key={label} className="stat-tile">
                      <div className="stat-tile__label">{label}</div>
                      <div className="stat-tile__value" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                {!compareMode && anomalies.length > 0 && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(248,113,113,0.15)' }}>
                    <div style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: '#f87171',
                      letterSpacing: '0.1em', marginBottom: '0.375rem' }}>ANOMALIES |z|≥2.5σ</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {anomalies.map(({ bin, z }) => (
                        <span key={bin} style={{
                          fontSize: '0.5625rem', fontFamily: 'monospace', padding: '0.125rem 0.375rem',
                          borderRadius: 99, background: 'rgba(248,113,113,0.12)',
                          border: '1px solid rgba(248,113,113,0.3)', color: '#f87171',
                        }}>
                          b{bin} z={z > 0 ? '+' : ''}{z.toFixed(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
