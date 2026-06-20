import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Sparkles, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../../store/scrollStore'

interface Props { sceneY: number }

const STEPS = [
  { label: 'Problem',   sub: 'Identify & Define',   color: '#ff006e' },
  { label: 'Breakdown', sub: 'Decompose Complexity', color: '#ff6b35' },
  { label: 'Research',  sub: 'Explore Solutions',    color: '#ffbe0b' },
  { label: 'Design',    sub: 'Architect the Plan',   color: '#00d4ff' },
  { label: 'Build',     sub: 'Implement & Iterate',  color: '#39ff14' },
  { label: 'Test',      sub: 'Validate & Verify',    color: '#8b5cf6' },
  { label: 'Optimize',  sub: 'Refine & Deploy',      color: '#00fff5' },
]

const STEP_T = [0.02, 0.16, 0.33, 0.50, 0.67, 0.84, 0.98]
const SEP = [0.16, 0.33, 0.50, 0.67, 0.84]

let _fp = 0

/* ───────── Earth (procedural via custom shader) ───────── */
const earthVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;
  uniform float uRotY;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = vNormal;
    // Rotate sampling position around Y axis for visible continent movement
    float c = cos(uRotY);
    float s = sin(uRotY);
    vec3 rp = vec3(position.x * c + position.z * s, position.y, -position.x * s + position.z * c);
    vLocalPos = rp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const earthFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;

  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    return 0.5 * noise(p) + 0.25 * noise(p * 2.0) + 0.125 * noise(p * 4.0);
  }

  void main() {
    vec3 n = normalize(vWorldNormal);
    float land = fbm(vLocalPos * 0.8);

    vec3 ocean = vec3(0.02, 0.08, 0.28);
    vec3 deepOcean = vec3(0.01, 0.04, 0.18);
    vec3 land1 = vec3(0.05, 0.22, 0.05);
    vec3 land2 = vec3(0.12, 0.28, 0.08);
    vec3 desert = vec3(0.35, 0.28, 0.12);
    vec3 ice = vec3(0.85, 0.9, 0.95);

    vec3 col;
    if (land < 0.42) { col = mix(deepOcean, ocean, land / 0.42); }
    else if (land < 0.52) { col = mix(ocean, land1, (land - 0.42) / 0.1); }
    else if (land < 0.62) { col = mix(land1, land2, (land - 0.52) / 0.1); }
    else if (land < 0.72) { col = mix(land2, desert, (land - 0.62) / 0.1); }
    else { col = mix(desert, ice, (land - 0.72) / 0.28); }

    // Polar ice caps based on rotated Y
    float polar = abs(vLocalPos.y / length(vLocalPos));
    if (polar > 0.7) { col = mix(col, ice, (polar - 0.7) / 0.3); }

    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
    float diff = max(dot(n, lightDir), 0.0) * 0.7 + 0.3;
    col *= diff;

    float rim = 1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0);
    col += vec3(0.2, 0.5, 1.0) * pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(col, 1.0);
  }
