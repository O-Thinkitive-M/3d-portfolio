import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

// ─── AWS / DevOps services ────────────────────────────────────────────────────
const AWS_SERVICES = [
  { name: 'EC2',            color: '#FF9900' },
  { name: 'Lambda',         color: '#FF9900' },
  { name: 'ECS',            color: '#FF9900' },
  { name: 'EKS',            color: '#FF9900' },
  { name: 'Auto Scaling',   color: '#FF9900' },
  { name: 'S3',             color: '#4ade80' },
  { name: 'EBS',            color: '#4ade80' },
  { name: 'EFS',            color: '#4ade80' },
  { name: 'FSx',            color: '#4ade80' },
  { name: 'Snowball',       color: '#4ade80' },
  { name: 'VPC',            color: '#a78bfa' },
  { name: 'Route 53',       color: '#a78bfa' },
  { name: 'ELB',            color: '#a78bfa' },
  { name: 'CloudFront',     color: '#a78bfa' },
  { name: 'Direct Connect', color: '#a78bfa' },
  { name: 'RDS',            color: '#22d3ee' },
  { name: 'DynamoDB',       color: '#22d3ee' },
  { name: 'Aurora',         color: '#22d3ee' },
  { name: 'Redshift',       color: '#22d3ee' },
  { name: 'ElastiCache',    color: '#22d3ee' },
  { name: 'IAM',            color: '#f87171' },
  { name: 'KMS',            color: '#f87171' },
  { name: 'Cognito',        color: '#f87171' },
  { name: 'GuardDuty',      color: '#f87171' },
  { name: 'WAF',            color: '#f87171' },
]

const BEAM_COUNT = 6    // fewer items = each clearly visible
const CYCLE_TIME = 32   // much slower — each label stays visible for ~5s

