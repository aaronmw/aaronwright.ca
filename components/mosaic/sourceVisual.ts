type HeldSource = {
  media: HTMLElement
  style: string | null
  opacity: string
}
const heldSources = new WeakMap<HTMLElement, HeldSource>()
type ReturnFrameReceiver = (frame: HTMLCanvasElement, time: number) => boolean
const returnFrames = new WeakMap<HTMLVideoElement, ReturnFrameReceiver>()
const returnReveals = new WeakMap<HTMLElement, () => void>()

/** Keep returned pixels and reveal timing with their existing owners. */
export function registerMosaicReturnFrame(
  video: HTMLVideoElement,
  receive: ReturnFrameReceiver,
) {
  returnFrames.set(video, receive)
  return () => {
    if (returnFrames.get(video) === receive) returnFrames.delete(video)
  }
}

export function registerMosaicReturnReveal(
  surface: HTMLElement,
  reveal: () => void,
) {
  returnReveals.set(surface, reveal)
  return () => {
    if (returnReveals.get(surface) === reveal) returnReveals.delete(surface)
  }
}

export function restoreMosaicReturnFrame(
  tile: HTMLElement,
  frame: HTMLCanvasElement,
  time: number,
) {
  const video = tile.querySelector<HTMLVideoElement>('[data-mosaic-video]')
  const surface = tile.parentElement
  if (!video || !surface || !returnFrames.get(video)?.(frame, time))
    return false
  returnReveals.get(surface)?.()
  return true
}

function freezeMedia(media: HTMLElement) {
  const style = getComputedStyle(media)
  const { width, height, left, top, filter, transform } = style
  Object.assign(media.style, {
    width,
    height,
    left,
    top,
    filter,
    transform,
    transition: 'none',
  })
}

/** Keep the clicked visual stationary while the lazily loaded viewer prepares. */
export function holdMosaicSource(tile: HTMLElement) {
  if (heldSources.has(tile)) return
  const media = tile.querySelector<HTMLElement>('[data-mosaic-media]')
  if (!media) return
  heldSources.set(tile, {
    media,
    style: media.getAttribute('style'),
    opacity: tile.style.opacity,
  })
  const fit =
    tile.matches(':focus-visible, [data-mosaic-return-focus]:focus') ||
    (matchMedia('(hover: hover) and (pointer: fine)').matches &&
      tile.matches(':hover'))
  tile.dataset.mosaicSource = 'held'
  if (fit) tile.dataset.mosaicSourceFit = 'true'
  tile.style.opacity = getComputedStyle(tile).opacity
  freezeMedia(media)
}

export function hideMosaicSource(tile: HTMLElement | null) {
  if (tile) tile.dataset.mosaicSourceHidden = 'true'
}

/** The return destination is the focus-restored cell, measured before animating. */
export function prepareMosaicReturn(tile: HTMLElement) {
  const held = heldSources.get(tile)
  if (!held) holdMosaicSource(tile)
  const source = heldSources.get(tile)
  if (!source) return
  if (source.style === null) source.media.removeAttribute('style')
  else source.media.setAttribute('style', source.style)
  source.media.style.transition = 'none'
  tile.dataset.mosaicSourceFit = 'true'
  tile.style.opacity = '1'
  freezeMedia(source.media)
}

export function releaseMosaicSource(tile: HTMLElement | null) {
  if (!tile) return
  const source = heldSources.get(tile)
  if (source) {
    if (source.style === null) source.media.removeAttribute('style')
    else source.media.setAttribute('style', source.style)
    tile.style.opacity = source.opacity
    heldSources.delete(tile)
  }
  delete tile.dataset.mosaicSource
  delete tile.dataset.mosaicSourceFit
  delete tile.dataset.mosaicSourceHidden
}

/** Preserve the fitted return destination for the restored focus lifetime. */
export function restoreMosaicFocus(tile: HTMLElement) {
  tile.dataset.mosaicReturnFocus = 'true'
  tile.addEventListener('blur', () => delete tile.dataset.mosaicReturnFocus, {
    once: true,
  })
  tile.focus({ preventScroll: true })
  if (document.activeElement !== tile) delete tile.dataset.mosaicReturnFocus
}
