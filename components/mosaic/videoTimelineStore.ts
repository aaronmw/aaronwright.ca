import { readVideoBuffer } from '../portfolio/presentation/videoBuffer'

const events = [
  'loadedmetadata',
  'durationchange',
  'timeupdate',
  'progress',
  'play',
  'pause',
  'ended',
  'emptied',
  'seeked',
]
const emptySnapshot = JSON.stringify({
  currentTime: 0,
  duration: 0,
  paused: true,
  buffered: [],
})

/** Native video time keeps advancing between React reads. Publish a stable
 * snapshot only when the media emits an event, including late video mounts. */
export function createVideoTimelineStore(slide: Element | null | undefined) {
  let snapshot = emptySnapshot
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => emptySnapshot,
    subscribe(notify: () => void) {
      const update = () => {
        const video = slide?.querySelector('video')
        const next = video
          ? JSON.stringify({
              currentTime: video.currentTime,
              duration: Number.isFinite(video.duration) ? video.duration : 0,
              paused: video.paused,
              buffered: readVideoBuffer(video),
            })
          : emptySnapshot
        if (next !== snapshot) {
          snapshot = next
          notify()
        }
      }
      // Media events do not bubble; the plugin may mount its video later.
      events.forEach(event =>
        slide?.addEventListener(event, update, { capture: true }),
      )
      update()
      return () =>
        events.forEach(event =>
          slide?.removeEventListener(event, update, { capture: true }),
        )
    },
  }
}
