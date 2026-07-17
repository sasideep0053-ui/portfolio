import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Sky }            from 'three/examples/jsm/objects/Sky.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass }     from 'three/examples/jsm/postprocessing/OutputPass.js'

function useClock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

// ── Time keyframes ────────────────────────────────────────────────────────────
const K = [
  { h:  0, elev:-30, tur:0.5, ray:0.5, mie:0.001, gnd:'#0a130e', amb:'#6080b0', ai:1.80, si:0.0, mi:1.40, exp:1.00, bs:0.18, greet:'Good Night'     },
  { h:  5, elev: -3, tur:5,   ray:2.0, mie:0.060, gnd:'#1a100a', amb:'#ffb870', ai:0.80, si:0.3, mi:0.00, exp:0.68, bs:0.20, greet:'Good Morning'   },
  { h:  7, elev: 18, tur:3.0, ray:2.0, mie:0.012, gnd:'#4a7a42', amb:'#e8c870', ai:0.70, si:0.9, mi:0.00, exp:0.74, bs:0.00, greet:'Good Morning'   },
  { h: 12, elev: 38, tur:2.0, ray:1.0, mie:0.005, gnd:'#5a8850', amb:'#f0e8c0', ai:0.65, si:1.5, mi:0.00, exp:0.70, bs:0.00, greet:'Good Afternoon' },
  { h: 17, elev: 20, tur:3.0, ray:1.5, mie:0.008, gnd:'#4a7a42', amb:'#f0c880', ai:0.65, si:1.1, mi:0.00, exp:0.74, bs:0.00, greet:'Good Afternoon' },
  { h: 19, elev:  3, tur:3.5, ray:2.0, mie:0.090, gnd:'#2a1c0c', amb:'#ff9950', ai:0.95, si:0.65, mi:0.00, exp:0.78, bs:0.00, greet:'Good Evening'   },
  { h: 20, elev: -8, tur:2.0, ray:1.0, mie:0.005, gnd:'#0d150a', amb:'#4060a0', ai:0.90, si:0.0, mi:0.60, exp:0.90, bs:0.18, greet:'Good Evening'   },
  { h: 21, elev:-30, tur:0.5, ray:0.5, mie:0.001, gnd:'#0a130e', amb:'#6080b0', ai:1.80, si:0.0, mi:1.40, exp:1.00, bs:0.18, greet:'Good Night'     },
  { h: 24, elev:-30, tur:0.5, ray:0.5, mie:0.001, gnd:'#0a130e', amb:'#6080b0', ai:1.80, si:0.0, mi:1.40, exp:1.00, bs:0.18, greet:'Good Night'     },
]

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpC(a: string,  b: string,  t: number) { return new THREE.Color(a).lerp(new THREE.Color(b), t) }

interface TimeConfig {
  turbidity: number; rayleigh: number; mieCoeff: number
  sunElevDeg: number; sunAzimDeg: number
  groundColor: THREE.Color; ambientColor: THREE.Color
  ambientI: number; sunI: number; moonI: number
  exposure: number; bloomStr: number
  showStars: boolean; greeting: string
}

function getTimeConfig(h: number): TimeConfig {
  let a = K[0], b = K[1]
  for (let i = 0; i < K.length - 1; i++) {
    if (h >= K[i].h && h < K[i + 1].h) { a = K[i]; b = K[i + 1]; break }
  }
  const t  = a.h === b.h ? 0 : (h - a.h) / (b.h - a.h)
  const dp = Math.max(0, Math.min(1, (h - 5.5) / 14.5))
  return {
    turbidity:   lerpN(a.tur,  b.tur,  t),
    rayleigh:    lerpN(a.ray,  b.ray,  t),
    mieCoeff:    lerpN(a.mie,  b.mie,  t),
    sunElevDeg:  lerpN(a.elev, b.elev, t),
    sunAzimDeg:  90 + dp * 180,
    groundColor: lerpC(a.gnd,  b.gnd,  t),
    ambientColor:lerpC(a.amb,  b.amb,  t),
    ambientI:    lerpN(a.ai,   b.ai,   t),
    sunI:        lerpN(a.si,   b.si,   t),
    moonI:       lerpN(a.mi,   b.mi,   t),
    exposure:    lerpN(a.exp,  b.exp,  t),
    bloomStr:    lerpN(a.bs,   b.bs,   t),
    showStars:   h < 4.8 || h > 20.2,
    greeting:    a.greet,
  }
}

