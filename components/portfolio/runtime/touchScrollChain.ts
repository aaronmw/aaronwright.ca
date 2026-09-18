const TOUCH_SCROLL_CHAIN_SELECTOR = '[data-portfolio-touch-scroll-chain]'
const EDGE_EPSILON_PX = 1

type ScrollMetrics = Pick<
  HTMLElement,
  'scrollTop' | 'scrollHeight' | 'clientHeight'
>

export function shouldChainTouchScroll(
  viewport: ScrollMetrics,
  deltaY: number,
) {
  const maximumScrollTop = Math.max(
    0,
    viewport.scrollHeight - viewport.clientHeight,
  )
  if (deltaY === 0) return false
  return deltaY > 0
    ? viewport.scrollTop <= EDGE_EPSILON_PX
    : viewport.scrollTop >= maximumScrollTop - EDGE_EPSILON_PX
}

// Keep native scrolling (including momentum) within the text. Embla owns the
// next outward swipe at an edge; native scrolling cannot transfer a gesture
// after the browser has already claimed it.
export function installPortfolioTouchScrollChain(
  root: HTMLElement,
  ignoreTarget: (target: EventTarget | null) => boolean,
) {
  let pending: { viewport: HTMLElement; touch: Touch } | null = null

  const clearPending = () => {
    pending = null
  }

  const handleTouchStart = (event: TouchEvent) => {
    clearPending()
    if (event.touches.length !== 1 || ignoreTarget(event.target)) return
    const target = event.target instanceof Element ? event.target : null
    const viewport = target?.closest<HTMLElement>(TOUCH_SCROLL_CHAIN_SELECTOR)
    if (
      !viewport ||
      !root.contains(viewport) ||
      !viewport.hasAttribute('data-portfolio-native-wheel-scroll')
    )
      return
    pending = { viewport, touch: event.touches[0] }
  }

  const handleTouchMove = (event: TouchEvent) => {
    const start = pending
    if (!start) return
    if (event.touches.length !== 1 || !event.cancelable) {
      clearPending()
      return
    }

    const touch = event.touches[0]
    const deltaX = touch.clientX - start.touch.clientX
    const deltaY = touch.clientY - start.touch.clientY
    if (deltaX === 0 && deltaY === 0) return
    clearPending()

    if (
      Math.abs(deltaY) <= Math.abs(deltaX) ||
      !shouldChainTouchScroll(start.viewport, deltaY)
    )
      return

    // Begin on the outer viewport so the text's native-scroll exclusion still
    // applies to the original touchstart. Embla handles drag, release, and snaps.
    // A standard Event also works on touch devices without a TouchEvent constructor.
    const handoff = new Event('touchstart', { cancelable: true })
    Object.defineProperties(handoff, {
      touches: { value: [start.touch] },
      targetTouches: { value: [start.touch] },
      changedTouches: { value: [start.touch] },
    })
    event.preventDefault()
    root.dispatchEvent(handoff)
  }

  root.addEventListener('touchstart', handleTouchStart, {
    capture: true,
    passive: true,
  })
  root.addEventListener('touchmove', handleTouchMove, {
    capture: true,
    passive: false,
  })
  root.addEventListener('touchend', clearPending, { capture: true })
  root.addEventListener('touchcancel', clearPending, { capture: true })

  return () => {
    root.removeEventListener('touchstart', handleTouchStart, { capture: true })
    root.removeEventListener('touchmove', handleTouchMove, { capture: true })
    root.removeEventListener('touchend', clearPending, { capture: true })
    root.removeEventListener('touchcancel', clearPending, { capture: true })
    clearPending()
  }
}