// ─── Moon surface texture (crater-covered rocky gray) ─────────────────────────
function makeMoonTex(): THREE.CanvasTexture {
  const W = 2048, H = 1024
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!

  // Base cool gray surface (lunar highlands color)
  ctx.fillStyle = '#808898'
  ctx.fillRect(0, 0, W, H)

  // Dark maria (lava plains) — large dark patches
  const maria = [
    { cx: 0.22, cy: 0.42, rw: 0.22, rh: 0.18, a: 0.5 },
    { cx: 0.60, cy: 0.30, rw: 0.18, rh: 0.14, a: 0.4 },
    { cx: 0.78, cy: 0.65, rw: 0.20, rh: 0.15, a: 0.45 },
    { cx: 0.45, cy: 0.72, rw: 0.15, rh: 0.12, a: 0.38 },
    { cx: 0.90, cy: 0.40, rw: 0.12, rh: 0.10, a: 0.42 },
  ]
  maria.forEach(m => {
    const grd = ctx.createRadialGradient(m.cx*W, m.cy*H, 0, m.cx*W, m.cy*H, m.rw*W)
    grd.addColorStop(0,   `rgba(55,62,74,${m.a})`)
    grd.addColorStop(0.6, `rgba(60,68,80,${m.a * 0.6})`)
    grd.addColorStop(1,   'transparent')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(m.cx*W, m.cy*H, m.rw*W, m.rh*H, 0, 0, Math.PI*2)
    ctx.fill()
  })

  // Tone variation (lighter highlands)
  for (let p = 0; p < 18; p++) {
    const px = ((Math.sin(p * 1.9 + 0.7) + 1) / 2) * W
    const py = ((Math.cos(p * 2.5 + 1.3) + 1) / 2) * H
    const pr = (0.04 + Math.abs(Math.sin(p * 1.2)) * 0.10) * W
    const alpha = p % 2 === 0 ? 0.30 : 0.20
    const grd = ctx.createRadialGradient(px, py, 0, px, py, pr)
    grd.addColorStop(0,   `rgba(155,165,185,${alpha})`)
    grd.addColorStop(1,   'transparent')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, W, H)
  }

  // Large craters with proper structure
  const largeCraters = [
    { fx: 0.14, fy: 0.38 }, { fx: 0.33, fy: 0.20 }, { fx: 0.52, fy: 0.55 },
    { fx: 0.68, fy: 0.25 }, { fx: 0.81, fy: 0.52 }, { fx: 0.25, fy: 0.70 },
    { fx: 0.72, fy: 0.80 }, { fx: 0.44, fy: 0.15 }, { fx: 0.90, fy: 0.68 },
    { fx: 0.07, fy: 0.62 }, { fx: 0.58, fy: 0.82 }, { fx: 0.38, fy: 0.88 },
  ]
  largeCraters.forEach(({ fx, fy }, i) => {
    const cx2 = fx * W
    const cy2 = fy * H
    const r   = (0.022 + Math.abs(Math.sin(i * 1.41)) * 0.038) * W

    // Outer ejecta blanket (faint bright splash)
    const grdEj = ctx.createRadialGradient(cx2, cy2, r * 0.8, cx2, cy2, r * 2.2)
    grdEj.addColorStop(0,   'transparent')
    grdEj.addColorStop(0.3, `rgba(170,178,195,${0.18 + Math.abs(Math.sin(i * 0.9)) * 0.14})`)
    grdEj.addColorStop(0.7, `rgba(140,150,168,${0.10})`)
    grdEj.addColorStop(1,   'transparent')
    ctx.fillStyle = grdEj
    ctx.beginPath(); ctx.arc(cx2, cy2, r * 2.2, 0, Math.PI*2); ctx.fill()

    // Bright raised rim
    const grdRim = ctx.createRadialGradient(cx2, cy2, r * 0.70, cx2, cy2, r * 1.10)
    grdRim.addColorStop(0,   'transparent')
    grdRim.addColorStop(0.5, `rgba(195,205,220,${0.55 + Math.abs(Math.sin(i)) * 0.30})`)
    grdRim.addColorStop(1,   'transparent')
    ctx.fillStyle = grdRim
    ctx.beginPath(); ctx.arc(cx2, cy2, r * 1.10, 0, Math.PI*2); ctx.fill()

    // Dark crater floor shadow
    const grdFl = ctx.createRadialGradient(cx2 + r*0.12, cy2 - r*0.08, 0, cx2, cy2, r * 0.88)
    grdFl.addColorStop(0,   `rgba(28,32,42,${0.75 + Math.abs(Math.sin(i * 0.7)) * 0.20})`)
    grdFl.addColorStop(0.65,`rgba(35,40,52,${0.55})`)
    grdFl.addColorStop(1,   'transparent')
    ctx.fillStyle = grdFl
    ctx.beginPath(); ctx.arc(cx2, cy2, r * 0.88, 0, Math.PI*2); ctx.fill()

    // Central peak (only larger craters)
    if (r > W * 0.028) {
      const grdPk = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 0.10)
      grdPk.addColorStop(0, 'rgba(210,218,230,0.65)')
      grdPk.addColorStop(1, 'transparent')
      ctx.fillStyle = grdPk
      ctx.beginPath(); ctx.arc(cx2, cy2, r * 0.10, 0, Math.PI*2); ctx.fill()
    }

    // Bright ray system for some craters
    if (i % 3 === 0) {
      for (let ray = 0; ray < 8; ray++) {
        const ra = (ray / 8) * Math.PI * 2 + i * 0.7
        const rx1 = cx2 + Math.cos(ra) * r * 1.2
        const ry1 = cy2 + Math.sin(ra) * r * 1.2
        const rx2 = cx2 + Math.cos(ra) * r * (3.0 + Math.sin(ray) * 2.0)
        const ry2 = cy2 + Math.sin(ra) * r * (3.0 + Math.sin(ray) * 2.0)
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2)
        ctx.strokeStyle = `rgba(185,195,210,${0.14 + Math.abs(Math.sin(ray)) * 0.10})`
        ctx.lineWidth = 1.5 + Math.abs(Math.sin(ray * 1.3)) * 3
        ctx.stroke()
      }
    }
  })

  // Small craters (dense field)
  for (let c = 0; c < 120; c++) {
    const cx2 = ((Math.sin(c * 3.11 + 2.1) + 1) / 2) * W
    const cy2 = ((Math.cos(c * 2.77 + 0.4) + 1) / 2) * H
    const r   = (0.003 + Math.abs(Math.sin(c * 1.88)) * 0.009) * W

    const grdRm = ctx.createRadialGradient(cx2, cy2, r*0.5, cx2, cy2, r*1.35)
    grdRm.addColorStop(0,   'transparent')
    grdRm.addColorStop(0.5, `rgba(175,185,200,${0.35 + Math.abs(Math.sin(c*0.5))*0.20})`)
    grdRm.addColorStop(1,   'transparent')
    ctx.fillStyle = grdRm
    ctx.beginPath(); ctx.arc(cx2, cy2, r*1.35, 0, Math.PI*2); ctx.fill()

    const grdIn = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r)
    grdIn.addColorStop(0,   `rgba(25,28,38,${0.65 + Math.abs(Math.sin(c*0.7))*0.25})`)
    grdIn.addColorStop(1,   'transparent')
    ctx.fillStyle = grdIn
    ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI*2); ctx.fill()
  }

  // Fine grain noise via tiny bumps
  for (let g = 0; g < 300; g++) {
    const gx = ((Math.sin(g * 5.77 + 1.1) + 1) / 2) * W
    const gy = ((Math.cos(g * 4.33 + 2.3) + 1) / 2) * H
    const gr = 1 + Math.abs(Math.sin(g * 2.1)) * 3
    const light = g % 2 === 0
    ctx.fillStyle = light ? `rgba(200,208,220,${0.08 + Math.abs(Math.sin(g))*0.07})`
                          : `rgba(40,44,55,${0.08 + Math.abs(Math.sin(g*1.3))*0.07})`
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI*2); ctx.fill()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

