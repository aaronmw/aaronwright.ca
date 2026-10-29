import { afterEach, expect, it, vi } from 'vitest'
vi.hoisted(() => {
  vi.stubGlobal('window', {})
})
import {
  blurbMotionGeometry,
  createBlurbMotion,
  createBlurbTimeline,
  type BlurbMotionElements,
} from '@/components/mosaic/blurbMotion'
import {
  createRectangleTimeline,
  rectangleCornerOrder,
  rectanglePaths,
} from '@/components/mosaic/rectangleMotion'
import { gsap } from '@/components/mosaic/motion'
import { MotionElement, motionInk } from './mosaicMotionFixture'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  gsap.globalTimeline.clear()
  gsap.ticker.sleep()
  vi.unstubAllGlobals()
})

function fixture(reduced = false, intro = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced })
  const window = new EventTarget()
  vi.stubGlobal('window', window)
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('getComputedStyle', () => ({
    borderTopWidth: '6px',
    backgroundColor: 'rgb(255, 42, 0)',
  }))
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect = disconnect
    },
  )
  const elements = {
    ...motionInk(),
    layer: new MotionElement({ left: 0, top: 0, width: 1920, height: 1080 }),
    panel: new MotionElement(),
    toggle: new MotionElement({ left: 30, top: 1020, width: 30, height: 30 }),
    anchor: new MotionElement({ left: 30, top: 1020, width: 30, height: 30 }),
  }
  const complete = vi.fn(),
    moving = vi.fn()
  const motion = createBlurbMotion(elements as unknown as BlurbMotionElements, {
    intro,
    expanded: true,
    onMoving: moving,
    onSettled: complete,
  })
  disposals.push(motion.dispose)
  return { elements, complete, moving, motion, window, media, disconnect }
}

it('reads browser-style rectangle accessors instead of spreading away dimensions', () => {
  class BrowserRect {
    get left() {
      return 30
    }
    get top() {
      return 80
    }
    get width() {
      return 480
    }
    get height() {
      return 240
    }
  }
  const panel = new BrowserRect()
  expect({ ...panel }).toEqual({})
  const geometry = blurbMotionGeometry(
    panel,
    { left: 30, top: 276, width: 44, height: 44 },
    6,
  )
  expect(rectanglePaths(geometry)[0]).toEqual([
    'M 19 215 L 25 215 L 25 221 L 19 221 Z',
    'M 19 215 L 25 215 L 25 221 L 0 240 Z',
    'M 0 0 L 25 215 L 25 221 L 0 240 Z',
    'M 0 0 L 480 0 L 25 221 L 0 240 Z',
    'M 0 0 L 480 0 L 480 240 L 0 240 Z',
  ])
})

it('keeps one logo-sized bottom-left anchor for all six panel placements', () => {
  const button = { left: 30, top: 1020, width: 30, height: 30 }
  for (const left of [30, 720, 1410])
    for (const top of [80, 750]) {
      const panel = { left, top, width: 480, height: 240 }
      const geometry = blurbMotionGeometry(panel, button, 6)
      expect(rectangleCornerOrder(geometry)).toEqual([3, 0, 1, 2])
      const paths = rectanglePaths(geometry)[0]
      const x = button.left - panel.left,
        y = button.top - panel.top
      expect(paths[0]).toBe(
        `M ${x + 12} ${y + 12} L ${x + 18} ${y + 12} L ${x + 18} ${y + 18} L ${x + 12} ${y + 18} Z`,
      )
      expect(paths[4]).toBe('M 0 0 L 480 0 L 480 240 L 0 240 Z')
      expect(geometry.center.x + panel.left).toBe(45)
      expect(geometry.center.y + panel.top).toBe(1035)
    }
})

