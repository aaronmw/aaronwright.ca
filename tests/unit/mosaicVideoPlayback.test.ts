import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMosaicVideoPlayback,
  type VideoState,
} from '@/components/mosaic/createMosaicVideoPlayback'
import { createMosaicPlaybackTempo } from '@/components/mosaic/mosaicPlaybackTempo'

class PendingSeekVideo extends EventTarget {
  src = ''
  muted = true
  paused = true
  seeking = false
  readyState = 4
  duration = 3
  playbackRate = 1
  videoWidth = 100
  videoHeight = 100
  loop = false
  preload = ''
  style = { visibility: '', opacity: '' }
  parentElement = { style: { backgroundColor: '' } }
  seeks: number[] = []
  frame: VideoFrameRequestCallback | null = null
  private time = 0
  seekable = { length: 1, start: () => 0, end: () => 3 }
  get currentTime() {
    return this.time
  }
  set currentTime(value: number) {
    this.time = value
    this.seeking = true
    this.seeks.push(value)
  }
  pause = vi.fn(() => {
    this.paused = true
  })
  play = vi.fn(() => {
    this.paused = false
    this.dispatchEvent(new Event('playing'))
    return Promise.resolve()
  })
  load = vi.fn()
  removeAttribute = vi.fn()
  setAttribute = vi.fn()
  closest = vi.fn<() => HTMLElement | null>(() => null)
  requestVideoFrameCallback = vi.fn((callback: VideoFrameRequestCallback) => {
    this.frame = callback
    return 1
  })
  cancelVideoFrameCallback = vi.fn(() => {
    this.frame = null
  })
  settle() {
    this.seeking = false
    this.dispatchEvent(new Event('seeked'))
  }
  elapse(time: number) {
    this.time = time
  }
  present(time: number) {
    const frame = this.frame
    this.frame = null
    frame?.(0, { mediaTime: time } as VideoFrameCallbackMetadata)
  }
}

const config = {
  media: {
    id: 'video',
    slug: 'video',
    src: '/video.mp4',
    alt: '',
    video: true,
    width: 100,
    height: 100,
    segments: [{ start: 1, end: 1.4, fadeIn: false, fadeOut: false }],
  },
  paused: false,
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
  vi.stubGlobal('matchMedia', () =>
    Object.assign(new EventTarget(), { matches: false }),
  )
})