// ─── Disc face texture (concentric ring patterns for top face detail) ─────────
function makeDiscTex(): THREE.CanvasTexture {
  const W = 1024
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = W
  const ctx = cv.getContext('2d')!
  const cx = W/2, cy = W/2, R = W/2

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, W)

  const rings = [
    { rf: 0.92, n: 64, gapEvery: 4, thk: 0.028, bright: 0.90 },
    { rf: 0.79, n: 52, gapEvery: 5, thk: 0.025, bright: 0.80 },
    { rf: 0.66, n: 40, gapEvery: 4, thk: 0.022, bright: 0.75 },
    { rf: 0.53, n: 30, gapEvery: 5, thk: 0.020, bright: 0.68 },
    { rf: 0.40, n: 22, gapEvery: 4, thk: 0.018, bright: 0.62 },
    { rf: 0.27, n: 14, gapEvery: 3, thk: 0.016, bright: 0.75 },
  ]

  rings.forEach(ring => {
    const rr  = ring.rf * R * 0.98
    const thk = ring.thk * R
    const step = Math.PI * 2 / ring.n
    for (let i = 0; i < ring.n; i++) {
      if (i % ring.gapEvery === ring.gapEvery - 1) continue
      const a0 = i * step + 0.04, a1 = (i+1) * step - 0.04

      ctx.beginPath()
      ctx.arc(cx, cy, rr + thk*2.4, a0, a1)
      ctx.arc(cx, cy, rr - thk*2.4, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = `rgba(0,200,255,${ring.bright * 0.20})`
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, rr + thk, a0, a1)
      ctx.arc(cx, cy, rr - thk, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = `rgba(0,255,255,${ring.bright})`
      ctx.fill()
    }
  })

  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R*0.12)
  grd.addColorStop(0, 'rgba(180,255,255,1.0)')
  grd.addColorStop(0.4,'rgba(0,220,255,0.7)')
  grd.addColorStop(1,  'rgba(0,80,120,0)')
  ctx.fillStyle = grd
  ctx.beginPath(); ctx.arc(cx, cy, R*0.12, 0, Math.PI*2); ctx.fill()

  return new THREE.CanvasTexture(cv)
}

