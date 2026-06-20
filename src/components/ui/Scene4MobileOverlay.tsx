import { useEffect, useReducer, useState } from 'react'
import { scene4MobileStore, s4Actions } from '../../store/scene4MobileStore'
import { LAYERS, InfoCard } from '../scenes/Scene4LLMCore'

// Rendered OUTSIDE the R3F canvas (sibling of canvas-root in App.tsx).
// This guarantees zero Three.js raycasting interference with DOM buttons.

export default function Scene4MobileOverlay() {
  const [, rerender] = useReducer(n => n + 1, 0)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    return scene4MobileStore.subscribe(rerender)
  }, [])

  const { isVisible, planetIdx, cardId } = scene4MobileStore.get()

  // Mirror the same mobile threshold used in Scene4LLMCore (viewport.width < 9 world units ≈ window.innerWidth < 768px)
  const isMobile = windowWidth < 768

  if (!isVisible || !isMobile) return null

  const layer = LAYERS[planetIdx]
  const cardLayer = cardId !== null ? (LAYERS.find(l => l.id === cardId) ?? null) : null

  const arrowBtn = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? 'rgba(80,60,120,0.12)' : 'rgba(168,85,247,0.25)',
    border: `1px solid rgba(168,85,247,${disabled ? '0.18' : '0.60'})`,
    color: disabled ? 'rgba(255,255,255,0.18)' : '#c084fc',
    width: '44px', height: '44px',
    borderRadius: '50%', fontSize: '24px',
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'sans-serif', lineHeight: '1',
    WebkitTapHighlightColor: 'transparent',
    border: `1px solid rgba(168,85,247,${disabled ? '0.18' : '0.60'})`,
  } as React.CSSProperties)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none',
      fontFamily: "'Courier New', monospace",
      zIndex: 50,
    }}>

      {/* ── Section title — top of screen ── */}
      <div style={{
        position: 'absolute', top: '7%', left: 0, right: 0,
        textAlign: 'center',
        fontSize: '15px', fontWeight: '300',
        color: '#f1f5f9', letterSpacing: '-0.01em', lineHeight: 1.3,
        textShadow: '0 0 30px rgba(167,139,250,0.7)',
      }}>
        7 Layer Architecture of Agentic AI
      </div>

      {/* ── Active planet name — below title ── */}
      <div style={{
        position: 'absolute', top: '13%', left: 0, right: 0,
        textAlign: 'center',
        fontSize: '14px', fontWeight: '700',
        color: layer.glowColor,
        letterSpacing: '0.05em',
        textShadow: `0 0 12px ${layer.glowColor}`,
      }}>
        {layer.id} — {layer.name}
      </div>

      {/* ── Transparent tap zone over the planet (middle band of screen) ── */}
      {/* This sits on top of the canvas so taps never reach the 3D mesh */}
      <div
        onClick={() => s4Actions.openCard(layer.id)}
        style={{
          position: 'absolute',
          top: '19%', bottom: '24%',
          left: '8%', right: '8%',
          pointerEvents: 'auto',
          cursor: 'pointer',
          // transparent — only a hit area
        }}
      />

      {/* ── Tap hint — above nav row ── */}
      <div style={{
        position: 'absolute', bottom: '17%', left: 0, right: 0,
        textAlign: 'center',
        fontSize: '11px',
        color: 'rgba(167,139,250,0.55)',
        letterSpacing: '0.14em',
      }}>
        TAP PLANET FOR DETAILS
      </div>

      {/* ── Navigation arrows + dots — bottom of screen ── */}
      <div style={{
        position: 'absolute', bottom: '8%', left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
        pointerEvents: 'auto',
      }}>

        {/* Left arrow */}
        <button
          onClick={() => s4Actions.navigate(-1)}
          disabled={planetIdx === 0}
          style={arrowBtn(planetIdx === 0)}
        >‹</button>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {LAYERS.map((l, i) => (
            <div
              key={i}
              onClick={() => s4Actions.jumpTo(i)}
              style={{
                width:  i === planetIdx ? '13px' : '8px',
                height: i === planetIdx ? '13px' : '8px',
                borderRadius: '50%',
                background: i === planetIdx ? l.glowColor : 'rgba(255,255,255,0.25)',
                boxShadow: i === planetIdx ? `0 0 8px ${l.glowColor}` : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => s4Actions.navigate(1)}
          disabled={planetIdx === LAYERS.length - 1}
          style={arrowBtn(planetIdx === LAYERS.length - 1)}
        >›</button>

      </div>

      {/* ── Info card overlay — covers entire screen with dark backdrop ── */}
      {cardLayer && (
        <div
          onClick={() => s4Actions.closeCard()}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(2,0,14,0.93)',
            zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            pointerEvents: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px' }}
          >
            <InfoCard
              layer={cardLayer}
              s={1.35}
              fullWidth
              onClose={() => s4Actions.closeCard()}
            />
          </div>
        </div>
      )}

    </div>
  )
}
