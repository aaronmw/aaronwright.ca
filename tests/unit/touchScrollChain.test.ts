import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  installPortfolioTouchScrollChain,
  shouldChainTouchScroll,
} from '../../components/portfolio/runtime/touchScrollChain'

describe('touch scroll chaining', () => {
  const overflowing = { scrollHeight: 800, clientHeight: 300 }

  it.each([
    ['upward swipe at the bottom', 500, -20, true],
    ['downward swipe at the bottom', 500, 20, false],
    ['downward swipe at the top', 0, 20, true],
    ['upward swipe at the top', 0, -20, false],
    ['upward swipe within the text', 250, -20, false],
    ['downward swipe within the text', 250, 20, false],
    ['fractional bottom edge', 499.5, -20, true],
    ['fractional top edge', 0.5, 20, true],
    ['bottom rubber band', 515, -20, true],
    ['top rubber band', -15, 20, true],
    ['stationary touch', 500, 0, false],
  ])('%s', (_label, scrollTop, deltaY, chains) => {
    expect(shouldChainTouchScroll({ ...overflowing, scrollTop }, deltaY)).toBe(
      chains,
    )
  })

  it('lets either direction reach the carousel when all the text fits', () => {
    const viewport = { scrollTop: 0, scrollHeight: 300, clientHeight: 300 }
    expect(shouldChainTouchScroll(viewport, 20)).toBe(true)
    expect(shouldChainTouchScroll(viewport, -20)).toBe(true)
  })
})

// Exercise the event adapter without a browser or an additional DOM dependency.
class ScrollElement extends EventTarget {
  scrollTop = 500
  scrollHeight = 800
  clientHeight = 300
  nativeScroll = true
  chain = false

  closest() {
    return this.chain ? this : null
  }

  contains(element: ScrollElement) {
    return element.chain
  }

  hasAttribute() {
    return this.nativeScroll
  }
}

function setupTouchChain() {
  vi.stubGlobal('Element', ScrollElement)
  const root = new ScrollElement()
  const text = new ScrollElement()
  text.chain = true
  const handoffs: Event[] = []
  const remove = installPortfolioTouchScrollChain(
    root as unknown as HTMLElement,
    () => false,
  )
  root.addEventListener('touchstart', event => {
    if (event.target === root) handoffs.push(event)
  })

  const touch = (
    type: string,
    x: number,
    y: number,
    count = 1,
    cancelable = true,
  ) => {
    const event = new Event(type, { cancelable })
    Object.defineProperties(event, {
      target: { value: text },
      touches: {
        value: Array.from({ length: count }, (_, identifier) => ({
          identifier,
          clientX: x,
          clientY: y,
        })),
      },
    })
    root.dispatchEvent(event)
    return event
  }
  return { text, handoffs, remove, touch }
}

describe('touch handoff events', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('starts one outer drag at the original finger position for an outward swipe', () => {
    const { touch, handoffs, remove } = setupTouchChain()
    touch('touchstart', 100, 200)
    expect(touch('touchmove', 102, 180).defaultPrevented).toBe(true)
    touch('touchmove', 103, 160)
    expect(handoffs).toHaveLength(1)
    expect((handoffs[0] as TouchEvent).touches[0]).toMatchObject({
      clientX: 100,
      clientY: 200,
    })
    remove()
    touch('touchstart', 100, 200)
    touch('touchmove', 100, 180)
    expect(handoffs).toHaveLength(1)
  })

  it.each([
    ['inward scroll', 100, 220, 1, true],
    ['horizontal swipe', 120, 202, 1, true],
    ['pinch', 100, 180, 2, true],
    ['browser-owned scroll', 100, 180, 1, false],
  ])('leaves %s alone', (_label, x, y, count, cancelable) => {
    const { touch, handoffs, remove } = setupTouchChain()
    touch('touchstart', 100, 200)
    expect(touch('touchmove', x, y, count, cancelable).defaultPrevented).toBe(
      false,
    )
    expect(handoffs).toHaveLength(0)
    remove()
  })

  it('waits for another swipe after native text scrolling reaches the edge', () => {
    const { text, touch, handoffs, remove } = setupTouchChain()
    text.scrollTop = 250
    touch('touchstart', 100, 200)
    expect(touch('touchmove', 100, 180).defaultPrevented).toBe(false)
    text.scrollTop = 500
    touch('touchmove', 100, 160)
    expect(handoffs).toHaveLength(0)
    touch('touchend', 100, 160, 0)
    touch('touchstart', 100, 200)
    expect(touch('touchmove', 100, 180).defaultPrevented).toBe(true)
    expect(handoffs).toHaveLength(1)
    remove()
  })

  it('does not restart a drag that already belongs to the carousel', () => {
    const { text, touch, handoffs, remove } = setupTouchChain()
    text.nativeScroll = false
    touch('touchstart', 100, 200)
    touch('touchmove', 100, 180)
    expect(handoffs).toHaveLength(0)
    remove()
  })
})