// ─── Realistic UFO Spaceship (multi-layer saucer, amber engines, blue dome) ───
function Spaceship({ y, s }: { y: number; s: number }) {
  const grp       = useRef<THREE.Group>(null!)
  const domeMat   = useRef<THREE.MeshStandardMaterial>(null!)
  const eng1Mat   = useRef<THREE.MeshStandardMaterial>(null!)
  const eng2Mat   = useRef<THREE.MeshStandardMaterial>(null!)
  const emitMat   = useRef<THREE.MeshBasicMaterial>(null!)
  const engLt     = useRef<THREE.PointLight>(null!)
  const domeLt    = useRef<THREE.PointLight>(null!)
  const discTex   = useMemo(makeDiscTex, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Hover float + slow rotation
    grp.current.position.y        = y + Math.sin(t * 0.55) * 0.14 * s
    grp.current.rotation.y        = t * 0.035

    // Engine pulse (amber)
    const ep = 0.7 + Math.sin(t * 2.0) * 0.5
    if (eng1Mat.current) eng1Mat.current.emissiveIntensity = 1.4 + ep * 0.8
    if (eng2Mat.current) eng2Mat.current.emissiveIntensity = 2.2 + ep * 1.2
    if (engLt.current)   engLt.current.intensity = 7.0 + ep * 4.0

    // Dome pulse (blue)
    const dp = 0.5 + Math.sin(t * 2.8 + 1.2) * 0.5
    if (domeMat.current) domeMat.current.emissiveIntensity = 0.9 + dp * 0.9
    if (domeLt.current)  domeLt.current.intensity = 2.5 + dp * 2.0

    if (emitMat.current) emitMat.current.opacity = 0.75 + Math.sin(t * 3.5) * 0.22
  })

  const R = 5.0 * s   // main disc outer radius
  const H = 1.6 * s   // main disc thickness

  const pods = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2
      return { x: Math.cos(a) * R * 0.855, z: Math.sin(a) * R * 0.855, a }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [R]
  )

  return (
    <group ref={grp} position={[0, y, 0]}>

      {/* ═══════ DYNAMIC LIGHTS ═══════ */}
      {/* Amber engine glow (below ship) */}
      <pointLight ref={engLt} position={[0, -H*0.55, 0]} intensity={8.0}
        color="#ff7700" distance={R*4.5} decay={2} />
      {/* Rim side fills (warm amber) */}
      <pointLight position={[ R*0.65, -H*0.1, 0]} intensity={2.5} color="#ff8800" distance={R*2.5} decay={2} />
      <pointLight position={[-R*0.65, -H*0.1, 0]} intensity={2.5} color="#ff8800" distance={R*2.5} decay={2} />
      {/* Blue dome */}
      <pointLight ref={domeLt} position={[0, H*1.3, 0]} intensity={3.0} color="#2255ee" distance={R*2.5} decay={2} />
      {/* Top key/fill (cold white, simulates distant star) */}
      <pointLight position={[R*0.5, H*2.5, R*0.4]} intensity={3.0} color="#c0ccff" distance={R*5} decay={1.5} />
      {/* Tractor beam emitter */}
      <pointLight position={[0, -H*1.0, 0]} intensity={5.0} color="#00eeff" distance={R*3.5} decay={2} />

      {/* ═══════ HULL — LAYER 1: Main disc body (widest) — brushed steel ═══════ */}
      <mesh>
        <cylinderGeometry args={[R, R*0.76, H, 96, 2]} />
        <meshStandardMaterial color="#5a6272" metalness={0.95} roughness={0.20}
          emissive="#1a2030" emissiveIntensity={0.20} />
      </mesh>

      {/* ═══════ HULL — LAYER 2: Upper cap section ═══════ */}
      <mesh position={[0, H*0.59, 0]}>
        <cylinderGeometry args={[R*0.76, R*0.82, H*0.46, 96, 1]} />
        <meshStandardMaterial color="#68717f" metalness={0.96} roughness={0.16}
          emissive="#1c2230" emissiveIntensity={0.18} />
      </mesh>

      {/* ═══════ HULL — LAYER 3: Upper center raised platform ═══════ */}
      <mesh position={[0, H*0.96, 0]}>
        <cylinderGeometry args={[R*0.46, R*0.52, H*0.40, 64, 1]} />
        <meshStandardMaterial color="#505a68" metalness={0.97} roughness={0.14}
          emissive="#141c28" emissiveIntensity={0.22} />
      </mesh>

      {/* ═══════ COCKPIT DOME ═══════ */}
      <mesh position={[0, H*1.14, 0]}>
        <sphereGeometry args={[R*0.34, 48, 24, 0, Math.PI*2, 0, Math.PI*0.58]} />
        <meshStandardMaterial ref={domeMat}
          color="#080e1c" emissive="#1a44ee" emissiveIntensity={0.9}
          transparent opacity={0.88} metalness={0.22} roughness={0.04} />
      </mesh>
      {/* Dome ring seal */}
      <mesh position={[0, H*1.14, 0]}>
        <torusGeometry args={[R*0.34, 0.050*s, 10, 64]} />
        <meshBasicMaterial color="#3366ff" transparent opacity={0.70}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ═══════ TOP FACE — ring pattern overlay ═══════ */}
      <mesh position={[0, H*0.535, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[R*0.97, 128]} />
        <meshBasicMaterial map={discTex} transparent opacity={0.45}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ═══════ HULL — LAYER 4: Lower underbelly section ═══════ */}
      <mesh position={[0, -H*0.54, 0]}>
        <cylinderGeometry args={[R*0.84, R*0.76, H*0.44, 96, 1]} />
        <meshStandardMaterial color="#626a78" metalness={0.94} roughness={0.22}
          emissive="#181e2a" emissiveIntensity={0.20} />
      </mesh>

      {/* ═══════ ENGINE BAY — outer ring ═══════ */}
      <mesh position={[0, -H*0.72, 0]}>
        <cylinderGeometry args={[R*0.67, R*0.67, H*0.24, 64, 1]} />
        <meshStandardMaterial ref={eng1Mat}
          color="#0c1018" emissive="#cc4400" emissiveIntensity={1.4}
          metalness={0.80} roughness={0.35} />
      </mesh>

      {/* ENGINE BAY — inner glow panel */}
      <mesh position={[0, -H*0.72, 0]}>
        <cylinderGeometry args={[R*0.57, R*0.57, H*0.20, 64, 1]} />
        <meshStandardMaterial ref={eng2Mat}
          color="#080c12" emissive="#ff5500" emissiveIntensity={2.2}
          metalness={0.70} roughness={0.45} />
      </mesh>

      {/* ENGINE BAY — bottom face (orange disc) */}
      <mesh position={[0, -H*0.82, 0]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[R*0.56, 64]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.55}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ═══════ 8 ENGINE PODS on rim ═══════ */}
      {pods.map(({ x, z, a }, i) => (
        <group key={i} position={[x, -H*0.10, z]} rotation={[0, -a, 0]}>
          {/* Pod nacelle body */}
          <mesh>
            <cylinderGeometry args={[0.22*s, 0.28*s, 0.65*s, 16]} />
            <meshStandardMaterial color="#505868" metalness={0.96} roughness={0.12}
              emissive="#101820" emissiveIntensity={0.20} />
          </mesh>
          {/* Pod exhaust glow */}
          <mesh position={[0, -0.25*s, 0]} rotation={[Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.15*s, 16]} />
            <meshBasicMaterial color="#ff7700" transparent opacity={0.88}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.25*s, 0]} rotation={[Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.30*s, 16]} />
            <meshBasicMaterial color="#ff4400" transparent opacity={0.28}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* No floating ring geometry — structural detail lives in hull layer geometry only */}

      {/* ═══════ TRACTOR BEAM EMITTER (bottom center) ═══════ */}
      <mesh position={[0, -H*0.84, 0]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.82*s, 32]} />
        <meshBasicMaterial ref={emitMat} color="#00ffff" transparent opacity={0.80}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, -H*0.84, 0]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[1.70*s, 32]} />
        <meshBasicMaterial color="#00ddff" transparent opacity={0.12}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── Moon planet — very large, nearly flat horizon ────────────────────────────
