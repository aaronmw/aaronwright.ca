export type MouseDragAxis = 'x' | 'y'

type MouseDragAxisLockOptions = {
  root: HTMLElement
  targetSelector: string
  ignoreTarget?: (target: EventTarget | null) => boolean
}

type PendingMouseDrag = {
  target: Element
  dragAllowed: boolean
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

type MouseIntent = MouseDragAxis | 'click'
const mouseIntents = new WeakMap<Event, MouseIntent>()

export function getPortfolioMouseIntent(event: Event) {
  return mouseIntents.get(event) ?? null
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
    if (getPortfolioMouseIntent(event)) return
    const eventTarget =
      event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null
    const dragTarget = eventTarget?.closest(targetSelector)
    if (event.button !== 0 || event.buttons !== 1 || !dragTarget) {
      clearPendingDrag()
      return
    }

    pendingDrag = {
      target: dragTarget,
      dragAllowed: !ignoreTarget?.(event.target),
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
    if (!start.dragAllowed) return

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
    dispatchMouseDown(start, axis)
  }

  function dispatchMouseDown(start: PendingMouseDrag, intent: MouseIntent) {
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
    mouseIntents.set(lockedMouseDown, intent)
    start.target.dispatchEvent(lockedMouseDown)
  }

  const handleMouseUp = (event: MouseEvent) => {
    const start = pendingDrag
    clearPendingDrag()
    if (!start || event.button !== 0) return
    // A press that never became a carousel drag still needs a down/up lifecycle.
    // Otherwise Embla retains click suppression from an earlier wheel/drag and
    // swallows this new click. Replay down at the release position; the original
    // mouseup then reaches both tracks, with no movement or synthetic click.
    dispatchMouseDown(
      {
        ...start,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
      },
      'click',
    )
  }

  root.addEventListener('mousedown', handleMouseDown, { capture: true })
  window.addEventListener('mousemove', handleMouseMove, { capture: true })
  window.addEventListener('mouseup', handleMouseUp, { capture: true })
  window.addEventListener('blur', clearPendingDrag)

  return () => {
    root.removeEventListener('mousedown', handleMouseDown, { capture: true })
    window.removeEventListener('mousemove', handleMouseMove, { capture: true })
    window.removeEventListener('mouseup', handleMouseUp, { capture: true })
    window.removeEventListener('blur', clearPendingDrag)
  }
}