it('adopts a viewer frame for a paused cell that has never presented video', async () => {
  const video = new PendingSeekVideo()
  const drawImage = vi.fn()
  const canvas = {
    width: 0,
    height: 0,
    hidden: true,
    style: { opacity: '0' },
    getContext: () => ({ drawImage }),
  }
  const source = { width: 1920, height: 1080 } as HTMLCanvasElement
  const state = vi.fn()
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    { ...config, paused: true },
    state,
    canvas as unknown as HTMLCanvasElement,
  )
  video.settle()
  expect(state).toHaveBeenLastCalledWith('loading')
  expect(controller.restoreFrame(source, 1.2)).toBe(true)
  expect(drawImage).toHaveBeenCalledWith(source, 0, 0)
  expect(state).toHaveBeenLastCalledWith('paused')
  expect(canvas).toMatchObject({
    width: 1920,
    height: 1080,
    hidden: false,
    style: { opacity: '1' },
  })
  expect(video.style.visibility).toBe('hidden')
  expect(video.play).not.toHaveBeenCalled()
  video.settle()
  controller.update({ ...config, paused: true })
  expect(canvas.hidden).toBe(false)
  expect(canvas.style.opacity).toBe('1')
  controller.update(config)
  await Promise.resolve()
  expect(canvas.hidden).toBe(false)
  video.present(1.2)
  expect(canvas.hidden).toBe(true)
  expect(video.style.visibility).toBe('')
  expect(state).toHaveBeenLastCalledWith('playing')
  controller.destroy()
  expect(controller.restoreFrame(source, 1.2)).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

it('keeps the configured excerpt when the returned frame is outside its range', () => {
  const video = new PendingSeekVideo()
  const canvas = {
    width: 100,
    height: 100,
    hidden: true,
    style: { opacity: '' },
    getContext: () => ({ drawImage: vi.fn() }),
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    { ...config, paused: true },
    () => {},
    canvas as unknown as HTMLCanvasElement,
  )
  expect(
    controller.restoreFrame(
      { width: 100, height: 100 } as HTMLCanvasElement,
      2.5,
    ),
  ).toBe(true)
  expect(video.seeks).toEqual([1])
  video.settle()
  controller.update(config)
  expect(canvas.hidden).toBe(false)
  video.present(1)
  expect(canvas.hidden).toBe(true)
  controller.destroy()
})

it('resumes the excerpt containing the viewer playhead instead of replaying the intro', () => {
  const video = new PendingSeekVideo()
  const canvas = {
    width: 100,
    height: 100,
    hidden: true,
    style: { opacity: '' },
    getContext: () => ({ drawImage: vi.fn() }),
  }
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        { start: 0, end: 1, speed: 1, fadeIn: true, fadeOut: false },
        { start: 0.5, end: 3, speed: 2, fadeIn: false, fadeOut: true },
      ],
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    { ...sequence, paused: true },
    () => {},
    canvas as unknown as HTMLCanvasElement,
  )
  expect(
    controller.restoreFrame(
      { width: 100, height: 100 } as HTMLCanvasElement,
      1.5,
    ),
  ).toBe(true)
  expect(video.setAttribute).toHaveBeenLastCalledWith(
    'data-mosaic-segment-index',
    '1',
  )
  expect(video.currentTime).toBe(1.5)
  expect(video.playbackRate).toBe(2)
  expect(video.play).not.toHaveBeenCalled()
  video.settle()
  controller.update(sequence)
  expect(canvas.hidden).toBe(false)
  video.present(1.5)
  expect(canvas.hidden).toBe(true)
  expect(video.style.opacity).toBe('1')
  expect(video.currentTime).toBe(1.5)
  controller.update({ ...sequence, paused: true })
  controller.restoreFrame(
    { width: 100, height: 100 } as HTMLCanvasElement,
    0.75,
  )
  // Overlapping authored excerpts retain the current excerpt when it fits.
  expect(video.setAttribute).toHaveBeenLastCalledWith(
    'data-mosaic-segment-index',
    '1',
  )
  expect(video.playbackRate).toBe(2)
  controller.destroy()
})

it('holds a paused cell without losing its fade, speed, or playhead on resume', async () => {
  const video = new PendingSeekVideo()
  const drawImage = vi.fn()
  const canvas = {
    width: 100,
    height: 100,
    hidden: true,
    style: { opacity: '' },
    getContext: () => ({ drawImage }),
  }
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        {
          start: 1,
          end: 3,
          speed: 2,
          fadeIn: false,
          fadeOut: true,
          fadeOutColor: 'white' as const,
        },
      ],
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
    canvas as unknown as HTMLCanvasElement,
  )
  video.settle()
  video.elapse(2.5)
  video.present(2.5)
  await Promise.resolve()
  const opacity = video.style.opacity
  const background = video.parentElement.style.backgroundColor
  expect(Number(opacity)).toBeGreaterThan(0)
  expect(Number(opacity)).toBeLessThan(1)
  expect(background).toBe('white')
  drawImage.mockClear()
  controller.update({ ...sequence, paused: true })
  expect(drawImage).toHaveBeenCalledOnce()
  expect(video.paused).toBe(true)
  expect(video.style.visibility).toBe('hidden')
  expect(canvas.hidden).toBe(false)
  expect(canvas.style.opacity).toBe(opacity)
  expect(video.parentElement.style.backgroundColor).toBe(background)
  controller.update({ ...sequence, paused: true })
  expect(drawImage).toHaveBeenCalledOnce()
  controller.update(sequence)
  // Keep the held frame through play(), until a decoded replacement arrives.
  expect(video.style.visibility).toBe('hidden')
  expect(canvas.hidden).toBe(false)
  expect(video.currentTime).toBe(2.5)
  expect(video.playbackRate).toBe(2)
  expect(video.seeks).toEqual([1])
  expect(video.load).toHaveBeenCalledOnce()
  video.present(2.5)
  expect(video.style.visibility).toBe('')
  expect(canvas.hidden).toBe(true)
  expect(video.style.opacity).toBe(opacity)
  controller.destroy()
  expect(vi.getTimerCount()).toBe(0)
})

