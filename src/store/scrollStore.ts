export interface ScrollState {
  progress: number
  targetProgress: number
  currentScene: number
}

export const scrollStore: ScrollState = {
  progress: 0,
  targetProgress: 0,
  currentScene: 0,
}

const TOTAL_SCROLL = 5000
const SCENE_COUNT = 8

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function initScrollEvents(): () => void {
  let currentScroll = 0

  const updateProgress = () => {
    scrollStore.targetProgress = currentScroll / TOTAL_SCROLL
    scrollStore.currentScene = Math.min(
      Math.floor(scrollStore.targetProgress * SCENE_COUNT),
      SCENE_COUNT - 1
    )
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    currentScroll = clamp(currentScroll + e.deltaY * 0.9, 0, TOTAL_SCROLL)
    updateProgress()
  }

  let touchY = 0
  const handleTouchStart = (e: TouchEvent) => {
    touchY = e.touches[0].clientY
  }
  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const dy = touchY - e.touches[0].clientY
    touchY = e.touches[0].clientY
    currentScroll = clamp(currentScroll + dy * 2.5, 0, TOTAL_SCROLL)
    updateProgress()
  }

  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: false })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })

  return () => {
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('touchstart', handleTouchStart)
    window.removeEventListener('touchmove', handleTouchMove)
  }
}

export function navigateToScene(sceneIndex: number) {
  scrollStore.targetProgress = sceneIndex / (SCENE_COUNT - 1)
  scrollStore.currentScene = Math.min(sceneIndex, SCENE_COUNT - 1)
}
