export const DEFAULT_IDLE_PLAYBACK_SPEED = 1
export const MIN_IDLE_PLAYBACK_SPEED = 0.1
const TRANSITION_MS = 1000

function validIdleSpeed(value: number) {
  return (
    Number.isFinite(value) && value >= MIN_IDLE_PLAYBACK_SPEED && value <= 1
  )
}

/** Each tile owns its tempo; segment changes never reset its interaction state. */
export function createMosaicPlaybackTempo(
  initialIdleSpeed = DEFAULT_IDLE_PLAYBACK_SPEED,
) {
  const listeners = new Set<(scale: number) => void>()
  let idleSpeed = validIdleSpeed(initialIdleSpeed)
    ? initialIdleSpeed
    : DEFAULT_IDLE_PLAYBACK_SPEED
  let hovered = false
  let focused = false
  let from = idleSpeed
  let target = idleSpeed
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
    const next = hovered || focused ? 1 : idleSpeed
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
    setIdleSpeed(value: number) {
      if (!validIdleSpeed(value)) return
      idleSpeed = value
      updateTarget()
    },
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