it('keeps the paused video visible if its current frame cannot be copied', () => {
  const video = new PendingSeekVideo()
  const drawImage = vi.fn()
  const canvas = {
    width: 100,
    height: 100,
    hidden: true,
    style: { opacity: '' },
    getContext: () => ({ drawImage }),
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    config,
    () => {},
    canvas as unknown as HTMLCanvasElement,
  )
  video.settle()
  video.present(1)
  // Even with an older cached frame, failure must not reveal stale pixels.
  drawImage.mockImplementation(() => {
    throw new Error('Frame copy failed')
  })
  controller.update({ ...config, paused: true })
  expect(video.paused).toBe(true)
  expect(video.style.visibility).toBe('')
  expect(canvas.hidden).toBe(true)
  controller.destroy()
})

it.each(['frame', 'timeupdate', 'timer'] as const)(
  'continues adjacent segments without pausing, seeking or masking on a %s boundary',
  async boundary => {
    const video = new PendingSeekVideo()
    const properties = new Map<string, string>()
    video.closest.mockReturnValue({
      style: {
        setProperty: (name: string, value: string) =>
          properties.set(name, value),
        removeProperty: (name: string) => properties.delete(name),
      },
      querySelector: () => null,
    } as unknown as HTMLElement)
    const canvas = {
      width: 100,
      height: 100,
      hidden: true,
      style: { opacity: '' },
      getContext: () => ({ drawImage: vi.fn() }),
    }
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      {
        ...config,
        media: {
          ...config.media,
          segments: [
            { start: 1, end: 1.8, speed: 1, fadeIn: true, fadeOut: false },
            {
              start: 1.8,
              end: 2.8,
              speed: 2,
              fadeIn: false,
              fadeOut: true,
              composition: {
                focal: { x: 0.2, y: 0.3 },
                target: { x: 0.5, y: 0.5 },
                zoom: 2,
              },
            },
          ],
        },
      },
      () => {},
      canvas as unknown as HTMLCanvasElement,
    )
    video.settle()
    video.present(1)
    await Promise.resolve()
    video.pause.mockClear()
    video.play.mockClear()
    // A decoded frame can reach the boundary slightly ahead of currentTime.
    video.elapse(boundary === 'frame' ? 1.79 : 1.8)
    if (boundary === 'frame') video.present(1.8)
    else if (boundary === 'timeupdate')
      video.dispatchEvent(new Event('timeupdate'))
    else vi.advanceTimersByTime(800)
    expect(video.playbackRate).toBe(2)
    expect(video.seeks).toEqual([1])
    expect(video.pause).not.toHaveBeenCalled()
    expect(video.play).not.toHaveBeenCalled()
    expect(video.load).toHaveBeenCalledOnce()
    expect(video.style.visibility).toBe('')
    expect(video.style.opacity).toBe('1')
    expect(canvas.hidden).toBe(true)
    expect(properties.get('--mosaic-segment-zoom')).toBe('2')
    // Monitoring must remain active to apply the second segment's fade.
    video.elapse(2.6)
    video.present(2.6)
    expect(Number(video.style.opacity)).toBeCloseTo(0.2)
    controller.destroy()
    expect(vi.getTimerCount()).toBe(0)
  },
)

it.each(['frame', 'timeupdate', 'timer'] as const)(
  'holds the visible baked-in fade frame across a %s boundary instead of reviving the intro',
  async boundary => {
    const video = new PendingSeekVideo()
    let visibleFrame = 'intro logo'
    let heldPixels = ''
    const drawImage = vi.fn(() => {
      heldPixels = visibleFrame
    })
    const canvas = {
      width: 100,
      height: 100,
      hidden: true,
      style: { opacity: '' },
      getContext: () => ({ drawImage }),
    }
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      {
        ...config,
        media: {
          ...config.media,
          segments: [
            { start: 0.2, end: 1, fadeIn: true, fadeOut: false },
            { start: 2, end: 3, speed: 2, fadeIn: true, fadeOut: true },
          ],
        },
      },
      () => {},
      canvas as unknown as HTMLCanvasElement,
    )
    video.settle()
    video.present(0.2)
    await Promise.resolve()
    expect(heldPixels).toBe('intro logo')
    visibleFrame = 'baked-in black frame'
    video.elapse(0.95)
    video.present(0.95)
    expect(drawImage).toHaveBeenCalledOnce()
    video.elapse(boundary === 'frame' ? 0.99 : 1)
    if (boundary === 'frame') video.present(1)
    else if (boundary === 'timeupdate')
      video.dispatchEvent(new Event('timeupdate'))
    else vi.advanceTimersByTime(800)
    expect(canvas.hidden).toBe(false)
    expect(canvas.style.opacity).toBe('1')
    expect(heldPixels).toBe('baked-in black frame')
    expect(drawImage).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(100)
    visibleFrame = 'new segment'
    video.settle()
    for (const name of ['canplay', 'progress', 'loadedmetadata']) {
      video.dispatchEvent(new Event(name))
      expect(heldPixels).toBe('baked-in black frame')
    }
    video.present(2)
    expect(canvas.hidden).toBe(true)
    expect(video.style.opacity).toBe('0')
    expect(video.seeks).toEqual([0.2, 2])
    expect(video.load).toHaveBeenCalledOnce()
    controller.destroy()
  },
)

