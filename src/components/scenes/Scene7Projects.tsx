import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

/* ═══════════════════════════════════════════════════════
   ISS SATELLITE PARTS
   All assembled rotations [0,0,0]. Geometry oriented
   correctly: truss along X, modules along Z.
   ═══════════════════════════════════════════════════════ */

interface SatPart {
  id: string
  aPos: [number, number, number]
  sPos: [number, number, number]
  sRot: [number, number, number]
  type: 'module' | 'truss' | 'solar' | 'radiator' | 'node' | 'antenna'
}

const PARTS: SatPart[] = [
  // Pressurized modules along Z
  { id: 'hab-core',  aPos: [0, 0, 0],        sPos: [0, 10, -6],     sRot: [0.8, 1.2, 0.3],   type: 'module' },
  { id: 'lab-fwd',   aPos: [0, 0, 1.3],      sPos: [5, 8, 5],       sRot: [-0.5, 0.9, -1.5], type: 'module' },
  { id: 'lab-aft',   aPos: [0, 0, -1.3],     sPos: [-5, 9, -4],     sRot: [0.7, -0.6, 1.2],  type: 'module' },
  { id: 'lab-fwd2',  aPos: [0, 0, 2.4],      sPos: [7, 5, 6],       sRot: [1.1, -0.4, 0.6],  type: 'module' },
  { id: 'lab-aft2',  aPos: [0, 0, -2.4],     sPos: [-7, 6, -5],     sRot: [-0.3, 1.8, -0.5], type: 'module' },
  // Node
  { id: 'node-top',  aPos: [0, 0.45, 0],     sPos: [-3, -7, 7],     sRot: [1.4, -0.3, 0.8],  type: 'node' },
  // Truss along X
  { id: 'truss-c',   aPos: [0, 0.5, 0],      sPos: [0, 12, 0],      sRot: [0, 0, 0.5],       type: 'truss' },
  { id: 'truss-l1',  aPos: [-3.2, 0.5, 0],   sPos: [-11, 6, 3],     sRot: [0.3, 1.5, -0.8],  type: 'truss' },
  { id: 'truss-l2',  aPos: [-6.4, 0.5, 0],   sPos: [-14, 3, -3],    sRot: [0.2, -1.0, 0.6],  type: 'truss' },
  { id: 'truss-r1',  aPos: [3.2, 0.5, 0],    sPos: [11, 5, -3],     sRot: [-0.4, -1.3, 0.9], type: 'truss' },
  { id: 'truss-r2',  aPos: [6.4, 0.5, 0],    sPos: [14, 2, 3],      sRot: [-0.2, 1.0, -0.6], type: 'truss' },
  // Solar arrays
  { id: 'sol-l1',    aPos: [-4.8, 0.5, 0],   sPos: [-12, 4, 5],     sRot: [0.5, -0.9, 1.5],  type: 'solar' },
  { id: 'sol-l2',    aPos: [-7.8, 0.5, 0],   sPos: [-15, -1, -4],   sRot: [0.2, 1.5, -0.8],  type: 'solar' },
  { id: 'sol-r1',    aPos: [4.8, 0.5, 0],    sPos: [12, 3, -5],     sRot: [-0.7, 0.6, -1.2], type: 'solar' },
  { id: 'sol-r2',    aPos: [7.8, 0.5, 0],    sPos: [15, -2, 4],     sRot: [-0.4, -1.3, 0.9], type: 'solar' },
  // Radiators
  { id: 'rad-l',     aPos: [-1.8, 0.5, 0],   sPos: [-8, -5, 6],     sRot: [2.1, -1.0, 0.4],  type: 'radiator' },
  { id: 'rad-r',     aPos: [1.8, 0.5, 0],    sPos: [8, -4, -5],     sRot: [0.3, 1.8, -0.5],  type: 'radiator' },
  // Antennas
  { id: 'ant-top',   aPos: [0, 1.6, 0],      sPos: [2, 14, 2],      sRot: [1.4, -0.3, 0.8],  type: 'antenna' },
  { id: 'dock-bot',  aPos: [0, -0.7, 0],     sPos: [-2, -9, 3],     sRot: [-0.5, 0.9, -1.5], type: 'antenna' },
  { id: 'ant-l',     aPos: [-5, 1.2, 0],     sPos: [-10, 9, 2],     sRot: [0.6, -1.2, 0.3],  type: 'antenna' },
  { id: 'ant-r',     aPos: [5, 1.2, 0],      sPos: [10, 8, -2],     sRot: [-0.6, 1.2, -0.3], type: 'antenna' },
]

