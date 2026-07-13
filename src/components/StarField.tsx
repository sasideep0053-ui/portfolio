import { useEffect, useRef } from 'react'
import { useTheme, COLOR_THEMES } from '../contexts/ThemeContext'

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── Mathematical constants ─────────────────────────────────────────────────
// The universe is built on these numbers — sunflowers, galaxies, shells, DNA
const PHI          = (1 + Math.sqrt(5)) / 2         // Golden ratio ≈ 1.61803…
const GOLDEN_ANGLE = Math.PI * 2 / (PHI * PHI)      // ≈ 137.508° — nature's packing angle

interface Star { angle: number; radius: number; size: number; brightness: number; phase: number }

interface Galaxy {
  nx: number; ny: number
  arms:       number
  perArm:     number
  halo:       number
  maxRFactor: number
  flattenY:   number
  turns:      number   // now φ-proportioned
  rotSpeed:   number
  rot:        number
  dimMult:    number
  coreScale:  number
  stars:      Star[]
  maxR:       number
}

// Spiral turns are now multiples of φ — each galaxy follows golden proportions
const GALAXY_DEFS: Omit<Galaxy, 'stars' | 'maxR' | 'rot'>[] = [
  // Large nearby galaxy — arms spaced at golden angle, turns = φ × 1.5
  { nx: 0.34, ny: 0.30, arms: 2, perArm: 150, halo: 90,  maxRFactor: 0.56, flattenY: 0.48, turns: PHI * 1.5,  rotSpeed:  0.00035, dimMult: 1.00, coreScale: 0.09 },
  // Medium — turns = φ (1.618 — single golden ratio)
  { nx: 0.76, ny: 0.70, arms: 3, perArm:  80, halo: 40,  maxRFactor: 0.28, flattenY: 0.55, turns: PHI,        rotSpeed: -0.00065, dimMult: 0.62, coreScale: 0.10 },
  // Small upper-right — turns = φ² (2.618 — square of golden ratio)
  { nx: 0.82, ny: 0.18, arms: 2, perArm:  40, halo: 18,  maxRFactor: 0.13, flattenY: 0.38, turns: PHI * PHI,  rotSpeed:  0.00130, dimMult: 0.38, coreScale: 0.12 },
  // Small lower-left — turns = φ (1.618)
  { nx: 0.12, ny: 0.78, arms: 4, perArm:  30, halo: 14,  maxRFactor: 0.10, flattenY: 0.60, turns: PHI,        rotSpeed: -0.00110, dimMult: 0.30, coreScale: 0.14 },
  // Tiny far galaxy — turns = φ² × 1.0
  { nx: 0.91, ny: 0.44, arms: 2, perArm:  20, halo:  8,  maxRFactor: 0.06, flattenY: 0.42, turns: PHI * PHI,  rotSpeed:  0.00200, dimMult: 0.22, coreScale: 0.16 },
]

function buildStars(def: Omit<Galaxy, 'stars' | 'maxR' | 'rot'>, maxR: number): Star[] {
  const stars: Star[] = []
  for (let arm = 0; arm < def.arms; arm++) {
    // Golden angle spacing between arms — matches how galaxies actually form
    const offset = arm * GOLDEN_ANGLE
    for (let i = 0; i < def.perArm; i++) {
      const t      = i / def.perArm
      const angle  = offset + t * Math.PI * 2 * def.turns
      const r      = t * maxR * (0.88 + Math.random() * 0.12)
      const spread = (Math.random() - 0.5) * 0.32 * (0.15 + t * 1.3)
      stars.push({
        angle:      angle + spread,
        radius:     r,
        size:       (1 - t * 0.50) * (Math.random() * 2.0 + 0.7),
        brightness: (1 - t * 0.45) * (0.32 + Math.random() * 0.48),
        phase:      Math.random() * Math.PI * 2,
      })
    }
  }
  for (let i = 0; i < def.halo; i++) {
    stars.push({
      angle:      Math.random() * Math.PI * 2,
      radius:     Math.random() * maxR * 0.95,
      size:       Math.random() * 1.0 + 0.3,
      brightness: Math.random() * 0.14 + 0.04,
      phase:      Math.random() * Math.PI * 2,
    })
  }
  return stars
}