it.each(['fade-out', 'fade-in', 'gap', 'selected-segment'] as const)(
  'keeps the masked seek for a %s boundary',
  async boundary => {
    const video = new PendingSeekVideo()
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      {
        ...config,
        media: {
          ...config.media,
          segments: [
            {
              start: 1,
              end: 1.4,
              fadeIn: false,
              fadeOut: boundary === 'fade-out',
            },
            {
              start: boundary === 'gap' ? 2 : 1.4,
              end: 2.8,
              speed: 2,
              fadeIn: boundary === 'fade-in',
              fadeOut: false,
            },
          ],
        },
        preview:
          boundary === 'selected-segment'
            ? { mode: 'segment', index: 0, revision: 1, onComplete: vi.fn() }
            : undefined,
      },
      () => {},
    )
    video.settle()
    video.present(1)
    await Promise.resolve()
    video.pause.mockClear()
    video.elapse(1.42)
    video.present(1.4)
    expect(video.pause).toHaveBeenCalled()
    expect(video.style.visibility).toBe('hidden')
    vi.advanceTimersByTime(100)
    expect(video.seeks.at(-1)).toBe(
      boundary === 'selected-segment' ? 1 : boundary === 'gap' ? 2 : 1.4,
    )
    controller.destroy()
    expect(vi.getTimerCount()).toBe(0)
  },
)

it('sets speed before playing each segment, restarts speed edits, and resets full-video playback', async () => {
  const video = new PendingSeekVideo()
  const speedsAtPlay: number[] = []
  const play = video.play.getMockImplementation()!
  video.play.mockImplementation(() => {
    speedsAtPlay.push(video.playbackRate)
    return play()
  })
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        { ...config.media.segments[0], speed: 0.1 },
        { start: 2, end: 2.8, fadeIn: false, fadeOut: false, speed: 2 },
      ],
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
  )
  expect(speedsAtPlay).toEqual([0.1])
  video.settle()
  await Promise.resolve()
  video.present(1.4)
  vi.advanceTimersByTime(100)
  expect(speedsAtPlay.at(-1)).toBe(2)
  video.settle()
  await Promise.resolve()
  controller.update({
    ...sequence,
    media: {
      ...sequence.media,
      segments: [{ ...sequence.media.segments[0], speed: 0.5 }],
    },
  })
  expect(video.seeks.at(-1)).toBe(1)
  expect(speedsAtPlay.at(-1)).toBe(0.5)
  video.settle()
  await Promise.resolve()
  controller.update({
    ...config,
    media: { ...config.media, segments: undefined },
  })
  expect(video.playbackRate).toBe(1)
  controller.destroy()
})

