// Shared store for Scene4 mobile overlay (rendered outside R3F canvas)
// Scene4LLMCore registers actions; Scene4MobileOverlay reads state + calls actions.

type Sub = () => void

export interface S4State {
  isVisible: boolean
  planetIdx: number
  cardId: number | null
}

let _s: S4State = { isVisible: false, planetIdx: 0, cardId: null }
const _subs = new Set<Sub>()

// Actions are registered by Scene4LLMCore on mount (closures over its setState)
export const s4Actions = {
  navigate(_delta: number): void {},
  jumpTo(_idx: number): void {},
  openCard(_id: number): void {},
  closeCard(): void {},
}

export const scene4MobileStore = {
  get(): S4State { return _s },

  set(patch: Partial<S4State>): void {
    const next = { ..._s, ...patch }
    if (
      next.isVisible === _s.isVisible &&
      next.planetIdx === _s.planetIdx &&
      next.cardId === _s.cardId
    ) return
    _s = next
    _subs.forEach(fn => fn())
  },

  subscribe(fn: Sub): () => void {
    _subs.add(fn)
    return () => _subs.delete(fn)
  },
}
