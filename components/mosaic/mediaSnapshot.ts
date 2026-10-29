import type { MosaicOrigin } from './types'

/** Preserve both portrait layers, even when opening or closing mid-crossfade. */
export function capturePortraitCanvas(
  root: HTMLElement,
): HTMLCanvasElement | null {
  const portrait = root.querySelector<HTMLElement>('[data-mosaic-portrait]')
  const base = portrait?.querySelector('img')
  const hover = portrait?.querySelector<HTMLImageElement>(
    '[data-mosaic-portrait-hover]',
  )
  if (
    !base?.complete ||
    !base.naturalWidth ||
    !hover?.complete ||
    !hover.naturalWidth
  )
    return null
  const opacity = Number.parseFloat(getComputedStyle(hover).opacity)
  if (!opacity) return null
  const canvas = document.createElement('canvas')
  canvas.width = base.naturalWidth
  canvas.height = base.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(base, 0, 0, canvas.width, canvas.height)
  context.globalAlpha = opacity
  context.drawImage(hover, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Copy the painted frame without synchronously encoding a full-size image. */
export function captureVideoCanvas(
  video: HTMLVideoElement,
): HTMLCanvasElement | null {
  try {
    const held = video.parentElement?.querySelector<HTMLCanvasElement>(
      '[data-mosaic-video-frame]:not([hidden])',
    )
    const source = held && held.width && held.height ? held : video
    if (
      source === video &&
      (video.readyState < 2 || !video.videoWidth || !video.videoHeight)
    )
      return null
    const canvas = document.createElement('canvas')
    canvas.width = source === video ? video.videoWidth : source.width
    canvas.height = source === video ? video.videoHeight : source.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0)
    return canvas
  } catch {
    // The caller retains the ordinary poster when a frame cannot be copied.
    return null
  }
}

/** Expand the media that is actually visible, including held frames. */
export function captureMosaicOrigin(
  tile: HTMLButtonElement,
  fallback: string,
): MosaicOrigin {
  const media = tile.querySelector<HTMLElement>('[data-mosaic-media]')
  const video = tile.querySelector<HTMLVideoElement>('[data-mosaic-video]')
  const state = video?.closest<HTMLElement>('[data-mosaic-video-state]')
    ?.dataset.mosaicVideoState
  const showingVideo = video && (state === 'playing' || state === 'paused')
  const videoTime = showingVideo ? video.currentTime : undefined
  const frame = showingVideo
    ? captureVideoCanvas(video)
    : capturePortraitCanvas(tile)
  return {
    tile: tile.getBoundingClientRect().toJSON(),
    media: (media ?? tile).getBoundingClientRect().toJSON(),
    poster: fallback,
    ...(frame ? { frame } : {}),
    ...(frame && Number.isFinite(videoTime) ? { videoTime } : {}),
  }
}