it('slows subsequent segments and their fades, then recovers without seeking or reloading', async () => {
  const video = new PendingSeekVideo()
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    {
      ...config,
      tempo: createMosaicPlaybackTempo(),
      media: {
        ...config.media,
        segments: [
          { start: 1, end: 1.4, speed: 1, fadeIn: true, fadeOut: false },
          {
            start: 1.4,
            end: 2.8,
            speed: 2,
            fadeIn: false,
            fadeOut: true,
            fadeOutColor: 'white',
          },
        ],
      },
    },
    () => {},
  )
  expect(video.playbackRate).toBe(0.2)
  video.settle()
  await Promise.resolve()
  video.present(1)
  video.elapse(1 + video.playbackRate) // One real second advances 0.2 media seconds.
  video.present(video.currentTime)
  expect(Number(video.style.opacity)).toBeCloseTo(0.5)
  video.pause.mockClear()
  video.play.mockClear()
  video.elapse(1.4)
  video.present(1.4)
  expect(video.playbackRate).toBe(0.4)
  video.elapse(2)
  video.present(2)
  expect(Number(video.style.opacity)).toBeCloseTo(0.8)
  video.elapse(2 + video.playbackRate)
  video.present(video.currentTime)
  expect(Number(video.style.opacity)).toBeCloseTo(0.4)
  expect(video.parentElement.style.backgroundColor).toBe('white')
  controller.setTimeScale(0.6)
  expect(video.playbackRate).toBe(1.2)
  // Rate changes do not recalculate a fade against a different span (or flash).
  expect(Number(video.style.opacity)).toBeCloseTo(0.4)
  controller.setTimeScale(1)
  expect(video.playbackRate).toBe(2)
  expect(video.currentTime).toBe(2.4)
  expect(video.seeks).toEqual([1])
  expect(video.load).toHaveBeenCalledOnce()
  expect(video.pause).not.toHaveBeenCalled()
  expect(video.play).not.toHaveBeenCalled()
  controller.destroy()
  expect(vi.getTimerCount()).toBe(0)
})

it('preserves the idle scale through a faded seek and a loop restart', async () => {
  const video = new PendingSeekVideo()
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    {
      ...config,
      tempo: createMosaicPlaybackTempo(),
      media: {
        ...config.media,
        segments: [
          { start: 1, end: 1.4, speed: 1, fadeIn: false, fadeOut: true },
          { start: 2, end: 2.8, speed: 2, fadeIn: true, fadeOut: true },
        ],
      },
    },
    () => {},
  )
  video.settle()
  await Promise.resolve()
  video.elapse(1.4)
  video.present(1.4)
  vi.advanceTimersByTime(100)
  expect(video.playbackRate).toBe(0.4)
  expect(video.seeks).toEqual([1, 2])
  video.settle()
  await Promise.resolve()
  video.elapse(2.8)
  video.present(2.8)
  vi.advanceTimersByTime(100)
  expect(video.playbackRate).toBe(0.2)
  expect(video.seeks).toEqual([1, 2, 1])
  controller.destroy()
})

it('scales full-video loops without resuming paused playback', () => {
  const video = new PendingSeekVideo()
  const sequence = {
    ...config,
    tempo: createMosaicPlaybackTempo(),
    media: { ...config.media, segments: undefined },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
  )
  expect(video.loop).toBe(true)
  expect(video.playbackRate).toBe(0.2)
  controller.update({ ...sequence, paused: true })
  video.play.mockClear()
  controller.setTimeScale(0.6)
  expect(video.playbackRate).toBe(0.6)
  controller.setTimeScale(1)
  expect(video.playbackRate).toBe(1)
  expect(video.play).not.toHaveBeenCalled()
  expect(video.seeks).toEqual([])
  expect(video.load).toHaveBeenCalledOnce()
  controller.destroy()
  controller.setTimeScale(0.2)
  expect(video.playbackRate).toBe(1)
  expect(vi.getTimerCount()).toBe(0)
})

it('handles native minimum rates for very slow authored segments without failing the entrance', () => {
  const video = new PendingSeekVideo()
  let rate = 1
  const rejected = vi.fn()
  Object.defineProperty(video, 'playbackRate', {
    get: () => rate,
    set: (next: number) => {
      if (next < 0.0625) {
        rejected()
        throw new DOMException('Unsupported rate', 'NotSupportedError')
      }
      rate = next
    },
  })
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    {
      ...config,
      tempo: createMosaicPlaybackTempo(),
      media: {
        ...config.media,
        segments: [{ ...config.media.segments[0], speed: 0.1 }],
      },
    },
    () => {},
  )
  expect(video.playbackRate).toBe(0.0625)
  controller.setTimeScale(0.3)
  expect(video.playbackRate).toBe(0.0625)
  expect(rejected).toHaveBeenCalledOnce()
  controller.setTimeScale(1)
  expect(video.playbackRate).toBe(0.1)
  controller.destroy()
})

