type Preparation = { signal: AbortSignal; current: () => boolean }

export async function prepareMosaicViewerVideo(
  video: HTMLVideoElement,
  { target, signal, current }: Preparation & { target?: number },
) {
  if (!current() || signal.aborted) return
  video.preload = 'auto'
  if (video.readyState < 1) {
    await new Promise<void>(resolve => {
      const done = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', done)
        video.removeEventListener('loadedmetadata', done)
        video.removeEventListener('error', done)
        resolve()
      }
      const timer = setTimeout(done, 1500)
      signal?.addEventListener('abort', done, { once: true })
      video.addEventListener('loadedmetadata', done, { once: true })
      video.addEventListener('error', done, { once: true })
      video.load()
    })
  }
  if (!current() || signal.aborted) return
  if (
    target !== undefined &&
    Number.isFinite(video.duration) &&
    target < video.duration
  ) {
    try {
      video.currentTime = target
    } catch {
      /* Retain the captured poster on failure. */
    }
  }
  // WebKit requires queued playback to settle some seeks. Keep it masked until
  // an actual frame arrives, matching the background controller's handoff.
  await new Promise<void>(resolve => {
    let frame: number | undefined
    const done = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      if (frame !== undefined) video.cancelVideoFrameCallback(frame)
      resolve()
    }
    const timer = setTimeout(done, 1500)
    signal?.addEventListener('abort', done, { once: true })
    if (typeof video.requestVideoFrameCallback === 'function') {
      const presented: VideoFrameRequestCallback = (_now, metadata) => {
        frame = undefined
        if (
          !current() ||
          signal.aborted ||
          (!video.seeking &&
            (target === undefined || metadata.mediaTime >= target - 0.05))
        )
          done()
        else frame = video.requestVideoFrameCallback(presented)
      }
      frame = video.requestVideoFrameCallback(presented)
    } else if (video.readyState >= 2 && !video.seeking) {
      done()
    }
    void video.play().then(() => {
      // The caller pauses on close. A stale play promise must not pause the
      // same element after a newer request has already reopened it.
      if (!current() || signal.aborted) return
      if (typeof video.requestVideoFrameCallback !== 'function') done()
    }, done)
  })
}

export async function waitForMosaicViewerVisual(
  viewer: HTMLElement,
  { signal, current }: Preparation,
) {
  // YARL may report entry before its measured slide or loaded-image state has
  // committed. Observe that commit instead of hiding the source prematurely.
  if (!current() || signal.aborted) return
  await new Promise<void>(resolve => {
    const done = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      observer.disconnect()
      resolve()
    }
    const check = () => {
      const visual = viewer.querySelector<HTMLElement>(
        '.yarl__slide_current img.yarl__slide_image:not(.yarl__slide_image_loading), .yarl__slide_current img[data-mosaic-about-portrait], .yarl__slide_current video, .yarl__slide_current .yarl__slide_error',
      )
      if (
        !current() ||
        signal.aborted ||
        (visual && visual.getBoundingClientRect().width > 0)
      )
        done()
    }
    const observer = new MutationObserver(check)
    const timer = setTimeout(done, 1500)
    signal?.addEventListener('abort', done, { once: true })
    observer.observe(viewer, {
      childList: true,
      subtree: true,
      attributes: true,
    })
    check()
  })
}
