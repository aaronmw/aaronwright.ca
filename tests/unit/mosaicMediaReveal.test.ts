import { afterEach, expect, it, vi } from 'vitest'
vi.hoisted(() => {
  vi.stubGlobal('window', {})
})
import { createMediaRevealMotion } from '@/components/mosaic/mediaRevealMotion'
import { gsap } from '@/components/mosaic/motion'

afterEach(() => {
  gsap.globalTimeline.clear()
  gsap.ticker.sleep()
  vi.unstubAllGlobals()
})

function fixture(reduced = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced })
  vi.stubGlobal('matchMedia', () => media)
  const surface = { opacity: 0 },
    covered = vi.fn()
  const motion = createMediaRevealMotion(
    surface as unknown as HTMLElement,
    covered,
  )
  return { media, surface, covered, motion }
}

it.each(['early', 'late'])(
  'gates %s media independently of the rectangle clock',
  arrival => {
    const { motion, surface, covered } = fixture()
    motion.ready(arrival === 'late', arrival === 'early')
    expect(motion.timeline.paused()).toBe(true)
    expect(covered).not.toHaveBeenCalled()
    motion.ready(true, true)
    expect(motion.timeline.paused()).toBe(false)
    expect(motion.timeline.duration()).toBe(0.35)
    motion.timeline.pause().progress(0.9)
    expect(covered).not.toHaveBeenCalled()
    motion.ready(true, true)
    expect(motion.timeline.progress()).toBe(0.9)
    motion.timeline.progress(1, false)
    expect(surface.opacity).toBe(1)
    expect(covered).toHaveBeenCalledOnce()
    motion.dispose()
  },
)

it('settles a running reveal on reduced motion, but still waits for late assets', () => {
  const { motion, media, covered } = fixture()
  media.matches = true
  media.dispatchEvent(new Event('change'))
  expect(covered).not.toHaveBeenCalled()
  motion.ready(true, true)
  expect(covered).toHaveBeenCalledOnce()
  motion.dispose()
})

it('removes interpolation and ignores readiness after unmount', () => {
  const { motion, surface, covered } = fixture()
  motion.ready(true, true)
  motion.timeline.pause().progress(0.5)
  motion.dispose()
  expect(surface.opacity).toBe(0)
  expect(motion.timeline.parent).toBeNull()
  motion.ready(true, true)
  expect(covered).not.toHaveBeenCalled()
})

it('settles a returned snapshot before a delayed readiness update can restart its reveal', () => {
  const { motion, surface, covered } = fixture()
  motion.complete()
  expect(surface.opacity).toBe(1)
  expect(covered).toHaveBeenCalledOnce()
  expect(motion.timeline.paused()).toBe(true)
  motion.ready(true, true)
  expect(motion.timeline.progress()).toBe(1)
  expect(motion.timeline.paused()).toBe(true)
  motion.dispose()
  motion.complete()
  expect(covered).toHaveBeenCalledOnce()
})
