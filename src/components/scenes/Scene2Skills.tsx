/**
 * Scene 2 — Core Skill Network (Redesigned)
 *
 * Responsive layout:
 *  - Cluster positions computed from canvas size + camera FOV + known camera Z=10
 *  - Desktop (≥768px): clusters spread to ±5.5 world units (full-width feel)
 *  - Mobile (<768px): clusters scale inward to fit within the narrower viewport
 *  - Orbit radius also scales down on mobile so dots stay on-screen
 *
 * Mobile interaction:
 *  - Desktop: hover shows/hides skill panel
 *  - Mobile:  tap TOGGLES panel (onPointerLeave is ignored to avoid
 *             immediate-hide when finger lifts before onClick fires)
 */

import { useRef, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Text, Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

// ── Types & Data ─────────────────────────────────────────────────────────────

type GeomType = 'ico' | 'octa' | 'tetra' | 'dodeca'
interface SkillDef { name: string; sub: string }

interface ClusterDef {
  id: string
  label: string
  color: string
  geomType: GeomType
  orbitSpeed: number
  panelRight: boolean   // desktop: panel side. mobile: ignored (always above center)
  skills: SkillDef[]
}

const CENTER: [number, number, number] = [0, -0.5, 0]

const CLUSTERS: ClusterDef[] = [
  {
    id: 'ai',
    label: 'AI & LLM Systems',
    color: '#8b5cf6',
    geomType: 'ico',
    orbitSpeed: 0.22,
    panelRight: true,
    skills: [
      { name: 'LLM Integration',    sub: 'RAG · Agents · Workflows' },
      { name: 'Vector Databases',   sub: 'Pinecone · Weaviate · pgvector' },
      { name: 'Prompt Engineering', sub: 'CoT · Few-shot · Tool Calling' },
      { name: 'AI System Design',   sub: 'Automation · Pipelines' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend & System Design',
    color: '#00d4ff',
    geomType: 'octa',
    orbitSpeed: 0.17,
    panelRight: false,
    skills: [
      { name: 'Java & Spring Boot',   sub: 'Microservices · Production APIs' },
      { name: 'Scalable API Design',  sub: 'REST · Distributed Systems' },
      { name: 'Database Engineering', sub: 'MySQL · Schema · Optimization' },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend Engineering',
    color: '#38bdf8',
    geomType: 'tetra',
    orbitSpeed: 0.28,
    panelRight: true,
    skills: [
      { name: 'React & Angular',         sub: 'Modern UI Systems' },
      { name: 'TypeScript & JavaScript', sub: 'Type-safe · ES2024' },
    ],
  },
  {
    id: 'devops',
    label: 'DevOps & SDLC',
    color: '#4ade80',
    geomType: 'dodeca',
    orbitSpeed: 0.14,
    panelRight: false,
    skills: [
      { name: 'Git & Version Control', sub: 'GitHub · Bitbucket · GitFlow' },
      { name: 'CI/CD Pipelines',       sub: 'Deployment · Automation' },
      { name: 'Cloud Platforms',       sub: 'AWS · Infrastructure' },
    ],
  },
]

// ── Viewport helper ───────────────────────────────────────────────────────────
// Computes the WORLD-UNIT half-extents visible at Scene 2's Z-plane (Z=0),
// using the camera's vertical FOV and its fixed Z distance to the scene.
// This is independent of the camera's Y travel and avoids the inflated values
// that come from using camera-to-world-origin distance.
function useSceneViewport() {
  const { size, camera } = useThree()
  return useMemo(() => {
    const aspect = size.width / size.height
    const cam = camera as THREE.PerspectiveCamera
    const fovRad = ((cam.fov ?? 60) * Math.PI) / 180
    const CAMERA_Z = 10  // camera Z at Scene 2 waypoint
    const halfH = Math.tan(fovRad / 2) * CAMERA_Z
    const halfW = halfH * aspect
    return { halfW, halfH, isMobile: size.width < 768 }
  }, [size.width, size.height, camera])
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SubOrbit({
  count, color, orbitR, speed,
}: {
  count: number; color: string; orbitR: number; speed: number
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const positions = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * orbitR, Math.sin(a) * orbitR * 0.32, Math.sin(a) * orbitR)
    }), [count, orbitR])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    groupRef.current.rotation.y = t * speed
    groupRef.current.rotation.z = Math.sin(t * 0.28) * 0.22
  })

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.2, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function EnergyLink({
  from, to, color, speed,
}: {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  speed: number
}) {
  const packetRef = useRef<THREE.Mesh>(null!)
  const tRef = useRef(Math.random())
  const [fx, fy, fz] = from
  const [tx, ty, tz] = to

  const { lineObj, lineMat, fromVec, toVec } = useMemo(() => {
    const fv = new THREE.Vector3(fx, fy, fz)
    const tv = new THREE.Vector3(tx, ty, tz)
    const geo = new THREE.BufferGeometry().setFromPoints([fv, tv])
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })
    return { lineObj: new THREE.Line(geo, mat), lineMat: mat, fromVec: fv, toVec: tv }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx, fy, fz, tx, ty, tz])

  useFrame(({ clock }, delta) => {
    tRef.current = (tRef.current + delta * speed) % 1
    packetRef.current.position.copy(fromVec.clone().lerp(toVec, tRef.current))
    lineMat.opacity = 0.07 + ((Math.sin(clock.getElapsedTime() * 2.2) + 1) * 0.5) * 0.18
  })

  return (
    <>
      <primitive object={lineObj} />
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshBasicMaterial color={color} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  )
}

