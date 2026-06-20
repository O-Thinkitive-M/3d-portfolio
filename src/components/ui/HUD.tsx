import { useEffect, useState } from 'react'
import { scrollStore, navigateToScene } from '../../store/scrollStore'

const SCENES = [
  'Entry',
  'Skills',
  'System Design',
  'Agentic AI',
  'AWS & DevOps',
  'Problem Solving',
  'AI Vision',
  'Who I Am',
]

export default function HUD() {
  const [progress, setProgress] = useState(0)
  const [scene, setScene] = useState(0)

  useEffect(() => {
    let raf: number
    const tick = () => {
      setProgress(scrollStore.progress)
      setScene(scrollStore.currentScene)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const isLastScene = scene >= 7
  // Hero title fades in on scene 0, fades out as user scrolls
  const heroOpacity = Math.max(0, 1 - progress * 12)

  return (
    <div className="hud">
      {/* ── Progress bar ── */}
      <div className="progress-bar" style={{ width: `${progress * 100}%` }} />

      {/* ── Scene tag (top-left) ── */}
      <div className="scene-tag">
        <em>{String(scene + 1).padStart(2, '0')}</em> / 08 &nbsp;—&nbsp; {SCENES[scene]}
      </div>

      {/* ── Scene 1 hero title (HTML overlay — never cut by 3D rings) ── */}
      <div
        className="scene1-hero"
        style={{ opacity: heroOpacity, pointerEvents: heroOpacity < 0.05 ? 'none' : 'auto' }}
      >
        <h1 className="hero-title">Inside My Developer Brain</h1>
        <p  className="hero-sub">A practical view of the concepts, systems, and technologies I use every day  </p>
      </div>

      {/* ── Nav dots ── */}
      <nav className="nav-dots">
        {SCENES.map((label, i) => (
          <div
            key={i}
            className={`nav-dot${scene === i ? ' active' : ''}`}
            data-label={label}
            onClick={() => navigateToScene(i)}
            title={label}
          />
        ))}
      </nav>

      {/* ── Scroll hint (scene 0 only) ── */}
      <div className={`scroll-hint${progress > 0.025 ? ' hidden' : ''}`}>
        <div className="scroll-mouse" />
        <span>Scroll to explore</span>
      </div>

      {/* ── CTA panel (last scene) ── */}
      <div className={`cta-panel${isLastScene ? ' visible' : ''}`}>
        <h2>Let's Connect</h2>
        <p>Open to collaborations & opportunities</p>
        <div className="cta-buttons">
          <button className="cta-btn primary" onClick={() => window.open('mailto:officialomkate@gmail.com')}>
            Get In Touch
          </button>
          <button className="cta-btn" onClick={() => window.open('https://github.com', '_blank')}>
            View GitHub
          </button>
          <button className="cta-btn" onClick={() => window.open('https://linkedin.com', '_blank')}>
            LinkedIn
          </button>
        </div>
      </div>
    </div>
  )
}