/* ═══════════════════════════════════════════════════════
   PLANET TEXTURE — Realistic Earth from ISS orbit

   Reference analysis (the photo):
   - TOP 20%: Deep space black, fading to very dark blue
   - 20-30%: Deep navy ocean with subtle cloud wisps
   - 30-40%: Blue ocean with white cloud formations
   - 40-50%: Transition zone — blue-grey clouds, violet haze
   - 50-55%: Thin bright blue atmosphere line (limb)
   - 55-65%: Pink/salmon atmosphere scatter layer
   - 65-100%: Golden/amber sunlit cloud tops, bright whites

   Key: The "limb" (horizon edge) has distinct color banding
   ═══════════════════════════════════════════════════════ */

function createPlanetTexture(): THREE.CanvasTexture {
  const w = 2048, h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!

  // === LAYER 1: Base ocean/land gradient ===
  const base = ctx.createLinearGradient(0, 0, 0, h)
  // Upper: deep ocean
  base.addColorStop(0,    '#020306')
  base.addColorStop(0.10, '#040810')
  base.addColorStop(0.20, '#081828')
  base.addColorStop(0.30, '#0c2840')
  base.addColorStop(0.38, '#103858')
  // Mid: atmosphere transition
  base.addColorStop(0.44, '#1a4868')
  base.addColorStop(0.50, '#3a5878')
  base.addColorStop(0.54, '#5a5878')
  // Limb: pink-salmon zone
  base.addColorStop(0.58, '#886068')
  base.addColorStop(0.62, '#b07060')
  // Lower: golden sunlit surface
  base.addColorStop(0.68, '#c88850')
  base.addColorStop(0.74, '#d8a048')
  base.addColorStop(0.80, '#e0b040')
  base.addColorStop(0.88, '#d8a840')
  base.addColorStop(0.94, '#c89838')
  base.addColorStop(1.0,  '#b08830')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  const rng = (n: number) => {
    const x = Math.sin(n * 127.1 + 42) * 43758.5453
    return x - Math.floor(x)
  }

  // === LAYER 2: Ocean texture — dark subtle variation in upper region ===
  for (let i = 0; i < 500; i++) {
    const x = rng(i * 2.3 + 800) * w
    const y = rng(i * 3.9 + 800) * h * 0.4
    const rx = rng(i * 5.1 + 800) * 100 + 30
    const ry = rx * 0.3
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rng(i * 6.7 + 800) - 0.5) * 0.4)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(10, 30, 60, ${rng(i * 7.3 + 800) * 0.15 + 0.03})`
    ctx.fill()
    ctx.restore()
  }

  // === LAYER 3: White cloud formations (upper hemisphere — over ocean) ===
  for (let i = 0; i < 1200; i++) {
    const x = rng(i * 2.17) * w
    const y = rng(i * 3.71) * h * 0.5
    const rx = rng(i * 5.31) * 100 + 15
    const ry = rx * (0.08 + rng(i * 4.13) * 0.1)
    const angle = (rng(i * 6.91) - 0.5) * 0.3
    const alpha = rng(i * 7.11) * 0.1 + 0.02

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(180, 210, 240, ${alpha})`
    ctx.fill()
    ctx.restore()
  }

  // === LAYER 4: Dense golden cloud cover (lower hemisphere — sunlit) ===
  for (let i = 0; i < 2500; i++) {
    const x = rng(i * 2.17 + 100) * w
    const y = h * 0.5 + rng(i * 3.71 + 100) * h * 0.5
    const rx = rng(i * 5.31 + 100) * 120 + 20
    const ry = rx * (0.06 + rng(i * 4.13 + 100) * 0.1)
    const angle = (rng(i * 6.91 + 100) - 0.5) * 0.3

    // More opaque + brighter in the golden zone
    const yN = (y - h * 0.5) / (h * 0.5)
    const alpha = yN > 0.3
      ? rng(i * 7.11 + 100) * 0.18 + 0.05
      : rng(i * 7.11 + 100) * 0.08 + 0.02

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = yN > 0.3
      ? `rgba(255, 235, 190, ${alpha})`
      : `rgba(220, 210, 200, ${alpha})`
    ctx.fill()
    ctx.restore()
  }

  // === LAYER 5: Bright cloud highlights — specular sun reflection ===
  for (let i = 0; i < 400; i++) {
    const x = rng(i * 11.3 + 300) * w
    const y = h * 0.6 + rng(i * 13.7 + 300) * h * 0.38
    const r = rng(i * 17.1 + 300) * 70 + 10
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(255, 240, 200, ${rng(i * 19.3 + 300) * 0.2 + 0.05})`)
    grad.addColorStop(0.4, `rgba(255, 220, 160, ${rng(i * 21.7 + 300) * 0.08})`)
    grad.addColorStop(1, 'rgba(255, 200, 120, 0)')
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }

  // === LAYER 6: Very bright sun glints (small intense spots) ===
  for (let i = 0; i < 150; i++) {
    const x = rng(i * 31.3 + 600) * w
    const y = h * 0.65 + rng(i * 37.7 + 600) * h * 0.3
    const r = rng(i * 41.1 + 600) * 25 + 5
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(255, 255, 240, ${rng(i * 43.3 + 600) * 0.25 + 0.08})`)
    grad.addColorStop(1, 'rgba(255, 255, 220, 0)')
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }

  // === LAYER 7: Cyclone/swirl patterns ===
  for (let i = 0; i < 8; i++) {
    const cx = rng(i * 51.3 + 700) * w
    const cy = h * 0.15 + rng(i * 57.7 + 700) * h * 0.35
    const r = rng(i * 61.1 + 700) * 50 + 20
    // Spiral arms
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2
      const armR = r * (0.5 + rng(i * 100 + a) * 0.5)
      const ax = cx + Math.cos(angle) * armR * 0.7
      const ay = cy + Math.sin(angle) * armR * 0.3
      ctx.beginPath()
      ctx.ellipse(ax, ay, armR * 0.4, armR * 0.1, angle, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 220, 240, ${rng(i * 200 + a) * 0.06 + 0.01})`
      ctx.fill()
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

/* ── Golden solar panel texture ── */
function createSolarTex(): THREE.CanvasTexture {
  const w = 256, h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#8a7030'
  ctx.fillRect(0, 0, w, h)

  const cx = 16, cy = 8, cw = w / cx, ch = h / cy
  for (let x = 0; x < cx; x++) {
    for (let y = 0; y < cy; y++) {
      const v = 0.85 + Math.random() * 0.3
      ctx.fillStyle = `rgb(${Math.floor(140 * v)},${Math.floor(115 * v)},${Math.floor(50 * v)})`
      ctx.fillRect(x * cw + 0.5, y * ch + 0.5, cw - 1, ch - 1)
    }
  }
  ctx.strokeStyle = 'rgba(60, 50, 20, 0.7)'
  ctx.lineWidth = 1
  for (let x = 0; x <= cx; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, h); ctx.stroke() }
  for (let y = 0; y <= cy; y++) { ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(w, y * ch); ctx.stroke() }

  return new THREE.CanvasTexture(canvas)
}

/* ═══════════════════════════════════════════════════════
   ISS PART RENDERER
   ═══════════════════════════════════════════════════════ */

function ISSPart({
  part, assemblyRef, solarTex,
}: {
  part: SatPart
  assemblyRef: React.MutableRefObject<number>
  solarTex: THREE.CanvasTexture
}) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!groupRef.current) return
    const p = assemblyRef.current
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2

    groupRef.current.position.set(
      THREE.MathUtils.lerp(part.sPos[0], part.aPos[0], e),
      THREE.MathUtils.lerp(part.sPos[1], part.aPos[1], e),
      THREE.MathUtils.lerp(part.sPos[2], part.aPos[2], e),
    )
    groupRef.current.rotation.set(
      THREE.MathUtils.lerp(part.sRot[0], 0, e),
      THREE.MathUtils.lerp(part.sRot[1], 0, e),
      THREE.MathUtils.lerp(part.sRot[2], 0, e),
    )
  })

  return (
    <group ref={groupRef}>
      {/* ── PRESSURIZED MODULE — Rectangular boxy shape like real ISS ── */}
      {part.type === 'module' && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          {/* Main body — octagonal cross-section (8-sided cylinder) */}
          <mesh>
            <cylinderGeometry args={[0.34, 0.34, 1.2, 8]} />
            <meshStandardMaterial color="#c8ccd2" metalness={0.55} roughness={0.35} />
          </mesh>
          {/* Flat bulkhead end caps */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.34, 0.28, 0.06, 8]} />
            <meshStandardMaterial color="#a0a8b0" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.28, 0.34, 0.06, 8]} />
            <meshStandardMaterial color="#a0a8b0" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Docking port rings */}
          <mesh position={[0, 0.63, 0]}>
            <torusGeometry args={[0.18, 0.025, 6, 8]} />
            <meshStandardMaterial color="#808890" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.63, 0]}>
            <torusGeometry args={[0.18, 0.025, 6, 8]} />
            <meshStandardMaterial color="#808890" metalness={0.7} roughness={0.25} />
          </mesh>
          {/* External equipment panels — boxy protrusions */}
          {[0.25, -0.15].map((y, i) => (
            <mesh key={`panel-${i}`} position={[0.34, y, 0]}>
              <boxGeometry args={[0.06, 0.2, 0.18]} />
              <meshStandardMaterial color="#9098a0" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
          {/* MMOD shield strips — horizontal lines on hull */}
          {[-0.4, -0.15, 0.1, 0.35].map((y, i) => (
            <mesh key={`strip-${i}`} position={[0, y, 0]}>
              <torusGeometry args={[0.345, 0.008, 4, 8]} />
              <meshStandardMaterial color="#a8b0b8" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          {/* MLI thermal blanket patches */}
          <mesh position={[-0.12, 0.1, 0.32]}>
            <boxGeometry args={[0.2, 0.35, 0.01]} />
            <meshStandardMaterial color="#c8a040" metalness={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[0.12, -0.2, -0.32]}>
            <boxGeometry args={[0.15, 0.25, 0.01]} />
            <meshStandardMaterial color="#c8a040" metalness={0.3} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* ── NODE — Junction with multiple docking ports ── */}
      {part.type === 'node' && (
        <group>
          {/* Shorter, wider octagonal body */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.5, 8]} />
            <meshStandardMaterial color="#d0d4d8" metalness={0.5} roughness={0.35} />
          </mesh>
          {/* 4 docking port stubs (top, bottom, left, right) */}
          {[
            { p: [0, 0.35, 0] as [number,number,number], r: [0,0,0] as [number,number,number] },
            { p: [0, -0.35, 0] as [number,number,number], r: [Math.PI,0,0] as [number,number,number] },
            { p: [0.38, 0, 0] as [number,number,number], r: [0,0,-Math.PI/2] as [number,number,number] },
            { p: [-0.38, 0, 0] as [number,number,number], r: [0,0,Math.PI/2] as [number,number,number] },
          ].map((d, i) => (
            <group key={i} position={d.p} rotation={d.r}>
              <mesh>
                <cylinderGeometry args={[0.14, 0.16, 0.12, 8]} />
                <meshStandardMaterial color="#a0a8b0" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <torusGeometry args={[0.12, 0.015, 4, 8]} />
                <meshStandardMaterial color="#808890" metalness={0.7} roughness={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ── TRUSS — Open lattice beam like real ITS ── */}
      {part.type === 'truss' && (
        <group>
          {/* 4 longerons (corner rails) */}
          {[
            [0, 0.08, 0.08], [0, -0.08, 0.08],
            [0, 0.08, -0.08], [0, -0.08, -0.08],
          ].map(([x, y, z], i) => (
            <mesh key={`long-${i}`} position={[x, y, z]}>
              <boxGeometry args={[3.2, 0.025, 0.025]} />
              <meshStandardMaterial color="#b8c0c8" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          {/* Cross braces — X pattern */}
          {Array.from({ length: 10 }, (_, j) => {
            const xO = -1.4 + j * 0.32
            return (
              <group key={j}>
                {/* Diagonal braces in Y-Z plane */}
                <mesh position={[xO, 0, 0.08]} rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.2, 0.012, 0.012]} />
                  <meshStandardMaterial color="#909aa4" metalness={0.55} roughness={0.35} />
                </mesh>
                <mesh position={[xO, 0, 0.08]} rotation={[0, 0, -Math.PI / 4]}>
                  <boxGeometry args={[0.2, 0.012, 0.012]} />
                  <meshStandardMaterial color="#909aa4" metalness={0.55} roughness={0.35} />
                </mesh>
                <mesh position={[xO, 0, -0.08]} rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.2, 0.012, 0.012]} />
                  <meshStandardMaterial color="#909aa4" metalness={0.55} roughness={0.35} />
                </mesh>
                <mesh position={[xO, 0, -0.08]} rotation={[0, 0, -Math.PI / 4]}>
                  <boxGeometry args={[0.2, 0.012, 0.012]} />
                  <meshStandardMaterial color="#909aa4" metalness={0.55} roughness={0.35} />
                </mesh>
                {/* Horizontal battens connecting top/bottom */}
                <mesh position={[xO, 0.08, 0]} rotation={[Math.PI / 4, 0, 0]}>
                  <boxGeometry args={[0.012, 0.2, 0.012]} />
                  <meshStandardMaterial color="#909aa4" metalness={0.55} roughness={0.35} />
                </mesh>
                <mesh position={[xO, -0.08, 0]} rotation={[Math.PI / 4, 0, 0]}>
                  <boxGeometry args={[0.012, 0.2, 0.012]} />
                  <meshStandardMaterial color="#909aa4" metalness={0.55} roughness={0.35} />
                </mesh>
              </group>
            )
          })}
          {/* Equipment boxes mounted on truss */}
          <mesh position={[0.5, 0.15, 0]}>
            <boxGeometry args={[0.12, 0.08, 0.1]} />
            <meshStandardMaterial color="#808890" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-0.8, -0.15, 0]}>
            <boxGeometry args={[0.1, 0.06, 0.08]} />
            <meshStandardMaterial color="#888890" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* ── SOLAR ARRAYS — Multi-segment blanket panels ── */}
      {part.type === 'solar' && (
        <group>
          {/* Rotary joint (SARJ-like) */}
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
            <meshStandardMaterial color="#a0a8b0" metalness={0.65} roughness={0.3} />
          </mesh>
          {/* Mast/boom extending up and down */}
          {[1, -1].map(dir => (
            <group key={dir} position={[0, dir * 1.5, 0]}>
              {/* Central mast */}
              <mesh>
                <boxGeometry args={[0.03, 2.6, 0.03]} />
                <meshStandardMaterial color="#a0a8b0" metalness={0.55} roughness={0.35} />
              </mesh>
              {/* Solar blanket — 4 segments with gaps */}
              {[0.9, 0.3, -0.3, -0.9].map((yOff, si) => (
                <group key={si}>
                  <mesh position={[0, yOff, 0]}>
                    <boxGeometry args={[1.8, 0.5, 0.008]} />
                    <meshStandardMaterial map={solarTex} metalness={0.25} roughness={0.45} side={THREE.DoubleSide} />
                  </mesh>
                  {/* Horizontal tension wires */}
                  <mesh position={[0, yOff + 0.25, 0]}>
                    <boxGeometry args={[1.8, 0.005, 0.005]} />
                    <meshStandardMaterial color="#808080" metalness={0.6} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, yOff - 0.25, 0]}>
                    <boxGeometry args={[1.8, 0.005, 0.005]} />
                    <meshStandardMaterial color="#808080" metalness={0.6} roughness={0.3} />
                  </mesh>
                </group>
              ))}
              {/* Guide wires along edges */}
              <mesh position={[-0.9, 0, 0]}>
                <boxGeometry args={[0.008, 2.6, 0.008]} />
                <meshStandardMaterial color="#707880" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0.9, 0, 0]}>
                <boxGeometry args={[0.008, 2.6, 0.008]} />
                <meshStandardMaterial color="#707880" metalness={0.6} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ── RADIATOR — Multi-panel heat rejection system ── */}
      {part.type === 'radiator' && (
        <group rotation={[0, Math.PI / 2, 0]}>
          {/* Radiator boom */}
          <mesh>
            <boxGeometry args={[0.02, 0.02, 0.4]} />
            <meshStandardMaterial color="#a0a8b0" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* 3 radiator panels */}
          {[-0.35, 0, 0.35].map((xOff, i) => (
            <mesh key={i} position={[xOff, 0, 0]}>
              <boxGeometry args={[0.3, 0.9, 0.01]} />
              <meshStandardMaterial color="#e8eaec" metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {/* Cross supports */}
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[1.05, 0.012, 0.012]} />
            <meshStandardMaterial color="#b0b8c0" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[1.05, 0.012, 0.012]} />
            <meshStandardMaterial color="#b0b8c0" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      )}

      {/* ── ANTENNA — Dish + boom ── */}
      {part.type === 'antenna' && (
        <group>
          {/* Boom */}
          <mesh>
            <boxGeometry args={[0.015, 0.9, 0.015]} />
            <meshStandardMaterial color="#b0b8c0" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Dish — shallow cone */}
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.12, 0.05, 8, 1, true]} />
            <meshStandardMaterial color="#e0e0e0" metalness={0.35} roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* Feed horn */}
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.015, 0.025, 0.06, 6]} />
            <meshStandardMaterial color="#c0c8d0" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Cross-strut */}
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.01, 0.3, 0.01]} />
            <meshStandardMaterial color="#a0a8b0" metalness={0.55} roughness={0.35} />
          </mesh>
          {/* Base bracket */}
          <mesh position={[0, -0.45, 0]}>
            <boxGeometry args={[0.06, 0.04, 0.06]} />
            <meshStandardMaterial color="#909098" metalness={0.55} roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   PLANET — MASSIVE with realistic atmosphere
   Positioned so only horizon arc is visible at bottom
   Multiple concentric atmosphere shells for realism
   ═══════════════════════════════════════════════════════ */

function Planet() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const texture = useMemo(() => createPlanetTexture(), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.003
  })

  // Only render top portion of sphere (thetaStart=0, thetaLength=PI/2.5)
  // This prevents geometry from extending into Scene 8 below
  const thetaCut = Math.PI / 2.5

  return (
    <group position={[0, -48, -16]}>
      {/* Planet body — only top cap rendered */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[46, 128, 48, 0, Math.PI * 2, 0, thetaCut]} />
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.03} side={THREE.DoubleSide} />
      </mesh>

      {/* Atmosphere 1: Sharp bright blue limb */}
      <mesh>
        <sphereGeometry args={[46.1, 128, 32, 0, Math.PI * 2, 0, thetaCut]} />
        <meshBasicMaterial color="#3399ff" transparent opacity={0.4} side={THREE.BackSide} />
      </mesh>

      {/* Atmosphere 2: Blue glow */}
      <mesh>
        <sphereGeometry args={[46.35, 64, 24, 0, Math.PI * 2, 0, thetaCut]} />
        <meshBasicMaterial color="#4488dd" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>

      {/* Atmosphere 3: Violet/purple transition */}
      <mesh>
        <sphereGeometry args={[46.7, 64, 24, 0, Math.PI * 2, 0, thetaCut]} />
        <meshBasicMaterial color="#6655aa" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      {/* Atmosphere 4: Pink scatter */}
      <mesh>
        <sphereGeometry args={[47.1, 48, 16, 0, Math.PI * 2, 0, thetaCut]} />
        <meshBasicMaterial color="#aa6688" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* Atmosphere 5: Wide outer haze */}
      <mesh>
        <sphereGeometry args={[47.8, 32, 12, 0, Math.PI * 2, 0, thetaCut]} />
        <meshBasicMaterial color="#4477bb" transparent opacity={0.02} side={THREE.BackSide} />
      </mesh>

      {/* Sunlight */}
      <directionalLight position={[50, 20, 25]} intensity={4} color="#ffe0a0" />
      <pointLight position={[40, 12, 20]} intensity={6} color="#ffb840" distance={80} />
      <pointLight position={[-35, -10, 15]} intensity={1} color="#4488cc" distance={60} />
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   FLOATING HOLOGRAPHIC VISION — Responsive 3D text.
   Positions scale with viewport aspect ratio so text
   stays visible on mobile (narrow) and desktop (wide).
   ═══════════════════════════════════════════════════════ */

interface FloatingItem {
  text: string
  color: string
  size: number
  pos: [number, number, number]
  drift: number
}

// Desktop base positions (aspect ~1.6+)
const FLOATING_ITEMS: FloatingItem[] = [
  // ── Left cluster: AI Dev Stack (green) ──
  { text: 'AI-Powered Dev Stack',  color: '#39ff14', size: 0.22, pos: [-8.5, 3.5, 1],   drift: 0 },
  { text: 'Claude Code',           color: '#39ff14', size: 0.15, pos: [-9.5, 2.4, 1],   drift: 0.8 },
  { text: 'Cursor AI',             color: '#39ff14', size: 0.15, pos: [-7.5, 2.3, 1],   drift: 1.6 },
  { text: 'Antigravity',           color: '#39ff14', size: 0.14, pos: [-10, 1.4, 1],    drift: 2.4 },
  { text: 'Warp Terminal',         color: '#39ff14', size: 0.14, pos: [-7.8, 1.3, 1],   drift: 3.2 },
  { text: 'GitHub Copilot',        color: '#39ff14', size: 0.15, pos: [-9, 0.4, 1],     drift: 4.0 },

  // ── Right cluster: Future Autonomous (pink) ──
  { text: 'Future: Autonomous',    color: '#ff006e', size: 0.22, pos: [8.5, 3.5, 1],    drift: 0.5 },
  { text: 'Multi-Agent Teams',     color: '#ff006e', size: 0.15, pos: [7.5, 2.4, 1],    drift: 1.3 },
  { text: 'Self-Healing Code',     color: '#ff006e', size: 0.15, pos: [9.5, 2.3, 1],    drift: 2.1 },
  { text: 'AI Code Review',        color: '#ff006e', size: 0.14, pos: [7.8, 1.3, 1],    drift: 2.9 },
  { text: 'Auto-Deploy Pipelines', color: '#ff006e', size: 0.14, pos: [10, 1.4, 1],     drift: 3.7 },
  { text: 'MCP + A2A Protocol',    color: '#ff006e', size: 0.14, pos: [8.2, 0.4, 1],    drift: 4.5 },
  { text: 'Zero-Human CI/CD',      color: '#ff006e', size: 0.14, pos: [10, 0.3, 1],     drift: 5.3 },

  // ── Top arc: Automation & Frameworks (purple) ──
  { text: 'Automation & Frameworks', color: '#8b5cf6', size: 0.2, pos: [0, 5.5, 0],     drift: 0.3 },
  { text: 'BMAD Method',            color: '#8b5cf6', size: 0.14, pos: [-3.5, 4.8, 0],  drift: 1.1 },
  { text: 'GSD Framework',          color: '#8b5cf6', size: 0.14, pos: [3.5, 4.8, 0],   drift: 1.9 },
  { text: 'Superpowers',            color: '#8b5cf6', size: 0.13, pos: [-5.5, 4.3, 0],  drift: 2.7 },
  { text: 'OpenSpec',                color: '#8b5cf6', size: 0.13, pos: [5.5, 4.3, 0],   drift: 3.5 },
  { text: 'Agentic Workflows',      color: '#8b5cf6', size: 0.14, pos: [0, 4.5, 0],     drift: 4.3 },

  // ── Scattered vision phrases (cyan/mixed) ──
  { text: 'Human-like AI Collaboration', color: '#00d4ff', size: 0.2,  pos: [-6, 5.2, -1],   drift: 0.2 },
  { text: 'The Future Is Autonomous',    color: '#ff006e', size: 0.2,  pos: [6, 5.0, -1],    drift: 1.0 },
  { text: 'From Prompt to Production',   color: '#8b5cf6', size: 0.16, pos: [-3, 6.2, -1],   drift: 1.8 },
  { text: 'Multi-Agent Intelligence',    color: '#ff006e', size: 0.16, pos: [3, 6.0, -1],    drift: 2.6 },
  { text: 'Agents That Think & Build',   color: '#39ff14', size: 0.15, pos: [-6.5, -0.5, 0], drift: 3.4 },
  { text: 'Code That Writes Itself',     color: '#8b5cf6', size: 0.15, pos: [6.5, -0.5, 0],  drift: 4.2 },
  { text: 'AI Pair Programming',         color: '#00d4ff', size: 0.15, pos: [-5, -1.5, 1],   drift: 5.0 },
  { text: 'Ship 10x Faster',            color: '#39ff14', size: 0.15, pos: [5, -1.5, 1],    drift: 5.8 },
]

function FloatingVision({ assemblyRef }: { assemblyRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { viewport } = useThree()

  // Responsive scale: on mobile (narrow), compress X positions inward
  // aspect < 1 = portrait/mobile, aspect > 1.5 = desktop
  const aspect = viewport.width / viewport.height
  const xScale = aspect < 1 ? 0.42 : aspect < 1.2 ? 0.6 : 1
  const sizeScale = aspect < 1 ? 0.75 : aspect < 1.2 ? 0.85 : 1

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const p = assemblyRef.current
    groupRef.current.visible = p > 0.65
    const t = clock.getElapsedTime()

    groupRef.current.children.forEach((child, i) => {
      if (i < FLOATING_ITEMS.length) {
        const item = FLOATING_ITEMS[i]
        const baseX = item.pos[0] * xScale
        const baseY = item.pos[1]
        child.position.x = baseX + Math.sin(t * 0.2 + item.drift * 1.3) * 0.04
        child.position.y = baseY + Math.sin(t * 0.35 + item.drift) * 0.06
      }
    })
  })

  return (
    <group ref={groupRef}>
      {FLOATING_ITEMS.map((item, i) => (
        <Text
          key={i}
          position={[item.pos[0] * xScale, item.pos[1], item.pos[2]]}
          fontSize={item.size * sizeScale}
          color={item.color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={1}
          letterSpacing={item.size >= 0.2 ? 0.06 : 0.03}
        >
          {item.text}
        </Text>
      ))}
      {/* Central quote — below ISS, above planet */}
      <Text
        position={[0, -3, 2]}
        fontSize={0.11 * sizeScale}
        color="#00d4ff"
        anchorX="center"
        fillOpacity={0.6}
        letterSpacing={0.03}
        maxWidth={aspect < 1 ? 6 : 14}
        textAlign="center"
      >
        {"\"The future of software engineering is AI that thinks, builds, and ships alongside you\""}
      </Text>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN SCENE
   ═══════════════════════════════════════════════════════ */

export default function Scene7Projects({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const satelliteRef = useRef<THREE.Group>(null!)
  const assemblyRef = useRef(0)
  const solarTex = useMemo(() => createSolarTex(), [])
  const { viewport } = useThree()

  const aspect = viewport.width / viewport.height
  const satScale = aspect < 0.7 ? 0.45 : aspect < 1 ? 0.55 : aspect < 1.2 ? 0.7 : 1

  useFrame(({ clock }) => {
    const dist = Math.abs(scrollStore.progress * 7 - 6)
    groupRef.current.visible = dist < 1.2

    const sceneProgress = 1 - Math.min(dist, 1.5) / 1.5
    assemblyRef.current = THREE.MathUtils.clamp(sceneProgress, 0, 1)

    // Gentle sway when assembled
    if (satelliteRef.current && assemblyRef.current > 0.9) {
      const t = clock.getElapsedTime()
      satelliteRef.current.position.x = Math.sin(t * 0.3) * 0.35
      satelliteRef.current.position.y = 2 + Math.sin(t * 0.2) * 0.12
    }
  })

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>
      {/* Strong warm sunlight */}
      <directionalLight position={[12, 8, 10]} intensity={3.5} color="#fff5d8" />
      <directionalLight position={[-6, 4, 8]} intensity={0.6} color="#88aadd" />
      <ambientLight intensity={0.3} />

      {/* Title */}
      <Text position={[0, 7.5, 0]} fontSize={0.65} color="#e2e8f0" anchorX="center" letterSpacing={-0.02}>
        Where I'm Going
      </Text>
      <Text position={[0, 6.7, 0]} fontSize={0.22} color="#00d4ff" anchorX="center" letterSpacing={0.12}>
        AI VISION
      </Text>

      {/* ISS satellite — scales down on mobile */}
      <group ref={satelliteRef} position={[0, 2, 0]} scale={satScale}>
        {PARTS.map(part => (
          <ISSPart key={part.id} part={part} assemblyRef={assemblyRef} solarTex={solarTex} />
        ))}
      </group>

      {/* Planet */}
      <Planet />

      {/* Floating holographic vision — orbits around scene */}
      <FloatingVision assemblyRef={assemblyRef} />

      {/* Space dust */}
      <Sparkles count={25} scale={20} size={0.15} speed={0.08} color="#6688cc" opacity={0.1} position={[0, 2, 0]} />
    </group>
  )
}
