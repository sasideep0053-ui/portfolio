import { useEffect, useRef, useState } from 'react'
import { useTheme, COLOR_THEMES } from '../contexts/ThemeContext'
import { devLog } from '../lib/devLog'

// ── Rendering modes ────────────────────────────────────────────────────────────
// spiral   : rotating Archimedean spiral bands, slow fade reveal (blue)
// waves    : flowing sine ribbons, reveal bottom→up (demonslayer water breathing)
// elements : 8×9 element-symbol grid, 4-quadrant reveal (atla)
// grimoire : concentric rotating magic circles + pentagram, radial reveal (blackclover)
// domain   : scattered cursed-kanji static + 茈 flash, venetian-blind reveal (jjk)
const THEME_CONFIGS = {
  blue:        { mode: 'spiral'   as const },
  aot:         { mode: 'ruins'    as const },  // flickering static block grid, gates reveal
  hxh:         { mode: 'nen'      as const },  // radial aura burst from center, circle reveal
  demonslayer: { mode: 'waves'    as const },
  atla:        { mode: 'elements' as const },
  blackclover: { mode: 'grimoire' as const },
  jjk:         { mode: 'domain'   as const },  // rotating cursed circle rings, full-canvas reveal
} as const

const CHAR_SZ     = 9
const GHOST_ALPHA = 0.13
const FADE_OUT_MS = 600

const RUNE_CHARS = ['ᚠ','ᚨ','ᚱ','ᛞ','✦','⟡','⬡','᛭','✴','ᚹ']
const JJK_CHARS  = ['呪','術','廻','戦','虚','式','茈','赫','領','域']
const ELEM_SYMS  = ['水','火','土','風']
const ELEM_RGBS: [number,number,number][] = [
  [ 56, 189, 248],  // water — blue
  [251, 146,  60],  // fire  — orange
  [101, 163,  13],  // earth — green
  [250, 204,  21],  // air   — yellow
]

type Pixels = Uint8ClampedArray

interface NenParticle  { x:number; y:number; vx:number; vy:number; r:number; alpha:number; pulse:number }
interface Wave         { y:number; amp:number; freq:number; phase:number; speed:number; lineW:number; alpha:number }
interface CursedParticle { x:number; y:number; char:string; size:number; life:number; maxLife:number; alpha:number }

function hexToRgb(hex: string): [number,number,number] {
  const n = parseInt(hex.replace('#',''), 16)
  return [(n>>16)&255, (n>>8)&255, n&255]
}
function brightness(px: Pixels, col: number, row: number, cols: number, rows: number): number {
  const c = Math.round(col), r = Math.round(row)
  if (c < 0 || c >= cols || r < 0 || r >= rows) return 0
  const i = (r * cols + c) * 4
  const lum = px[i]*0.299 + px[i+1]*0.587 + px[i+2]*0.114
  const raw = (lum/255) * (px[i+3]/255)
  return Math.max(0, Math.min(1, (raw-0.5)*2.4+0.5))
}
function computeSobel(px: Pixels, cols: number, rows: number): Float32Array {
  const edges = new Float32Array(cols * rows)
  const lum = (r: number, c: number) => {
    const i = (Math.max(0,Math.min(rows-1,r))*cols + Math.max(0,Math.min(cols-1,c)))*4
    return (px[i]*0.299 + px[i+1]*0.587 + px[i+2]*0.114)/255
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const gx = -lum(r-1,c-1)-2*lum(r,c-1)-lum(r+1,c-1)+lum(r-1,c+1)+2*lum(r,c+1)+lum(r+1,c+1)
      const gy = -lum(r-1,c-1)-2*lum(r-1,c)-lum(r-1,c+1)+lum(r+1,c-1)+2*lum(r+1,c)+lum(r+1,c+1)
      edges[r*cols+c] = Math.min(1, Math.sqrt(gx*gx+gy*gy)*2.2)
    }
  return edges
}

