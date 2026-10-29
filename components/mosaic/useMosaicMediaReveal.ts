import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createMediaRevealMotion } from './mediaRevealMotion'
import { registerMosaicReturnReveal } from './sourceVisual'

/** Loading time is not animation time: late media gets its own complete reveal. */
export function useMosaicMediaReveal(
  surface: RefObject<HTMLDivElement | null>,
  arrived: boolean,
  ready: boolean,
  settleEntrance: () => void,
) {
  const [covered, setCovered] = useState(false)
  const motion = useRef<ReturnType<typeof createMediaRevealMotion> | null>(null)
  useLayoutEffect(() => {
    if (!surface.current) return
    const active = createMediaRevealMotion(surface.current, () =>
      setCovered(true),
    )
    motion.current = active
    const unregisterReturn = registerMosaicReturnReveal(surface.current, () => {
      // A decoded viewer snapshot is already visible. Prepare its destination
      // while covered, including direct links whose grid has never played.
      settleEntrance()
      active.complete()
    })
    return () => {
      unregisterReturn()
      active.dispose()
      motion.current = null
    }
  }, [surface, settleEntrance])
  useLayoutEffect(() => {
    motion.current?.ready(arrived, ready)
  }, [arrived, ready])
  return covered
}