function CentralHub() {
  const groupRef = useRef<THREE.Group>(null!)
  const halo1Ref = useRef<THREE.Mesh>(null!)
  const halo2Ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    groupRef.current.rotation.y = t * 0.2
    groupRef.current.rotation.x = Math.sin(t * 0.33) * 0.12
    const b = (Math.sin(t * 1.4) + 1) * 0.5
    ;(halo1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.07 + b * 0.07
    ;(halo2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + b * 0.03
  })

  return (
    <group ref={groupRef} position={CENTER}>
      <mesh>
        <icosahedronGeometry args={[0.58, 1]} />
        <meshPhongMaterial color="#060614" emissive="#0d0a3a" emissiveIntensity={1.0} shininess={120} specular="#00d4ff" />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.66, 2]} />
        <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.80, 1]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={halo1Ref}>
        <sphereGeometry args={[1.05, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.07} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={halo2Ref}>
        <sphereGeometry args={[1.65, 12, 12]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.02} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Sparkles count={22} scale={2.6} size={0.5} speed={0.3} color="#00d4ff" opacity={0.7} />
    </group>
  )
}

function ClusterHub({
  cluster, pos, orbitR, isHovered, isMobile, onHover, onUnhover,
}: {
  cluster: ClusterDef
  pos: [number, number, number]
  orbitR: number
  isHovered: boolean
  isMobile: boolean
  onHover: (id: string) => void
  onUnhover: () => void
}) {
  const hubRef   = useRef<THREE.Mesh>(null!)
  const haloRef  = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const scaleRef = useRef(1.0)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    hubRef.current.rotation.y = t * 0.35
    hubRef.current.rotation.x = t * 0.18
    const b = (Math.sin(t * 1.8) + 1) * 0.5
    ;(haloRef.current.material as THREE.MeshBasicMaterial).opacity = isHovered ? 0.13 + b * 0.1 : 0.04 + b * 0.05
    const target = isHovered ? 1.14 : 1.0
    scaleRef.current += (target - scaleRef.current) * 0.08
    groupRef.current.scale.setScalar(scaleRef.current)
  })

  const g = cluster.geomType

  // Panel sits to the side of the hub — just beyond the orbiting dots.
  // panelRight=true  → panel extends to the RIGHT (used for left-side clusters: AI, Frontend)
  // panelRight=false → panel extends to the LEFT  (used for right-side clusters: Backend, DevOps)
  const sideOffset = orbitR + 0.55
  const panelPos: [number, number, number] = [
    cluster.panelRight ? sideOffset : -sideOffset,
    0.15,
    0,
  ]
  const panelTransform = cluster.panelRight ? 'translateX(0)' : 'translateX(-100%)'

  const panelStyle: React.CSSProperties = {
    transform: panelTransform,
    pointerEvents: 'none',
  }

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!isMobile) onHover(cluster.id)      // desktop: show on hover
  }
  const handlePointerLeave = () => {
    if (!isMobile) onUnhover()              // desktop: hide on hover-out
  }
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()                     // prevent bubbling to background plane
    // Both desktop and mobile: tap/click toggles panel
    isHovered ? onUnhover() : onHover(cluster.id)
  }

  return (
    <group position={pos}>
      <SubOrbit count={cluster.skills.length} color={cluster.color} orbitR={orbitR} speed={cluster.orbitSpeed} />

      <group ref={groupRef}>
        <mesh
          ref={hubRef}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        >
          {g === 'ico'    && <icosahedronGeometry  args={[0.45, 0]} />}
          {g === 'octa'   && <octahedronGeometry   args={[0.45, 0]} />}
          {g === 'tetra'  && <tetrahedronGeometry  args={[0.45, 0]} />}
          {g === 'dodeca' && <dodecahedronGeometry args={[0.42, 0]} />}
          <meshPhongMaterial
            color="#060614"
            emissive={cluster.color}
            emissiveIntensity={isHovered ? 1.5 : 0.85}
            shininess={120}
            specular={cluster.color}
          />
        </mesh>

        <mesh>
          {g === 'ico'    && <icosahedronGeometry  args={[0.55, 1]} />}
          {g === 'octa'   && <octahedronGeometry   args={[0.55, 0]} />}
          {g === 'tetra'  && <tetrahedronGeometry  args={[0.55, 0]} />}
          {g === 'dodeca' && <dodecahedronGeometry args={[0.51, 0]} />}
          <meshBasicMaterial
            color={cluster.color}
            wireframe
            transparent
            opacity={isHovered ? 0.52 : 0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={haloRef}>
          <sphereGeometry args={[0.8, 14, 14]} />
          <meshBasicMaterial color={cluster.color} transparent opacity={0.04} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        <Text
          position={[0, -0.95, 0]}
          fontSize={0.155}
          color={cluster.color}
          anchorX="center"
          maxWidth={2.8}
          textAlign="center"
        >
          {cluster.label}
        </Text>
      </group>

      {isHovered && (
        <Html position={panelPos} style={panelStyle}>
          <div
            className="skill-panel"
            style={{
              borderColor: cluster.color + '55',
              boxShadow: `0 0 32px ${cluster.color}28`,
              minWidth: '200px',
              maxWidth: '260px',
            }}
          >
            <div className="skill-panel-title" style={{ color: cluster.color }}>
              {cluster.label}
            </div>
            {cluster.skills.map((s) => (
              <div key={s.name} className="skill-panel-item">
                <span className="skill-panel-name">{s.name}</span>
                <span className="skill-panel-sub">{s.sub}</span>
              </div>
            ))}
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Main scene ───────────────────────────────────────────────────────────────

export default function Scene2Skills({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // ── Responsive viewport math ──────────────────────────────────────────────
  // We compute world-unit extents from the ACTUAL camera FOV and the known
  // camera Z=10 (Scene 2 waypoint), so this is always accurate regardless
  // of where the camera is in Y (scroll position).
  const { halfW, halfH, isMobile } = useSceneViewport()

  // Cluster positions:  x spread = 72% of half-width, capped at desktop value
  const xSpread = Math.min(halfW * 0.72, 5.5)
  // Orbit radius: leave at least 0.15 world-unit gap from the viewport edge
  const orbitR  = Math.min(1.35, halfW - xSpread - 0.15)
  // Y positions: % of half-height, capped at desktop values
  const yTop    = Math.min(halfH * 0.36, 2.2)
  const yBot    = -Math.min(halfH * 0.50, 3.0)

  const clusterPositions = useMemo((): [number, number, number][] => [
    [-xSpread, yTop,  0.6],
    [ xSpread, yTop, -0.6],
    [-xSpread, yBot, -0.4],
    [ xSpread, yBot,  0.4],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [xSpread, yTop, yBot])

  useFrame(() => {
    const dist = Math.abs(scrollStore.progress * 7 - 1)
    groupRef.current.visible = dist < 1.8
  })

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>

      {/* ── Background click-catcher: closes any open panel when clicking empty space ── */}
      {hoveredId !== null && (
        <mesh
          position={[0, 0, -1]}
          onClick={(e) => { e.stopPropagation(); setHoveredId(null) }}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── Section title ── */}
      <Text position={[0, 5.0, 0]} fontSize={0.52} color="#e2e8f0" anchorX="center" letterSpacing={-0.02}>
        Core Skill Network
      </Text>
      <Text position={[0, 4.35, 0]} fontSize={0.165} color="#00d4ff" anchorX="center" letterSpacing={0.14}>
        AI · BACKEND · FRONTEND · DEVOPS
      </Text>

      {/* ── Central hub ── */}
      <CentralHub />
      <Text position={[0, -1.75, 0]} fontSize={0.155} color="rgba(255,255,255,0.42)" anchorX="center">
        Full Stack AI Engineer
      </Text>

      {/* ── 4 Cluster hubs ── */}
      {CLUSTERS.map((cluster, i) => (
        <ClusterHub
          key={cluster.id}
          cluster={cluster}
          pos={clusterPositions[i]}
          orbitR={orbitR}
          isHovered={hoveredId === cluster.id}
          isMobile={isMobile}
          onHover={setHoveredId}
          onUnhover={() => setHoveredId(null)}
        />
      ))}

      {/* ── Energy links: center → each cluster ── */}
      {CLUSTERS.map((cluster, i) => (
        <EnergyLink
          key={cluster.id}
          from={CENTER}
          to={clusterPositions[i]}
          color={cluster.color}
          speed={0.32 + i * 0.06}
        />
      ))}

      {/* ── Cross links: AI ↔ Backend, Frontend ↔ DevOps ── */}
      <EnergyLink from={clusterPositions[0]} to={clusterPositions[1]} color="#8b5cf6" speed={0.18} />
      <EnergyLink from={clusterPositions[2]} to={clusterPositions[3]} color="#38bdf8" speed={0.16} />

      {/* ── Ambient sparkles ── */}
      <Sparkles count={55} scale={16} size={0.55} speed={0.14} color="#00d4ff" opacity={0.28} />
      <Sparkles count={30} scale={14} size={0.4}  speed={0.09} color="#8b5cf6" opacity={0.2}  />
    </group>
  )
}
