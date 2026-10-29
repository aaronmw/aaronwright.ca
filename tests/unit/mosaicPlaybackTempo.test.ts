import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMosaicPlaybackTempo } from '@/components/mosaic/mosaicPlaybackTempo'

let now = 0
let nextFrame = 0
const frames = new Map<number, FrameRequestCallback>()

beforeEach(() => {
  now = 0
  nextFrame = 0
  frames.clear()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function paintAt(time: number) {
  now = time
  const pending = Array.from(frames.values())
  frames.clear()
  pending.forEach(callback => callback(time))
}

it('stays slow indefinitely and ramps only the hovered tile over one second', () => {
  const tempo = createMosaicPlaybackTempo()
  const otherTempo = createMosaicPlaybackTempo()
  const firstVideo = vi.fn()
  const secondVideo = vi.fn()
  const stopFirst = tempo.subscribe(firstVideo)
  const stopSecond = otherTempo.subscribe(secondVideo)
  paintAt(10000)
  expect(tempo.getTimeScale()).toBe(0.2)
  expect(frames.size).toBe(0)
  tempo.setHovered(true)
  expect(frames.size).toBe(1)
  paintAt(10250)
  expect(firstVideo).toHaveBeenLastCalledWith(0.325)
  paintAt(10500)
  expect(tempo.getTimeScale()).toBeCloseTo(0.6)
  expect(otherTempo.getTimeScale()).toBe(0.2)
  expect(secondVideo).toHaveBeenCalledExactlyOnceWith(0.2)
  // Repeated input must not restart the ramp.
  tempo.setHovered(true)
  paintAt(11000)
  expect(firstVideo).toHaveBeenLastCalledWith(1)
  expect(secondVideo).toHaveBeenLastCalledWith(0.2)
  expect(frames.size).toBe(0)
  stopFirst()
  stopSecond()
})

it('reverses from its current speed when hover ends, reaching exactly 0.2 again', () => {
  const tempo = createMosaicPlaybackTempo()
  const video = vi.fn()
  const stop = tempo.subscribe(video)
  tempo.setHovered(true)
  paintAt(500)
  expect(tempo.getTimeScale()).toBeCloseTo(0.6)
  tempo.setHovered(false)
  expect(video.mock.lastCall?.[0]).toBeCloseTo(0.6)
  paintAt(1000)
  expect(video.mock.lastCall?.[0]).toBeCloseTo(0.4)
  paintAt(1500)
  expect(video).toHaveBeenLastCalledWith(0.2)
  expect(frames.size).toBe(0)
  tempo.setHovered(true)
  paintAt(2500)
  expect(video).toHaveBeenLastCalledWith(1)
  stop()
})

it('keeps normal speed while either hover or keyboard focus remains active', () => {
  const tempo = createMosaicPlaybackTempo()
  const video = vi.fn()
  const stop = tempo.subscribe(video)
  tempo.setFocused(true)
  paintAt(1000)
  expect(video).toHaveBeenLastCalledWith(1)
  tempo.setHovered(true)
  tempo.setFocused(false)
  paintAt(2000)
  expect(tempo.getTimeScale()).toBe(1)
  tempo.setFocused(true)
  tempo.setHovered(false)
  paintAt(3000)
  expect(tempo.getTimeScale()).toBe(1)
  tempo.setFocused(false)
  paintAt(4000)
  expect(video).toHaveBeenLastCalledWith(0.2)
  expect(frames.size).toBe(0)
  stop()
})

it('cancels work when videos unmount and resumes from elapsed time without replaying the ramp', () => {
  const tempo = createMosaicPlaybackTempo()
  const stop = tempo.subscribe(vi.fn())
  tempo.setHovered(true)
  paintAt(250)
  stop()
  expect(frames.size).toBe(0)
  now = 500
  const video = vi.fn()
  const stopAgain = tempo.subscribe(video)
  expect(video.mock.lastCall?.[0]).toBeCloseTo(0.6)
  // A suspended/background page catches up on its next animation frame.
  paintAt(5000)
  expect(video).toHaveBeenLastCalledWith(1)
  expect(frames.size).toBe(0)
  stopAgain()
})

it('delivers the exact normal rate even if a frame crosses the ramp deadline', () => {
  const tempo = createMosaicPlaybackTempo()
  const video = vi.fn<(scale: number) => void>(() => {
    now += 2
  })
  const stop = tempo.subscribe(video)
  tempo.setHovered(true) // Ramp starts at 2 ms.
  paintAt(1001)
  expect(video.mock.lastCall?.[0]).toBeLessThan(1)
  expect(frames.size).toBe(1)
  paintAt(1017)
  expect(video).toHaveBeenLastCalledWith(1)
  expect(frames.size).toBe(0)
  stop()
})