it('snaps each segment crop before playback, restores inherited framing, and restarts crop edits', async () => {
  const video = new PendingSeekVideo()
  const properties = new Map<string, string>()
  const events: string[] = []
  const pan = {
    transitionProperty: 'left',
    cancel: vi.fn(() => events.push('snap')),
  }
  const unrelated = { transitionProperty: 'opacity', cancel: vi.fn() }
  const media = { getAnimations: vi.fn(() => [pan, unrelated]) }
  video.closest.mockReturnValue({
    style: {
      setProperty: (name: string, value: string) => properties.set(name, value),
      removeProperty: (name: string) => properties.delete(name),
    },
    querySelector: () => media,
  } as unknown as HTMLElement)
  const compositionsAtPlay: Record<string, string>[] = []
  const play = video.play.getMockImplementation()!
  video.play.mockImplementation(() => {
    events.push('play')
    compositionsAtPlay.push(Object.fromEntries(properties))
    return play()
  })
  const crop = (zoom: number) => ({
    focal: { x: 0.2, y: 0.3 },
    target: { x: 0.5, y: 0.5 },
    zoom,
  })
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        {
          start: 1,
          end: 1.4,
          fadeIn: false,
          fadeOut: false,
          composition: crop(2),
        },
        {
          start: 2,
          end: 2.8,
          fadeIn: true,
          fadeOut: true,
          composition: crop(4),
        },
        { start: 0.2, end: 0.8, fadeIn: false, fadeOut: false },
      ],
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
  )
  expect(events.slice(0, 2)).toEqual(['snap', 'play'])
  expect(compositionsAtPlay[0]).toMatchObject({
    '--mosaic-segment-zoom': '2',
    '--mosaic-segment-focal-x': '0.2',
  })
  video.settle()
  video.present(1)
  await Promise.resolve()
  video.present(1.4)
  vi.advanceTimersByTime(100)
  expect(compositionsAtPlay.at(-1)?.['--mosaic-segment-zoom']).toBe('4')
  expect(events.slice(-2)).toEqual(['snap', 'play'])
  video.settle()
  video.present(2)
  expect(video.style.opacity).toBe('0')
  await Promise.resolve()
  video.present(2.8)
  vi.advanceTimersByTime(100)
  expect(compositionsAtPlay.at(-1)).toEqual({})
  expect(events.slice(-2)).toEqual(['snap', 'play'])
  video.settle()
  video.present(0.2)
  await Promise.resolve()
  video.present(0.8)
  vi.advanceTimersByTime(100)
  expect(compositionsAtPlay.at(-1)?.['--mosaic-segment-zoom']).toBe('2')
  const edited = {
    ...sequence,
    media: {
      ...sequence.media,
      segments: sequence.media.segments.map((segment, i) =>
        i === 1 ? { ...segment, composition: crop(6) } : segment,
      ),
    },
    preview: {
      mode: 'segment' as const,
      index: 1,
      revision: 1,
      onComplete: vi.fn(),
    },
  }
  video.settle()
  controller.update(edited)
  expect(video.seeks.at(-1)).toBe(2)
  expect(compositionsAtPlay.at(-1)?.['--mosaic-segment-zoom']).toBe('6')
  expect(unrelated.cancel).not.toHaveBeenCalled()
  expect(video.load).toHaveBeenCalledOnce()
  controller.destroy()
  expect(properties.size).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it.each(['black', 'white'] as const)(
  'keeps the completed fade %s through seek readiness until the new frame arrives',
  async color => {
    const video = new PendingSeekVideo()
    const canvas = {
      width: 100,
      height: 100,
      hidden: true,
      style: { opacity: '' },
      getContext: () => ({ drawImage: vi.fn() }),
    }
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      {
        ...config,
        media: {
          ...config.media,
          segments: [
            {
              start: 0.2,
              end: 3,
              speed: 3,
              fadeIn: true,
              fadeOut: true,
              fadeInColor: color === 'white' ? 'black' : 'white',
              fadeOutColor: color,
            },
          ],
        },
      },
      () => {},
      canvas as unknown as HTMLCanvasElement,
    )
    video.settle()
    video.present(0.2)
    await Promise.resolve()
    video.present(2.72)
    expect(Number(video.style.opacity)).toBeCloseTo(0.2)
    video.present(3)
    expect(canvas.style.opacity).toBe('0')
    expect(video.parentElement.style.backgroundColor).toBe(color)
    vi.advanceTimersByTime(100)
    video.settle()
    for (const event of ['canplay', 'progress', 'loadedmetadata']) {
      video.dispatchEvent(new Event(event))
      expect(canvas.hidden).toBe(false)
      expect(canvas.style.opacity).toBe('0')
      expect(video.parentElement.style.backgroundColor).toBe(color)
    }
    video.present(0.2)
    expect(canvas.hidden).toBe(true)
    expect(video.style.opacity).toBe('0')
    expect(video.parentElement.style.backgroundColor).toBe(
      color === 'white' ? 'black' : 'white',
    )
    controller.destroy()
    expect(video.parentElement.style.backgroundColor).toBe('')
  },
)

