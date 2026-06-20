import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

function sr(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

type PlanetType = 'sun' | 'gas' | 'earth' | 'rocky'

interface ConceptDef {
  id: string
  label: string
  color: string
  type: PlanetType
  sz: number
}

// ─── 40 System Design Concepts ───────────────────────────────────────────────
const CONCEPTS: ConceptDef[] = [
  { id: 'apis',         label: 'APIs',                        color: '#00d4ff', type: 'sun',   sz: 0.72 },
  { id: 'api-gw',       label: 'API Gateways',                color: '#22d3ee', type: 'gas',   sz: 0.58 },
  { id: 'jwts',         label: 'JWTs',                        color: '#06b6d4', type: 'earth', sz: 0.44 },
  { id: 'webhooks',     label: 'Webhooks',                    color: '#00bcd4', type: 'earth', sz: 0.48 },
  { id: 'rest-gql',     label: 'REST vs GraphQL',             color: '#0891b2', type: 'gas',   sz: 0.52 },
  { id: 'lb',           label: 'Load Balancing',              color: '#00d4ff', type: 'sun',   sz: 0.66 },
  { id: 'proxy',        label: 'Proxy & Reverse Proxy',       color: '#0e7490', type: 'rocky', sz: 0.36 },
  { id: 'cdn',          label: 'CDN',                         color: '#22d3ee', type: 'sun',   sz: 0.62 },
  { id: 'polling-ws',   label: 'Long Polling & WebSockets',   color: '#00d4ff', type: 'rocky', sz: 0.33 },
  { id: 'acid',         label: 'ACID Transactions',           color: '#39ff14', type: 'gas',   sz: 0.56 },
  { id: 'db-idx',       label: 'Database Indexes',            color: '#22c55e', type: 'earth', sz: 0.44 },
  { id: 'sharding',     label: 'Database Sharding',           color: '#4ade80', type: 'gas',   sz: 0.58 },
  { id: 'con-hash',     label: 'Consistent Hashing',          color: '#39ff14', type: 'gas',   sz: 0.50 },
  { id: 'cdc',          label: 'CDC',                         color: '#86efac', type: 'rocky', sz: 0.30 },
  { id: 'sql-nosql',    label: 'SQL vs NoSQL',                color: '#39ff14', type: 'sun',   sz: 0.68 },
  { id: 'replication',  label: 'Replication',                 color: '#16a34a', type: 'earth', sz: 0.46 },
  { id: '2pc',          label: 'Two-Phase Commit',            color: '#4ade80', type: 'earth', sz: 0.40 },
  { id: 'scalability',  label: 'Scalability',                 color: '#ffd700', type: 'sun',   sz: 0.76 },
  { id: 'availability', label: 'Availability',                color: '#facc15', type: 'gas',   sz: 0.60 },
  { id: 'spof',         label: 'SPOF',                        color: '#fbbf24', type: 'rocky', sz: 0.33 },
  { id: 'cap',          label: 'CAP Theorem',                 color: '#ffd700', type: 'sun',   sz: 0.64 },
  { id: 'caching',      label: 'Caching',                     color: '#f59e0b', type: 'sun',   sz: 0.64 },
  { id: 'cache-strat',  label: 'Caching Strategies',          color: '#ffd700', type: 'earth', sz: 0.44 },
  { id: 'cache-evict',  label: 'Cache Eviction Policies',     color: '#fde68a', type: 'rocky', sz: 0.32 },
  { id: 'rate-limit',   label: 'Rate Limiting',               color: '#ffd700', type: 'earth', sz: 0.46 },
  { id: 'mq',           label: 'Message Queues',              color: '#8b5cf6', type: 'gas',   sz: 0.56 },
  { id: 'bloom',        label: 'Bloom Filters',               color: '#a855f7', type: 'rocky', sz: 0.32 },
  { id: 'idempotency',  label: 'Idempotency',                 color: '#7c3aed', type: 'rocky', sz: 0.34 },
  { id: 'event-src',    label: 'Event Sourcing',              color: '#9333ea', type: 'gas',   sz: 0.56 },
  { id: 'cqrs',         label: 'CQRS',                        color: '#8b5cf6', type: 'sun',   sz: 0.65 },
  { id: 'saga',         label: 'Saga Pattern',                color: '#6d28d9', type: 'earth', sz: 0.46 },
  { id: 'concurrency',  label: 'Concurrency & Parallelism',   color: '#ff006e', type: 'sun',   sz: 0.65 },
  { id: 'stateful',     label: 'Stateful vs Stateless',       color: '#f43f5e', type: 'earth', sz: 0.44 },
  { id: 'batch-stream', label: 'Batch vs Stream Processing',  color: '#fb7185', type: 'earth', sz: 0.46 },
  { id: 'geohash',      label: 'Geohashing',                  color: '#ff006e', type: 'rocky', sz: 0.32 },
  { id: 'svc-mesh',     label: 'Service Mesh',                color: '#e11d48', type: 'earth', sz: 0.44 },
  { id: 'circ-break',   label: 'Circuit Breaker',             color: '#ff006e', type: 'sun',   sz: 0.65 },
  { id: 'dist-locks',   label: 'Distributed Locks',           color: '#ff6b35', type: 'earth', sz: 0.44 },
  { id: 'consensus',    label: 'Consensus Algorithms',        color: '#f97316', type: 'gas',   sz: 0.58 },
  { id: 'observability',label: 'Observability',               color: '#fb923c', type: 'sun',   sz: 0.72 },
]

// ─── Planet Component ─────────────────────────────────────────────────────────
function Planet({
  concept,
  position,
  idx,
  isMobile,
  szScale,
  isActive,
  onActivate,
}: {
  concept: ConceptDef
  position: [number, number, number]
  idx: number
  isMobile: boolean
  szScale: number
  isActive: boolean          // mobile: controlled from parent
  onActivate: () => void     // mobile: tell parent to activate this planet
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef  = useRef<THREE.Mesh>(null!)
  // Desktop uses local hover state; mobile is driven by parent active state
  const [desktopHover, setDesktopHover] = useState(false)
  const hovered = isMobile ? isActive : desktopHover

  const phase    = sr(idx * 13 + 7) * Math.PI * 2
  const rotSpeed = 0.10 + sr(idx * 3 + 1) * 0.12
  const ringTilt = Math.PI * (0.22 + sr(idx * 7 + 3) * 0.16)
  const curSc    = useRef(1.0)

  const r = concept.sz * szScale
  const { type, color } = concept

  const rIn  = r * 1.45
  const rOut = r * 2.10
  const rTIn = r * 0.14
  const rTOut = r * 0.08

  const rHit = type === 'gas' ? r * 2.6 : type === 'sun' ? r * 1.6 : r * 1.4
  const ttY  = -(type === 'sun' ? 90 : type === 'gas' ? 100 : type === 'earth' ? 72 : 58)

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime() + phase
    if (bodyRef.current) bodyRef.current.rotation.y += delta * rotSpeed
    let tgt = hovered ? 1.45 : 1.0
    if (type === 'sun' && !hovered) tgt *= 1.0 + Math.sin(t * 0.6) * 0.05
    curSc.current += (tgt - curSc.current) * 0.09
    groupRef.current.scale.setScalar(curSc.current)
  })

  const enterDesktop = (e: { stopPropagation: () => void }) => {
    if (isMobile) return
    e.stopPropagation(); setDesktopHover(true)
  }
  const leaveDesktop = () => { if (!isMobile) setDesktopHover(false) }
  const handleClick  = (e: { stopPropagation: () => void }) => {
    if (!isMobile) return
    e.stopPropagation()
    onActivate()   // parent decides open/close toggle
  }

  return (
    <group ref={groupRef} position={position}>

      {/* ══ SUN ══ */}
      {type === 'sun' && (
        <>
          <mesh renderOrder={-2}>
            <sphereGeometry args={[r * 2.4, 12, 12]} />
            <meshBasicMaterial color={color} transparent opacity={hovered ? 0.10 : 0.055}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh renderOrder={-1}>
            <sphereGeometry args={[r * 1.28, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={hovered ? 0.45 : 0.28}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={bodyRef} renderOrder={0}>
            <sphereGeometry args={[r, 32, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} roughness={0.25} metalness={0.0} />
          </mesh>
          <mesh renderOrder={1}>
            <sphereGeometry args={[r * 0.48, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.80}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* ══ GAS GIANT ══ */}
      {type === 'gas' && (
        <>
          <mesh ref={bodyRef} renderOrder={0}>
            <sphereGeometry args={[r, 32, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.90} roughness={0.50} metalness={0.20} />
          </mesh>
          <mesh renderOrder={1}>
            <torusGeometry args={[r * 0.70, r * 0.07, 2, 64]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh renderOrder={2}>
            <sphereGeometry args={[r * 1.06, 24, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.12}
              blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
          </mesh>
          <group rotation={[ringTilt, sr(idx * 5 + 2) * 0.4, 0.08]}>
            <mesh renderOrder={3}>
              <torusGeometry args={[rIn, rTIn, 2, 96]} />
              <meshBasicMaterial color={color} transparent opacity={hovered ? 0.85 : 0.70}
                side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh renderOrder={3}>
              <torusGeometry args={[(rIn + rOut) * 0.5, r * 0.04, 2, 96]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.5}
                side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh renderOrder={3}>
              <torusGeometry args={[rOut, rTOut, 2, 96]} />
              <meshBasicMaterial color={color} transparent opacity={hovered ? 0.55 : 0.40}
                side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh renderOrder={4}>
              <torusGeometry args={[rIn, rTIn * 1.8, 2, 96]} />
              <meshBasicMaterial color={color} transparent opacity={0.14}
                blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </>
      )}

      {/* ══ EARTH-LIKE ══ */}
      {type === 'earth' && (
        <>
          <mesh renderOrder={-1}>
            <sphereGeometry args={[r * 1.55, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={hovered ? 0.07 : 0.03}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={bodyRef} renderOrder={0}>
            <sphereGeometry args={[r, 28, 28]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.40} roughness={0.78} metalness={0.08} />
          </mesh>
          <mesh renderOrder={1}>
            <sphereGeometry args={[r * 0.995, 20, 20]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <mesh renderOrder={2}>
            <sphereGeometry args={[r * 1.07, 20, 20]} />
            <meshBasicMaterial color={color} transparent opacity={hovered ? 0.22 : 0.14}
              blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
          </mesh>
        </>
      )}

      {/* ══ ROCKY ══ */}
      {type === 'rocky' && (
        <>
          <mesh renderOrder={-1}>
            <sphereGeometry args={[r * 1.30, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={hovered ? 0.06 : 0.025}
              blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={bodyRef} renderOrder={0}>
            <sphereGeometry args={[r, 20, 20]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} roughness={0.94} metalness={0.02} />
          </mesh>
        </>
      )}

      {/* Hitbox — desktop hover + mobile click */}
      <mesh
        visible={false}
        onPointerEnter={enterDesktop}
        onPointerLeave={leaveDesktop}
        onClick={handleClick}
      >
        <sphereGeometry args={[rHit, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Tooltip */}
      {hovered && (
        <Html center zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(2, 4, 18, 0.97)',
            border: `2px solid ${color}`,
            borderTop: `3px solid ${color}`,
            borderRadius: 8,
            padding: '10px 24px',
            color: '#ffffff',
            fontSize: isMobile ? 13 : 15,
            fontFamily: '"Share Tech Mono","Courier New",monospace',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 30px ${color}99, 0 0 12px ${color}55`,
            letterSpacing: '0.06em',
            textShadow: `0 0 14px ${color}, 0 0 5px ${color}`,
            pointerEvents: 'none',
            transform: `translateY(${ttY}px)`,
            userSelect: 'none',
          }}>
            {concept.label}
            <span style={{ display: 'block', height: 2, marginTop: 7, background: color, borderRadius: 1, opacity: 0.45 }} />
          </div>
        </Html>
      )}
    </group>
  )
}

// ─── Dense GPU background star cloud ─────────────────────────────────────────
function StarCloud({ isMobile }: { isMobile: boolean }) {
  const geo = useMemo(() => {
    const count   = isMobile ? 800 : 1800
    const pos     = new Float32Array(count * 3)
    const col     = new Float32Array(count * 3)
    const palette = ['#00d4ff','#8b5cf6','#39ff14','#ffd700','#ff006e',
                     '#ffffff','#ffffff','#ffffff','#ff6b35','#22d3ee']
    const c = new THREE.Color()
    const W = isMobile ? 20 : 50
    const H = isMobile ? 32 : 32
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (sr(i * 3)     - 0.5) * W
      pos[i * 3 + 1] = (sr(i * 3 + 1) - 0.5) * H
      pos[i * 3 + 2] = (sr(i * 3 + 2) - 0.5) * 18 - 6
      c.set(palette[Math.floor(sr(i * 7 + 2) * palette.length)])
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(col, 3))
    return g
  }, [isMobile])

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.55}
        sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function Nebula({ pos, color, r, seed }: {
  pos: [number,number,number]; color: string; r: number; seed: number
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const ph  = sr(seed * 11) * Math.PI * 2
  useFrame(({ clock }) => {
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.020 + Math.sin(clock.getElapsedTime() * 0.22 + ph) * 0.008
  })
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[r, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.020}
        blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  )
}

// ─── Scene root ───────────────────────────────────────────────────────────────
export default function Scene3SystemDesign({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const { size } = useThree()
  const isMobile = size.width < 768

  // Mobile: only one tooltip open at a time — null means none
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleActivate = useCallback((id: string) => {
    setActiveId(prev => prev === id ? null : id)
  }, [])

  const clearActive = useCallback(() => { setActiveId(null) }, [])

  // ── Jittered grid positions — fills entire screen edge-to-edge ──────────────
  // Desktop: 8 cols × 5 rows. Mobile: 4 cols × 10 rows (portrait).
  const { positions, szScale } = useMemo(() => {
    const COLS = isMobile ? 4 : 8
    const ROWS = Math.ceil(CONCEPTS.length / COLS)  // 10 or 5

    // Visible half-extents (camera ~12 units from scene, FOV ~75°)
    // half-height ≈ 9.1, half-width ≈ 9.1 × aspect
    const HW = isMobile ? 3.2  : 14.2   // X half-span (leaves ~1 unit margin)
    const HH = isMobile ? 9.0  : 7.4    // Y half-span (title consumes top ~2 units)

    // Cell dimensions
    const cw = (HW * 2) / COLS
    const ch = (HH * 2) / ROWS

    // Jitter is 30% of cell size so planets stay inside their cell but look organic
    const jx = cw * 0.30
    const jy = ch * 0.28

    // Scale planets down on mobile so they fit neatly in narrower cells
    const scale = isMobile ? 0.54 : 1.0

    const pts = CONCEPTS.map((_, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)

      // Grid centre of this cell (origin = screen centre)
      const bx = -HW + cw * (col + 0.5)
      // Shift down by 1 unit to leave room for title at top
      const by = (HH - ch * 0.5) - ch * row - 1.2

      return [
        bx + (sr(i * 5)     - 0.5) * jx * 2,
        by + (sr(i * 5 + 1) - 0.5) * jy * 2,
        (sr(i * 5 + 2) - 0.5) * 3.5,
      ] as [number, number, number]
    })

    return { positions: pts, szScale: scale }
  }, [isMobile])

  useFrame(() => {
    const dist = Math.abs(scrollStore.progress * 7 - 2)
    groupRef.current.visible = dist < 1.8
  })

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>

      {/* Dedicated lights for 3-D depth on planet bodies */}
      <pointLight position={[8, 5, 14]} intensity={2.0} color="#ffffff" />
      <pointLight position={[-6, -3, 10]} intensity={0.6} color="#6688ff" />

      <StarCloud isMobile={isMobile} />

      <Nebula pos={[-9,  3, -7]} color="#00d4ff" r={8}   seed={1} />
      <Nebula pos={[ 8, -3, -8]} color="#8b5cf6" r={7.5} seed={2} />
      <Nebula pos={[ 0,  6, -6]} color="#39ff14" r={6}   seed={3} />
      <Nebula pos={[-7, -5, -7]} color="#ffd700" r={6.5} seed={4} />
      <Nebula pos={[ 9,  6, -8]} color="#ff006e" r={5.5} seed={5} />
      <Nebula pos={[ 0, -2, -9]} color="#ff6b35" r={5}   seed={6} />

      {/* Title */}
      <Text
        position={[0, isMobile ? 8.0 : 8.8, 0]}
        fontSize={isMobile ? 0.46 : 0.64}
        color="#e2e8f0"
        anchorX="center"
        letterSpacing={-0.02}
      >
        System Design Universe
      </Text>
      <Text
        position={[0, isMobile ? 7.28 : 8.04, 0]}
        fontSize={isMobile ? 0.15 : 0.18}
        color="#00d4ff"
        anchorX="center"
        letterSpacing={0.14}
      >
        {isMobile ? 'TAP A PLANET TO EXPLORE' : 'HOVER THE PLANETS TO EXPLORE CONCEPTS'}
      </Text>

      {/* Category legend — desktop only */}
      {!isMobile && (
        <>
          <Text position={[-13.5, -8.8, 0]} fontSize={0.13} color="#00d4ffaa" anchorX="left">● Networking</Text>
          <Text position={[ -9.2, -8.8, 0]} fontSize={0.13} color="#39ff14aa" anchorX="left">● Database</Text>
          <Text position={[ -5.2, -8.8, 0]} fontSize={0.13} color="#ffd700aa" anchorX="left">● Scalability</Text>
          <Text position={[ -1.0, -8.8, 0]} fontSize={0.13} color="#8b5cf6aa" anchorX="left">● Messaging</Text>
          <Text position={[  3.2, -8.8, 0]} fontSize={0.13} color="#ff006eaa" anchorX="left">● Architecture</Text>
          <Text position={[  7.6, -8.8, 0]} fontSize={0.13} color="#ff6b35aa" anchorX="left">● Distributed</Text>
        </>
      )}

      {/* Mobile backdrop — clicking empty space closes the active tooltip */}
      {isMobile && (
        <mesh position={[0, 0, -3]} onClick={clearActive}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* 40 concept planets */}
      {CONCEPTS.map((concept, i) => (
        <Planet
          key={concept.id}
          concept={concept}
          position={positions[i]}
          idx={i}
          isMobile={isMobile}
          szScale={szScale}
          isActive={activeId === concept.id}
          onActivate={() => handleActivate(concept.id)}
        />
      ))}
    </group>
  )
}