`

function Earth({ position, radius }: { position: [number, number, number]; radius: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(() => ({ uRotY: { value: 0 } }), [])

  useFrame(({ clock }) => {
    // Use elapsed time directly — never pauses, never accumulates drift
    if (matRef.current) matRef.current.uniforms.uRotY.value = clock.getElapsedTime() * 0.15
  })

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial ref={matRef} vertexShader={earthVertexShader} fragmentShader={earthFragmentShader} uniforms={uniforms} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.04, 32, 32]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.12, 24, 24]} />
        <meshBasicMaterial color="#88bbff" transparent opacity={0.03} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Cloud layer */}
      <mesh rotation={[0.1, 0.5, 0]}>
        <sphereGeometry args={[radius * 1.015, 32, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={1} />
      </mesh>
      <pointLight position={[radius, radius * 0.5, radius]} intensity={0.3} color="#4488ff" distance={radius * 4} />
    </group>
  )
}

/* ───────── Moon (procedural shader) ───────── */
const moonVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const moonFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 n = normalize(vNormal);

    // Base gray surface
    float surface = noise(vPosition * 3.0) * 0.3 + 0.5;

    // Craters — darker circular depressions
    float craters = 0.0;
    craters += smoothstep(0.35, 0.3, length(vPosition - vec3(0.5, 0.3, 0.7)));
    craters += smoothstep(0.25, 0.2, length(vPosition - vec3(-0.6, 0.4, 0.5)));
    craters += smoothstep(0.2, 0.15, length(vPosition - vec3(0.2, -0.5, 0.7)));
    craters += smoothstep(0.3, 0.25, length(vPosition - vec3(-0.3, -0.2, 0.8)));
    craters += smoothstep(0.15, 0.1, length(vPosition - vec3(0.7, 0.1, 0.5)));
    craters += smoothstep(0.18, 0.13, length(vPosition - vec3(-0.1, 0.7, 0.4)));
    craters += smoothstep(0.12, 0.08, length(vPosition - vec3(0.4, -0.3, 0.6)));
    craters += smoothstep(0.22, 0.17, length(vPosition - vec3(-0.5, -0.5, 0.3)));
    craters = min(craters, 1.0);

    // Maria (dark flat areas)
    float maria = noise(vPosition * 1.5 + 3.0);
    maria = smoothstep(0.45, 0.55, maria) * 0.15;

    vec3 lightGray = vec3(0.62, 0.6, 0.58);
    vec3 darkGray = vec3(0.32, 0.3, 0.28);
    vec3 craterDark = vec3(0.2, 0.19, 0.17);

    vec3 col = mix(lightGray, darkGray, surface * 0.5 + maria);
    col = mix(col, craterDark, craters * 0.6);

    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
    float diff = max(dot(n, lightDir), 0.0) * 0.65 + 0.35;
    col *= diff;

    gl_FragColor = vec4(col, 1.0);
  }
`

