import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Portfolio from './components/Portfolio'
import HUD from './components/ui/HUD'
import Scene4MobileOverlay from './components/ui/Scene4MobileOverlay'
import { initScrollEvents } from './store/scrollStore'
import './index.css'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const cleanup = initScrollEvents()
    const timer = setTimeout(() => setLoaded(true), 1200)
    return () => {
      cleanup()
      clearTimeout(timer)
    }
  }, [])

  return (
    <>
      {/* Loading screen */}
      <div className={`loading ${loaded ? 'done' : ''}`}>
        <div className="loading-ring" />
        <span className="loading-text">Initializing AI Brain</span>
      </div>

      {/* 3D Canvas */}
      <div className="canvas-root">
        <Canvas
          camera={{ position: [0, 3, 12], fov: 60, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
          style={{ background: '#020408' }}
        >
          <Suspense fallback={null}>
            <Portfolio />
          </Suspense>
        </Canvas>
      </div>

      {/* Scene 4 mobile overlay — outside canvas, no raycasting interference */}
      <Scene4MobileOverlay />

      {/* HUD overlay */}
      <HUD />
    </>
  )
}
