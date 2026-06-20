import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { scrollStore } from '../store/scrollStore'

import Scene1Entry from './scenes/Scene1Entry'
import Scene2Skills from './scenes/Scene2Skills'
import Scene3SystemDesign from './scenes/Scene3SystemDesign'
import Scene4LLMCore from './scenes/Scene4LLMCore'
import Scene5RAGPipeline from './scenes/Scene5RAGPipeline'
import Scene6FullStack from './scenes/Scene6FullStack'
import Scene7Projects from './scenes/Scene7Projects'
import Scene8Mindset from './scenes/Scene8Mindset'

// Camera waypoints for each scene [x, y, z]
const CAM_POS: [number, number, number][] = [
  [0, 3, 12],      // 0 – Entry
  [0, -17, 10],    // 1 – Skills
  [2, -37, 12],    // 2 – System Design
  [0, -57, 8],     // 3 – LLM core
  [-1, -77, 13],   // 4 – RAG
  [0, -97, 13],    // 5 – Problem Solving
  [1, -117, 11],   // 6 – Projects
  [0, -138, 9],    // 7 – Who I Am (closer, slightly lower for planet-entry feel)
]

// LookAt targets
const CAM_TARGET: [number, number, number][] = [
  [0, 0, 0],
  [0, -20, 0],
  [0, -40, 0],
  [0, -60, 0],
  [0, -80, 0],
  [0, -100, 0],
  [0, -120, 0],
  [0, -141, 0],   // look slightly below center for nature immersion
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpV3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export default function Portfolio() {
  const targetVec = useRef(new THREE.Vector3())

  useFrame((state) => {
    // Smooth progress
    scrollStore.progress += (scrollStore.targetProgress - scrollStore.progress) * 0.04

    const p = scrollStore.progress
    const n = CAM_POS.length - 1
    const rawIdx = p * n
    const idx = Math.min(Math.floor(rawIdx), n - 1)
    const t = rawIdx - idx

    const posTarget = lerpV3(CAM_POS[idx], CAM_POS[Math.min(idx + 1, n)], t)
    const lookTarget = lerpV3(CAM_TARGET[idx], CAM_TARGET[Math.min(idx + 1, n)], t)

    state.camera.position.lerp(
      new THREE.Vector3(...posTarget),
      0.06
    )

    targetVec.current.set(...lookTarget)
    state.camera.lookAt(targetVec.current)
  })

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 10, 10]} intensity={0.5} color="#00d4ff" />
      <pointLight position={[0, -140, 5]} intensity={0.4} color="#8b5cf6" />

      {/* Background */}
      <Stars
        radius={200}
        depth={80}
        count={6000}
        factor={3}
        saturation={0.3}
        fade
        speed={0.3}
      />

      {/* Scenes — each centered at Y = sceneIndex * -20 */}
      <Scene1Entry sceneY={0} />
      <Scene2Skills sceneY={-20} />
      <Scene3SystemDesign sceneY={-40} />
      <Scene4LLMCore sceneY={-60} />
      <Scene5RAGPipeline sceneY={-80} />
      <Scene6FullStack sceneY={-100} />
      <Scene7Projects sceneY={-120} />
      <Scene8Mindset sceneY={-140} />
    </>
  )
}
