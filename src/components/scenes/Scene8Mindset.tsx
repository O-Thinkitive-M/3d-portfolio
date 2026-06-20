import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

/* ── Rocky mountain with vertex-colored snow caps ── */
function RockyMountain({ position, scale = 1, seed = 0, snowLine = 0.65 }: {
  position: [number, number, number]
  scale?: number
  seed?: number
  snowLine?: number // 0-1, where snow starts (fraction of height)
}) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 2.5, 12, 8)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    let maxY = -Infinity

    // First pass: find max height
    for (let i = 0; i < pos.count; i++) {
      maxY = Math.max(maxY, pos.getY(i))
    }

    // Second pass: displace + color
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)

      // Jagged rocky displacement — stronger on sides, less on tip
      const heightFrac = (y + 1.25) / 2.5
      const displacement =
        (Math.sin(x * 8 + seed) * 0.08 +
         Math.sin(z * 6 + seed * 1.3) * 0.06 +
         Math.sin((x + z) * 12 + seed * 2) * 0.03) *
        (1 - heightFrac * 0.5) // less displacement near peak

      pos.setX(i, x + displacement * (1 + Math.random() * 0.3))
      pos.setZ(i, z + displacement * 0.8)
      // Slight Y variation for ruggedness
      pos.setY(i, y + Math.sin(x * 5 + z * 7 + seed) * 0.04)

      // Vertex coloring: rock grey → snow white at top
      const normalizedY = (y + 1.25) / 2.5
      if (normalizedY > snowLine) {
        // Snow — white with slight blue tint
        const snowBlend = Math.min(1, (normalizedY - snowLine) / (1 - snowLine))
        colors[i * 3]     = 0.85 + snowBlend * 0.15 // R
        colors[i * 3 + 1] = 0.87 + snowBlend * 0.13 // G
        colors[i * 3 + 2] = 0.92 + snowBlend * 0.08 // B
      } else if (normalizedY > snowLine - 0.15) {
        // Rock-snow transition
        const t = (normalizedY - (snowLine - 0.15)) / 0.15
        colors[i * 3]     = 0.35 + t * 0.5
        colors[i * 3 + 1] = 0.32 + t * 0.55
        colors[i * 3 + 2] = 0.28 + t * 0.64
      } else if (normalizedY > 0.2) {
        // Mid rock — grey-brown
        colors[i * 3]     = 0.32 + Math.sin(seed + x * 3) * 0.05
        colors[i * 3 + 1] = 0.30 + Math.sin(seed + z * 3) * 0.04
        colors[i * 3 + 2] = 0.26 + Math.sin(seed + x * 2) * 0.03
      } else {
        // Base — darker rock with moss hints
        colors[i * 3]     = 0.22 + Math.sin(seed + x * 4) * 0.04
        colors[i * 3 + 1] = 0.25 + Math.sin(seed + z * 4) * 0.05
        colors[i * 3 + 2] = 0.18
      }
    }

    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [seed, snowLine])

  return (
    <mesh position={position} scale={scale} geometry={geo}>
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        flatShading
      />
    </mesh>
  )
}

/* ── Pine tree silhouette — narrow stacked cones ── */
function PineTree({ position, scale = 1 }: {
  position: [number, number, number]
  scale?: number
}) {
  const darkGreen = useMemo(() => {
    const base = 0.12 + Math.random() * 0.08
    return new THREE.Color(base * 0.5, base, base * 0.3)
  }, [])

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.04, 0.3, 4]} />
        <meshStandardMaterial color="#3d2b1a" roughness={0.95} />
      </mesh>
      {/* Tiered canopy — 4 narrow overlapping cones */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.22, 0.45, 6]} />
        <meshStandardMaterial color={darkGreen} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.18, 0.4, 6]} />
        <meshStandardMaterial color={darkGreen} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.13, 0.35, 5]} />
        <meshStandardMaterial color={darkGreen} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <coneGeometry args={[0.08, 0.25, 5]} />
        <meshStandardMaterial color={darkGreen} roughness={0.85} flatShading />
      </mesh>
    </group>
  )
}

