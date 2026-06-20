import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

const SERVICES = [
  { id: 'gateway', label: 'API Gateway', sub: 'Rate Limiting · Auth', pos: [0, 2, 0] as [number, number, number], color: '#00d4ff', w: 1.8, h: 0.7 },
  { id: 'user', label: 'User Service', sub: 'Registration · Profile', pos: [-3.5, 0, 0] as [number, number, number], color: '#39ff14', w: 1.6, h: 0.7 },
  { id: 'order', label: 'Order Service', sub: 'CRUD · State Machine', pos: [0, 0, 0] as [number, number, number], color: '#00d4ff', w: 1.6, h: 0.7 },
  { id: 'notify', label: 'Notify Service', sub: 'Email · Push · SMS', pos: [3.5, 0, 0] as [number, number, number], color: '#8b5cf6', w: 1.6, h: 0.7 },
  { id: 'db1', label: 'User DB', sub: 'MySQL', pos: [-3.5, -2, 0] as [number, number, number], color: '#39ff14', w: 1.4, h: 0.55, isDB: true },
  { id: 'db2', label: 'Order DB', sub: 'MySQL', pos: [0, -2, 0] as [number, number, number], color: '#00d4ff', w: 1.4, h: 0.55, isDB: true },
  { id: 'lb', label: 'Load Balancer', sub: 'Round Robin', pos: [0, 3.5, 0] as [number, number, number], color: '#ff006e', w: 1.8, h: 0.6 },
]

const CONNECTIONS: [number, number, string][] = [
  [6, 0, '#ff006e'],   // LB → Gateway
  [0, 1, '#00d4ff'],   // Gateway → User
  [0, 2, '#00d4ff'],   // Gateway → Order
  [0, 3, '#00d4ff'],   // Gateway → Notify
  [1, 4, '#39ff14'],   // User → UserDB
  [2, 5, '#00d4ff'],   // Order → OrderDB
  [2, 3, '#8b5cf6'],   // Order → Notify (event)
]

// Moving data packet along a path
function DataPacket({ from, to, color, speed, size = 0.07 }: {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  speed: number
  size?: number
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const tRef = useRef(Math.random())

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * speed) % 1
    const t = tRef.current
    ref.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t
    )
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

// Service box
function ServiceBox({ service }: { service: typeof SERVICES[0] }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = 0.3 + Math.sin(t * 1.5 + service.pos[0]) * 0.05
    ;(ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
  })

  const isDB = 'isDB' in service && service.isDB

  return (
    <group position={service.pos}>
      <mesh ref={ref}>
        {isDB ? (
          <cylinderGeometry args={[service.w / 2, service.w / 2, service.h, 16]} />
        ) : (
          <boxGeometry args={[service.w, service.h, 0.3]} />
        )}
        <meshStandardMaterial
          color="#05081a"
          emissive={service.color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Border glow */}
      <mesh>
        {isDB ? (
          <cylinderGeometry args={[service.w / 2 + 0.03, service.w / 2 + 0.03, service.h + 0.04, 16]} />
        ) : (
          <boxGeometry args={[service.w + 0.05, service.h + 0.05, 0.28]} />
        )}
        <meshBasicMaterial color={service.color} transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>

      <Text
        position={[0, 0.08, 0.2]}
        fontSize={0.2}
        color={service.color}
        anchorX="center"
        anchorY="middle"
      >
        {service.label}
      </Text>
      <Text
        position={[0, -0.18, 0.2]}
        fontSize={0.13}
        color="rgba(255,255,255,0.45)"
        anchorX="center"
        anchorY="middle"
      >
        {service.sub}
      </Text>
    </group>
  )
}

export default function Scene3Microservices({ sceneY }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const [active, setActive] = useState(false)
  const duplicatesRef = useRef<THREE.Group>(null!)

  useFrame(({ clock }) => {
    const dist = Math.abs(scrollStore.progress * 7 - 2)
    groupRef.current.visible = dist < 1.8

    const t = clock.getElapsedTime()
    if (duplicatesRef.current) {
      const scale = active ? 1 + Math.sin(t * 2) * 0.02 : 1
      duplicatesRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>
      {/* Title */}
      <Text position={[0, 5.2, 0]} fontSize={0.55} color="#e2e8f0" anchorX="center" letterSpacing={-0.02}>
        Distributed Backend World
      </Text>
      <Text position={[0, 4.55, 0]} fontSize={0.2} color="#39ff14" anchorX="center" letterSpacing={0.1}>
        MICROSERVICES ARCHITECTURE
      </Text>

      {/* Connection lines */}
      {CONNECTIONS.map(([a, b, color], i) => (
        <Line
          key={i}
          points={[
            new THREE.Vector3(...SERVICES[a].pos),
            new THREE.Vector3(...SERVICES[b].pos),
          ]}
          color={color}
          lineWidth={1}
          transparent
          opacity={0.3}
          dashed
          dashScale={4}
          dashSize={0.3}
          gapSize={0.15}
        />
      ))}

      {/* Data packets */}
      {CONNECTIONS.map(([a, b, color], i) => (
        <DataPacket
          key={i}
          from={SERVICES[a].pos}
          to={SERVICES[b].pos}
          color={color}
          speed={0.25 + i * 0.05}
        />
      ))}
      {/* Return packets (reverse) */}
      {CONNECTIONS.slice(0, 4).map(([a, b, color], i) => (
        <DataPacket
          key={`r${i}`}
          from={SERVICES[b].pos}
          to={SERVICES[a].pos}
          color={color}
          speed={0.2 + i * 0.04}
          size={0.05}
        />
      ))}

      {/* Service boxes */}
      {SERVICES.map((s) => (
        <ServiceBox key={s.id} service={s} />
      ))}

      {/* Scale-out visual (duplicated services when active) */}
      <group ref={duplicatesRef}>
        {active && [1, 2].map((copy) => (
          <group key={copy} position={[(copy * 6) - 3, 0, -2 * copy]}>
            <ServiceBox service={{ ...SERVICES[2], pos: [0, 0, 0] }} />
            <Text position={[0, 1, 0]} fontSize={0.14} color="#ff006e" anchorX="center">
              Replica ×{copy + 1}
            </Text>
          </group>
        ))}
      </group>

      {/* Interaction button */}
      <Html position={[0, -3.5, 0]} center>
        <button
          className="interact-btn"
          onClick={() => setActive((v) => !v)}
        >
          {active ? 'Reset Scale' : '⚡ Trigger Scale-Out'}
        </button>
      </Html>

      {/* Architecture labels */}
      <Text position={[-5.5, 2, 0]} fontSize={0.16} color="rgba(255,255,255,0.3)" anchorX="left">
        Layer: Ingress
      </Text>
      <Text position={[-5.5, 0, 0]} fontSize={0.16} color="rgba(255,255,255,0.3)" anchorX="left">
        Layer: Business
      </Text>
      <Text position={[-5.5, -2, 0]} fontSize={0.16} color="rgba(255,255,255,0.3)" anchorX="left">
        Layer: Data
      </Text>
    </group>
  )
}
