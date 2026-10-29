const IDLE_TIME_SCALE = 0.2
const TRANSITION_MS = 1000

/** Each tile owns its tempo; segment changes never reset its interaction state. */
export function createMosaicPlaybackTempo() {
  const listeners = new Set<(scale: number) => void>()
  let hovered = false
  let focused = false
  let from = IDLE_TIME_SCALE
  let target = IDLE_TIME_SCALE
  let transitionStart = 0
  let frame: number | undefined

  function getTimeScale() {
    if (from === target) return target
    const progress = Math.min(
      1,
      (performance.now() - transitionStart) / TRANSITION_MS,
    )
    if (progress === 1) return target
    // Smooth acceleration, with no sudden rate change at either end.
    const eased = progress * progress * (3 - 2 * progress)
    return from + (target - from) * eased
  }

  function schedule(publishedScale: number) {
    if (listeners.size > 0 && frame === undefined && publishedScale !== target)
      frame = requestAnimationFrame(tick)
  }

  function updateTarget() {
    const next = hovered || focused ? 1 : IDLE_TIME_SCALE
    if (target === next) return
    from = getTimeScale()
    target = next
    transitionStart = performance.now()
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    listeners.forEach(listener => listener(from))
    schedule(from)
  }

  function tick() {
    frame = undefined
    const scale = getTimeScale()
    listeners.forEach(listener => listener(scale))
    schedule(scale)
  }

  return {
    getTimeScale,
    setHovered(value: boolean) {
      hovered = value
      updateTarget()
    },
    setFocused(value: boolean) {
      focused = value
      updateTarget()
    },
    subscribe(listener: (scale: number) => void) {
      listeners.add(listener)
      const scale = getTimeScale()
      listener(scale)
      schedule(scale)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && frame !== undefined) {
          cancelAnimationFrame(frame)
          frame = undefined
        }
      }
    },
  }
}

export type MosaicPlaybackTempo = ReturnType<typeof createMosaicPlaybackTempo>