// Returns 0..1 opacity for a character visible between hStart and hEnd
function charOpacity(h: number, hStart: number, hEnd: number, fade = 0.7) {
  if (h <= hStart || h >= hEnd) return 0
  return Math.min((h - hStart) / fade, (hEnd - h) / fade, 1)
}

// ── Procedural textures ───────────────────────────────────────────────────────
function makeGrassTex() {
  const s = 512
  const cv = document.createElement('canvas'); cv.width = cv.height = s
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#2d5520'; ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 28; i++) {
    const px = Math.random()*s, py = Math.random()*s, pr = 18 + Math.random()*45
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fillStyle = Math.random() > 0.5 ? '#234818' : '#377030'
    ctx.fill()
  }
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * s, y = Math.random() * s
    const g = 0x20 + Math.floor(Math.random() * 0x38)
    ctx.fillStyle = `rgb(${Math.floor(g * 0.38)},${g},${Math.floor(g * 0.22)})`
    ctx.fillRect(x, y, 1 + Math.random() * 1.5, 1 + Math.random() * 3)
  }
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * s, y = Math.random() * s
    const r = 0xa0 + Math.floor(Math.random()*30), gr = 0x90 + Math.floor(Math.random()*20)
    ctx.fillStyle = `rgba(${r},${gr},32,0.35)`
    ctx.fillRect(x, y, 1, 2 + Math.random() * 3)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(28, 18)
  return tex
}

