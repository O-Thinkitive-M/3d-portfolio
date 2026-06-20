/**
 * Scene 1 — Entry (Neural Brain)
 *
 * Visual layers (core → outer):
 *  1. Dark core sphere — deep navy, barely lit
 *  2. Edge mesh (LineSegments) — 30 icosahedron edges, pulsing additive glow
 *  3. Inner wireframe shell (detail 2) — cyan, additive, thin
 *  4. Outer wireframe shell (detail 3) — purple, additive, thinner
 *  5. Vertex nodes (InstancedMesh × 12) — individual fire-pulse per node
 *  6. Three concentric glow halos — additive blending, radius 1.8 / 2.4 / 3.2
 *  7. Three orbital torus rings — tilted on different axes
 *  8. Six curved-path data packets
 *  9. Sparkles (ambient blue + purple)
 * 10. Grid plane — fades on scroll
 *
 * Interactions:
 *  - Mouse move → smooth parallax tilt on brain group
 *  - Scroll → grid fades, camera zooms in
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract 12 unique vertex positions from a detail-0 IcosahedronGeometry */
function getIcoVertices(radius: number): THREE.Vector3[] {
  const geo = new THREE.IcosahedronGeometry(radius, 0)
  const pos = geo.attributes.position
  const unique: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
    if (!unique.some((u) => u.distanceTo(v) < 0.05)) unique.push(v)
  }
  geo.dispose()
  return unique
}

/** Extract unique edge pairs from a detail-0 IcosahedronGeometry as flat Float32Array */
function getIcoEdges(radius: number): Float32Array {
  const geo = new THREE.IcosahedronGeometry(radius, 0)
  const pos = geo.attributes.position
  const edgeSet = new Set<string>()
  const result: number[] = []

  // non-indexed: every 3 attributes = one triangle
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [i, i + 1, i + 2]
    const pairs = [
      [tri[0], tri[1]],
      [tri[1], tri[2]],
      [tri[0], tri[2]],
    ]
    for (const [a, b] of pairs) {
      // canonical key using rounded coords for dedup
      const ax = pos.getX(a).toFixed(3), ay = pos.getY(a).toFixed(3), az = pos.getZ(a).toFixed(3)
      const bx = pos.getX(b).toFixed(3), by = pos.getY(b).toFixed(3), bz = pos.getZ(b).toFixed(3)
      const key = [[ax, ay, az].join(','), [bx, by, bz].join(',')].sort().join('|')
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        result.push(
          pos.getX(a), pos.getY(a), pos.getZ(a),
          pos.getX(b), pos.getY(b), pos.getZ(b),
        )
      }
    }
  }
  geo.dispose()
  return new Float32Array(result)
}

// ── sub-components ────────────────────────────────────────────────────────────

function OrbitalRing({
  radius, tube, tiltX, tiltY, speed, color,
}: {
  radius: number; tube: number; tiltX: number; tiltY: number; speed: number; color: string
}) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed
    ref.current.rotation.x = tiltX + t * 0.3
    ref.current.rotation.y = tiltY + t * 0.5
    ref.current.rotation.z = t * 0.2
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, tube, 6, 80]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.22}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