describe('mosaic pending video seeks', () => {
  it('masks stale decoded frames even when native playing fires before seeked', () => {
    const video = new PendingSeekVideo()
    const drawImage = vi.fn()
    const canvas = {
      width: 100,
      height: 100,
      hidden: true,
      style: { opacity: '' },
      getContext: () => ({ drawImage }),
    }
    const states: VideoState[] = []
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      config,
      state => states.push(state),
      canvas as unknown as HTMLCanvasElement,
    )
    expect(video.play).toHaveBeenCalledOnce()
    expect(video.style.visibility).toBe('hidden')
    video.present(0.2)
    expect(video.style.visibility).toBe('hidden')
    video.settle()
    video.present(0.2)
    expect(video.style.visibility).toBe('hidden')
    video.present(1)
    expect(video.style.visibility).toBe('')
    expect(states.at(-1)).toBe('playing')
    expect(drawImage).toHaveBeenCalledOnce()
    video.present(1.03)
    expect(drawImage).toHaveBeenCalledOnce()
    video.present(1.4)
    expect(video.style.visibility).toBe('hidden')
    expect(canvas.hidden).toBe(false)
    controller.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('falls back on a stalled seek without unbounded retries or source reloads', () => {
    const video = new PendingSeekVideo()
    const states: VideoState[] = []
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      config,
      state => states.push(state),
    )
    expect(video.seeks).toEqual([1])
    expect(video.style.visibility).toBe('hidden')
    vi.advanceTimersByTime(8000)
    expect(states.at(-1)).toBe('seek-error')
    expect(video.paused).toBe(true)
    vi.advanceTimersByTime(10000)
    expect(video.seeks).toEqual([1])
    expect(video.play).toHaveBeenCalledOnce()
    expect(video.load).toHaveBeenCalledOnce()
    controller.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('suspends the seek watchdog and resumes queued decoding after gallery pause', () => {
    const video = new PendingSeekVideo()
    const states: VideoState[] = []
    const controller = createMosaicVideoPlayback(
      video as unknown as HTMLVideoElement,
      config,
      state => states.push(state),
    )
    controller.update({ ...config, paused: true })
    vi.advanceTimersByTime(9000)
    expect(states).not.toContain('seek-error')
    controller.update(config)
    expect(video.play).toHaveBeenCalledTimes(2)
    video.settle()
    video.present(1)
    expect(states.at(-1)).toBe('playing')
    controller.destroy()
    expect(vi.getTimerCount()).toBe(0)
  })
})

it('plays multiple segments in order, preserves the active segment through pause, and wraps once', async () => {
  const video = new PendingSeekVideo()
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        { start: 1, end: 1.4, fadeIn: false, fadeOut: false },
        { start: 2, end: 2.8, fadeIn: true, fadeOut: false },
        { start: 0.2, end: 0.8, fadeIn: false, fadeOut: true },
      ],
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
  )
  video.settle()
  video.present(1)
  await Promise.resolve()
  video.present(1.4)
  vi.advanceTimersByTime(100)
  expect(video.seeks).toEqual([1, 2])
  video.settle()
  video.present(2)
  expect(video.style.opacity).toBe('0')
  video.present(2.25)
  expect(video.style.opacity).toBe('0.5')
  controller.update({ ...sequence, paused: true })
  controller.update(sequence)
  video.present(2.8)
  vi.advanceTimersByTime(100)
  expect(video.seeks).toEqual([1, 2, 0.2])
  video.settle()
  video.present(0.2)
  expect(video.style.opacity).toBe('1')
  video.present(0.55)
  expect(Number(video.style.opacity)).toBeCloseTo(0.5)
  video.present(0.8)
  expect(video.style.opacity).toBe('0')
  vi.advanceTimersByTime(100)
  expect(video.seeks).toEqual([1, 2, 0.2, 1])
  expect(video.load).toHaveBeenCalledOnce()
  controller.destroy()
  expect(vi.getTimerCount()).toBe(0)
})