function Moon({ position, radius }: { position: [number, number, number]; radius: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.008 })

  return (
    <group position={position}>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[radius, 64, 64]} />
          <shaderMaterial vertexShader={moonVertexShader} fragmentShader={moonFragmentShader} />
        </mesh>
      </group>
      {/* Subtle dust glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.06, 24, 24]} />
        <meshBasicMaterial color="#ccccaa" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <pointLight position={[radius * 0.5, radius * 0.3, radius]} intensity={0.15} color="#eeeedd" distance={radius * 3} />
    </group>
  )
}

/* ───────── Lunar Rover (Yutu / Chang'e style) ───────── */
function Rover() {
  const gold = '#c9a832'
  const goldDark = '#8a7020'
  const silver = '#b0b0b8'

  return (
    <group>
      {/* ══ Main body — gold foil box (trapezoidal) ══ */}
      {/* Lower body (wider base) */}
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.14]} />
        <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.08} metalness={0.75} roughness={0.35} />
      </mesh>
      {/* Upper body (narrower — trapezoid effect) */}
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.12]} />
        <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.1} metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Gold foil side panels */}
      {[-1, 1].map((s) => (
        <mesh key={`gp${s}`} position={[0, 0.06, s * 0.071]}>
          <boxGeometry args={[0.17, 0.04, 0.002]} />
          <meshStandardMaterial color={goldDark} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* Front panel detail */}
      <mesh position={[0.091, 0.06, 0]}>
        <boxGeometry args={[0.002, 0.04, 0.13]} />
        <meshStandardMaterial color={goldDark} metalness={0.8} roughness={0.4} />
      </mesh>

      {/* ══ Solar panels (two wings, angled open) ══ */}
      {/* Left solar panel */}
      <group position={[0, 0.1, -0.1]} rotation={[0.45, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.15, 0.004, 0.1]} />
          <meshStandardMaterial color="#1a1a3a" emissive="#1122aa" emissiveIntensity={0.08} metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Panel frame */}
        <mesh>
          <boxGeometry args={[0.155, 0.006, 0.105]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.35} transparent opacity={0.8} />
        </mesh>
        {/* Cell grid lines */}
        {[-0.04, 0, 0.04].map((x, i) => (
          <mesh key={`lg${i}`} position={[x, 0.004, 0]}>
            <boxGeometry args={[0.001, 0.001, 0.09]} />
            <meshBasicMaterial color="#333366" />
          </mesh>
        ))}
      </group>
      {/* Right solar panel */}
      <group position={[0, 0.1, 0.1]} rotation={[-0.45, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.15, 0.004, 0.1]} />
          <meshStandardMaterial color="#1a1a3a" emissive="#1122aa" emissiveIntensity={0.08} metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.155, 0.006, 0.105]} />
          <meshStandardMaterial color={gold} metalness={0.7} roughness={0.35} transparent opacity={0.8} />
        </mesh>
        {[-0.04, 0, 0.04].map((x, i) => (
          <mesh key={`rg${i}`} position={[x, 0.004, 0]}>
            <boxGeometry args={[0.001, 0.001, 0.09]} />
            <meshBasicMaterial color="#333366" />
          </mesh>
        ))}
      </group>

      {/* ══ Camera mast (top, with panoramic head) ══ */}
      <mesh position={[0.04, 0.13, 0]}>
        <cylinderGeometry args={[0.004, 0.005, 0.06, 6]} />
        <meshStandardMaterial color={silver} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Pan/tilt head */}
      <mesh position={[0.04, 0.168, 0]}>
        <boxGeometry args={[0.018, 0.012, 0.025]} />
        <meshStandardMaterial color="#dddddd" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Camera eyes (two lenses) */}
      {[-0.008, 0.008].map((z, i) => (
        <mesh key={`eye${i}`} position={[0.05, 0.168, z]}>
          <sphereGeometry args={[0.004, 8, 8]} />
          <meshStandardMaterial color="#111122" emissive="#00ccff" emissiveIntensity={0.6} metalness={0.3} roughness={0.1} />
        </mesh>
      ))}

      {/* ══ Directional antenna (tall mast with small dish) ══ */}
      <mesh position={[-0.05, 0.14, 0.02]}>
        <cylinderGeometry args={[0.002, 0.002, 0.08, 4]} />
        <meshStandardMaterial color={silver} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Small dish */}
      <mesh position={[-0.05, 0.185, 0.02]} rotation={[0.5, 0, 0.2]}>
        <coneGeometry args={[0.015, 0.006, 10]} />
        <meshStandardMaterial color="#eeeeee" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* ══ Wheels (4 spherical wheels like Yutu) ══ */}
      {[-1, 1].map((side) =>
        [-1, 1].map((fb) => (
          <group key={`w${side}${fb}`} position={[fb * 0.08, 0.012, side * 0.085]}>
            {/* Wheel hub */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <sphereGeometry args={[0.016, 10, 10]} />
              <meshStandardMaterial color="#555560" metalness={0.7} roughness={0.4} />
            </mesh>
            {/* Wheel rim ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.016, 0.003, 6, 12]} />
              <meshStandardMaterial color="#444450" metalness={0.6} roughness={0.5} />
            </mesh>
            {/* Axle to body */}
            <mesh position={[0, 0.015, -side * 0.015]}>
              <boxGeometry args={[0.006, 0.006, 0.03]} />
              <meshStandardMaterial color={silver} metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        ))
      )}

      {/* ══ Equipment on top (various small instruments) ══ */}
      {/* Small box instrument */}
      <mesh position={[-0.03, 0.11, 0.03]}>
        <boxGeometry args={[0.02, 0.012, 0.02]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Another instrument */}
      <mesh position={[0.02, 0.11, -0.03]}>
        <cylinderGeometry args={[0.008, 0.008, 0.015, 6]} />
        <meshStandardMaterial color={silver} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* ───────── Desktop Step Marker ───────── */
function StepMarker({ step, index, pos, labelSide }: {
  step: (typeof STEPS)[0]; index: number; pos: THREE.Vector3; labelSide: 'left' | 'right'
}) {
  const nodeRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!nodeRef.current) return
    const mat = nodeRef.current.material as THREE.MeshStandardMaterial
    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
    const t = STEP_T[index]
    const passed = _fp >= t
    const active = passed && _fp < t + 0.06
    if (active) {
      mat.emissiveIntensity = 2.0 + Math.sin(clock.getElapsedTime() * 5) * 0.5
      glowMat.opacity = 0.18
    } else if (passed) { mat.emissiveIntensity = 0.7; glowMat.opacity = 0.06 }
    else { mat.emissiveIntensity = 0.1; glowMat.opacity = 0.02 }
  })

  const lx = labelSide === 'left' ? -0.5 : 0.5
  const anchor = labelSide === 'left' ? 'right' : 'left'

  return (
    <group position={[pos.x, pos.y, pos.z + 0.1]}>
      <mesh ref={nodeRef} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color="#060a18" emissive={step.color} emissiveIntensity={0.1} metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshBasicMaterial color={step.color} transparent opacity={0.02} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Text position={[lx, 0.32, 0]} fontSize={0.12} color={step.color} anchorX={anchor as any} letterSpacing={0.1}>{`0${index + 1}`}</Text>
      <Text position={[lx, 0.05, 0]} fontSize={0.36} color={step.color} anchorX={anchor as any} fontWeight={700}>{step.label}</Text>
      <Text position={[lx, -0.22, 0]} fontSize={0.16} color="rgba(255,255,255,0.4)" anchorX={anchor as any}>{step.sub}</Text>
    </group>
  )
}