function DataPacket({
  path, speed, color,
}: {
  path: THREE.CatmullRomCurve3; speed: number; color: string
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const t = useRef(Math.random())
  useFrame((_, delta) => {
    t.current = (t.current + delta * speed) % 1
    ref.current.position.copy(path.getPoint(t.current))
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 6, 6]} />
      <meshBasicMaterial
        color={color}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Scene1Entry({ sceneY }: Props) {
  const outerRef   = useRef<THREE.Group>(null!)   // visibility / scroll fade
  const brainRef   = useRef<THREE.Group>(null!)   // mouse tilt target
  const gridRef    = useRef<THREE.Mesh>(null!)
  const edgeMatRef = useRef<THREE.LineBasicMaterial>(null!)
  const halo1Ref   = useRef<THREE.Mesh>(null!)
  const halo2Ref   = useRef<THREE.Mesh>(null!)
  const halo3Ref   = useRef<THREE.Mesh>(null!)
  const instanceRef = useRef<THREE.InstancedMesh>(null!)

  // Mouse position for parallax (tracked outside rAF for smoothness)
  const mouse = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth)  * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── geometry / data (stable across renders) ───────────────────────────────

  const edgePositions = useMemo(() => getIcoEdges(1.5), [])
  const vertices      = useMemo(() => getIcoVertices(1.5), [])

  const edgeGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3))
    return g
  }, [edgePositions])

  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#00d4ff',
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [])
  // keep ref in sync
  edgeMatRef.current = edgeMat

  // Dummy matrix for instanced vertex nodes
  const dummy = useMemo(() => new THREE.Matrix4(), [])
  const firingColor = useMemo(() => new THREE.Color(), [])

  // Orbit paths for data packets
  const paths = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const base = (i / 6) * Math.PI * 2
      const r    = 2.6 + (i % 3) * 0.55
      const pts  = Array.from({ length: 40 }, (__, j) => {
        const a = (j / 40) * Math.PI * 2
        return new THREE.Vector3(
          Math.cos(a + base) * r,
          Math.sin(a * (1 + i * 0.2)) * (0.8 + i * 0.15),
          Math.sin(a + base) * r,
        )
      })
      return new THREE.CatmullRomCurve3(pts, true)
    }),
  [])

  // ── per-frame animation ───────────────────────────────────────────────────

  useFrame(({ clock }, delta) => {
    const t    = clock.getElapsedTime()
    const prog = scrollStore.progress

    // Visibility window
    const dist = Math.abs(prog * 8 - 0)
    outerRef.current.visible = dist < 1.8

    // ── Grid fade on scroll
    const gridOpacity = Math.max(0, 0.22 - prog * 2.5)
    ;(gridRef.current.material as THREE.MeshBasicMaterial).opacity = gridOpacity

    // ── Mouse parallax on brain group
    const influence = Math.max(0, 1 - prog * 5)
    const targetX   = mouse.current.y * 0.28 * influence
    const targetY   = mouse.current.x * 0.28 * influence
    brainRef.current.rotation.x += (targetX - brainRef.current.rotation.x) * 0.06
    brainRef.current.rotation.y += (targetY - brainRef.current.rotation.y) * 0.06

    // Slow auto-spin
    brainRef.current.rotation.y += delta * 0.06

    // ── Neural edge pulse (whole mesh breathes)
    edgeMat.opacity = 0.12 + (Math.sin(t * 1.8) + 1) * 0.22

    // ── Glow halos breathing
    const breath = (Math.sin(t * 1.2) + 1) * 0.5
    ;(halo1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + breath * 0.07
    ;(halo2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.03 + breath * 0.04
    ;(halo3Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.01 + breath * 0.02

    // ── Vertex node "firing" (each node fires at different phase)
    if (instanceRef.current) {
      for (let i = 0; i < vertices.length; i++) {
        const fire = Math.max(0, Math.sin(t * 1.8 + i * 0.72))
        const scale = 0.045 + fire * 0.065
        dummy.makeScale(scale, scale, scale)
        dummy.setPosition(vertices[i])
        instanceRef.current.setMatrixAt(i, dummy)

        const lightness = 0.25 + fire * 0.55
        // alternate: blue nodes vs occasional purple flare
        if (i % 3 === 0) {
          firingColor.setHSL(0.83, 1, lightness) // purple
        } else {
          firingColor.setHSL(0.55, 1, lightness) // cyan
        }
        instanceRef.current.setColorAt(i, firingColor)
      }
      instanceRef.current.instanceMatrix.needsUpdate = true
      if (instanceRef.current.instanceColor) instanceRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group ref={outerRef} position={[0, sceneY, 0]}>
      {/* ── Grid floor ── */}
      <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
        <planeGeometry args={[32, 32, 22, 22]} />
        <meshBasicMaterial
          color="#00d4ff"
          wireframe
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── Brain group (mouse-tilt target) ── */}
      <group ref={brainRef}>

        {/* 1. Dark core sphere */}
        <mesh>
          <sphereGeometry args={[1.45, 48, 48]} />
          <meshPhongMaterial
            color="#010614"
            emissive="#001a33"
            emissiveIntensity={0.8}
            shininess={80}
            specular="#00d4ff"
            transparent
            opacity={0.98}
          />
        </mesh>

        {/* 2. Neural edge mesh — 30 edges of base icosahedron */}
        <primitive object={new THREE.LineSegments(edgeGeom, edgeMat)} />

        {/* 3. Inner wireframe shell */}
        <mesh>
          <icosahedronGeometry args={[1.52, 2]} />
          <meshBasicMaterial
            color="#00d4ff"
            wireframe
            transparent
            opacity={0.14}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 4. Outer wireframe shell */}
        <mesh>
          <icosahedronGeometry args={[1.72, 3]} />
          <meshBasicMaterial
            color="#8b5cf6"
            wireframe
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 5. Vertex firing nodes — InstancedMesh × 12 */}
        <instancedMesh
          ref={instanceRef}
          args={[undefined, undefined, vertices.length]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            vertexColors
          />
        </instancedMesh>

        {/* 6a. Glow halo — tight */}
        <mesh ref={halo1Ref}>
          <sphereGeometry args={[1.82, 24, 24]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 6b. Glow halo — mid */}
        <mesh ref={halo2Ref}>
          <sphereGeometry args={[2.4, 20, 20]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.03}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 6c. Outer glow halo (outside brain group so it doesn't tilt) */}
      <mesh ref={halo3Ref}>
        <sphereGeometry args={[3.2, 16, 16]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.015}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── Orbital rings ── */}
      <OrbitalRing radius={2.85} tube={0.018} tiltX={0.4}  tiltY={0}   speed={0.14} color="#00d4ff" />
      <OrbitalRing radius={3.35} tube={0.015} tiltX={1.1}  tiltY={0.3} speed={0.09} color="#8b5cf6" />
      <OrbitalRing radius={3.85} tube={0.012} tiltX={-0.6} tiltY={0.8} speed={0.07} color="#00d4ff" />

      {/* ── Data packets ── */}
      {paths.map((p, i) => (
        <DataPacket
          key={i}
          path={p}
          speed={0.07 + i * 0.012}
          color={i % 3 === 0 ? '#8b5cf6' : '#00d4ff'}
        />
      ))}

      {/* ── Ambient sparkles ── */}
      <Sparkles count={70} scale={10} size={0.7} speed={0.2} color="#00d4ff" opacity={0.5} />
      <Sparkles count={35} scale={7}  size={0.4} speed={0.12} color="#8b5cf6" opacity={0.35} />
    </group>
  )
}
