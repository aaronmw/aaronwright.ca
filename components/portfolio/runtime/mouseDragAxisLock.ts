export type MouseDragAxis = 'x' | 'y'

type MouseDragAxisLockOptions = {
  root: HTMLElement
  targetSelector: string
  ignoreTarget?: (target: EventTarget | null) => boolean
}

type PendingMouseDrag = {
  target: Element
  clientX: number
  clientY: number
  screenX: number
  screenY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

const AXIS_LOCK_MIN_DISTANCE = 8
const AXIS_DOMINANCE_RATIO = 1.15
const CAROUSEL_DRAG_LOCK_SELECTOR = '[data-portfolio-carousel-drag-lock]'

const lockedMouseDownAxes = new WeakMap<Event, MouseDragAxis>()

export function getLockedMouseDragAxis(event: Event) {
  return lockedMouseDownAxes.get(event) ?? null
}

export function isPortfolioCarouselDragLockedTarget(
  target: EventTarget | null,
) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  return Boolean(element?.closest(CAROUSEL_DRAG_LOCK_SELECTOR))
}

export function installPortfolioMouseDragAxisLock({
  root,
  targetSelector,
  ignoreTarget,
}: MouseDragAxisLockOptions) {
  let pendingDrag: PendingMouseDrag | null = null

  const clearPendingDrag = () => {
    pendingDrag = null
  }

  const handleMouseDown = (event: MouseEvent) => {
    if (getLockedMouseDragAxis(event)) return
    const eventTarget =
      event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null
    const dragTarget = eventTarget?.closest(targetSelector)
    if (
      event.button !== 0 ||
      event.buttons !== 1 ||
      !dragTarget ||
      ignoreTarget?.(event.target)
    ) {
      clearPendingDrag()
      return
    }

    pendingDrag = {
      target: dragTarget,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    }
  }

  const handleMouseMove = (event: MouseEvent) => {
    const start = pendingDrag
    if (!start) return
    if ((event.buttons & 1) === 0) {
      clearPendingDrag()
      return
    }

    const xDistance = Math.abs(event.clientX - start.clientX)
    const yDistance = Math.abs(event.clientY - start.clientY)
    if (Math.max(xDistance, yDistance) < AXIS_LOCK_MIN_DISTANCE) return

    const axis =
      xDistance >= yDistance * AXIS_DOMINANCE_RATIO
        ? 'x'
        : yDistance >= xDistance * AXIS_DOMINANCE_RATIO
          ? 'y'
          : null
    if (!axis) return

    clearPendingDrag()
    const lockedMouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: start.clientX,
      clientY: start.clientY,
      screenX: start.screenX,
      screenY: start.screenY,
      ctrlKey: start.ctrlKey,
      shiftKey: start.shiftKey,
      altKey: start.altKey,
      metaKey: start.metaKey,
    })
    lockedMouseDownAxes.set(lockedMouseDown, axis)
    start.target.dispatchEvent(lockedMouseDown)
  }

  root.addEventListener('mousedown', handleMouseDown, { capture: true })
  window.addEventListener('mousemove', handleMouseMove, { capture: true })
  window.addEventListener('mouseup', clearPendingDrag, { capture: true })
  window.addEventListener('blur', clearPendingDrag)

  return () => {
    root.removeEventListener('mousedown', handleMouseDown, { capture: true })
    window.removeEventListener('mousemove', handleMouseMove, { capture: true })
    window.removeEventListener('mouseup', clearPendingDrag, { capture: true })
    window.removeEventListener('blur', clearPendingDrag)
  }
}