/* ───────── Mobile step card ───────── */
function MobileStepOverlay() {
  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => {
      let idx = 0
      for (let i = STEP_T.length - 1; i >= 0; i--) { if (_fp >= STEP_T[i] - 0.02) { idx = i; break } }
      setActiveStep(idx)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <Html center position={[0, -3.5, 1]} style={{ pointerEvents: 'none' }}>
      <div style={{ width: '80vw', maxWidth: '340px', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ width: i === activeStep ? '20px' : '8px', height: '4px', borderRadius: '2px', background: i <= activeStep ? step.color : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <div style={{ background: 'rgba(6,10,24,0.85)', border: `1px solid ${STEPS[activeStep].color}40`, borderRadius: '12px', padding: '16px 20px', backdropFilter: 'blur(10px)', transition: 'border-color 0.3s ease' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: STEPS[activeStep].color, marginBottom: '4px' }}>STEP {String(activeStep + 1).padStart(2, '0')} / 07</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: STEPS[activeStep].color, marginBottom: '4px' }}>{STEPS[activeStep].label}</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{STEPS[activeStep].sub}</div>
        </div>
        <div style={{ marginTop: '10px', height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((activeStep + 1) / 7) * 100}%`, background: `linear-gradient(90deg, ${STEPS[0].color}, ${STEPS[activeStep].color})`, transition: 'width 0.4s ease', borderRadius: '1px' }} />
        </div>
      </div>
    </Html>
  )
}

/* ─────── Rocket stage geometry (reusable for attached + debris) ─────── */
// Stage shapes for debris — each matches the rocket section it came from
const STAGE_COLORS = [
  { body: '#12122c', emissive: '#ff6b35' },  // side boosters
  { body: '#0c0c22', emissive: '#ffbe0b' },  // core booster
  { body: '#16163a', emissive: '#00d4ff' },  // interstage
  { body: '#111128', emissive: '#39ff14' },  // upper stage
  { body: '#1a1a32', emissive: '#8b5cf6' },  // service module
]

/* ───────────────── Main Scene ───────────────── */
export default function Scene6FullStack({ sceneY }: Props) {
  const { viewport } = useThree()
  const isMobile = viewport.width < 9

  const groupRef = useRef<THREE.Group>(null!)
  const rocketRef = useRef<THREE.Group>(null!)
  const roverGroupRef = useRef<THREE.Group>(null!)
  const mobileRoverRef = useRef<THREE.Group>(null!)
  const flameRef = useRef<THREE.Mesh>(null!)
  const flame2Ref = useRef<THREE.Mesh>(null!)
  const flame3Ref = useRef<THREE.Mesh>(null!)
  const flameLightRef = useRef<THREE.PointLight>(null!)
  const flightProgress = useRef(0)
  const holdTimer = useRef(0)
  const roverDeploy = useRef(0)
  const stageRefs = useRef<(THREE.Group | null)[]>([null, null, null, null, null])
  const debrisRefs = useRef<(THREE.Group | null)[]>([null, null, null, null, null])

  const curve = useMemo(() => {
    if (isMobile) {
      // Bottom-left (near Earth) → top-right (near Moon)
      return new THREE.CubicBezierCurve3(
        new THREE.Vector3(-1.8, -4.5, 0),
        new THREE.Vector3(-0.6, -1, 0.5),
        new THREE.Vector3(0.6, 1.5, 0.3),
        new THREE.Vector3(1.8, 4, 0),
      )
    }
    return new THREE.CubicBezierCurve3(
      new THREE.Vector3(-5.5, -3.5, 0),
      new THREE.Vector3(-1.5, 0, 1.2),
      new THREE.Vector3(1.5, 2, 0.8),
      new THREE.Vector3(6, 3.2, 0),
    )
  }, [isMobile])

  const pathPoints = useMemo(() => curve.getPoints(50).map((p) => [p.x, p.y, p.z] as [number, number, number]), [curve])
  const stepPositions = useMemo(() => STEP_T.map((t) => curve.getPoint(t)), [curve])
  const sepData = useMemo(() => SEP.map((t) => {
    const pos = curve.getPoint(t)
    const tangent = curve.getTangent(t)
    return { pos, drift: new THREE.Vector3(-tangent.y, tangent.x, -0.3).normalize() }
  }), [curve])

  const labelSides: ('left' | 'right')[] = ['right', 'left', 'right', 'left', 'right', 'left', 'right']
  const rocketScale = isMobile ? 1.0 : 1.2

  useFrame(({ clock }, delta) => {
    const dist = Math.abs(scrollStore.progress * 7 - 5)
    groupRef.current.visible = dist < (isMobile ? 1.2 : 1.8)
    if (!groupRef.current.visible) { flightProgress.current = 0; holdTimer.current = 0; _fp = 0; return }

    if (flightProgress.current >= 1) {
      holdTimer.current += delta
      if (holdTimer.current > 3) { flightProgress.current = 0; holdTimer.current = 0 }
    } else { flightProgress.current = Math.min(flightProgress.current + delta * 0.075, 1) }

    const fp = flightProgress.current
    _fp = fp

    // Landing transition: rocket shrinks away, rover appears
    const landing = fp > 0.93
    const landingT = landing ? Math.min((fp - 0.93) / 0.07, 1) : 0  // 0→1 over fp 0.93→1.0

    if (rocketRef.current) {
      const pos = curve.getPoint(fp)
      const tangent = curve.getTangent(fp)
      rocketRef.current.position.copy(pos)
      rocketRef.current.rotation.z = Math.atan2(tangent.y, tangent.x) - Math.PI / 2

      if (fp < 0.04) { rocketRef.current.scale.setScalar((fp / 0.04) * rocketScale) }
      else if (landing) {
        // Shrink to 0 during landing
        rocketRef.current.scale.setScalar(rocketScale * 0.85 * (1 - landingT))
      }
      else { const shed = SEP.filter((s) => fp >= s).length; rocketRef.current.scale.setScalar((1 - shed * 0.03) * rocketScale) }
    }

    // Rover deploy on Moon surface
    if (roverGroupRef.current) {
      if (landing && !isMobile) {
        roverDeploy.current = Math.min(roverDeploy.current + delta * 1.2, 1)
        roverGroupRef.current.visible = true
        const rd = roverDeploy.current
        // Scale up with bounce
        const bounce = rd < 0.6 ? rd / 0.6 : 1 + Math.sin((rd - 0.6) / 0.4 * Math.PI) * 0.08
        roverGroupRef.current.scale.setScalar(bounce)
      } else {
        roverDeploy.current = 0
        roverGroupRef.current.visible = false
        roverGroupRef.current.scale.setScalar(0)
      }
    }

    // Mobile rover deploy
    if (mobileRoverRef.current) {
      if (landing && isMobile) {
        const rd = Math.min(roverDeploy.current + delta * 1.2, 1)
        roverDeploy.current = rd
        mobileRoverRef.current.visible = true
        const bounce = rd < 0.6 ? rd / 0.6 : 1 + Math.sin((rd - 0.6) / 0.4 * Math.PI) * 0.08
        mobileRoverRef.current.scale.setScalar(bounce)
      } else if (isMobile) {
        mobileRoverRef.current.visible = false
        mobileRoverRef.current.scale.setScalar(0)
      }
    }

    stageRefs.current.forEach((ref, i) => { if (ref) ref.visible = fp < SEP[i] })

    // Multi-layer flame
    const on = fp > 0.01 && fp < 0.93
    const t = clock.getElapsedTime()
    if (flameRef.current) {
      flameRef.current.visible = on
      if (on) {
        const f = 0.7 + Math.sin(t * 14) * 0.18 + Math.sin(t * 23) * 0.12
        flameRef.current.scale.set(f, f * 1.6 + Math.sin(t * 30) * 0.2, f)
        ;(flameRef.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 18) * 0.15
      }
    }
    if (flame2Ref.current) {
      flame2Ref.current.visible = on
      if (on) {
        const f2 = 0.6 + Math.sin(t * 18) * 0.2
        flame2Ref.current.scale.set(f2 * 0.6, f2 * 2.0 + Math.sin(t * 35) * 0.3, f2 * 0.6)
      }
    }
    if (flame3Ref.current) {
      flame3Ref.current.visible = on
      if (on) {
        const f3 = 0.5 + Math.sin(t * 25) * 0.15
        flame3Ref.current.scale.set(f3 * 0.3, f3 * 2.5, f3 * 0.3)
      }
    }
    if (flameLightRef.current) { flameLightRef.current.visible = on; if (on) flameLightRef.current.intensity = 0.6 + Math.sin(t * 20) * 0.3 }

    debrisRefs.current.forEach((ref, i) => {
      if (!ref) return
      const elapsed = fp - SEP[i]
      if (elapsed > 0 && elapsed < 0.25) {
        ref.visible = true
        const d = elapsed * 6
        const { pos, drift } = sepData[i]
        ref.position.set(pos.x + drift.x * d * 1.5, pos.y + drift.y * d * 1.5 - d * 0.3, pos.z + drift.z * d)
        ref.rotation.z += delta * (i % 2 === 0 ? 2.5 : -2.5)
        ref.rotation.x += delta * 1.2
        ref.scale.setScalar(Math.max(0, (1 - elapsed * 4.5) * rocketScale * 1.2))
      } else { ref.visible = false }
    })
  })

  return (
    <group ref={groupRef} position={[0, sceneY, 0]}>
      {/* Title */}
      <Text position={[0, isMobile ? 7 : 7.5, 0]} fontSize={isMobile ? 0.36 : 0.8} color="#e2e8f0" anchorX="center" letterSpacing={-0.02} maxWidth={isMobile ? 5.5 : 16} textAlign="center">
        How I Solve Problems
      </Text>
      {!isMobile && (
        <Text position={[0, 6.5, 0]} fontSize={0.18} color="#00d4ff" anchorX="center" letterSpacing={0.06}>
          PROBLEM → BREAKDOWN → RESEARCH → DESIGN → BUILD → TEST → OPTIMIZE
        </Text>
      )}

      {/* ════════ EARTH (launch) — desktop only ════════ */}
      {!isMobile && (
        <>
          <Earth position={[-8.5, -5.5, -2]} radius={3.0} />
          <Text position={[-8.5, -9, 0]} fontSize={0.14} color="rgba(100,180,255,0.45)" anchorX="center" letterSpacing={0.1}>CHALLENGE ORIGIN</Text>
        </>
      )}

      {/* ════════ MOON (landing) — desktop only ════════ */}
      {!isMobile && (
        <>
          <Moon position={[8.5, 5, -2]} radius={2.6} />
          <Text position={[8.5, 2, 0]} fontSize={0.14} color="rgba(200,200,180,0.45)" anchorX="center" letterSpacing={0.1}>SOLUTION DELIVERED</Text>
        </>
      )}

      {/* Trajectory */}
      <Line points={pathPoints} color="#ffffff" opacity={0.06} transparent lineWidth={1} dashed dashSize={0.2} gapSize={0.12} />

      {/* Mobile: node markers */}
      {isMobile && STEP_T.map((_st, i) => {
        const p = stepPositions[i]
        return (
          <mesh key={i} position={[p.x, p.y, p.z + 0.1]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={STEPS[i].color} transparent opacity={0.4} />
          </mesh>
        )
      })}

      {/* Desktop: step markers */}
      {!isMobile && STEPS.map((step, i) => (
        <StepMarker key={i} step={step} index={i} pos={stepPositions[i]} labelSide={labelSides[i]} />
      ))}

      {/* Mobile: step card */}
      {isMobile && <MobileStepOverlay />}

      {/* ════════ MOBILE: Earth bottom-left + Moon top-right ════════ */}
      {isMobile && (
        <>
          {/* Earth — half visible at bottom-left corner */}
          <Earth position={[-3, -6.5, -3]} radius={2.5} />

          {/* Moon — top-right corner, behind the rocket endpoint */}
          <Moon position={[2.8, 5.2, -3]} radius={1.8} />

          {/* Rover — on Moon surface, appears on landing */}
          <group ref={mobileRoverRef} position={[2, 4.2, -0.3]} rotation={[0.1, -0.2, 0]} visible={false} scale={0}>
            <group scale={2.2}>
              <Rover />
            </group>
            <Text position={[0, -0.3, 0]} fontSize={0.1} color="#00fff5" anchorX="center" letterSpacing={0.06}>
              LANDED
            </Text>
          </group>
        </>
      )}

      {/* ═══════════ ROCKET (detailed) ═══════════ */}
      <group ref={rocketRef} scale={rocketScale}>
        {/* Nose fairing (smooth aerodynamic) */}
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.09, 0.35, 16]} />
          <meshStandardMaterial color="#f0f0f5" emissive="#ffffff" emissiveIntensity={0.08} metalness={0.92} roughness={0.06} />
        </mesh>
        {/* Nose tip */}
        <mesh position={[0, 1.06, 0]}>
          <coneGeometry args={[0.02, 0.1, 8]} />
          <meshStandardMaterial color="#ee2200" emissive="#ff2200" emissiveIntensity={0.4} metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Payload section (the lander — always visible) */}
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.3, 16]} />
          <meshStandardMaterial color="#e8e8f4" emissive="#ffffff" emissiveIntensity={0.06} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Viewport window */}
        <mesh position={[0, 0.55, 0.09]}>
          <circleGeometry args={[0.025, 12]} />
          <meshStandardMaterial color="#112244" emissive="#00d4ff" emissiveIntensity={0.6} metalness={0.3} roughness={0.1} />
        </mesh>
        {/* Stripe */}
        <mesh position={[0, 0.42, 0]}>
          <torusGeometry args={[0.102, 0.005, 4, 20]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.4} />
        </mesh>

        {/* ── Stage 5: Service module ── */}
        <group ref={(el) => { stageRefs.current[4] = el }}>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.1, 0.115, 0.2, 12]} />
            <meshStandardMaterial color="#c0c0d8" emissive="#8b5cf6" emissiveIntensity={0.12} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Solar panel stubs */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.16, 0.22, 0]}>
              <boxGeometry args={[0.06, 0.01, 0.04]} />
              <meshStandardMaterial color="#1a1a5a" emissive="#8b5cf6" emissiveIntensity={0.15} metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* ── Stage 4: Upper stage ── */}
        <group ref={(el) => { stageRefs.current[3] = el }}>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.115, 0.14, 0.35, 12]} />
            <meshStandardMaterial color="#b8b8d0" emissive="#39ff14" emissiveIntensity={0.06} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Thruster bell */}
          <mesh position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.065, 0.12, 10]} />
            <meshStandardMaterial color="#0a0a14" emissive="#ff8800" emissiveIntensity={0.3} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Pipe detail */}
          <mesh position={[0.13, -0.05, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.3, 4]} />
            <meshStandardMaterial color="#333366" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* ── Stage 3: Interstage adapter ── */}
        <group ref={(el) => { stageRefs.current[2] = el }}>
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.14, 0.155, 0.2, 12]} />
            <meshStandardMaterial color="#a8a8c8" emissive="#00d4ff" emissiveIntensity={0.06} metalness={0.9} roughness={0.22} />
          </mesh>
          {/* Lattice struts */}
          {[0, 1.57, 3.14, 4.71].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.15, -0.38, Math.sin(a) * 0.15]}>
              <boxGeometry args={[0.008, 0.2, 0.008]} />
              <meshBasicMaterial color="#00d4ff" transparent opacity={0.12} />
            </mesh>
          ))}
        </group>

        {/* ── Stage 2: Core booster ── */}
        <group ref={(el) => { stageRefs.current[1] = el }}>
          <mesh position={[0, -0.72, 0]}>
            <cylinderGeometry args={[0.155, 0.17, 0.5, 12]} />
            <meshStandardMaterial color="#b0b0cc" emissive="#ffbe0b" emissiveIntensity={0.05} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Paint stripe */}
          <mesh position={[0, -0.55, 0]}>
            <torusGeometry args={[0.156, 0.004, 4, 16]} />
            <meshBasicMaterial color="#ffbe0b" transparent opacity={0.25} />
          </mesh>
          {/* Engine cluster: 4 bells */}
          {[[0.06, 0], [-0.06, 0], [0, 0.06], [0, -0.06]].map(([x, z], i) => (
            <mesh key={i} position={[x, -1.02, z]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.035, 0.1, 8]} />
              <meshStandardMaterial color="#080810" emissive="#ff6600" emissiveIntensity={0.5} metalness={0.55} roughness={0.4} />
            </mesh>
          ))}
          {/* Fuel pipes */}
          {[0.165, -0.165].map((x, i) => (
            <mesh key={i} position={[x, -0.65, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.38, 4]} />
              <meshStandardMaterial color="#222244" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* ── Stage 1: Side boosters ── */}
        <group ref={(el) => { stageRefs.current[0] = el }}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.3, -0.55, 0]}>
              <mesh>
                <cylinderGeometry args={[0.055, 0.065, 0.75, 10]} />
                <meshStandardMaterial color="#a0a0c0" emissive="#ff6b35" emissiveIntensity={0.06} metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Booster nose */}
              <mesh position={[0, 0.43, 0]}>
                <coneGeometry args={[0.055, 0.14, 10]} />
                <meshStandardMaterial color="#1a1a38" metalness={0.92} roughness={0.15} />
              </mesh>
              {/* Booster nozzle */}
              <mesh position={[0, -0.43, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.032, 0.08, 8]} />
                <meshStandardMaterial color="#080810" emissive="#ff4400" emissiveIntensity={0.5} metalness={0.5} roughness={0.45} />
              </mesh>
              {/* Attachment strut */}
              <mesh position={[side * -0.12, 0.05, 0]}>
                <boxGeometry args={[0.1, 0.015, 0.015]} />
                <meshStandardMaterial color="#2a2a50" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[side * -0.12, -0.15, 0]}>
                <boxGeometry args={[0.1, 0.015, 0.015]} />
                <meshStandardMaterial color="#2a2a50" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>

        {/* ── Engine flame (3-layer realistic) ── */}
        {/* Outer flame — orange */}
        <mesh ref={flameRef} position={[0, -1.15, 0]} visible={false}>
          <coneGeometry args={[0.1, 0.45, 10]} />
          <meshBasicMaterial color="#ff5500" transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Mid flame — yellow */}
        <mesh ref={flame2Ref} position={[0, -1.12, 0]} visible={false}>
          <coneGeometry args={[0.06, 0.35, 8]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Core flame — white-hot */}
        <mesh ref={flame3Ref} position={[0, -1.1, 0]} visible={false}>
          <coneGeometry args={[0.025, 0.25, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <pointLight ref={flameLightRef} position={[0, -1.2, 0]} intensity={0.6} color="#ff6600" distance={3} />
      </group>

      {/* ═══════ DEBRIS — matching stage geometry ═══════ */}
      {SEP.map((_, i) => (
        <group key={i} ref={(el) => { debrisRefs.current[i] = el }} visible={false}>
          {/* Main piece — matches the stage shape */}
          <mesh>
            <cylinderGeometry args={[
              0.055 + i * 0.02,
              0.065 + i * 0.02,
              i === 0 ? 0.4 : 0.2 + i * 0.04,
              8
            ]} />
            <meshStandardMaterial
              color={STAGE_COLORS[i].body}
              emissive={STAGE_COLORS[i].emissive}
              emissiveIntensity={0.25}
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
          {/* Nozzle piece */}
          <mesh position={[0, -(0.15 + i * 0.02), 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.03 + i * 0.005, 0.06, 6]} />
            <meshStandardMaterial color="#0a0a14" emissive="#ff6600" emissiveIntensity={0.3} metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Separation spark flash */}
          <mesh>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshBasicMaterial color={STAGE_COLORS[i].emissive} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* ═══════ ROVER (appears at curve endpoint on landing) ═══════ */}
      {!isMobile && (
        <group ref={roverGroupRef} position={[7.8, 4.2, 0.8]} rotation={[0.1, -0.3, 0.03]} visible={false} scale={0}>
          <group scale={3.5}>
            <Rover />
          </group>
          <Text position={[0, -0.45, 0]} fontSize={0.14} color="#00fff5" anchorX="center" letterSpacing={0.08}>
            SUCCESSFULLY LANDED
          </Text>
        </group>
      )}

      {/* Ambient */}
      <Sparkles count={isMobile ? 8 : 20} scale={isMobile ? [5, 12, 3] : [18, 14, 5]} size={0.18} speed={0.06} color="#ffffff" opacity={0.1} />

      {/* Tagline — desktop only */}
      {!isMobile && (
        <Text position={[0, -7.5, 0]} fontSize={0.18} color="rgba(255,255,255,0.22)" anchorX="center" maxWidth={14} textAlign="center">
          Like a multi-stage rocket, each phase sheds complexity — leaving only the refined solution
        </Text>
      )}
    </group>
  )
}