function makeRockTex() {
  const s = 256
  const cv = document.createElement('canvas'); cv.width = cv.height = s
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#4a4540'; ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 18; i++) {
    const px = Math.random()*s, py = Math.random()*s, pr = 12 + Math.random()*32
    const v = 0x32 + Math.floor(Math.random() * 0x22)
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${v},${Math.floor(v*0.92)},${Math.floor(v*0.82)})`
    ctx.fill()
  }
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * s, y = Math.random() * s
    const v = 0x2e + Math.floor(Math.random() * 0x2c)
    ctx.fillStyle = `rgb(${v},${Math.floor(v*0.93)},${Math.floor(v*0.83)})`
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 5)
  return tex
}

function makeFlameTexture() {
  const w = 128, h = 200
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  // Flame silhouette: pointed tip, teardrop bulge, narrow base
  ctx.beginPath()
  ctx.moveTo(w * 0.50, h * 0.03)
  ctx.bezierCurveTo(w * 0.76, h * 0.18, w * 0.92, h * 0.40, w * 0.85, h * 0.60)
  ctx.bezierCurveTo(w * 0.78, h * 0.76, w * 0.68, h * 0.88, w * 0.56, h * 0.94)
  ctx.lineTo(w * 0.50, h * 1.00)
  ctx.lineTo(w * 0.44, h * 0.94)
  ctx.bezierCurveTo(w * 0.32, h * 0.88, w * 0.22, h * 0.76, w * 0.15, h * 0.60)
  ctx.bezierCurveTo(w * 0.08, h * 0.40, w * 0.24, h * 0.18, w * 0.50, h * 0.03)
  ctx.closePath()
  const grad = ctx.createLinearGradient(w / 2, h, w / 2, 0)
  grad.addColorStop(0.00, 'rgba(255,255,190,1.0)')
  grad.addColorStop(0.14, 'rgba(255,210, 20,1.0)')
  grad.addColorStop(0.35, 'rgba(255,110,  0,0.90)')
  grad.addColorStop(0.62, 'rgba(210, 35,  0,0.70)')
  grad.addColorStop(0.86, 'rgba(150,  0,  0,0.35)')
  grad.addColorStop(1.00, 'rgba( 80,  0,  0,0.00)')
  ctx.fillStyle = grad; ctx.fill()
  return new THREE.CanvasTexture(cv)
}

// ── Presets ───────────────────────────────────────────────────────────────────
const TIME_PRESETS = [
  { label: 'Live',  h: null },
  { label: 'Dawn',  h: 5.5  },
  { label: 'Morn',  h: 8    },
  { label: 'Noon',  h: 12   },
  { label: 'Dusk',  h: 18.5 },
  { label: 'Night', h: 22   },
]

const MT_DATA: [number,number,number,number][] = [
  [-18,-28,14,11],[-10,-24,10,8],[-4,-26,12,9],
  [4,-22,8,7],[12,-25,11,9],[20,-28,13,10],[0,-32,16,13],
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function ThreeSceneDemo() {
  const mountRef      = useRef<HTMLDivElement>(null)
  const now           = useClock()
  const [greeting,     setGreeting]    = useState(() => getTimeConfig(new Date().getHours() + new Date().getMinutes() / 60).greeting)
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const overrideRef   = useRef<number | null>(null)
  const transitionRef = useRef<{ from: number; to: number; frames: number } | null>(null)

  const clockStr  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  function selectPreset(h: number | null) {
    const cur = overrideRef.current ?? (new Date().getHours() + new Date().getMinutes() / 60)
    overrideRef.current = cur
    transitionRef.current = h !== null ? { from: cur % 24, to: h, frames: 45 } : null
    if (h === null) overrideRef.current = null
    setActivePreset(h)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Touch devices tend to have far weaker GPU fill-rate — antialiasing, soft
    // shadow filtering, and bloom's extra passes are the costliest knobs here.
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled  = !isTouchDevice
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap
    renderer.toneMapping        = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace   = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 2000)
    camera.position.set(0, 2.5, 11)
    camera.lookAt(0, 4, 0)

    // ── Sky ────────────────────────────────────────────────────────────────
    const sky = new Sky()
    sky.scale.setScalar(450)
    scene.add(sky)
    const skyU = sky.material.uniforms
    skyU['mieDirectionalG'].value = 0.8

    // ── Sun disc ───────────────────────────────────────────────────────────
    const sunMat  = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), sunMat)
    scene.add(sunMesh)

    // ── Moon disc ──────────────────────────────────────────────────────────
    const moonMat  = new THREE.MeshBasicMaterial({ color: 0xdce8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 16), moonMat)
    moonMesh.visible = false
    scene.add(moonMesh)

    // ── Ground ─────────────────────────────────────────────────────────────
    const grassTex  = makeGrassTex()
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92, metalness: 0 })
    const groundGeo = new THREE.PlaneGeometry(200, 120, 120, 72)
    // Displace far-field vertices for rolling hills (local Y > 15 = world Z < -15, away from camera)
    const gPos = groundGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < gPos.count; i++) {
      const lx = gPos.getX(i), ly = gPos.getY(i)
      const farT = Math.max(0, Math.min(1, (ly - 12) / 22))
      const h = farT * (
        Math.sin(lx * 0.055) * 1.4 + Math.sin(ly * 0.048) * 1.1
        + Math.sin(lx * 0.15 + ly * 0.12) * 0.6
        + Math.sin(lx * 0.30 - ly * 0.20) * 0.3
      )
      gPos.setZ(i, h)
    }
    gPos.needsUpdate = true
    groundGeo.computeVertexNormals()
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true
    scene.add(ground)

    // ── Mountains ──────────────────────────────────────────────────────────
    const rockTex = makeRockTex()
    MT_DATA.forEach(([x, z, h, r], idx) => {
      const shade = new THREE.Color(0x7a9a6a)
        .lerp(new THREE.Color(0x9ab888), (idx * 0.37) % 1)
      const mat = new THREE.MeshStandardMaterial({ map: rockTex, color: shade, roughness: 0.86 + (idx % 3) * 0.04, metalness: 0 })
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 20 + idx), mat)
      m.position.set(x, h / 2 - 2, z); m.castShadow = true; m.receiveShadow = true
      scene.add(m)
    })

    // ── Trees ──────────────────────────────────────────────────────────────
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2008, roughness: 0.95 })
    ;[[-6,-8,1.4],[6,-8,1.4],[-10,-12,1.8],[10,-12,1.8],[-3,-14,2],[4,-16,2.2]]
      .forEach(([x, z, s], ti) => {
        const shade = new THREE.Color(0x183d12).lerp(new THREE.Color(0x255c1a), (ti * 0.31) % 1)
        const lm1 = new THREE.MeshStandardMaterial({ color: shade.clone().multiplyScalar(0.85), roughness: 0.88 })
        const lm2 = new THREE.MeshStandardMaterial({ color: shade.clone(), roughness: 0.86 })
        const lm3 = new THREE.MeshStandardMaterial({ color: shade.clone().multiplyScalar(1.10), roughness: 0.84 })
        const g     = new THREE.Group()
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14*s, 0.21*s, 1.3*s, 8), trunkMat)
        trunk.position.y = 0.65*s - 1; trunk.castShadow = true
        const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.82*s, 1.7*s, 10), lm1)
        f1.position.y = 1.7*s - 1; f1.castShadow = true; f1.receiveShadow = true
        const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.60*s, 1.4*s, 10), lm2)
        f2.position.y = 2.35*s - 1; f2.castShadow = true
        const f3 = new THREE.Mesh(new THREE.ConeGeometry(0.40*s, 1.1*s, 10), lm3)
        f3.position.y = 2.88*s - 1; f3.castShadow = true
        g.add(trunk, f1, f2, f3); g.position.set(x, 0, z); scene.add(g)
      })

    // ── Boulders ───────────────────────────────────────────────────────────
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x6a6560, roughness: 0.93, metalness: 0 })
    ;[[-4.5, 5.5, 0.70], [3.8, 6.0, 0.45], [-7.0, 3.5, 1.0], [5.5, 3.0, 0.35],
      [-1.5, 7.0, 0.80], [5.8, 6.5, 0.55], [-5.5, 4.0, 0.50], [1.5, 4.0, 0.40]]
      .forEach(([x, z, s], i) => {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), boulderMat)
        b.position.set(x, -1 + s * 0.45, z)
        b.rotation.set(i * 0.7, i * 1.3, i * 0.4)
        b.scale.set(1 + (i % 3) * 0.18, 0.52 + (i % 4) * 0.12, 0.85 + (i % 3) * 0.14)
        b.castShadow = true; b.receiveShadow = true
        scene.add(b)
      })

    // ── Dog — morning character ────────────────────────────────────────────
    // All character materials start opacity:0 and are faded in by time of day
    const dogMats: THREE.MeshStandardMaterial[] = []
    const dMat = (c: number) => {
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, transparent: true, opacity: 0 })
      dogMats.push(m); return m
    }
    const dogFur = dMat(0xc87030), dogDark = dMat(0x7a4418), dogBlack = dMat(0x181010)
    const dogGroup = new THREE.Group()
    // body
    const dgBody = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.22), dogFur)
    dgBody.position.set(0, 0.42, 0); dogGroup.add(dgBody)
    // head
    const dgHead = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.19, 0.20), dogFur)
    dgHead.position.set(0.31, 0.51, 0); dogGroup.add(dgHead)
    // snout
    const dgSnout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.14), dogDark)
    dgSnout.position.set(0.42, 0.48, 0); dogGroup.add(dgSnout)
    // nose
    const dgNose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), dogBlack)
    dgNose.position.set(0.47, 0.51, 0); dogGroup.add(dgNose)
    // ears
    ;[0.09, -0.09].forEach(ez => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.05), dogDark)
      ear.position.set(0.27, 0.57, ez); ear.rotation.z = -0.28; dogGroup.add(ear)
    })
    // legs
    const dlGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.30, 6)
    ;[[0.17, 0.10], [0.17, -0.10], [-0.17, 0.10], [-0.17, -0.10]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(dlGeo, dogFur); leg.position.set(lx, 0.15, lz); dogGroup.add(leg)
    })
    // tail — stored for wag animation
    const dogTailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.32, 6), dogFur)
    dogTailMesh.position.set(-0.29, 0.50, 0); dogTailMesh.rotation.z = 1.1; dogGroup.add(dogTailMesh)
    dogGroup.position.set(0, -1, 0)
    scene.add(dogGroup)

    // ── Cattle — afternoon characters ──────────────────────────────────────
    const cowMats: THREE.MeshStandardMaterial[] = []
    const cowHeadMeshes: THREE.Mesh[] = []
    const cowGroups: THREE.Group[] = []

    // Two cows: tan Holstein and dark beef
    ;[
      { bodyC: 0xd8c890, spotC: 0x282018, posX: -3.5, posZ: -1.5, rotY:  0.4 },
      { bodyC: 0x303028, spotC: 0xe8e8e0, posX:  2.8, posZ: -2.2, rotY: -0.7 },
    ].forEach(({ bodyC, spotC, posX, posZ, rotY }) => {
      const cMat = (c: number) => {
        const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, transparent: true, opacity: 0 })
        cowMats.push(m); return m
      }
      const bm = cMat(bodyC), sm = cMat(spotC), nm = cMat(0xc8a070)
      const cg = new THREE.Group()
      // body
      const cwBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.50, 0.44), bm)
      cwBody.position.set(0, 0.72, 0); cg.add(cwBody)
      // colour spot / marking
      const cwSpot = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.36, 0.45), sm)
      cwSpot.position.set(0.08, 0.72, 0); cg.add(cwSpot)
      // head — angled down (grazing)
      const cwHead = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.26, 0.26), bm)
      cwHead.position.set(0.56, 0.63, 0); cwHead.rotation.z = -0.5; cg.add(cwHead)
      cowHeadMeshes.push(cwHead)
      // snout
      const cwSnout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.18), nm)
      cwSnout.position.set(0.72, 0.52, 0); cwSnout.rotation.z = -0.5; cg.add(cwSnout)
      // legs
      const clGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.42, 6)
      ;[[0.30, 0.16], [0.30, -0.16], [-0.30, 0.16], [-0.30, -0.16]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(clGeo, bm); leg.position.set(lx, 0.21, lz); cg.add(leg)
      })
      // tail
      const cwTail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.38, 6), cMat(0x202020))
      cwTail.position.set(-0.47, 0.85, 0); cwTail.rotation.z = -0.55; cg.add(cwTail)
      cg.position.set(posX, -1, posZ); cg.rotation.y = rotY
      scene.add(cg); cowGroups.push(cg)
    })

    // ── Kids — dusk characters ─────────────────────────────────────────────
    const kidMats: THREE.MeshStandardMaterial[] = []
    const kidGroups: THREE.Group[] = []

    ;[
      { shirtC: 0xcc2020, pantsC: 0x2040a0, posX: -1.5, posZ: 5.0 },
      { shirtC: 0x1a60dd, pantsC: 0x182060, posX:  2.2, posZ: 5.0 },
    ].forEach(({ shirtC, pantsC, posX, posZ }) => {
      const kMat = (c: number) => {
        const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.80, transparent: true, opacity: 0 })
        kidMats.push(m); return m
      }
      const skinM  = kMat(0xe8b890), shirtM = kMat(shirtC)
      const pantsM = kMat(pantsC),   hairM  = kMat(0x3a2810)
      const kg = new THREE.Group()
      // legs
      const klGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.32, 6)
      ;[0.07, -0.07].forEach(kx => {
        const leg = new THREE.Mesh(klGeo, pantsM); leg.position.set(kx, 0.16, 0); kg.add(leg)
      })
      // body
      const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.40, 8), shirtM)
      kBody.position.set(0, 0.52, 0); kg.add(kBody)
      // arms (spread out — playful)
      const kaGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.28, 6)
      ;[[0.17, 0.55], [-0.17, -0.55]].forEach(([kx, rz]) => {
        const arm = new THREE.Mesh(kaGeo, shirtM); arm.position.set(kx, 0.56, 0); arm.rotation.z = rz; kg.add(arm)
      })
      // head
      const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinM)
      kHead.position.set(0, 0.88, 0); kg.add(kHead)
      // hair
      const kHair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), hairM)
      kHair.position.set(0, 0.97, 0); kHair.scale.set(1, 0.55, 1); kg.add(kHair)
      kg.position.set(posX, -1, posZ)
      scene.add(kg); kidGroups.push(kg)
    })

    // ── Night camp — tent + campfire ──────────────────────────────────────
    const campMats: THREE.Material[] = []
    const mkCampMat = (c: number, roughness = 0.9) => {
      const m = new THREE.MeshStandardMaterial({ color: c, roughness, transparent: true, opacity: 0 })
      campMats.push(m); return m
    }

    // Tent — 4-sided pyramid rotated 45° reads as a ridge tent from camera
    const tentMesh = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 4, 1), mkCampMat(0x8b2800, 0.88))
    tentMesh.position.set(8, 0.1, -3); tentMesh.rotation.y = Math.PI / 4
    tentMesh.castShadow = true; tentMesh.receiveShadow = true
    scene.add(tentMesh)

    // Rock ring around fire pit
    const rockRingMat = mkCampMat(0x5a5550, 0.95)
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), rockRingMat)
      rk.position.set(5.0 + Math.cos(ang) * 0.40, -0.90, -1.0 + Math.sin(ang) * 0.40)
      rk.rotation.set(i * 0.8, i * 1.3, i * 0.5); scene.add(rk)
    }

    // Crossed logs
    const logMat = mkCampMat(0x3a1e08, 0.95)
    for (let i = 0; i < 2; i++) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.85, 6), logMat)
      lg.position.set(5.0, -0.92, -1.0); lg.rotation.z = 0.22
      lg.rotation.y = i * Math.PI / 2 + Math.PI / 4; scene.add(lg)
    }

    // Flames — 3 crossed billboard planes with canvas flame silhouette
    const flameTex    = makeFlameTexture()
    const flamePlaneMat = new THREE.MeshBasicMaterial({
      map: flameTex, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    campMats.push(flamePlaneMat)
    const flameGroup = new THREE.Group()
    flameGroup.position.set(5.0, -0.80, -1.0)
    for (let i = 0; i < 3; i++) {
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), flamePlaneMat)
      fp.rotation.y = (i / 3) * Math.PI; fp.position.y = 0.41
      flameGroup.add(fp)
    }
    scene.add(flameGroup)

    // Flickering point light — range 8 keeps glow off distant trees
    const fireLight = new THREE.PointLight(0xff7830, 0, 6, 1.8)
    fireLight.position.set(5.0, -0.1, -1.0)
    scene.add(fireLight)

    // ── Stars ──────────────────────────────────────────────────────────────
    const sv = new Float32Array(1200 * 3)
    for (let i = 0; i < 1200; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
      const r  = 400 + Math.random() * 40
      sv[i*3]   = r * Math.sin(ph) * Math.cos(th)
      sv[i*3+1] = Math.abs(r * Math.cos(ph))
      sv[i*3+2] = r * Math.sin(ph) * Math.sin(th)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(sv, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0, sizeAttenuation: true })
    scene.add(new THREE.Points(starGeo, starMat))

    // ── Fog ────────────────────────────────────────────────────────────────
    scene.fog = new THREE.FogExp2(0x090e18, 0.003)

    // ── Lights ─────────────────────────────────────────────────────────────
    const ambLight  = new THREE.AmbientLight(0xffffff, 0.3)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5a3a, 0.4)
    const dirLight  = new THREE.DirectionalLight(0xfff5e0, 1.0)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.setScalar(2048)
    dirLight.shadow.camera.near = 1;   dirLight.shadow.camera.far    = 120
    dirLight.shadow.camera.left = -28; dirLight.shadow.camera.right  = 28
    dirLight.shadow.camera.top  = 28;  dirLight.shadow.camera.bottom = -28
    dirLight.shadow.bias = -0.001
    const moonLight = new THREE.DirectionalLight(0xb8c8ff, 0)
    scene.add(ambLight, hemiLight, dirLight, moonLight)

    // ── Post-processing ────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    // Bloom's internal blur mip chain scales with this resolution — halve it on
    // touch devices, where it's otherwise one of the costliest passes per frame.
    const bloomScale = isTouchDevice ? 0.5 : 1
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth * bloomScale, mount.clientHeight * bloomScale), 0.28, 0.40, 0.88,
    )
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // ── Resize ─────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = mount
      renderer.setSize(w, h); composer.setSize(w, h)
      // composer.setSize() resets every pass — including bloom — to full
      // resolution, so re-apply the touch-device downscale after it runs.
      bloom.setSize(w * bloomScale, h * bloomScale)
      camera.aspect = w / h; camera.updateProjectionMatrix()
    })
    ro.observe(mount)

    // ── Animation loop ─────────────────────────────────────────────────────
    const sunVec    = new THREE.Vector3()
    const fogDay    = new THREE.Color(0x4a7090)
    const fogNight  = new THREE.Color(0x090e18)
    const fogDusk   = new THREE.Color(0x5a3018)
    const hemiDay   = new THREE.Color(0xb8d8f0)
    const hemiNight = new THREE.Color(0x6080b0)
    let dogOp = 0, cattleOp = 0, kidsOp = 0, campOp = 0
    let animId: number, prevGreeting = '', lastTs = -1

    function animate(ts: number) {
      animId = requestAnimationFrame(animate)
      lastTs = lastTs < 0 ? ts : lastTs
      lastTs = ts

      // Preset transition — ease-out cubic over 45 frames
      const tr = transitionRef.current
      if (tr && tr.frames > 0) {
        tr.frames--
        const p = 1 - Math.pow(tr.frames / 45, 3)
        let delta = tr.to - tr.from
        if (Math.abs(delta) > 12) delta -= Math.sign(delta) * 24
        overrideRef.current = (tr.from + delta * p + 24) % 24
        if (tr.frames === 0) { overrideRef.current = tr.to; transitionRef.current = null }
      }
      const h   = overrideRef.current ?? (new Date().getHours() + new Date().getMinutes() / 60)
      const cfg = getTimeConfig(h)

      if (cfg.greeting !== prevGreeting) { prevGreeting = cfg.greeting; setGreeting(cfg.greeting) }

      // Sky
      const phi = THREE.MathUtils.degToRad(90 - cfg.sunElevDeg)
      const tht = THREE.MathUtils.degToRad(cfg.sunAzimDeg)
      sunVec.setFromSphericalCoords(1, phi, tht)
      skyU['turbidity'].value      = cfg.turbidity
      skyU['rayleigh'].value       = cfg.rayleigh
      skyU['mieCoefficient'].value = cfg.mieCoeff
      skyU['sunPosition'].value.copy(sunVec)

      // Sun disc
      const sunElev = cfg.sunElevDeg
      sunMat.color.set(sunElev > 20 ? 0xffffff : sunElev > 5 ? 0xffcc44 : 0xff6622)
      sunMesh.position.copy(sunVec).multiplyScalar(350)
      sunMesh.visible = cfg.sunElevDeg > -1

      // Moon disc
      const moonFraction = Math.min(1, cfg.moonI / 1.4)
      moonMesh.visible = cfg.moonI > 0.05
      if (moonMesh.visible) {
        moonMesh.position.set(-sunVec.x, Math.max(0.15, Math.abs(sunVec.y)), -sunVec.z).multiplyScalar(320)
        moonMat.opacity = moonFraction * 0.85
        moonMat.color.set(moonMesh.position.y > 120 ? 0xeef2ff : 0xffe8c0)
      }

      // Ground tint
      groundMat.color.copy(cfg.groundColor)

      // Fog — warm tint near horizon at dawn/dusk
      const fogT        = Math.max(0, Math.min(1, cfg.sunElevDeg / 70))
      const horizonWarm = Math.max(0, 1 - Math.abs(cfg.sunElevDeg - 3) / 12) * Math.min(1, cfg.mieCoeff * 14)
      ;(scene.fog as THREE.FogExp2).color
        .copy(fogNight).lerp(fogDay, fogT * 0.25)
        .lerp(fogDusk, horizonWarm * 0.5)

      renderer.toneMappingExposure = cfg.exposure

      // Lights
      const sunBoost = 1.0 + Math.min(cfg.sunI, 1.0) * 1.4
      ambLight.color.copy(cfg.ambientColor)
      ambLight.intensity  = cfg.ambientI * (1.0 + Math.min(cfg.sunI, 1.0) * 0.8)
      const hemiT = Math.max(0, Math.min(1, cfg.sunElevDeg / 30))
      hemiLight.color.copy(hemiNight).lerp(hemiDay, hemiT).lerp(cfg.ambientColor, Math.max(0, 0.5 - hemiT))
      hemiLight.groundColor.copy(cfg.groundColor)
      hemiLight.intensity = cfg.ambientI * sunBoost
      dirLight.color.set(0xfff5e0); dirLight.intensity = cfg.sunI
      dirLight.position.copy(sunVec).multiplyScalar(80)
      moonLight.intensity = cfg.moonI
      moonLight.position.set(-sunVec.x, Math.max(0.2, Math.abs(sunVec.y)), -sunVec.z).multiplyScalar(60)

      bloom.strength = cfg.bloomStr

      // Stars
      starMat.opacity += ((cfg.showStars ? 0.9 : 0) - starMat.opacity) * 0.02

      // ── Character animation ──────────────────────────────────────────────
      const ct = Date.now() / 1000

      // Dog — morning (h 7..11.5)
      dogOp += (charOpacity(h, 7, 11.5) - dogOp) * 0.025
      dogGroup.visible = dogOp > 0.01
      if (dogGroup.visible) {
        dogMats.forEach(m => { m.opacity = dogOp })
        // Mid-field run — z stays near 0 so camera frustum covers ground level
        dogGroup.position.x = Math.cos(ct * 0.65) * 2.2 + 0.5
        dogGroup.position.z = Math.sin(ct * 0.65) * 1.2
        dogGroup.position.y = -1 + Math.abs(Math.sin(ct * 2.8)) * 0.13
        dogGroup.rotation.y = -ct * 0.65 - Math.PI / 2
        dogTailMesh.rotation.z = 1.1 + Math.sin(ct * 6) * 0.5   // tail wag
      }

      // Cattle — afternoon (h 12..16.5)
      cattleOp += (charOpacity(h, 11.0, 17.0) - cattleOp) * 0.025
      cowGroups.forEach(cg => { cg.visible = cattleOp > 0.01 })
      if (cattleOp > 0.01) {
        cowMats.forEach(m => { m.opacity = cattleOp })
        // Heads bob slowly while grazing
        cowHeadMeshes.forEach((ch, i) => {
          ch.rotation.z = -0.5 + Math.sin(ct * 0.42 + i * 1.4) * 0.20
        })
      }

      // Kids — dusk (h 17.5..19.5)
      kidsOp += (charOpacity(h, 17.5, 19.5) - kidsOp) * 0.025
      kidGroups.forEach(kg => { kg.visible = kidsOp > 0.01 })
      if (kidsOp > 0.01) {
        kidMats.forEach(m => { m.opacity = kidsOp })
        // Run in opposite circles in mid-field — same z band as cattle
        kidGroups.forEach((kg, i) => {
          const phase = i * Math.PI
          kg.position.x = Math.cos(ct * 1.4 + phase) * 1.8 + 0.5
          kg.position.z = Math.sin(ct * 1.4 + phase) * 0.8 + 0.5
          kg.position.y = -1 + Math.abs(Math.sin(ct * 3.5 + phase)) * 0.24
          kg.rotation.y = -(ct * 1.4 + phase) + Math.PI / 2
        })
      }

      // Night camp — visible h > 20.5 or h < 4.8
      const campTarget = h > 20.5 ? Math.min((h - 20.5) / 0.8, 1)
                       : h < 4.8  ? Math.min((4.8 - h) / 0.8, 1) : 0
      campOp += (campTarget - campOp) * 0.025
      campMats.forEach(m => { m.opacity = campOp })
      flameGroup.visible = campOp > 0.01
      if (campOp > 0.01) {
        const fs = 0.88 + Math.sin(ct * 7.8) * 0.10 + Math.sin(ct * 13.3) * 0.06
        flameGroup.scale.set(fs, fs * (1 + Math.sin(ct * 11.3) * 0.08), fs)
        flameGroup.rotation.y += 0.02
        fireLight.intensity = campOp * (4.0 + Math.sin(ct * 9.1) * 0.6 + Math.sin(ct * 15.7) * 0.4)
      } else { fireLight.intensity = 0 }

      // Camera sway
      const t = Date.now() / 1000
      camera.position.x = Math.sin(t * 0.08) * 0.3
      camera.lookAt(0, 4, 0)

      composer.render()
    }
    animate(performance.now())

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      grassTex.dispose(); rockTex.dispose(); flameTex.dispose()
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh || (obj as THREE.Points).isPoints) {
          mesh.geometry?.dispose()
          const mat = mesh.material
          if (Array.isArray(mat)) mat.forEach(m => m.dispose())
          else (mat as THREE.Material)?.dispose()
        }
      })
      composer.dispose(); renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="three-scene">
      <div ref={mountRef} className="three-scene__mount" />
      <div className="three-scene__overlay">
        <p className="three-scene__greeting">{greeting}</p>
        <p className="three-scene__clock">{clockStr}</p>
      </div>
      <div className="three-scene__times" role="group" aria-label="Time of day">
        {TIME_PRESETS.map(p => (
          <button
            key={p.label}
            className={`three-scene__time-btn${activePreset === p.h ? ' three-scene__time-btn--active' : ''}`}
            onClick={() => selectPreset(p.h)}
            aria-pressed={activePreset === p.h}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
