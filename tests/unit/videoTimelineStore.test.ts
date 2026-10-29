import { describe, expect, it, vi } from 'vitest'
import { createVideoTimelineStore } from '@/components/mosaic/videoTimelineStore'

function fixture() {
  let time = 0
  const video = {
    get currentTime() {
      return ++time / 100
    },
    duration: 10,
    paused: false,
    buffered: { length: 0 },
  } as HTMLVideoElement
  const slide = Object.assign(new EventTarget(), {
    video: video as HTMLVideoElement | null,
    querySelector() {
      return this.video
    },
  })
  return { slide, store: createVideoTimelineStore(slide as unknown as Element) }
}

describe('video controls external store', () => {
  it('keeps a stable snapshot between media events even while playback advances', () => {
    const { slide, store } = fixture()
    const notify = vi.fn()
    const unsubscribe = store.subscribe(notify)
    const before = store.getSnapshot()
    for (let read = 0; read < 100; read++)
      expect(store.getSnapshot()).toBe(before)
    expect(notify).toHaveBeenCalledTimes(1)
    slide.dispatchEvent(new Event('timeupdate'))
    expect(store.getSnapshot()).not.toBe(before)
    expect(notify).toHaveBeenCalledTimes(2)
    unsubscribe()
    const last = store.getSnapshot()
    slide.dispatchEvent(new Event('timeupdate'))
    expect(store.getSnapshot()).toBe(last)
    expect(notify).toHaveBeenCalledTimes(2)
  })

  it('observes a video mounted after subscription and resets when it disappears', () => {
    const { slide, store } = fixture()
    const video = slide.video
    slide.video = null
    const notify = vi.fn()
    const unsubscribe = store.subscribe(notify)
    expect(store.getSnapshot()).toBe(store.getServerSnapshot())
    expect(notify).not.toHaveBeenCalled()
    slide.video = video
    slide.dispatchEvent(new Event('loadedmetadata'))
    expect(JSON.parse(store.getSnapshot())).toMatchObject({
      duration: 10,
      paused: false,
    })
    slide.video = null
    slide.dispatchEvent(new Event('emptied'))
    expect(store.getSnapshot()).toBe(store.getServerSnapshot())
    unsubscribe()
  })
})