function Planet({ y, s }: { y: number; s: number }) {
  const core = useRef<THREE.Mesh>(null!)
  const tex  = useMemo(makeMoonTex, [])
  const R    = 22 * s

  useFrame(({ clock }) => {
    core.current.rotation.y = clock.getElapsedTime() * 0.018
  })

  return (
    <group position={[0, y, 0]}>
      {/* Moon surface — bright gray, no atmosphere ring */}
      <mesh ref={core}>
        <sphereGeometry args={[R, 128, 128]} />
        <meshStandardMaterial map={tex} color="#c8d0d8"
          emissive="#606870" emissiveIntensity={0.35}
          roughness={0.85} metalness={0.04} />
      </mesh>
    </group>
  )
}

// ─── Tractor beam ─────────────────────────────────────────────────────────────
function TractorBeam({ yTop, yBottom, rTop, rBottom }: {
  yTop: number; yBottom: number; rTop: number; rBottom: number
}) {
  const mat1 = useRef<THREE.MeshBasicMaterial>(null!)
  const mat2 = useRef<THREE.MeshBasicMaterial>(null!)
  const h    = yTop - yBottom
  const my   = (yTop + yBottom) / 2

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    mat1.current.opacity = 0.030 + Math.sin(t * 1.4) * 0.012
    mat2.current.opacity = 0.100 + Math.sin(t * 2.1 + 1) * 0.035
  })

  return (
    <group position={[0, my, 0]}>
      <mesh>
        <cylinderGeometry args={[rTop*2.2, rBottom*2.0, h, 32, 1, true]} />
        <meshBasicMaterial ref={mat1} color="#00eeff" transparent opacity={0.03}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[rTop, rBottom, h, 32, 1, true]} />
        <meshBasicMaterial ref={mat2} color="#00ffff" transparent opacity={0.10}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[rTop*0.42, rBottom*0.30, h, 16, 1, true]} />
        <meshBasicMaterial color="#aaffff" transparent opacity={0.22}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[rTop*0.06, rTop*0.06, h, 8, 1, true]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.38}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── Floating AWS service labels ──────────────────────────────────────────────