it('replaces the sequence during an in-flight seek and clears it without reloading', () => {
  const video = new PendingSeekVideo()
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    config,
    () => {},
  )
  controller.update({
    ...config,
    media: {
      ...config.media,
      segments: [{ start: 2, end: 3, fadeIn: false, fadeOut: false }],
    },
  })
  video.settle()
  expect(video.seeks).toEqual([1, 2])
  video.settle()
  video.present(2)
  controller.update({
    ...config,
    media: { ...config.media, segments: undefined },
  })
  expect(video.loop).toBe(true)
  expect(video.load).toHaveBeenCalledOnce()
  controller.destroy()
  expect(vi.getTimerCount()).toBe(0)
})

it('repeats only the selected editor segment with its fades and restarts on reselection or edits', () => {
  const video = new PendingSeekVideo()
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        { start: 0.2, end: 0.8, fadeIn: false, fadeOut: false },
        { start: 1.5, end: 2.5, fadeIn: true, fadeOut: true },
      ],
    },
    preview: {
      mode: 'segment' as const,
      index: 1,
      revision: 1,
      onComplete: vi.fn(),
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
  )
  expect(video.seeks).toEqual([1.5])
  video.settle()
  video.present(1.5)
  expect(video.style.opacity).toBe('0')
  video.present(1.75)
  expect(video.style.opacity).toBe('0.5')
  video.currentTime = 2.5
  video.settle()
  video.present(2.5)
  vi.advanceTimersByTime(100)
  expect(video.seeks).toEqual([1.5, 2.5, 1.5])
  video.settle()
  video.currentTime = 2
  video.settle()
  controller.update({
    ...sequence,
    preview: { ...sequence.preview, revision: 2 },
  })
  expect(video.seeks.at(-1)).toBe(1.5)
  video.settle()
  controller.update({
    ...sequence,
    media: {
      ...sequence.media,
      segments: [
        sequence.media.segments[0],
        { ...sequence.media.segments[1], start: 1.7 },
      ],
    },
    preview: { ...sequence.preview, revision: 3 },
  })
  expect(video.seeks.at(-1)).toBe(1.7)
  expect(sequence.preview.onComplete).not.toHaveBeenCalled()
  expect(video.load).toHaveBeenCalledOnce()
  controller.destroy()
})

it('previews the complete sequence once, holds at the end, and can return to isolated editing', () => {
  const video = new PendingSeekVideo()
  const completed = vi.fn()
  const sequence = {
    ...config,
    media: {
      ...config.media,
      segments: [
        { start: 0.2, end: 0.8, fadeIn: false, fadeOut: false },
        { start: 1.5, end: 2.5, fadeIn: false, fadeOut: true },
      ],
    },
    preview: {
      mode: 'sequence' as const,
      index: 1,
      revision: 1,
      onComplete: completed,
    },
  }
  const controller = createMosaicVideoPlayback(
    video as unknown as HTMLVideoElement,
    sequence,
    () => {},
  )
  expect(video.seeks).toEqual([0.2])
  video.settle()
  video.present(0.2)
  video.present(0.8)
  vi.advanceTimersByTime(100)
  expect(video.seeks).toEqual([0.2, 1.5])
  video.settle()
  video.present(1.5)
  video.present(2.5)
  expect(completed).toHaveBeenCalledOnce()
  expect(video.paused).toBe(true)
  video.dispatchEvent(new Event('progress'))
  vi.advanceTimersByTime(10000)
  expect(video.seeks).toEqual([0.2, 1.5])
  controller.update({
    ...sequence,
    preview: { ...sequence.preview, mode: 'segment', index: 0, revision: 2 },
  })
  expect(video.seeks.at(-1)).toBe(0.2)
  controller.destroy()
  expect(vi.getTimerCount()).toBe(0)
})
