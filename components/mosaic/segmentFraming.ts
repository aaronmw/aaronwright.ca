import { mosaicCompositionProperties } from './composition'
import type { MosaicSegment } from './types'

/** Apply the frame synchronously before playback; CSS still owns its geometry. */
export function createSegmentFraming(video: HTMLVideoElement) {
  const tile = video.closest<HTMLElement>('[data-mosaic-project]')
  const media = tile?.querySelector<HTMLElement>('[data-mosaic-media]')
  let previous = '{}'
  let properties: Record<string, number> = {}

  function apply(composition: MosaicSegment['composition']) {
    const next = mosaicCompositionProperties(composition, '--mosaic-segment')
    const key = JSON.stringify(next)
    if (previous === key) return
    previous = key
    for (const name of Object.keys(properties)) {
      if (!(name in next)) tile?.style.removeProperty(name)
    }
    for (const [name, value] of Object.entries(next))
      tile?.style.setProperty(name, String(value))
    properties = next
    // Flush pending CSS transitions and cancel only this frame's geometry
    // transitions. Subsequent hover/focus transitions retain their normal timing.
    for (const animation of media?.getAnimations() ?? []) {
      if (
        'transitionProperty' in animation &&
        ['width', 'height', 'left', 'top'].includes(
          String(animation.transitionProperty),
        )
      )
        animation.cancel()
    }
  }
  return { apply, clear: () => apply(undefined) }
}