function BeamServices({ yTop, yBottom, rTop, rBottom, fontSize }: {
  yTop: number; yBottom: number; rTop: number; rBottom: number; fontSize: number
}) {
  const slots = useMemo(() =>
    Array.from({ length: BEAM_COUNT }, (_, i) => ({
      phase0: i / BEAM_COUNT,
      svc0:   (i * 4) % AWS_SERVICES.length,
      xFreq:  0.18 + i * 0.04,   // very slow lateral drift
      zFreq:  0.14 + i * 0.03,
      xPh:    (i / BEAM_COUNT) * Math.PI * 2,
      zPh:    (i / BEAM_COUNT) * Math.PI * 1.4,
    })),
    []
  )

  const grpRefs  = useRef<(THREE.Group | null)[]>([])
  const divRefs  = useRef<(HTMLDivElement | null)[]>([])
  const cycleRef = useRef<number[]>(Array(BEAM_COUNT).fill(-1))
  const yRange   = yTop - yBottom

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    slots.forEach((sl, i) => {
      const raw   = t / CYCLE_TIME + sl.phase0
      const phase = raw % 1
      const cycle = Math.floor(raw)

      if (cycle !== cycleRef.current[i]) {
        cycleRef.current[i] = cycle
        const svc = AWS_SERVICES[(sl.svc0 + cycle) % AWS_SERVICES.length]
        const d = divRefs.current[i]
        if (d) {
          d.textContent       = svc.name
          d.style.color       = svc.color
          d.style.textShadow  = `0 0 10px ${svc.color}, 0 0 22px ${svc.color}55`
          d.style.borderColor = `${svc.color}65`
          d.style.background  = `${svc.color}16`
        }
      }

      const r = rBottom + (rTop - rBottom) * phase
      const x = Math.sin(t * sl.xFreq + sl.xPh) * r * 0.30  // tight lateral spread
      const z = Math.cos(t * sl.zFreq + sl.zPh) * r * 0.15
      const yPos = yBottom + yRange * phase

      const g = grpRefs.current[i]
      if (g) g.position.set(x, yPos, z)

      const d = divRefs.current[i]
      if (d) {
        // slow fade in/out at extremes, stay fully opaque for long middle portion
        const op = phase < 0.06 ? phase / 0.06
                 : phase > 0.92 ? (1 - phase) / 0.08
                 : 1
        d.style.opacity = String(Math.max(0, Math.min(1, op)))
      }
    })
  })

  return (
    <>
      {slots.map((sl, i) => {
        const svc = AWS_SERVICES[sl.svc0]
        return (
          <group key={i} ref={(el) => { grpRefs.current[i] = el }}>
            <Html center zIndexRange={[1, 50]}>
              <div
                ref={(el) => { divRefs.current[i] = el }}
                style={{
                  fontFamily: "'Courier New', monospace",
                  color: svc.color,
                  fontSize: `${fontSize}px`,
                  fontWeight: '800',
                  letterSpacing: '0.10em',
                  whiteSpace: 'nowrap',
                  textShadow: `0 0 8px ${svc.color}, 0 0 20px ${svc.color}88, 0 0 40px ${svc.color}44`,
                  background: `${svc.color}22`,
                  border: `1.5px solid ${svc.color}90`,
                  borderRadius: '4px',
                  padding: '4px 14px',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  backdropFilter: 'blur(2px)',
                  minWidth: '90px',
                  textAlign: 'center',
                }}
              >
                {svc.name}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

// ─── Scene 5 — AWS & DevOps Infrastructure ────────────────────────────────────
export default function Scene5AWSCloud({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const { viewport } = useThree()

  const isMobile = viewport.width < 9
  const s        = Math.min(1.0, Math.max(0.52, viewport.width / 16))
  const cssS     = Math.min(1.0, Math.max(0.65, viewport.width / 16))

  useFrame(() => {
    const dist = Math.abs(scrollStore.progress * 7 - 4)
    groupRef.current.visible = dist < (isMobile ? 0.7 : 1.8)
  })

  const shipY   =  5.5 * s
  const planetR = 22.0 * s
  const planetY = -(planetR - 0.8 * s)   // only thin dome visible at screen bottom

  const beamTop    = shipY - 1.6 * s * 0.84  // just below ship emitter
  const beamBottom = 0.8 * s + 0.45 * s      // just above planet surface

  const rTop    = 0.55 * s
  const rBottom = 2.60 * s
  const fontSize = Math.round((isMobile ? 13 : 17) * cssS)

  const CATEGORIES = [
    { label: 'Compute',  color: '#FF9900' },
    { label: 'Storage',  color: '#4ade80' },
    { label: 'Network',  color: '#a78bfa' },
    { label: 'Database', color: '#22d3ee' },
    { label: 'Security', color: '#f87171' },
  ]

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>

      {/* Scene-level lighting — neutral white to keep planet gray */}
      <directionalLight position={[20, 15, 10]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-10, 5, 8]} intensity={0.5} color="#e8ecf0" />
      <ambientLight intensity={0.18} />

      {/* Deep space backdrop */}
      <mesh>
        <sphereGeometry args={[60, 20, 20]} />
        <meshBasicMaterial color="#010912" transparent opacity={0.97}
          side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* Nebula hints */}
      <mesh position={[-8, 3, -22]} scale={[4, 2.5, 1]}>
        <sphereGeometry args={[7, 12, 12]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.12}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[9, 0, -22]} scale={[3, 2, 1]}>
        <sphereGeometry args={[6, 12, 12]} />
        <meshBasicMaterial color="#0c1e40" transparent opacity={0.10}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <Sparkles count={60} scale={28} size={0.7} speed={0.10} color="#aaccff" opacity={0.09} />

      {/* Realistic UFO */}
      <Spaceship y={shipY} s={s} />

      {/* Tractor beam */}
      <TractorBeam yTop={beamTop} yBottom={beamBottom} rTop={rTop} rBottom={rBottom} />

      {/* Floating service labels */}
      <BeamServices
        yTop={beamTop} yBottom={beamBottom}
        rTop={rTop} rBottom={rBottom}
        fontSize={fontSize}
      />

      {/* Moon planet */}
      <Planet y={planetY} s={s} />

      {/* Scene title */}
      <Html position={[0, shipY + 2.8 * s, 0]} center zIndexRange={[0, 5]}>
        <div style={{ fontFamily: "'Courier New', monospace", textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{
            fontSize: `${Math.round(22 * cssS)}px`,
            fontWeight: '300',
            color: '#e0f2fe',
            letterSpacing: '-0.02em',
            lineHeight: 1.14,
            textShadow: '0 0 40px rgba(0,210,255,0.80)',
          }}>
            AWS & DevOps<br />Infrastructure
          </div>
          <div style={{
            fontSize: `${Math.round(8 * cssS)}px`,
            color: '#22d3ee',
            letterSpacing: '0.20em',
            marginTop: `${Math.round(5 * cssS)}px`,
            opacity: 0.65,
          }}>
            CLOUD SERVICES · BEAM UP
          </div>
        </div>
      </Html>

      {/* Category legend */}
      {!isMobile && (
        <Html position={[-9.5 * s, 1.5 * s, 0]} zIndexRange={[0, 5]}>
          <div style={{
            fontFamily: "'Courier New', monospace",
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '9px',
          }}>
            {CATEGORIES.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: c.color, boxShadow: `0 0 7px ${c.color}`, flexShrink: 0,
                }} />
                <span style={{
                  color: c.color,
                  fontSize: `${Math.round(10 * cssS)}px`,
                  letterSpacing: '0.08em',
                  opacity: 0.85,
                }}>{c.label}</span>
              </div>
            ))}
          </div>
        </Html>
      )}

    </group>
  )
}