export default function MatrixPortrait({
  src, width = 500, height = 620,
}: { src?: string; width?: number; height?: number }) {
  const { theme, colorTheme } = useTheme()
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const themeRef     = useRef(theme)
  const accentRef    = useRef(COLOR_THEMES[colorTheme].accent)
  const startRainRef = useRef<(()=>void)|null>(null)
  const stopRainRef  = useRef<(()=>void)|null>(null)

  const [hovered,   setHovered]   = useState(false)
  const [revealing, setRevealing] = useState(false)
  const autoRevealedRef = useRef(false)

  useEffect(() => { themeRef.current  = theme },                           [theme])
  useEffect(() => { accentRef.current = COLOR_THEMES[colorTheme].accent }, [colorTheme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reset reveal state so each theme change plays the full animation fresh
    autoRevealedRef.current = false
    setRevealing(false)

    canvas.width  = width
    canvas.height = height

    const cfg  = THEME_CONFIGS[colorTheme] ?? THEME_CONFIGS.blue
    const cols = Math.floor(width  / CHAR_SZ)
    const rows = Math.floor(height / CHAR_SZ)
    const cx   = width  / 2
    const cy   = height / 2

    let px: Pixels|null            = null
    let edgeMap: Float32Array|null = null
    let img: HTMLImageElement|null = null
    let drawCoords = { sx:0, sy:0, sw:width, sh:height }
    let animId = 0, running = false, fadingOut = false
    let revealTriggered = false
    let stopTimer = 0, autoRevealTimer = 0

    // Touch devices tend to have weaker GPUs for canvas filter/shadowBlur work —
    // halve the frame rate there so it's smoother instead of janky, at the cost
    // of the animation itself playing at half speed.
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    let frameCount = 0
    // shadowBlur is the single most expensive Canvas 2D primitive here — skip
    // the glow entirely on touch devices rather than paying for it every frame.
    const glow = (px: number) => isTouchDevice ? 0 : px

    // ── Column state ───────────────────────────────────────────────────────
    const drops   = Array.from({length:cols}, (_,i) => -Math.random()*rows*0.2 - i*0.1)
    const revealY = new Array<number>(cols).fill(0)

    // ── Waves state (demonslayer) ──────────────────────────────────────────
    const makeWave = (i: number, total: number): Wave => ({
      y:     (height * (i + 0.5)) / total,
      amp:   10 + Math.random() * 28,
      freq:  0.006 + Math.random() * 0.009,
      phase: Math.random() * Math.PI * 2,
      speed: 0.013 + Math.random() * 0.012,
      lineW: 1 + Math.random() * 3.5,
      alpha: 0.18 + Math.random() * 0.48,
    })
    const WAVE_COUNT = 16
    let wavesList: Wave[] = Array.from({length: WAVE_COUNT}, (_, i) => makeWave(i, WAVE_COUNT))
    let waveFrame = 0

    // ── Elements state (atla) ──────────────────────────────────────────────
    let elementFrame = 0

    // ── Orbit state (reused for grimoire frame counter) ────────────────────
    let orbitFrame   = 0
    let grimoireAngles = [0, Math.PI / 8, Math.PI / 5]

    // Grimoire ring definitions
    const GRIMOIRE_RINGS = [
      { radius: 55,  speed:  0.018, runeCount: 5,  fontSize: 13, lineAlpha: 0.45 },
      { radius: 115, speed: -0.012, runeCount: 8,  fontSize: 11, lineAlpha: 0.32 },
      { radius: 178, speed:  0.008, runeCount: 10, fontSize: 10, lineAlpha: 0.24 },
    ]

    // ── Ruins state (aot) ─────────────────────────────────────────────────
    let ruinsFrame = 0
    const makeNenParticle = (): NenParticle => ({
      x:     Math.random() * width,
      y:     Math.random() * height,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    -(0.3 + Math.random() * 0.7),
      r:     1.2 + Math.random() * 3.5,
      alpha: 0.3  + Math.random() * 0.65,
      pulse: Math.random() * Math.PI * 2,
    })
    let nenParticles: NenParticle[] = Array.from({length: 160}, makeNenParticle)
    let nenFrame = 0

    // domain frame counter (jjk)
    let flashFrame = 0
    let cursedParticles: CursedParticle[] = []

    // ── Spiral state (blue) ───────────────────────────────────────────────
    let spiralPath1: Path2D | null = null
    let spiralPath2: Path2D | null = null
    let spiralPhase = 0
    let spiralFrame = 0

    ctx.textAlign = 'left'

    // ── Ghost ──────────────────────────────────────────────────────────────
    const drawGhost = () => {
      if (!img) return
      const {sx,sy,sw,sh} = drawCoords
      const [ar,ag,ab] = hexToRgb(accentRef.current)
      ctx.clearRect(0,0,width,height)
      ctx.filter      = 'grayscale(1) brightness(0.45) contrast(0.85)'
      ctx.globalAlpha = GHOST_ALPHA
      ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height)
      ctx.filter      = 'none'
      ctx.globalCompositeOperation = 'source-atop'
      ctx.globalAlpha = 0.18
      ctx.fillStyle   = `rgb(${ar},${ag},${ab})`
      ctx.fillRect(0,0,width,height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    // ── Tick ───────────────────────────────────────────────────────────────
    const tick = () => {
      if (!running) return
      if (isTouchDevice) {
        frameCount++
        if (frameCount % 2 !== 0) { animId = requestAnimationFrame(tick); return }
      }
      const [ar,ag,ab] = hexToRgb(accentRef.current)

      // ── SPIRAL (blue) — rotating Archimedean spiral ─────────────────────────
      if (cfg.mode === 'spiral') {
        spiralFrame++
        ctx.fillStyle = 'rgba(6,6,10,1)'; ctx.fillRect(0,0,width,height)

        // Lazy-init two interleaved spiral paths centered at origin
        if (!spiralPath1) {
          const TURNS = 22
          const mR = Math.sqrt(cx*cx + cy*cy) * 1.10
          const b  = mR / (Math.PI * 2 * TURNS)
          spiralPath1 = new Path2D(); spiralPath2 = new Path2D()
          let f1 = true, f2 = true
          for (let th = 3; th <= TURNS * Math.PI * 2 + 3; th += 0.06) {
            const r = b * th
            if (f1) { spiralPath1.moveTo(Math.cos(th)*r, Math.sin(th)*r); f1=false }
            else      spiralPath1.lineTo(Math.cos(th)*r, Math.sin(th)*r)
            if (f2) { spiralPath2.moveTo(Math.cos(th+Math.PI)*r, Math.sin(th+Math.PI)*r); f2=false }
            else      spiralPath2.lineTo(Math.cos(th+Math.PI)*r, Math.sin(th+Math.PI)*r)
          }
        }
        const mR2 = Math.sqrt(cx*cx + cy*cy) * 1.10
        const lw  = (mR2 / (Math.PI * 2 * 22)) * Math.PI * 0.60
        spiralPhase += 0.016
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(spiralPhase); ctx.lineCap = 'butt'
        ctx.lineWidth = lw; ctx.shadowBlur = 0
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.72)`
        ctx.stroke(spiralPath1!)
        ctx.strokeStyle = 'rgba(6,6,10,1)'
        ctx.stroke(spiralPath2!)
        ctx.restore()

        // Reveal: photo fades in over frames 200→300
        if (img && !revealTriggered) {
          const {sx,sy,sw,sh} = drawCoords
          const fadeA = Math.max(0, Math.min(0.92, (spiralFrame - 200) / 100 * 0.92))
          if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
          if (spiralFrame >= 300 && !revealTriggered) {
            revealTriggered = true; autoRevealedRef.current = true
            running = false; setRevealing(true)
            devLog('SYSTEM', 'spiral decoded — identity revealed'); return
          }
        }

      // ── RUINS (aot) — flickering static block grid (chars stay in place, pulse) ──
      } else if (cfg.mode === 'ruins') {
        ruinsFrame++
        ctx.fillStyle = 'rgba(6,6,10,0.10)'; ctx.fillRect(0,0,width,height)

        if (!fadingOut) {
          const RUINS_CHARS = '█▓▒░▪◼▫▤▥'
          ctx.font = `${CHAR_SZ}px monospace`
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const rawB  = px ? brightness(px, col, row, cols, rows) : 0.25 + Math.random()*0.4
              const edge  = edgeMap ? edgeMap[row*cols+col] : 0
              const phase = col * 0.43 + row * 0.72
              const flick = 0.18 + 0.68 * Math.abs(Math.sin(ruinsFrame * 0.016 + phase))
              const b     = Math.min(1, (rawB + edge * 0.55) * flick)
              if (b < 0.04) continue
              const ci = Math.floor((1 - b) * (RUINS_CHARS.length - 0.01))
              ctx.fillStyle = `rgba(${ar},${ag},${ab},${b * 0.82})`
              ctx.fillText(RUINS_CHARS[ci], col * CHAR_SZ, (row + 1) * CHAR_SZ)
            }
          }
        }

        // Reveal: fade in after 180 frames
        if (img && !revealTriggered && ruinsFrame > 180) {
          const {sx,sy,sw,sh} = drawCoords
          const fadeA = Math.max(0, Math.min(0.92, (ruinsFrame - 180) / 120 * 0.92))
          if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
          if (ruinsFrame >= 300 && !revealTriggered) {
            revealTriggered = true; autoRevealedRef.current = true
            running = false; setRevealing(true)
            devLog('SYSTEM', 'walls fall — identity revealed'); return
          }
        }

      // ── NEN (hxh) — floating nen-aura particle field ─────────────────────
      } else if (cfg.mode === 'nen') {
        nenFrame++
        ctx.fillStyle = 'rgba(6,6,10,0.045)'; ctx.fillRect(0,0,width,height)

        if (!fadingOut) {
          for (const p of nenParticles) {
            p.x += p.vx; p.y += p.vy; p.pulse += 0.042
            if (p.y < -p.r * 4)       { p.x = Math.random()*width; p.y = height + p.r }
            if (p.x < -p.r * 4)         p.x = width  + p.r
            if (p.x > width + p.r * 4)  p.x = -p.r
            const fa = p.alpha * (0.55 + 0.45 * Math.sin(p.pulse))
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
            ctx.fillStyle   = `rgba(${ar},${ag},${ab},${fa})`
            ctx.shadowColor = `rgba(${ar},${ag},${ab},0.55)`
            ctx.shadowBlur  = glow(p.r * 3.5)
            ctx.fill()
          }
          // Killua lightning bolt: 3-segment jagged line, fires every ~45 frames
          const lt = nenFrame % 45
          if (lt < 12) {
            const seed = Math.floor(nenFrame / 45)
            const rng  = (n: number) => Math.sin(seed * 127.1 + n * 311.7) * 0.5 + 0.5
            const x0 = width  * (0.25 + rng(0) * 0.5)
            const y0 = height * (rng(1) * 0.3)
            const x1 = x0 + (rng(2) - 0.5) * 120
            const y1 = y0 + height * 0.28
            const x2 = x1 + (rng(3) - 0.5) * 80
            const y2 = y1 + height * 0.28
            const x3 = x2 + (rng(4) - 0.5) * 60
            const y3 = y2 + height * 0.22
            const boltAlpha = Math.sin(lt / 12 * Math.PI) * 0.85
            ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3)
            ctx.strokeStyle = `rgba(255,238,80,${boltAlpha})`
            ctx.lineWidth   = 1.5 + boltAlpha
            ctx.shadowColor = `rgba(255,220,50,0.9)`
            ctx.shadowBlur  = glow(14)
            ctx.stroke()
          }
          ctx.shadowBlur = 0
        }

        // Reveal: fade in after 200 frames (aura dissipates)
        if (img && !revealTriggered && nenFrame > 200) {
          const {sx,sy,sw,sh} = drawCoords
          const fadeA = Math.max(0, Math.min(0.92, (nenFrame - 200) / 100 * 0.92))
          if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
          if (nenFrame >= 300 && !revealTriggered) {
            revealTriggered = true; autoRevealedRef.current = true
            running = false; setRevealing(true)
            devLog('SYSTEM', 'aura sensed — identity revealed'); return
          }
        }

      // ── WAVES (demonslayer) — Water Breathing flowing ribbons ────────────
      } else if (cfg.mode === 'waves') {
        waveFrame++
        ctx.fillStyle = 'rgba(6,6,10,0.05)'; ctx.fillRect(0,0,width,height)

        if (!fadingOut) {
          for (const w of wavesList) {
            ctx.beginPath()
            for (let x = 0; x <= width; x += 3) {
              const y = w.y + Math.sin(x * w.freq + waveFrame * w.speed + w.phase) * w.amp
              if (x === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
            ctx.shadowColor = 'rgba(56,189,248,0.62)'
            ctx.shadowBlur  = glow(4 + w.lineW * 2)
            ctx.strokeStyle = `rgba(56,189,248,${w.alpha})`
            ctx.lineWidth   = w.lineW
            ctx.stroke()
          }
          ctx.shadowBlur = 0
        }

        // Reveal: fade in after 220 frames (water settles)
        if (img && !revealTriggered) {
          const {sx,sy,sw,sh} = drawCoords
          if (waveFrame > 220) {
            const fadeA = Math.max(0, Math.min(0.92, (waveFrame - 220) / 80 * 0.92))
            if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
          }
          if (waveFrame >= 300 && !revealTriggered) {
            revealTriggered = true; autoRevealedRef.current = true
            running = false; setRevealing(true)
            devLog('SYSTEM', 'waters still — identity revealed'); return
          }
        }

      // ── ELEMENTS (atla) — 4-element symbol grid ──────────────────────────
      } else if (cfg.mode === 'elements') {
        elementFrame++
        ctx.fillStyle = 'rgba(6,6,10,0.04)'; ctx.fillRect(0,0,width,height)

        if (!fadingOut) {
          const ECOLS = 8, EROWS = 9
          const cellW = width  / ECOLS
          const cellH = height / EROWS

          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          for (let row = 0; row < EROWS; row++) {
            for (let col = 0; col < ECOLS; col++) {
              // 2×2 tile: water, fire, earth, air
              const elemIdx = (row % 2) * 2 + (col % 2)
              const [er, eg, eb] = ELEM_RGBS[elemIdx]
              const phase   = (col * 1.3 + row * 2.7) * 0.55
              const pulse   = 0.40 + 0.40 * Math.sin(elementFrame * 0.032 + phase)
              const scale   = 0.85 + 0.20 * Math.sin(elementFrame * 0.021 + phase)
              const cellCx  = col * cellW + cellW * 0.5
              const cellCy  = row * cellH + cellH * 0.5
              const fontSize = Math.min(cellW, cellH) * 0.42 * scale

              ctx.save()
              ctx.globalAlpha = Math.max(0, pulse)
              ctx.shadowColor = `rgba(${er},${eg},${eb},0.85)`
              ctx.shadowBlur  = glow(6 + 7 * pulse)
              ctx.font        = `${fontSize}px monospace`
              ctx.fillStyle   = `rgb(${er},${eg},${eb})`
              ctx.fillText(ELEM_SYMS[elemIdx], cellCx, cellCy)
              ctx.restore()
            }
          }
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
          ctx.globalAlpha = 1; ctx.shadowBlur = 0
        }

        // Reveal: fade in after 200 frames
        if (img && !revealTriggered) {
          const {sx,sy,sw,sh} = drawCoords
          const fadeA = Math.max(0, Math.min(0.92, (elementFrame - 200) / 100 * 0.92))
          if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
          if (elementFrame >= 300 && !revealTriggered) {
            revealTriggered = true; autoRevealedRef.current = true
            running = false; setRevealing(true)
            devLog('SYSTEM', 'four nations united — identity revealed'); return
          }
        }

      // ── GRIMOIRE (blackclover) — concentric magic circles + pentagram ──────
      } else if (cfg.mode === 'grimoire') {
        orbitFrame++
        ctx.fillStyle = 'rgba(6,6,10,0.065)'; ctx.fillRect(0,0,width,height)

        if (!fadingOut) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

          for (let ri = 0; ri < GRIMOIRE_RINGS.length; ri++) {
            const ring = GRIMOIRE_RINGS[ri]
            grimoireAngles[ri] += ring.speed
            const angle = grimoireAngles[ri]

            // Draw rotating ring
            ctx.beginPath()
            ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(${ar},${ag},${ab},${ring.lineAlpha})`
            ctx.lineWidth   = 1.5
            ctx.shadowColor = `rgba(${ar},${ag},${ab},0.4)`
            ctx.shadowBlur  = glow(6)
            ctx.stroke()

            // Tick marks between runes
            const ticks = ring.runeCount * 4
            for (let t = 0; t < ticks; t++) {
              const ta = angle + (t / ticks) * Math.PI * 2
              ctx.beginPath()
              ctx.moveTo(cx + Math.cos(ta) * (ring.radius - 4), cy + Math.sin(ta) * (ring.radius - 4))
              ctx.lineTo(cx + Math.cos(ta) * (ring.radius + 4), cy + Math.sin(ta) * (ring.radius + 4))
              ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.28)`
              ctx.lineWidth = 0.8
              ctx.shadowBlur = 0
              ctx.stroke()
            }

            // Rune characters on the ring
            ctx.font = `${ring.fontSize}px monospace`
            for (let i = 0; i < ring.runeCount; i++) {
              const a    = angle + (i / ring.runeCount) * Math.PI * 2
              const x    = cx + Math.cos(a) * ring.radius
              const y    = cy + Math.sin(a) * ring.radius
              const pulse = 0.40 + 0.50 * Math.sin(orbitFrame * 0.038 + i * 1.2)
              ctx.globalAlpha = Math.max(0, pulse)
              ctx.shadowColor = `rgba(${ar},${ag},${ab},0.85)`
              ctx.shadowBlur  = glow(10)
              ctx.fillStyle   = `rgba(${ar},${ag},${ab},${Math.max(0, pulse)})`
              ctx.fillText(RUNE_CHARS[i % RUNE_CHARS.length], x, y)
            }
          }

          // Rotating pentagram in center (5-leaf clover's 5 points)
          const pentR = 42, pentAngle = orbitFrame * 0.010
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const a1 = pentAngle + (i       / 5) * Math.PI * 2 - Math.PI / 2
            const a2 = pentAngle + ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2
            ctx.moveTo(cx + Math.cos(a1) * pentR, cy + Math.sin(a1) * pentR)
            ctx.lineTo(cx + Math.cos(a2) * pentR, cy + Math.sin(a2) * pentR)
          }
          ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.65)`
          ctx.lineWidth   = 1.8
          ctx.shadowColor = `rgba(${ar},${ag},${ab},0.7)`
          ctx.shadowBlur  = glow(14)
          ctx.stroke()

          // Pulsing center dot
          const dotR = 5 + 2 * Math.sin(orbitFrame * 0.06)
          ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
          ctx.fillStyle   = `rgba(${ar},${ag},${ab},0.80)`
          ctx.shadowBlur  = glow(20)
          ctx.fill()

          ctx.shadowBlur = 0; ctx.globalAlpha = 1
          ctx.textAlign  = 'left'; ctx.textBaseline = 'alphabetic'
        }

        // Reveal: fade in after 200 frames
        if (img && !revealTriggered) {
          if (orbitFrame > 200) {
            const {sx,sy,sw,sh} = drawCoords
            const fadeA = Math.max(0, Math.min(0.92, (orbitFrame - 200) / 100 * 0.92))
            if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
            if (orbitFrame >= 300 && !revealTriggered) {
              revealTriggered = true; autoRevealedRef.current = true
              running = false; setRevealing(true)
              devLog('SYSTEM', 'grimoire opened — identity revealed'); return
            }
          }
        }

      // ── DOMAIN (jjk) — scattered cursed-kanji static + 茈 flash ─────────────
      } else if (cfg.mode === 'domain') {
        flashFrame++
        ctx.fillStyle = 'rgba(6,6,10,0.14)'; ctx.fillRect(0,0,width,height)

        if (!fadingOut) {
          for (let i = 0; i < 5; i++) {
            if (cursedParticles.length < 90 && Math.random() < 0.82) {
              cursedParticles.push({
                x: Math.random() * width, y: Math.random() * height,
                char: JJK_CHARS[Math.floor(Math.random() * JJK_CHARS.length)],
                size: 9 + Math.random() * 22, life: 0,
                maxLife: 18 + Math.floor(Math.random() * 42),
                alpha: 0.28 + Math.random() * 0.68,
              })
            }
          }
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          for (let i = cursedParticles.length - 1; i >= 0; i--) {
            const p = cursedParticles[i]; p.life++
            const t = p.life / p.maxLife
            const fade = t < 0.2 ? t/0.2 : t > 0.6 ? 1-(t-0.6)/0.4 : 1
            ctx.font        = `${p.size}px monospace`
            ctx.globalAlpha = p.alpha * fade
            ctx.shadowColor = `rgba(${ar},${ag},${ab},0.85)`
            ctx.shadowBlur  = glow(8 + p.size * 0.3)
            ctx.fillStyle   = `rgba(${ar},${ag},${ab},1)`
            ctx.fillText(p.char, p.x, p.y)
            if (p.life >= p.maxLife) cursedParticles.splice(i, 1)
          }
          // Periodic large 茈 flash at center every ~90 frames
          const ct = flashFrame % 90
          if (ct < 26) {
            const bp = Math.sin(ct / 26 * Math.PI)
            ctx.font = `bold ${68 + 22*bp}px monospace`
            ctx.globalAlpha = bp * 0.55; ctx.shadowBlur = glow(36 * bp)
            ctx.fillText('茈', cx, cy)
          }
          ctx.shadowBlur = 0; ctx.globalAlpha = 1
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
        }

        // Reveal: smooth cross-fade after 220 frames
        if (img && !revealTriggered) {
          const {sx,sy,sw,sh} = drawCoords
          if (flashFrame > 220) {
            const fadeA = Math.max(0, Math.min(0.92, (flashFrame - 220) / 80 * 0.92))
            if (fadeA > 0) { ctx.globalAlpha = fadeA; ctx.drawImage(img, sx,sy,sw,sh, 0,0,width,height); ctx.globalAlpha = 1 }
          }
          if (flashFrame >= 300 && !revealTriggered) {
            revealTriggered = true; autoRevealedRef.current = true
            running = false; setRevealing(true)
            devLog('SYSTEM', 'domain collapsed — identity revealed'); return
          }
        }
      }

      animId = requestAnimationFrame(tick)
    }

    // ── Controls ───────────────────────────────────────────────────────────
    startRainRef.current = () => {
      clearTimeout(stopTimer); clearTimeout(autoRevealTimer)
      // Hovering while intro animation is in progress — skip to reveal immediately
      if (running && !autoRevealedRef.current) {
        revealTriggered = true; autoRevealedRef.current = true
        running = false; cancelAnimationFrame(animId)
        setRevealing(true)
        return
      }
      fadingOut = false; revealTriggered = false; running = true
      orbitFrame = 0; grimoireAngles = [0, Math.PI/8, Math.PI/5]
      waveFrame = 0; elementFrame = 0; flashFrame = 0
      ruinsFrame = 0; nenFrame = 0
      spiralPhase = 0; spiralFrame = 0; spiralPath1 = null; spiralPath2 = null
      cursedParticles = []
      for (let i = 0; i < cols; i++) { drops[i] = -Math.random()*rows*0.2 - i*0.1; revealY[i] = 0 }
      wavesList    = Array.from({length: WAVE_COUNT}, (_, i) => makeWave(i, WAVE_COUNT))
      nenParticles = Array.from({length: 160}, makeNenParticle)
      cancelAnimationFrame(animId)
      setRevealing(false); drawGhost()
      devLog('SYSTEM', autoRevealedRef.current
        ? 'portrait replay — animation restarted'
        : 'portrait hover — animation initiated')
      tick()
    }

    stopRainRef.current = () => {
      clearTimeout(stopTimer); clearTimeout(autoRevealTimer)
      if (!autoRevealedRef.current) {
        // Initial animation still running — let it finish, don't interrupt
        return
      }
      fadingOut = true
      setRevealing(true)
      stopTimer = window.setTimeout(() => { running=false; cancelAnimationFrame(animId) }, FADE_OUT_MS)
    }

    // ── Photo load ─────────────────────────────────────────────────────────
    const loadPhoto = () => {
      if (!src) {
        ctx.fillStyle='#111'; ctx.fillRect(0,0,width,height)
        ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(height*0.55)}px monospace`
        ctx.textAlign='center'; ctx.textBaseline='middle'
        ctx.fillText('SK', width/2, height/2)
        ctx.font=`${CHAR_SZ-1}px monospace`; ctx.textAlign='left'; ctx.textBaseline='alphabetic'
        const off=document.createElement('canvas'); off.width=cols; off.height=rows
        const o=off.getContext('2d')!; o.drawImage(canvas,0,0,width,height,0,0,cols,rows)
        px=o.getImageData(0,0,cols,rows).data; return
      }
      const image = new Image()
      image.onload = () => {
        img = image
        const scale = Math.max(width/img.width, height/img.height)
        const sw=width/scale, sh=height/scale
        const sx=(img.width-sw)/2, sy=(img.height-sh)/2
        drawCoords = {sx,sy,sw,sh}
        const off=document.createElement('canvas'); off.width=cols; off.height=rows
        const o=off.getContext('2d')!
        o.drawImage(img, sx,sy,sw,sh, 0,0,cols,rows)
        px=o.getImageData(0,0,cols,rows).data; edgeMap=computeSobel(px,cols,rows)
        devLog('SYSTEM', `portrait loaded — ${cols}×${rows} grid ready`)
        drawGhost()
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setRevealing(true); autoRevealedRef.current=true
        } else {
          autoRevealTimer = window.setTimeout(() => startRainRef.current?.(), 50)
        }
      }
      image.onerror = () => {
        ctx.fillStyle='#111'; ctx.fillRect(0,0,width,height)
        ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(height*0.55)}px monospace`
        ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('SK',width/2,height/2)
        ctx.font=`${CHAR_SZ-1}px monospace`; ctx.textAlign='left'; ctx.textBaseline='alphabetic'
        const off=document.createElement('canvas'); off.width=cols; off.height=rows
        const o=off.getContext('2d')!; o.fillStyle='#000'; o.fillRect(0,0,cols,rows)
        px=o.getImageData(0,0,cols,rows).data
      }
      image.src = src
    }

    loadPhoto()
    return () => { cancelAnimationFrame(animId); clearTimeout(stopTimer); clearTimeout(autoRevealTimer); running=false }
  }, [src, width, height, colorTheme])

  useEffect(() => { stopRainRef.current?.() }, [theme, colorTheme])

  const handleMouseEnter = () => {
    setHovered(true)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) startRainRef.current?.()
  }
  const handleMouseLeave = () => {
    setHovered(false)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) stopRainRef.current?.()
  }

  return (
    <div className="hero__portrait-outer">
      <div
        className={`hero__portrait-wrap${hovered ? ' hero__portrait-wrap--hovered' : ''}`}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}      onBlur={handleMouseLeave}
        tabIndex={0} role="button"
        aria-label={revealing ? 'Portrait revealed — press Enter to replay' : 'Encrypted portrait — press Enter to reveal'}
        onKeyDown={e => {
          if (e.key==='Enter'||e.key===' ') { e.preventDefault(); revealing ? startRainRef.current?.() : handleMouseEnter() }
        }}
      >
        <canvas ref={canvasRef} className="matrix-portrait" role="img" aria-label="Portrait" />
        {src && (
          <img src={src} alt="Sasideep Kakumani" draggable={false}
            className={`hero__portrait-reveal${revealing ? ' hero__portrait-reveal--visible' : ''}`} />
        )}
      </div>
      <p className="hero__decrypt-label">
        {hovered ? 'decrypting...' : revealing ? '[ hover to replay ]' : '[ hover to reveal ]'}
      </p>
    </div>
  )
}