// Fibonacci sunflower: n seeds placed at golden angle increments.
// Same formula as sunflowers, pinecones, nautilus shells.
function buildFibonacciCluster(
  cx: number, cy: number,
  n: number,
  maxR: number,
): { x: number; y: number; r: number; a: number; phase: number }[] {
  const result = []
  for (let i = 1; i <= n; i++) {
    const angle = i * GOLDEN_ANGLE                    // golden angle step
    const t     = Math.sqrt(i / n)                   // sqrt → uniform area density
    const x     = cx + Math.cos(angle) * t * maxR
    const y     = cy + Math.sin(angle) * t * maxR
    result.push({
      x,
      y,
      r:     0.18 + (1 - t) * 0.55,                 // inner seeds slightly larger
      a:     0.06 + (1 - t) * 0.10,                 // inner seeds brighter
      phase: angle,                                  // phase tied to position
    })
  }
  return result
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { colorTheme, theme } = useTheme()
  const accent = COLOR_THEMES[colorTheme].accent

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const [ar, ag, ab] = hexToRgb(accent)
    const isLight = theme === 'light'

    const sR = isLight ? Math.max(0, ar - 30) : Math.min(255, ar + 115)
    const sG = isLight ? Math.max(0, ag - 30) : Math.min(255, ag + 115)
    const sB = isLight ? Math.max(0, ab - 20) : Math.min(255, ab + 115)
    const bMult = isLight ? 0.62 : 0.90

    let raf: number
    let W = 0, H = 0

    const galaxies: Galaxy[] = GALAXY_DEFS.map(def => ({
      ...def,
      stars: [],
      maxR:  0,
      rot:   Math.random() * Math.PI * 2,
    }))

    interface BgStar { x: number; y: number; r: number; a: number; phase: number }
    let bgStars: BgStar[] = []

    const setup = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      if (!W || !H) return
      canvas.width  = W * devicePixelRatio
      canvas.height = H * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

      const base = Math.max(W, H)
      for (const g of galaxies) {
        g.maxR  = base * g.maxRFactor
        g.stars = buildStars(g, g.maxR)
      }

      bgStars = []

      // ── Fibonacci sunflower clusters at each galaxy center ─────────────
      // Star counts are Fibonacci numbers: 89, 55, 34, 21, 13
      // Cluster radii are φ-scaled fractions of each galaxy's maxR
      const clusterDefs = [
        { gi: 0, n: 89, rFactor: 0.55 },   // 89 seeds — main galaxy
        { gi: 1, n: 55, rFactor: 0.50 },   // 55 seeds — medium galaxy
        { gi: 2, n: 34, rFactor: 0.45 },   // 34 seeds — small upper-right
        { gi: 3, n: 21, rFactor: 0.40 },   // 21 seeds — small lower-left
        { gi: 4, n: 13, rFactor: 0.35 },   // 13 seeds — tiny far galaxy
      ]
      for (const { gi, n, rFactor } of clusterDefs) {
        const g = galaxies[gi]
        bgStars.push(
          ...buildFibonacciCluster(g.nx * W, g.ny * H, n, g.maxR * rFactor),
        )
      }

      // ── Remaining background stars — random fill for full coverage ──────
      // 280 total - (89+55+34+21+13) = 68 random stars
      for (let i = 0; i < 68; i++) {
        bgStars.push({
          x:     Math.random() * W,
          y:     Math.random() * H,
          r:     Math.random() * 0.80 + 0.20,
          a:     Math.random() * 0.20 + 0.05,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    const drawGalaxy = (g: Galaxy, t: number) => {
      const cx = g.nx * W
      const cy = g.ny * H

      const outerA = (isLight ? 0.055 : 0.050) * g.dimMult
      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.maxR * 1.25)
      haze.addColorStop(0,   `rgba(${ar},${ag},${ab},${outerA})`)
      haze.addColorStop(0.4, `rgba(${ar},${ag},${ab},${outerA * 0.4})`)
      haze.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, W, H)

      const pulse     = 0.86 + 0.14 * Math.sin(t * 0.38 + g.rot)
      const coreAlpha = (isLight ? 0.16 : 0.28) * pulse * g.dimMult
      const core      = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.maxR * g.coreScale)
      core.addColorStop(0,   `rgba(${Math.min(255,ar+130)},${Math.min(255,ag+130)},${Math.min(255,ab+130)},${coreAlpha})`)
      core.addColorStop(0.45,`rgba(${ar},${ag},${ab},${coreAlpha * 0.38})`)
      core.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(0, 0, W, H)

      for (const s of g.stars) {
        const a       = s.angle + g.rot
        const x       = cx + Math.cos(a) * s.radius
        const y       = cy + Math.sin(a) * s.radius * g.flattenY
        const twinkle = 0.72 + 0.28 * Math.sin(t + s.phase)
        const alpha   = s.brightness * bMult * twinkle * g.dimMult
        if (alpha < 0.010) continue
        ctx.beginPath()
        ctx.arc(x, y, s.size * (0.88 + 0.12 * twinkle), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sR},${sG},${sB},${alpha})`
        ctx.fill()
      }
    }

    const frame = () => {
      ctx.clearRect(0, 0, W, H)
      const t = Date.now() * 0.0014

      // Background stars (Fibonacci clusters + random fill)
      for (const s of bgStars) {
        const tw    = 0.55 + 0.45 * Math.sin(t * 0.7 + s.phase)
        const alpha = s.a * (isLight ? 0.72 : 1.0) * tw
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sR},${sG},${sB},${alpha})`
        ctx.fill()
      }

      // Galaxies back-to-front
      for (let i = galaxies.length - 1; i >= 0; i--) {
        const g = galaxies[i]
        g.rot += g.rotSpeed
        drawGalaxy(g, t)
      }

      raf = requestAnimationFrame(frame)
    }

    setup()
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { frame() }

    const ro = new ResizeObserver(setup)
    ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [accent, theme])

  return <canvas ref={canvasRef} className="star-field" aria-hidden="true" />
}
