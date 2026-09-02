import type { EmblaCarouselType } from 'embla-carousel'

type OrderedBoundaryWrapOptions = {
  api: EmblaCarouselType
  axis: 'x' | 'y'
  root: HTMLElement
  onWrap: (direction: -1 | 1) => void
  ignoreTarget?: (target: EventTarget | null) => boolean
}

const WHEEL_GESTURE_IDLE_MS = 180
const WHEEL_MIN_DELTA = 6
const DRAG_MIN_DISTANCE = 40
const AXIS_DOMINANCE_RATIO = 1.15

function boundaryDirection(api: EmblaCarouselType, direction: -1 | 1) {
  const selectedIndex = api.selectedScrollSnap()
  const lastIndex = api.scrollSnapList().length - 1
  if (direction < 0 && selectedIndex === 0) return direction
  if (direction > 0 && selectedIndex === lastIndex) return direction
  return null
}

export function installOrderedBoundaryWrap({
  api,
  axis,
  root,
  onWrap,
  ignoreTarget,
}: OrderedBoundaryWrapOptions) {
  let lastWheelAt = Number.NEGATIVE_INFINITY
  let wheelGestureStartedAtBoundary = false
  let wheelGestureWrapped = false
  let dragStart:
    | { pointerId: number; primary: number; cross: number; direction: -1 | 1 }
    | undefined

  const handleWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const primaryDelta = axis === 'x' ? event.deltaX : event.deltaY
    const crossDelta = axis === 'x' ? event.deltaY : event.deltaX
    if (
      Math.abs(primaryDelta) < WHEEL_MIN_DELTA ||
      Math.abs(primaryDelta) < Math.abs(crossDelta) * AXIS_DOMINANCE_RATIO
    ) {
      return
    }

    const direction = Math.sign(primaryDelta) as -1 | 1
    if (event.timeStamp - lastWheelAt > WHEEL_GESTURE_IDLE_MS) {
      wheelGestureStartedAtBoundary = Boolean(boundaryDirection(api, direction))
      wheelGestureWrapped = false
    }
    lastWheelAt = event.timeStamp
    if (!wheelGestureStartedAtBoundary) return

    event.preventDefault()
    event.stopImmediatePropagation()
    if (wheelGestureWrapped) return
    wheelGestureWrapped = true
    onWrap(direction)
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || ignoreTarget?.(event.target)) return
    const selectedIndex = api.selectedScrollSnap()
    const lastIndex = api.scrollSnapList().length - 1
    const direction =
      selectedIndex === 0 ? -1 : selectedIndex === lastIndex ? 1 : null
    if (!direction) return
    dragStart = {
      pointerId: event.pointerId,
      primary: axis === 'x' ? event.clientX : event.clientY,
      cross: axis === 'x' ? event.clientY : event.clientX,
      direction,
    }
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return
    const start = dragStart
    dragStart = undefined
    const primary = axis === 'x' ? event.clientX : event.clientY
    const cross = axis === 'x' ? event.clientY : event.clientX
    const primaryDistance = primary - start.primary
    const crossDistance = cross - start.cross
    const direction = Math.sign(-primaryDistance) as -1 | 0 | 1
    if (
      direction !== start.direction ||
      Math.abs(primaryDistance) < DRAG_MIN_DISTANCE ||
      Math.abs(primaryDistance) < Math.abs(crossDistance) * AXIS_DOMINANCE_RATIO
    ) {
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onWrap(direction))
    })
  }

  const clearDrag = (event: PointerEvent) => {
    if (dragStart?.pointerId === event.pointerId) dragStart = undefined
  }

  root.addEventListener('wheel', handleWheel, { capture: true, passive: false })
  root.addEventListener('pointerdown', handlePointerDown, { capture: true })
  window.addEventListener('pointerup', handlePointerUp, { capture: true })
  window.addEventListener('pointercancel', clearDrag, { capture: true })

  return () => {
    root.removeEventListener('wheel', handleWheel, { capture: true })
    root.removeEventListener('pointerdown', handlePointerDown, {
      capture: true,
    })
    window.removeEventListener('pointerup', handlePointerUp, { capture: true })
    window.removeEventListener('pointercancel', clearDrag, { capture: true })
  }
}
