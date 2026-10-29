import { afterEach, expect, it, vi } from 'vitest'
vi.hoisted(() => {
  vi.stubGlobal('window', {})
})
import { gsap } from '@/components/mosaic/motion'
import { createViewerMotion } from '@/components/mosaic/viewerMotion'
import {
  prepareMosaicViewerVideo,
  waitForMosaicViewerVisual,
} from '@/components/mosaic/viewerMedia'
import {
  registerMosaicReturnFrame,
  registerMosaicReturnReveal,
  restoreMosaicReturnFrame,
} from '@/components/mosaic/sourceVisual'

it('reveals a return destination only after its video owner accepts the captured frame', () => {
  const video = {} as HTMLVideoElement,
    surface = {} as HTMLElement
  const tile = {
    parentElement: surface,
    querySelector: () => video,
  } as unknown as HTMLElement
  const frame = {} as HTMLCanvasElement
  const receive = vi.fn(() => false),
    reveal = vi.fn()
  const unregisterFrame = registerMosaicReturnFrame(video, receive)
  const unregisterReveal = registerMosaicReturnReveal(surface, reveal)
  expect(restoreMosaicReturnFrame(tile, frame, 2)).toBe(false)
  expect(reveal).not.toHaveBeenCalled()
  receive.mockReturnValue(true)
  expect(restoreMosaicReturnFrame(tile, frame, 2)).toBe(true)
  expect(receive).toHaveBeenLastCalledWith(frame, 2)
  expect(reveal).toHaveBeenCalledOnce()
  expect(receive.mock.invocationCallOrder.at(-1)).toBeLessThan(
    reveal.mock.invocationCallOrder[0],
  )
  unregisterFrame()
  unregisterReveal()
  expect(restoreMosaicReturnFrame(tile, frame, 2)).toBe(false)
  expect(reveal).toHaveBeenCalledOnce()
})

afterEach(() => {
  gsap.globalTimeline.clear()
  gsap.ticker.sleep()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it.each([true, false])(
  'reverses the %s viewer timeline without restarting its snapshot',
  opensAtEnd => {
    const snapshot = { x: 10, opacity: 1 },
      reached = vi.fn()
    const motion = createViewerMotion(
      opensAtEnd,
      timeline => {
        timeline
          .addLabel('source')
          .to(snapshot, { x: 300, duration: 0.36, ease: 'none' })
          .addLabel('destination')
      },
      reached,
    )
    motion.timeline.pause().progress(0.4)
    const x = snapshot.x,
      time = motion.timeline.time()
    for (const expanded of [false, true, false, true]) {
      motion.setExpanded(expanded)
      expect(motion.timeline.time()).toBe(time)
      expect(snapshot.x).toBe(x)
      expect(motion.timeline.reversed()).toBe(expanded !== opensAtEnd)
      motion.timeline.pause()
    }
    motion.timeline.timeScale(0.2).seek('destination', false)
    expect(reached).toHaveBeenLastCalledWith(opensAtEnd)
    motion.timeline.reverse().pause().seek('source', false)
    expect(reached).toHaveBeenLastCalledWith(!opensAtEnd)
    expect(snapshot.x).toBe(10)
    motion.context.revert()
    expect(motion.timeline.parent).toBeNull()
  },
)

it('can append the decoded portrait/content handoff to the same reversible clock', () => {
  const snapshot = { opacity: 1 },
    content = { opacity: 0 },
    reached = vi.fn()
  const motion = createViewerMotion(
    true,
    timeline => {
      timeline.to({}, { duration: 0.36 }).addLabel('visual-ready')
    },
    reached,
  )
  motion.timeline.seek('visual-ready')
  motion.context.add(() => {
    motion.timeline
      .to(snapshot, { opacity: 0, duration: 0.12 }, 'visual-ready')
      .to(content, { opacity: 1, duration: 0.24 }, 'visual-ready')
      .addLabel('open')
  })
  motion.timeline.seek('open', false)
  expect(snapshot.opacity).toBe(0)
  expect(content.opacity).toBe(1)
  motion.setExpanded(false)
  motion.timeline.pause().seek('visual-ready')
  expect(snapshot.opacity).toBe(1)
  expect(content.opacity).toBe(0)
  motion.context.revert()
  expect(snapshot.opacity).toBe(1)
  expect(content.opacity).toBe(0)
})

function videoFixture(readyState = 1) {
  const callbacks = new Map<number, VideoFrameRequestCallback>()
  let serial = 0
  const video = Object.assign(new EventTarget(), {
    readyState,
    duration: 30,
    currentTime: 0,
    seeking: false,
    preload: '',
    load: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    requestVideoFrameCallback: vi.fn((callback: VideoFrameRequestCallback) => {
      callbacks.set(++serial, callback)
      return serial
    }),
    cancelVideoFrameCallback: vi.fn((id: number) => callbacks.delete(id)),
  })
  const abort = new AbortController()
  const prepare = (target = 12) =>
    prepareMosaicViewerVideo(video as unknown as HTMLVideoElement, {
      target,
      signal: abort.signal,
      current: () => !abort.signal.aborted,
    })
  const frame = (time: number) => {
    const [id, callback] = Array.from(callbacks)[0]
    callbacks.delete(id)
    callback(0, { mediaTime: time } as VideoFrameCallbackMetadata)
  }
  return { video, abort, prepare, frame, callbacks }
}

it('holds the handoff for metadata and the requested decoded frame, independent of timeline speed', async () => {
  const { video, prepare, frame } = videoFixture(0)
  const complete = vi.fn(),
    pending = prepare().then(complete)
  expect(video.load).toHaveBeenCalledOnce()
  expect(video.play).not.toHaveBeenCalled()
  video.readyState = 1
  video.dispatchEvent(new Event('loadedmetadata'))
  await Promise.resolve()
  expect(video.currentTime).toBe(12)
  frame(5)
  await Promise.resolve()
  expect(complete).not.toHaveBeenCalled()
  frame(12)
  await pending
  expect(complete).toHaveBeenCalledOnce()
})

it.each([0, 1])(
  'aborts media preparation at readiness %i and removes queued work',
  async readyState => {
    vi.useFakeTimers()
    const { video, prepare, abort, callbacks } = videoFixture(readyState)
    const pending = prepare()
    abort.abort()
    await pending
    video.dispatchEvent(new Event('loadedmetadata'))
    expect(callbacks.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    if (readyState === 0) expect(video.play).not.toHaveBeenCalled()
  },
)

it('ignores an obsolete play promise rather than pausing a newer open', async () => {
  const { video, prepare, abort } = videoFixture()
  let resolve!: () => void
  video.play.mockImplementationOnce(
    () =>
      new Promise<void>(done => {
        resolve = done
      }),
  )
  const pending = prepare()
  abort.abort()
  await pending
  resolve()
  await Promise.resolve()
  expect(video.pause).not.toHaveBeenCalled()
})

it('disconnects visual-readiness observation immediately on cancellation', async () => {
  vi.useFakeTimers()
  const disconnect = vi.fn()
  vi.stubGlobal(
    'MutationObserver',
    class {
      observe() {}
      disconnect = disconnect
    },
  )
  const abort = new AbortController()
  const pending = waitForMosaicViewerVisual(
    { querySelector: () => null } as unknown as HTMLElement,
    { signal: abort.signal, current: () => true },
  )
  abort.abort()
  await pending
  expect(disconnect).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})
