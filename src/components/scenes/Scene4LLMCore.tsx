import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'
import { scene4MobileStore, s4Actions } from '../../store/scene4MobileStore'

interface Props { sceneY: number }

export interface LayerData {
  id: number
  name: string
  baseColor: string
  emissiveColor: string
  glowColor: string
  tools: string[]
  desc: string
  r: number
  pos: [number, number, number]
  emissive: number
  cardPos: [number, number, number]
}

export const LAYERS: LayerData[] = [
  {
    id: 1, name: 'Language Model Layer',
    baseColor: '#18084a', emissiveColor: '#6d28d9', glowColor: '#a855f7',
    tools: ['ChatGPT', 'Claude', 'Mistral', 'Llama', 'Gemini'],
    desc: 'Core intelligence: reasoning, planning & response generation',
    r: 2.7, pos: [-5.2, -1.5, 0], emissive: 0.18, cardPos: [-0.5, 2.2, 1],
  },
  {
    id: 2, name: 'Memory & Context Layer',
    baseColor: '#001e2e', emissiveColor: '#0284c7', glowColor: '#22d3ee',
    tools: ['Redis', 'Weaviate', 'Chroma', 'Milvus', 'Pinecone'],
    desc: 'Stores & retrieves contextual information across interactions',
    r: 1.65, pos: [-0.5, 1.2, -0.5], emissive: 0.28, cardPos: [1.6, 0.8, 0],
  },
  {
    id: 3, name: 'Tooling Layer',
    baseColor: '#061a00', emissiveColor: '#15803d', glowColor: '#4ade80',
    tools: ['LangChain', 'OpenAI', 'LlamaIndex', 'Zapier AI', 'SerpAPI'],
    desc: 'External APIs, databases & software services',
    r: 1.05, pos: [2.8, 1.8, 0], emissive: 0.45, cardPos: [0.2, 0.2, 0],
  },
  {
    id: 4, name: 'Orchestration Layer',
    baseColor: '#280020', emissiveColor: '#be185d', glowColor: '#f472b6',
    tools: ['Crewai', 'Haystack', 'Sem. Kernel', 'Autogen', 'LangGraph'],
    desc: 'Workflows, task planning & multi-agent coordination',
    r: 0.60, pos: [6.2, 1.8, 0.5], emissive: 0.44, cardPos: [3.8, 0.9, 0],
  },
  {
    id: 5, name: 'Communication Layer',
    baseColor: '#180800', emissiveColor: '#7c2d12', glowColor: '#fb923c',
    tools: ['A2A', 'MCP', 'gRPC', 'WebSockets', 'Kafka'],
    desc: 'Messaging & protocols between agents & services',
    r: 0.48, pos: [5.5, -0.5, 0.2], emissive: 0.03, cardPos: [3.2, -1.6, 0],
  },
  {
    id: 6, name: 'Infrastructure Layer',
    baseColor: '#06060e', emissiveColor: '#2d3f52', glowColor: '#e2e8f0',
    tools: ['Docker', 'AWS ECS', 'Kubernetes', 'Vertex AI', 'Azure AI'],
    desc: 'Computing environment for deploying AI agents',
    r: 0.36, pos: [4.2, -2.1, 0.3], emissive: 0.02, cardPos: [2.2, -3.2, 0],
  },
  {
    id: 7, name: 'Evaluation Layer',
    baseColor: '#200000', emissiveColor: '#991b1b', glowColor: '#f87171',
    tools: ['RAGAS', 'LangSmith', 'DeepEval', 'TruLens', 'Arize Phoenix'],
    desc: 'Performance monitoring & hallucination detection',
    r: 0.20, pos: [2.8, -1.3, 0.3], emissive: 0.40, cardPos: [0.8, -2.3, 0],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Procedural planet surface texture
// ─────────────────────────────────────────────────────────────────────────────
function makePlanetTexture(glowHex: string, baseHex: string, seed: number): THREE.CanvasTexture {
  const W = 512, H = 256
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!

  const gr = parseInt(glowHex.slice(1, 3), 16)
  const gg = parseInt(glowHex.slice(3, 5), 16)
  const gb = parseInt(glowHex.slice(5, 7), 16)
  const br = parseInt(baseHex.slice(1, 3), 16)
  const bg = parseInt(baseHex.slice(3, 5), 16)
  const bb = parseInt(baseHex.slice(5, 7), 16)

  ctx.fillStyle = `rgb(${Math.max(br, 10)},${Math.max(bg, 4)},${Math.max(bb, 14)})`
  ctx.fillRect(0, 0, W, H)

  for (let band = 0; band < 14; band++) {
    const y0   = ((band / 14) + (Math.sin(seed + band * 0.5) * 0.04)) * H
    const ht   = (2.0 + Math.sin(seed + band * 1.7) * 1.5) * (H / 22)
    const amp  = W * (0.03 + Math.sin(band * 2.3 + seed) * 0.022)
    const freq = (3 + band % 4) / W
    const alpha = 0.12 + Math.abs(Math.sin(band * 1.4 + seed)) * 0.16
    ctx.beginPath()
    ctx.moveTo(0, y0)
    for (let x = 0; x <= W; x += 2) ctx.lineTo(x, y0 + Math.sin(x * freq * 6.28 + seed * 3) * amp * 0.5)
    for (let x = W; x >= 0; x -= 2) ctx.lineTo(x, y0 + ht + Math.sin(x * freq * 6.28 + seed * 3 + 1) * amp * 0.3)
    ctx.closePath()
    ctx.fillStyle = `rgba(${gr},${gg},${gb},${alpha})`
    ctx.fill()
  }

  for (let s = 0; s < 6; s++) {
    const sx   = ((seed * 137.5 + s * 79.3) % 1) * W
    const sy   = ((seed * 53.1  + s * 113.7) % 1) * H
    const sRad = W * (0.03 + Math.sin(s * 2.1 + seed) * 0.018)
    const grd  = ctx.createRadialGradient(sx, sy, 0, sx, sy, sRad)
    grd.addColorStop(0, `rgba(${Math.min(gr * 2, 255)|0},${Math.min(gg * 1.8, 255)|0},${Math.min(gb * 2, 255)|0},0.32)`)
    grd.addColorStop(1, `rgba(${gr},${gg},${gb},0)`)
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(sx, sy, sRad, sRad * 0.5, s * 0.8 + seed, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

// ─────────────────────────────────────────────────────────────────────────────
// Single planet
// ─────────────────────────────────────────────────────────────────────────────
interface PlanetProps {
  layer: LayerData
  onHover: () => void
  onLeave: () => void
  onClick: () => void
  hovered: boolean
  isMobile: boolean
  overridePos?: [number, number, number]
  overrideR?: number
}

function LayerPlanet({ layer, onHover, onLeave, onClick, hovered, isMobile, overridePos, overrideR }: PlanetProps) {
  const planetRef  = useRef<THREE.Mesh>(null!)
  const cloud1Ref  = useRef<THREE.Mesh>(null!)
  const cloud2Ref  = useRef<THREE.Mesh>(null!)
  const haloRef    = useRef<THREE.Mesh>(null!)
  const matRef     = useRef<THREE.MeshStandardMaterial>(null!)

  const texture = useMemo(
    () => makePlanetTexture(layer.glowColor, layer.baseColor, layer.id * 0.618),
    [layer]
  )

  const r = overrideR ?? layer.r
  const pos = overridePos ?? layer.pos

  const rSpeed = 0.09 + layer.id * 0.013
  const isCrescent = layer.emissive < 0.10
  const rimOpacity = isCrescent
    ? (hovered ? 0.70 : 0.55)
    : (hovered ? 0.26 : 0.18)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (planetRef.current)  planetRef.current.rotation.y  = t * rSpeed
    if (cloud1Ref.current)  { cloud1Ref.current.rotation.y = t * rSpeed * 0.58; cloud1Ref.current.rotation.z = t * 0.022 }
    if (cloud2Ref.current)  { cloud2Ref.current.rotation.y = -t * rSpeed * 0.38; cloud2Ref.current.rotation.x = t * 0.018 }

    const pulse = 1 + Math.sin(t * 1.15 + layer.id) * 0.024
    if (haloRef.current) haloRef.current.scale.setScalar(pulse)

    if (matRef.current) {
      const boost = hovered ? 0.18 : 0
      matRef.current.emissiveIntensity = layer.emissive + boost + Math.sin(t * 1.05 + layer.id) * 0.055
    }
  })

  return (
    <group position={pos}>

      {/* ── Wide outer nebula glow ── */}
      <mesh>
        <sphereGeometry args={[r * 3.8, 24, 24]} />
        <meshBasicMaterial color={layer.glowColor} transparent opacity={0.028}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Saturn-style ring system (L1 only) ── */}
      {layer.id === 1 && (
        <>
          <mesh rotation={[Math.PI * 0.42, 0.10, 0.06]}>
            <ringGeometry args={[r * 1.45, r * 1.80, 200]} />
            <meshBasicMaterial color="#c084fc" transparent opacity={0.44}
              side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh rotation={[Math.PI * 0.42, 0.10, 0.06]}>
            <ringGeometry args={[r * 1.80, r * 1.96, 80]} />
            <meshBasicMaterial color="#030010" transparent opacity={0.94}
              side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh rotation={[Math.PI * 0.42, 0.10, 0.06]}>
            <ringGeometry args={[r * 1.96, r * 2.90, 200]} />
            <meshBasicMaterial color="#9d4edd" transparent opacity={0.24}
              side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh rotation={[Math.PI * 0.42, 0.10, 0.06]}>
            <ringGeometry args={[r * 2.90, r * 3.50, 160]} />
            <meshBasicMaterial color="#7c3aed" transparent opacity={0.07}
              side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI * 0.05, 0.04, Math.PI * 0.14]} scale={[1.7, 0.14, 1.3]}>
            <sphereGeometry args={[r * 2.9, 32, 32]} />
            <meshBasicMaterial color="#c840fb" transparent opacity={0.04}
              side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* ── Mid atmosphere halo ── */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[r * 1.75, 24, 24]} />
        <meshBasicMaterial color={layer.glowColor} transparent
          opacity={layer.id === 1 ? 0.14 : 0.09}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Pink rim halo for L1 ── */}
      {layer.id === 1 && (
        <>
          <mesh>
            <sphereGeometry args={[r * 1.055, 32, 32]} />
            <meshBasicMaterial color="#e040fb" transparent opacity={0.22}
              side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[r * 1.14, 32, 32]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.12}
              side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* ── Tight rim ── */}
      <mesh>
        <sphereGeometry args={[r * 1.08, 24, 24]} />
        <meshBasicMaterial color={layer.glowColor} transparent opacity={rimOpacity}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Cloud layers ── */}
      <mesh ref={cloud1Ref}>
        <sphereGeometry args={[r * 1.006, 40, 40]} />
        <meshBasicMaterial map={texture} transparent opacity={0.22}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={cloud2Ref}>
        <sphereGeometry args={[r * 1.013, 40, 40]} />
        <meshBasicMaterial map={texture} transparent opacity={0.12}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Planet core ── */}
      <mesh
        ref={planetRef}
        onPointerEnter={(e) => { e.stopPropagation(); if (!isMobile) onHover() }}
        onPointerLeave={() => { if (!isMobile) onLeave() }}
        onClick={(e) => { e.stopPropagation(); if (!isMobile) onClick() }}
      >
        <sphereGeometry args={[r, 64, 64]} />
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          color={layer.baseColor}
          emissive={layer.emissiveColor}
          emissiveIntensity={layer.emissive}
          roughness={0.60}
          metalness={0.06}
        />
      </mesh>

      {/* ── Hover ring indicator (desktop only) ── */}
      {hovered && !isMobile && layer.id !== 1 && (
        <mesh rotation={[Math.PI * 0.5, 0, 0]}>
          <ringGeometry args={[r * 1.35, r * 1.44, 64]} />
          <meshBasicMaterial color={layer.glowColor} transparent opacity={0.60}
            side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Info card — exported so Scene4MobileOverlay can use it
// ─────────────────────────────────────────────────────────────────────────────
export function InfoCard({ layer, s, onClose, fullWidth }: {
  layer: LayerData
  s: number
  onClose?: () => void
  fullWidth?: boolean
}) {
  const px = (n: number) => `${Math.round(n * s)}px`
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(5,3,28,0.97) 0%, rgba(10,5,40,0.95) 100%)',
      border: `1px solid ${layer.glowColor}28`,
      borderLeft: `3px solid ${layer.glowColor}`,
      borderRadius: px(6),
      padding: `${px(12)} ${px(16)}`,
      minWidth: fullWidth ? '100%' : px(210),
      maxWidth: fullWidth ? '100%' : px(250),
      backdropFilter: 'blur(16px)',
      fontFamily: "'Courier New', monospace",
      boxShadow: `0 0 28px ${layer.glowColor}18, 0 4px 18px rgba(0,0,0,0.6)`,
      animation: 'fadeInCard 0.18s ease',
      userSelect: 'none' as const,
      position: 'relative' as const,
      boxSizing: 'border-box' as const,
    }}>
      <style>{`@keyframes fadeInCard{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {onClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{
            position: 'absolute', top: px(8), right: px(10),
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.55)', fontSize: px(16),
            cursor: 'pointer', padding: `${px(2)} ${px(5)}`,
            lineHeight: 1,
          }}
        >✕</button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: px(8), marginBottom: px(10) }}>
        <div style={{
          background: layer.glowColor, color: '#000',
          fontSize: px(10), fontWeight: '800',
          padding: `${px(3)} ${px(8)}`, borderRadius: px(3),
          letterSpacing: '0.05em', flexShrink: 0,
        }}>{layer.id}</div>
        <div style={{ color: layer.glowColor, fontSize: px(13), fontWeight: '700', letterSpacing: '0.04em', lineHeight: 1.2 }}>
          {layer.name}
        </div>
      </div>

      <div style={{
        color: 'rgba(255,255,255,0.90)',
        fontSize: px(13),
        marginBottom: px(12),
        lineHeight: 1.65,
        letterSpacing: '0.01em',
      }}>
        {layer.desc}
      </div>

      <div style={{ height: '1px', background: `linear-gradient(90deg,${layer.glowColor}40,transparent)`, marginBottom: px(10) }} />

      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: px(5) }}>
        {layer.tools.map(tool => (
          <span key={tool} style={{
            background: `${layer.glowColor}18`,
            border: `1px solid ${layer.glowColor}50`,
            color: layer.glowColor,
            fontSize: px(10),
            padding: `${px(4)} ${px(8)}`,
            borderRadius: px(3),
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap' as const,
          }}>{tool}</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Arc connections (desktop only)
// ─────────────────────────────────────────────────────────────────────────────
function ArcCircuit() {
  const geometry = useMemo(() => {
    const positions: number[] = []
    LAYERS.forEach((layer, i) => {
      if (i === LAYERS.length - 1) return
      const next = LAYERS[i + 1]
      const a   = new THREE.Vector3(...layer.pos)
      const b   = new THREE.Vector3(...next.pos)
      const mid = a.clone().lerp(b, 0.5)
      mid.y += 0.45
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      const pts = curve.getPoints(22)
      for (let j = 0; j < pts.length - 1; j++) {
        positions.push(pts[j].x, pts[j].y, pts[j].z, pts[j + 1].x, pts[j + 1].y, pts[j + 1].z)
      }
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#a855f7" transparent opacity={0.10} />
    </lineSegments>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene 4 — 7 Layer Agentic AI Architecture
// ─────────────────────────────────────────────────────────────────────────────
export default function Scene4AgenticAI({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)

  const [hoveredId, setHoveredId]             = useState<number | null>(null)
  const [activePlanetIdx, setActivePlanetIdx] = useState(0)

  const hoveredLayer = LAYERS.find(l => l.id === hoveredId) ?? null

  const { viewport } = useThree()
  const sceneScale = Math.min(1.0, Math.max(0.50, viewport.width / 18))
  const cssScale   = Math.min(1.0, Math.max(0.72, viewport.width / 18))
  const isMobile   = viewport.width < 9
  const mobileR    = viewport.width * 0.36
  const activeLayer = LAYERS[activePlanetIdx]

  // ── Register navigation actions into the store (stable refs, no stale closures) ──
  useEffect(() => {
    s4Actions.navigate = (delta) => {
      setActivePlanetIdx(prev => Math.max(0, Math.min(LAYERS.length - 1, prev + delta)))
      setHoveredId(null)
    }
    s4Actions.jumpTo = (idx) => {
      setActivePlanetIdx(idx)
      setHoveredId(null)
    }
    s4Actions.openCard = (id) => setHoveredId(id)
    s4Actions.closeCard = () => setHoveredId(null)
  }, [])

  // ── Sync display state to store so overlay can read it ──
  useEffect(() => {
    scene4MobileStore.set({ planetIdx: activePlanetIdx, cardId: hoveredId })
  }, [activePlanetIdx, hoveredId])

  useFrame(() => {
    const dist = Math.abs(scrollStore.progress * 7 - 3)
    const visible = dist < 1.8
    groupRef.current.visible = visible
    // Overlay only shows on mobile when scene 4 is the active scene (not just nearby)
    scene4MobileStore.set({ isVisible: visible && scrollStore.currentScene === 3 && isMobile })
  })

  const handlePlanetClick = (id: number) => {
    setHoveredId(prev => prev === id ? null : id)
  }

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>

      {/* ── Lighting ── */}
      <pointLight position={[10, 6, 8]}  intensity={2.8} color="#ffffff" />
      <pointLight position={[-14, 4, 5]} intensity={0.30} color="#4c1d95" />
      <pointLight position={[0, -9, 3]}  intensity={0.20} color="#5b21b6" />

      {/* ════════════════════════════════════════════════════════════
          MOBILE — only 3D planet, NO Html overlay.
          All UI is in Scene4MobileOverlay (outside canvas) so there
          is zero Three.js raycasting interference with DOM buttons.
          ════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <LayerPlanet
          key={activeLayer.id}
          layer={activeLayer}
          hovered={false}        // visual hover handled by overlay card open state
          onHover={() => {}}
          onLeave={() => {}}
          onClick={() => {}}     // overlay tap zone handles planet taps
          isMobile={true}
          overridePos={[0, 0, 0]}
          overrideR={mobileR}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
          DESKTOP — full multi-planet layout
          ════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <group scale={[sceneScale, sceneScale, sceneScale]}>

          {/* Scene title */}
          <Html position={[0, 5.6, 0]} center zIndexRange={[0, 5]}>
            <div style={{ fontFamily: "'Courier New', monospace", textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{
                fontSize: `${Math.round(25 * cssScale)}px`, fontWeight: '300',
                color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.12,
                textShadow: '0 0 40px rgba(167,139,250,0.65)',
              }}>
                7 Layer Architecture<br />of Agentic AI
              </div>
              <div style={{
                fontSize: `${Math.round(9.5 * cssScale)}px`, color: '#a78bfa',
                letterSpacing: '0.18em', marginTop: `${Math.round(5 * cssScale)}px`, opacity: 0.7,
              }}>
                HOVER TO EXPLORE
              </div>
            </div>
          </Html>

          {/* Floating name labels (large planets) */}
          {LAYERS.filter(l => l.r >= 1.0).map(layer => (
            <Html
              key={`lbl-${layer.id}`}
              position={[layer.pos[0], layer.pos[1] + layer.r + 0.45, layer.pos[2]]}
              center
              zIndexRange={[1, 5]}
            >
              <div style={{
                fontFamily: "'Courier New', monospace",
                color: layer.glowColor,
                fontSize: `${Math.round(Math.max(9, layer.r * 10.5) * cssScale)}px`,
                letterSpacing: '0.10em', fontWeight: '600',
                textShadow: `0 0 10px ${layer.glowColor}`,
                pointerEvents: 'none', whiteSpace: 'nowrap',
                opacity: hoveredId === layer.id ? 0 : 0.80,
                transition: 'opacity 0.2s',
              }}>
                {layer.id} — {layer.name}
              </div>
            </Html>
          ))}

          {/* Small planet badges */}
          {LAYERS.filter(l => l.r < 1.0).map(layer => (
            <Html
              key={`badge-${layer.id}`}
              position={[layer.pos[0], layer.pos[1] + layer.r + 0.28, layer.pos[2]]}
              center
              zIndexRange={[1, 5]}
            >
              <div style={{
                fontFamily: "'Courier New', monospace",
                color: layer.glowColor,
                fontSize: `${Math.round(8.5 * cssScale)}px`,
                letterSpacing: '0.08em', fontWeight: '600',
                textShadow: `0 0 8px ${layer.glowColor}`,
                pointerEvents: 'none',
                opacity: hoveredId === layer.id ? 0 : 0.60,
                transition: 'opacity 0.2s',
              }}>
                L{layer.id}
              </div>
            </Html>
          ))}

          {/* All planet meshes */}
          {LAYERS.map(layer => (
            <LayerPlanet
              key={layer.id}
              layer={layer}
              hovered={hoveredId === layer.id}
              onHover={() => setHoveredId(layer.id)}
              onLeave={() => setHoveredId(null)}
              onClick={() => handlePlanetClick(layer.id)}
              isMobile={false}
            />
          ))}

          {/* Desktop info card */}
          {hoveredLayer && (
            <Html
              key={hoveredLayer.id}
              position={hoveredLayer.cardPos}
              center={false}
              zIndexRange={[100, 200]}
            >
              <InfoCard layer={hoveredLayer} s={cssScale} />
            </Html>
          )}

          <ArcCircuit />

          <Sparkles count={90} scale={20} size={0.85} speed={0.18} color="#ffffff" opacity={0.09} />

          {/* Deep-space nebula backdrop */}
          <mesh>
            <sphereGeometry args={[38, 24, 24]} />
            <meshBasicMaterial color="#0a0028" transparent opacity={0.72}
              side={THREE.BackSide} depthWrite={false} />
          </mesh>
          <mesh position={[0, -8, 0]} scale={[1, 0.25, 1]}>
            <sphereGeometry args={[30, 24, 24]} />
            <meshBasicMaterial color="#164e63" transparent opacity={0.22}
              side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>

        </group>
      )}

    </group>
  )
}