it('grows one corner at a time and keeps full strokes through the red fill', () => {
  const ink = motionInk()
  const geometry = { width: 480, height: 240, pixel: 6 }
  const paths = rectanglePaths(geometry)
  const timeline = createRectangleTimeline(ink, geometry)
  for (let step = 1; step <= 4; step++) {
    timeline.time(step * 0.045)
    expect(ink.shape.getAttribute('d')).toBe(paths[0][step])
    expect(Number(ink.stroke.getAttribute('stroke-width'))).toBe(12)
  }
  timeline.seek('filled')
  expect(Number(ink.paint.getAttribute('fill-opacity'))).toBe(1)
  expect(Number(ink.stroke.getAttribute('stroke-width'))).toBe(12)
  timeline.reverse().pause().time(0.09)
  expect(ink.shape.getAttribute('d')).toBe(paths[0][2])
})

it('reveals notes above solid ink and retraces the same paths on reversal', () => {
  const ink = motionInk(),
    panel = new MotionElement()
  const geometry = blurbMotionGeometry(
    panel.bounds,
    { left: 30, top: 896, width: 44, height: 44 },
    6,
  )
  const timeline = createBlurbTimeline(
    ink,
    panel as unknown as HTMLElement,
    geometry,
    'black',
  )
  timeline.seek('filled')
  expect(panel.opacity).toBe(0)
  expect(Number(ink.paint.getAttribute('fill-opacity'))).toBe(1)
  expect(Number(ink.stroke.getAttribute('stroke-width'))).toBe(12)
  timeline.time(timeline.labels.filled + 0.12)
  expect(panel.opacity).toBeGreaterThan(0)
  expect(panel.opacity).toBeLessThan(1)
  expect(Number(ink.svg.getAttribute('opacity'))).toBe(1)
  expect(Number(ink.stroke.getAttribute('stroke-width'))).toBe(12)
  timeline.progress(1)
  expect(panel.opacity).toBe(1)
  timeline.time(timeline.labels.pixel + 0.07)
  const path = ink.shape.getAttribute('d'),
    time = timeline.time()
  timeline.reverse()
  expect(timeline.time()).toBe(time)
  expect(ink.shape.getAttribute('d')).toBe(path)
  timeline.pause().seek('pixel')
  expect(ink.shape.getAttribute('d')).toBe(rectanglePaths(geometry)[0][0])
  timeline.progress(0)
  expect(ink.shape.getAttribute('d')).toBe(geometry.buttonPaths[0])
})

it('opens from the fixed button and allows immediate reversal during the first reveal', () => {
  const { motion, complete, elements } = fixture(false, true)
  expect(motion.timeline.paused()).toBe(false)
  expect(motion.timeline.time()).toBe(0)
  expect(elements.layer.dataset.controlsReady).toBe('')
  expect(elements.travel.getAttribute('transform')).toBe('translate(0 0)')
  motion.timeline.pause().time(motion.timeline.labels.pixel + 0.07)
  const time = motion.timeline.time(),
    path = elements.shape.getAttribute('d')
  expect(complete).not.toHaveBeenCalled()
  motion.setExpanded(false)
  expect(motion.timeline.time()).toBe(time)
  expect(elements.shape.getAttribute('d')).toBe(path)
  motion.timeline.pause().progress(0, false)
  expect(complete).toHaveBeenLastCalledWith(false)
  expect(elements.shape.getAttribute('d')).toBe(
    'M 0 320 L 30 320 L 30 350 L 0 350 Z',
  )
  expect(elements.layer.dataset.controlsReady).toBe('')
})

it.each([true, false])(
  'keeps the outline visible throughout closing after intro=%s',
  intro => {
    const { motion, elements } = fixture(false, intro)
    const timeline = motion.timeline
    timeline.pause().progress(1, false)
    motion.setExpanded(false)
    timeline.pause()
    expect(motion.timeline).toBe(timeline)
    expect(timeline.reversed()).toBe(true)
    timeline.time(timeline.labels.filled + 0.12)
    expect(Number(elements.svg.getAttribute('opacity'))).toBe(1)
    expect(Number(elements.stroke.getAttribute('stroke-width'))).toBe(12)
    for (const time of [
      timeline.labels.filled - 0.01,
      timeline.labels.pixel + 0.07,
    ]) {
      timeline.time(time)
      expect(elements.panel.opacity).toBe(0)
      expect(Number(elements.svg.getAttribute('opacity'))).toBe(1)
    }
    timeline.progress(0, false)
    expect(Number(elements.svg.getAttribute('opacity'))).toBe(0)
  },
)