/* ── Turquoise alpine lake ── */
function Lake() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    ;(ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.2 + Math.sin(t * 0.5) * 0.05
  })

  return (
    <mesh ref={ref} position={[0, -2.18, -2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12, 6]} />
      <meshStandardMaterial
        color="#1ca3aa"
        emissive="#0e8a8f"
        emissiveIntensity={0.2}
        roughness={0.05}
        metalness={0.6}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

/* ── Forest floor / ground ── */
function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(45, 30, 40, 30)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // Gentle rolling
      const h = Math.sin(x * 0.3) * Math.cos(z * 0.25) * 0.15 +
                Math.sin(x * 0.8 + z * 0.6) * 0.08
      pos.setY(i, h)

      // Varied green tones
      const noise = Math.sin(x * 2.1 + z * 1.7) * 0.1
      colors[i * 3]     = 0.12 + noise * 0.3 // R
      colors[i * 3 + 1] = 0.30 + noise + Math.random() * 0.05 // G
      colors[i * 3 + 2] = 0.08 + noise * 0.2 // B
    }

    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh position={[0, -2.2, -2]} geometry={geo}>
      <meshStandardMaterial vertexColors roughness={0.95} flatShading />
    </mesh>
  )
}

export default function Scene8Mindset({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)

  // Pine tree positions — clustered around lake edges and hillsides
  const pines = useMemo(() => [
    // Left foreground
    { pos: [-5, -1.9, 1] as [number, number, number], s: 1.4 },
    { pos: [-4.2, -1.95, 0.5] as [number, number, number], s: 1.1 },
    { pos: [-5.8, -2, 0] as [number, number, number], s: 0.9 },
    { pos: [-3.5, -2, -0.5] as [number, number, number], s: 1.2 },
    // Right foreground
    { pos: [5, -1.9, 1] as [number, number, number], s: 1.3 },
    { pos: [4.3, -1.95, 0.5] as [number, number, number], s: 1.0 },
    { pos: [5.8, -2, 0] as [number, number, number], s: 0.85 },
    { pos: [3.6, -2, -0.5] as [number, number, number], s: 1.15 },
    // Center near lake
    { pos: [-1.8, -2.05, 0.8] as [number, number, number], s: 0.8 },
    { pos: [1.8, -2.05, 0.8] as [number, number, number], s: 0.75 },
    // Far sides
    { pos: [-7, -2.1, -1] as [number, number, number], s: 0.7 },
    { pos: [7, -2.1, -1] as [number, number, number], s: 0.7 },
    { pos: [-6.5, -2.1, -2] as [number, number, number], s: 0.6 },
    { pos: [6.5, -2.1, -2] as [number, number, number], s: 0.6 },
    // Back treeline
    { pos: [-4, -2.1, -3.5] as [number, number, number], s: 0.5 },
    { pos: [-2.5, -2.1, -3.5] as [number, number, number], s: 0.45 },
    { pos: [2.5, -2.1, -3.5] as [number, number, number], s: 0.45 },
    { pos: [4, -2.1, -3.5] as [number, number, number], s: 0.5 },
  ], [])

  useFrame(() => {
    const dist = Math.abs(scrollStore.progress * 7 - 7)
    groupRef.current.visible = dist < 1.5
  })

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>
      {/* ── Bright alpine sunlight ── */}
      <directionalLight position={[15, 20, 10]} intensity={2.0} color="#fff5dd" />
      <directionalLight position={[-12, 10, 6]} intensity={0.6} color="#aaccee" />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#ffffff" />
      <ambientLight intensity={0.5} />

      {/* ── Title ── */}
      <Text position={[0, 5, 1]} fontSize={0.7} color="#ffffff" anchorX="center"
        letterSpacing={-0.02} outlineWidth={0.025} outlineColor="#000000">
        Who I Am
      </Text>
      <Text position={[0, 4.2, 1]} fontSize={0.17} color="#f0d060" anchorX="center"
        letterSpacing={0.14} outlineWidth={0.01} outlineColor="#000000">
        FULL-STACK ENGINEER · AI BUILDER
      </Text>

      {/* ── Stats ── */}
      <group position={[-3.8, 3, 1.5]}>
        <mesh>
          <planeGeometry args={[2.3, 1.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0.2, 0.01]} fontSize={0.42} color="#00d4ff" anchorX="center">3+</Text>
        <Text position={[0, -0.2, 0.01]} fontSize={0.13} color="rgba(255,255,255,0.85)" anchorX="center">Years Experience</Text>
      </group>
      <group position={[0, 3, 1.5]}>
        <mesh>
          <planeGeometry args={[2.3, 1.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0.2, 0.01]} fontSize={0.42} color="#ff006e" anchorX="center">10+</Text>
        <Text position={[0, -0.2, 0.01]} fontSize={0.13} color="rgba(255,255,255,0.85)" anchorX="center">AI Projects</Text>
      </group>
      <group position={[3.8, 3, 1.5]}>
        <mesh>
          <planeGeometry args={[2.3, 1.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0.2, 0.01]} fontSize={0.42} color="#39ff14" anchorX="center">12+</Text>
        <Text position={[0, -0.2, 0.01]} fontSize={0.13} color="rgba(255,255,255,0.85)" anchorX="center">Microservices</Text>
      </group>

      {/* ══════════════════════════════════════
          ROCKY MOUNTAIN RANGE — Moraine-style
         ══════════════════════════════════════ */}

      {/* Back row — tallest peaks, heavy snow */}
      <RockyMountain position={[0, 1.2, -12]}    scale={3.0}  seed={0}   snowLine={0.55} />
      <RockyMountain position={[-4, 0.8, -11]}   scale={2.6}  seed={3}   snowLine={0.6} />
      <RockyMountain position={[4, 0.8, -11]}    scale={2.6}  seed={7}   snowLine={0.6} />
      <RockyMountain position={[-7.5, 0.5, -10]} scale={2.2}  seed={11}  snowLine={0.65} />
      <RockyMountain position={[7.5, 0.5, -10]}  scale={2.2}  seed={15}  snowLine={0.65} />

      {/* Mid row — shorter, more rock visible */}
      <RockyMountain position={[-2.5, 0, -8]}    scale={2.0}  seed={20}  snowLine={0.7} />
      <RockyMountain position={[2.5, 0, -8]}     scale={2.0}  seed={25}  snowLine={0.7} />
      <RockyMountain position={[-6, -0.2, -8]}   scale={1.8}  seed={30}  snowLine={0.72} />
      <RockyMountain position={[6, -0.2, -8]}    scale={1.8}  seed={35}  snowLine={0.72} />
      <RockyMountain position={[-10, 0, -9]}     scale={2.0}  seed={40}  snowLine={0.68} />
      <RockyMountain position={[10, 0, -9]}      scale={2.0}  seed={45}  snowLine={0.68} />

      {/* Front row — foothills, barely any snow */}
      <RockyMountain position={[-5, -0.8, -5]}   scale={1.3}  seed={50}  snowLine={0.85} />
      <RockyMountain position={[5, -0.8, -5]}    scale={1.3}  seed={55}  snowLine={0.85} />
      <RockyMountain position={[-8, -0.5, -6]}   scale={1.5}  seed={60}  snowLine={0.8} />
      <RockyMountain position={[8, -0.5, -6]}    scale={1.5}  seed={65}  snowLine={0.8} />

      {/* ── Turquoise alpine lake ── */}
      <Lake />

      {/* ── Forested ground ── */}
      <Ground />

      {/* ── Pine trees ── */}
      {pines.map((p, i) => (
        <PineTree key={i} position={p.pos} scale={p.s} />
      ))}

      {/* ── Golden dust particles ── */}
      <Sparkles count={12} scale={14} size={0.2} speed={0.03} color="#ffe080" opacity={0.1} />

      {/* ── Quote ── */}
      <Float speed={0.3} floatIntensity={0.1}>
        <Text
          position={[0, -1.5, 2.5]}
          fontSize={0.14}
          color="rgba(255,255,255,0.45)"
          anchorX="center"
          maxWidth={10}
          textAlign="center"
          outlineWidth={0.005}
          outlineColor="#000000"
        >
          "Building intelligent systems that bridge the gap between ideas and reality."
        </Text>
      </Float>
    </group>
  )
}