it('repeated toggles preserve the playhead, prescribed corners, and the fixed control', () => {
  const { motion, elements, complete } = fixture()
  const timeline = motion.timeline
  const position = { ...elements.layer.style.values }
  const random = vi.spyOn(Math, 'random')
  complete.mockClear()
  motion.setExpanded(false)
  timeline.pause().time(timeline.labels.pixel + 0.07)
  const path = elements.shape.getAttribute('d'),
    time = timeline.time()
  for (const expanded of [true, false, true, false]) {
    motion.setExpanded(expanded)
    timeline.pause()
    expect(timeline.time()).toBe(time)
    expect(elements.shape.getAttribute('d')).toBe(path)
    expect(elements.layer.style.values).toEqual(position)
    expect(elements.layer.dataset.controlsReady).toBe('')
  }
  expect(random).not.toHaveBeenCalled()
  timeline.progress(0, false)
  expect(complete).toHaveBeenLastCalledWith(false)
  expect(elements.layer.style.values).toEqual(position)
  expect(elements.shape.getAttribute('d')).toBe(
    'M 0 320 L 30 320 L 30 350 L 0 350 Z',
  )
  motion.setExpanded(true)
  expect(motion.timeline).toBe(timeline)
  timeline.pause().timeScale(0.2).progress(0.5)
  expect(timeline.timeScale()).toBe(0.2)
  timeline.progress(1, false)
  expect(complete).toHaveBeenLastCalledWith(true)
  expect(elements.layer.style.values).toEqual(position)
  expect(elements.toggle.bounds).toEqual({
    left: 30,
    top: 1020,
    width: 30,
    height: 30,
  })
})

it('keeps the reveal visible until React commits the settled state', () => {
  const { motion, elements, complete } = fixture()
  motion.setExpanded(false)
  motion.timeline.pause().progress(0, false)
  // React has rendered the collapsed endpoint, then the opening transition.
  elements.layer.dataset.collapsed = 'true'
  elements.layer.dataset.animating = 'true'
  motion.setExpanded(true)
  motion.timeline.pause().progress(1, false)
  expect(complete).toHaveBeenLastCalledWith(true)
  expect(elements.panel.opacity).toBe(1)
  expect(elements.svg.getAttribute('opacity')).toBe('0')
  // A queued React commit still has data-collapsed. The animation override
  // must survive until that same commit removes both attributes together.
  expect(elements.layer.dataset.collapsed).toBe('true')
  expect(elements.layer.dataset.animating).toBe('true')
})

it('settles resize and reduced-motion changes to the latest requested endpoint', () => {
  const { motion, elements, window, media, complete } = fixture()
  motion.setExpanded(false)
  motion.timeline.pause().progress(0.4)
  elements.panel.bounds.width = 400
  window.dispatchEvent(new Event('resize'))
  expect(complete).toHaveBeenLastCalledWith(false)
  expect(motion.timeline.progress()).toBe(0)
  expect(elements.layer.dataset.animating).toBeUndefined()
  motion.setExpanded(true)
  motion.timeline.pause().progress(0.3)
  media.matches = true
  media.dispatchEvent(new Event('change'))
  expect(complete).toHaveBeenLastCalledWith(true)
  expect(motion.timeline.progress()).toBe(1)
  expect(elements.panel.style.opacity).toBe('1')
})

it('skips reduced motion and cleans up tweens, observers, controls, and obsolete callbacks', () => {
  const { motion, elements, complete, window, disconnect } = fixture(true, true)
  expect(complete).toHaveBeenCalledExactlyOnceWith(true)
  expect(motion.timeline.paused()).toBe(true)
  complete.mockClear()
  motion.dispose()
  window.dispatchEvent(new Event('resize'))
  motion.setExpanded(false)
  expect(disconnect).toHaveBeenCalled()
  expect(motion.timeline.parent).toBeNull()
  expect(elements.layer.dataset.controlsReady).toBeUndefined()
  expect(elements.layer.style.values).toEqual({})
  expect(complete).not.toHaveBeenCalled()
})
