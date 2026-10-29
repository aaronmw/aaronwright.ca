import type { MosaicVideoProps } from './MosaicVideo'
import { createSegmentFraming } from './segmentFraming'
import {
  canSeekTo,
  segmentOpacity,
  segmentFadeColor,
  resolveVideoSegments,
  segmentRestartDelay,
  type ResolvedVideoLoop,
} from './videoLoop'

export type VideoState =
  | 'loading'
  | 'playing'
  | 'paused'
  | 'reduced-motion'
  | 'autoplay-denied'
  | 'media-error'
  | 'invalid-loop'
  | 'seek-error'

export function createMosaicVideoPlayback(
  video: HTMLVideoElement,
  initialConfig: MosaicVideoProps,
  onState: (state: VideoState) => void,
  heldFrame?: HTMLCanvasElement | null,
) {
  let config = initialConfig
  let timeScale = initialConfig.tempo?.getTimeScale() ?? 1
  let minimumPlaybackRate = 0
  let destroyed = false
  let attached = false
  let hasFrame = false
  let hasHeldFrame = false
  let denied = false
  let failed: 'media-error' | 'seek-error' | null = null
  let prepared = ''
  let durationReported = NaN
  let range: ResolvedVideoLoop = { kind: 'waiting' }
  let segmentIndex =
    initialConfig.preview?.mode === 'segment' ? initialConfig.preview.index : 0
  let previewComplete = false
  let pendingSeek: number | null = null
  let activeSeek: number | null = null
  let lastRestart = -Infinity
  let playGeneration = 0
  let playPending = false
  let frame: number | undefined
  let paint: number | undefined
  let endTimer: ReturnType<typeof setTimeout> | undefined
  let seekTimer: ReturnType<typeof setTimeout> | undefined
  let restartTimer: ReturnType<typeof setTimeout> | undefined
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const framing = createSegmentFraming(video)
  const surface = video.parentElement

  const allowed = () =>
    !config.paused && !document.hidden && !motion.matches && !previewComplete
  const publish = (next: VideoState) => {
    if (!destroyed) onState(next)
  }
  const showRestingFrame = () =>
    publish(
      (hasFrame && video.style.visibility !== 'hidden') || hasHeldFrame
        ? 'paused'
        : 'loading',
    )

  function segments() {
    if (config.media.segments?.length) return config.media.segments
    if (config.preview && Number.isFinite(video.duration) && video.duration > 0)
      return [{ start: 0, end: video.duration, fadeIn: false, fadeOut: false }]
    return undefined
  }

  function resolveRange() {
    const list = segments()
    segmentIndex = Math.max(0, Math.min(segmentIndex, (list?.length || 1) - 1))
    return resolveVideoSegments(list, video.duration, segmentIndex)
  }

  function paintFade(time = video.currentTime) {
    // Fade spans use authored segment speed, not the temporary interaction scale.
    // Advancing the media clock more slowly stretches both fades and footage.
    const opacity = String(
      range.kind === 'segment' ? segmentOpacity(time, range) : 1,
    )
    if (surface)
      surface.style.backgroundColor =
        range.kind === 'segment' ? segmentFadeColor(time, range) : 'black'
    video.style.opacity = opacity
    if (heldFrame) heldFrame.style.opacity = opacity
  }

  function applyPlaybackRate() {
    const speed = range.kind === 'segment' ? (range.speed ?? 1) : 1
    const rate = Math.max(minimumPlaybackRate, speed * timeScale)
    if (video.playbackRate === rate) return
    try {
      video.playbackRate = rate
    } catch (error) {
      // Chromium rejects rates below 1/16. Keep slow authored segments playing
      // at that floor; engines supporting lower rates retain the exact scale.
      if (
        !(error instanceof DOMException) ||
        error.name !== 'NotSupportedError' ||
        rate >= 0.0625
      )
        throw error
      minimumPlaybackRate = 0.0625
      video.playbackRate = minimumPlaybackRate
    }
  }

  function setTimeScale(scale: number) {
    if (destroyed || !Number.isFinite(scale) || scale <= 0) return
    timeScale = scale
    applyPlaybackRate()
    if (allowed() && !video.paused && !checkBoundary()) armEndTimer()
  }

  function stopMonitoring() {
    if (frame !== undefined) video.cancelVideoFrameCallback(frame)
    if (paint !== undefined) cancelAnimationFrame(paint)
    clearTimeout(endTimer)
    frame = paint = undefined
    endTimer = undefined
  }

  function pause() {
    playGeneration += 1
    playPending = false
    video.pause()
    stopMonitoring()
  }

  function cancelSeek() {
    clearTimeout(seekTimer)
    clearTimeout(restartTimer)
    seekTimer = restartTimer = undefined
    pendingSeek = null
  }

  function fail(reason: 'media-error' | 'seek-error') {
    failed = reason
    pause()
    cancelSeek()
    publish(reason)
  }

  function cacheFrame() {
    if (!heldFrame || video.readyState < 2) return false
    try {
      const context = heldFrame.getContext('2d')
      if (!context) return false
      if (heldFrame.width !== video.videoWidth)
        heldFrame.width = video.videoWidth
      if (heldFrame.height !== video.videoHeight)
        heldFrame.height = video.videoHeight
      context.drawImage(video, 0, 0, heldFrame.width, heldFrame.height)
      hasHeldFrame = true
      return true
    } catch {
      /* A poster remains available if a frame cannot be copied. */
      return false
    }
  }

  function holdFrame({ allowPoster = true } = {}) {
    // Freeze what is visible now. A boundary callback can already report the
    // next timestamp; rejecting it here would revive an old cached intro frame.
    if (hasFrame && video.style.visibility !== 'hidden' && !video.seeking) {
      if (!cacheFrame() && !allowPoster) return
    }
    if (!hasHeldFrame && !allowPoster) return
    video.style.visibility = 'hidden'
    if (heldFrame) heldFrame.hidden = !hasHeldFrame
    publish(hasHeldFrame ? 'paused' : 'loading')
  }

  function restoreFrame(source: HTMLCanvasElement, time: number) {
    if (destroyed || !heldFrame || !source.width || !source.height) return false
    try {
      const context = heldFrame.getContext('2d')
      if (!context) return false
      heldFrame.width = source.width
      heldFrame.height = source.height
      context.drawImage(source, 0, 0)
    } catch {
      return false
    }
    hasHeldFrame = true
    pause()
    video.style.visibility = 'hidden'
    heldFrame.hidden = false
    // This is the expanded viewer's presented frame, not the grid's old fade.
    heldFrame.style.opacity = '1'
    const list = segments()
    if (
      list &&
      range.kind === 'segment' &&
      (time < range.start || time >= range.end) &&
      config.preview?.mode !== 'segment'
    ) {
      // A direct link leaves the grid on its intro. Resume the authored excerpt
      // containing the viewer's playhead rather than flashing back to that intro.
      const matching = list.findIndex(
        segment => time >= segment.start && time < segment.end,
      )
      if (matching >= 0 && matching !== segmentIndex) {
        segmentIndex = matching
        range = resolveRange()
        prepared = rangeKey()
        video.setAttribute('data-mosaic-segment-index', String(segmentIndex))
        framing.apply(list[segmentIndex].composition)
        applyPlaybackRate()
      }
    }
    if (
      Number.isFinite(time) &&
      time >= 0 &&
      time < video.duration &&
      (range.kind === 'full' ||
        (range.kind === 'segment' && time >= range.start && time < range.end))
    ) {
      cancelSeek()
      activeSeek = null
      pendingSeek = time
      trySeek()
    }
    publish('paused')
    return true
  }

  function markFrame(time = video.currentTime) {
    if (pendingSeek !== null || video.seeking || !allowed() || video.paused)
      return
    if (
      range.kind === 'segment' &&
      (video.currentTime < range.start || video.currentTime >= range.end)
    )
      return
    paintFade(time)
    // Keep a known-valid frame for the next masked seek. This copy happens only
    // at the handoff, never on every video frame, and stays local to the canvas.
    if (video.style.visibility === 'hidden') cacheFrame()
    if (heldFrame) heldFrame.hidden = true
    video.style.visibility = ''
    hasFrame = true
    publish('playing')
  }

  function startMonitoring() {
    stopMonitoring()
    if (typeof video.requestVideoFrameCallback === 'function') {
      const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
        frame = undefined
        if (!allowed() || video.paused) return
        const validFrame =
          range.kind !== 'segment' ||
          (metadata.mediaTime >= range.start && metadata.mediaTime < range.end)
        if (validFrame && pendingSeek === null && !video.seeking) {
          markFrame(metadata.mediaTime)
        }
        if (range.kind === 'segment' && metadata.mediaTime >= range.end) {
          restartSegment()
          return
        }
        if (range.kind === 'segment')
          frame = video.requestVideoFrameCallback(onFrame)
      }
      frame = video.requestVideoFrameCallback(onFrame)
    } else {
      // Older engines still get a paint before the poster is removed. Segment
      // boundaries also have an end timer, independent of timeupdate frequency.
      const tick = () => {
        paint = undefined
        if (!allowed() || video.paused) return
        markFrame()
        if (range.kind === 'segment') paint = requestAnimationFrame(tick)
      }
      paint = requestAnimationFrame(tick)
    }
    armEndTimer()
  }

  function armEndTimer() {
    clearTimeout(endTimer)
    if (range.kind !== 'segment' || !allowed() || video.paused) return
    const remaining = (range.end - video.currentTime) / video.playbackRate
    endTimer = setTimeout(
      () => {
        endTimer = undefined
        if (!checkBoundary()) armEndTimer()
      },
      Math.max(50, Math.min(1000, remaining * 1000)),
    )
  }

  function play(whileSeeking = false) {
    if (
      !allowed() ||
      denied ||
      failed ||
      (pendingSeek !== null && !whileSeeking) ||
      playPending ||
      !video.paused
    )
      return
    const generation = ++playGeneration
    playPending = true
    void video.play().then(
      () => {
        if (destroyed || generation !== playGeneration) return
        playPending = false
        if (!allowed() || (pendingSeek !== null && !whileSeeking)) pause()
      },
      error => {
        if (destroyed || generation !== playGeneration) return
        playPending = false
        if (error instanceof DOMException && error.name === 'AbortError') return
        denied = true
        pause()
        publish('autoplay-denied')
      },
    )
  }

  function finishSeek() {
    if (pendingSeek === null || video.seeking || video.readyState < 2) return
    const target = pendingSeek
    // A range edit can arrive while the browser is still seeking to the old
    // range. Wait for that seek to settle, then issue the latest target.
    if (activeSeek !== null && activeSeek !== target) {
      activeSeek = null
      trySeek()
      return
    }
    if (
      Math.abs(video.currentTime - target) > 0.05 ||
      (range.kind === 'segment' && video.currentTime >= range.end)
    ) {
      fail('seek-error')
      return
    }
    clearTimeout(seekTimer)
    seekTimer = undefined
    pendingSeek = null
    activeSeek = null
    if (allowed()) {
      play()
      if (!video.paused) startMonitoring()
    } else showRestingFrame()
  }

  function trySeek() {
    if (pendingSeek === null || video.readyState < 1) return
    if (video.seeking) {
      play(true)
      return
    }
    if (
      Math.abs(video.currentTime - pendingSeek) < 0.001 &&
      video.readyState >= 2
    ) {
      finishSeek()
      return
    }
    if (!canSeekTo(video.seekable, pendingSeek)) return
    try {
      activeSeek = pendingSeek
      video.currentTime = pendingSeek
      // Queue muted playback to let WebKit finish decoding a paused seek. The
      // held frame masks stale output until rVFC confirms an in-range frame.
      play(true)
    } catch {
      fail('seek-error')
    }
  }

  function watchSeek() {
    clearTimeout(seekTimer)
    seekTimer = undefined
    if (allowed())
      seekTimer = setTimeout(() => {
        seekTimer = undefined
        if (allowed()) fail('seek-error')
      }, 8000)
  }

  function seekStart() {
    if (range.kind !== 'segment') return
    holdFrame()
    pause()
    cancelSeek()
    framing.apply(segments()?.[segmentIndex]?.composition)
    applyPlaybackRate()
    lastRestart = performance.now()
    pendingSeek = range.start
    watchSeek()
    trySeek()
  }

  function restartSegment() {
    if (
      pendingSeek !== null ||
      restartTimer !== undefined ||
      range.kind !== 'segment' ||
      !allowed()
    )
      return
    const nextIndex = segmentIndex + 1
    const list = segments()
    const next =
      config.preview?.mode !== 'segment' && nextIndex < (list?.length || 0)
        ? resolveVideoSegments(list, video.duration, nextIndex)
        : null
    // Adjacent excerpts already share a playhead. Keep decoding through their
    // boundary; masking and seeking here can flash a stale held frame.
    if (
      next?.kind === 'segment' &&
      next.start === range.end &&
      !range.fadeOut &&
      !next.fadeIn &&
      !video.paused &&
      !video.seeking &&
      video.currentTime < next.end
    ) {
      segmentIndex = nextIndex
      range = next
      prepared = rangeKey()
      video.setAttribute('data-mosaic-segment-index', String(segmentIndex))
      framing.apply(list?.[segmentIndex]?.composition)
      applyPlaybackRate()
      paintFade()
      startMonitoring()
      return
    }
    holdFrame()
    paintFade(range.end)
    pause()
    showRestingFrame()
    if (
      config.preview?.mode === 'sequence' &&
      segmentIndex === (segments()?.length || 1) - 1
    ) {
      previewComplete = true
      config.preview.onComplete()
      return
    }
    restartTimer = setTimeout(
      () => {
        restartTimer = undefined
        if (allowed()) {
          if (config.preview?.mode !== 'segment')
            segmentIndex = (segmentIndex + 1) % (segments()?.length || 1)
          range = resolveRange()
          prepared = rangeKey()
          video.setAttribute('data-mosaic-segment-index', String(segmentIndex))
          seekStart()
        }
      },
      segmentRestartDelay(performance.now(), lastRestart),
    )
  }

  function checkBoundary() {
    if (
      range.kind === 'segment' &&
      pendingSeek === null &&
      video.currentTime >= range.end
    ) {
      restartSegment()
      return true
    }
    return false
  }

  function rangeKey() {
    return range.kind === 'segment'
      ? `${segmentIndex}:${range.start}:${range.end}:${video.duration}`
      : 'full'
  }

  function synchronize() {
    if (destroyed) return
    framing.apply(segments()?.[segmentIndex]?.composition)
    const shouldAttach = !motion.matches || config.inspect
    if (!shouldAttach) {
      pause()
      cancelSeek()
      if (attached) {
        video.removeAttribute('src')
        video.load()
        attached = false
      }
      prepared = ''
      hasFrame = false
      publish('reduced-motion')
      return
    }
    video.preload = allowed() ? 'auto' : 'metadata'
    if (!attached) {
      attached = true
      video.src = config.media.src
      video.load()
    }
    if (motion.matches) {
      pause()
      cancelSeek()
      prepared = ''
      publish('reduced-motion')
      return
    }
    if (failed) {
      publish(failed)
      return
    }
    range = resolveRange()
    applyPlaybackRate()
    // A ready/progress event can arrive after seeked but before the first decoded
    // frame. Preserve the outgoing frame's fade until markFrame reveals its replacement.
    if (
      pendingSeek === null &&
      !video.seeking &&
      video.style.visibility !== 'hidden'
    )
      paintFade()
    video.setAttribute('data-mosaic-segment-index', String(segmentIndex))
    video.loop = range.kind === 'full'
    if (range.kind === 'invalid') {
      pause()
      cancelSeek()
      prepared = ''
      publish('invalid-loop')
      return
    }
    if (range.kind === 'waiting') {
      pause()
      showRestingFrame()
      return
    }
    const key = rangeKey()
    if (prepared !== key) {
      prepared = key
      cancelSeek()
      if (range.kind === 'segment') seekStart()
    }
    if (!allowed()) {
      // Chromium can retain a slow video's compositor cadence after pause,
      // throttling the viewer animation. Keep its pixels on the existing canvas
      // until playback presents a new frame; retain the video if copying fails.
      if (config.paused) holdFrame({ allowPoster: false })
      pause()
      clearTimeout(seekTimer)
      seekTimer = undefined
      showRestingFrame()
      return
    }
    if (denied) {
      publish('autoplay-denied')
      return
    }
    if (pendingSeek !== null) {
      if (seekTimer === undefined) watchSeek()
      trySeek()
      return
    }
    if (!checkBoundary()) play()
  }

  function metadata() {
    const duration = video.duration
    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      duration !== durationReported
    ) {
      durationReported = duration
      config.onDuration?.(config.media.id, duration)
    }
    synchronize()
  }

  function ready() {
    if (pendingSeek !== null) trySeek()
    else synchronize()
  }
  function playing() {
    if (
      !allowed() ||
      denied ||
      failed ||
      range.kind === 'invalid' ||
      range.kind === 'waiting'
    ) {
      pause()
      return
    }
    startMonitoring()
  }
  function visibility() {
    if (!document.hidden) denied = false
    synchronize()
  }
  function preference() {
    denied = false
    synchronize()
  }
  function error() {
    fail('media-error')
  }
  function ended() {
    if (range.kind === 'segment') restartSegment()
  }

  const listeners = {
    loadedmetadata: metadata,
    durationchange: metadata,
    canplay: ready,
    progress: ready,
    seeked: finishSeek,
    playing,
    timeupdate: checkBoundary,
    error,
    ended,
  }
  Object.entries(listeners).forEach(([name, handler]) =>
    video.addEventListener(name, handler),
  )
  document.addEventListener('visibilitychange', visibility)
  motion.addEventListener('change', preference)
  function update(next: MosaicVideoProps) {
    const previewChanged =
      next.preview?.revision !== config.preview?.revision ||
      next.preview?.mode !== config.preview?.mode ||
      next.preview?.index !== config.preview?.index
    const rangeChanged =
      JSON.stringify(next.media.segments) !==
        JSON.stringify(config.media.segments) || previewChanged
    if ((config.paused && !next.paused) || rangeChanged) denied = false
    if (rangeChanged) {
      segmentIndex = next.preview?.mode === 'segment' ? next.preview.index : 0
      previewComplete = false
      failed = failed === 'seek-error' ? null : failed
      prepared = ''
    }
    config = next
    synchronize()
    if (rangeChanged && allowed() && !video.paused) startMonitoring()
  }
  synchronize()
  function destroy() {
    destroyed = true
    pause()
    cancelSeek()
    framing.clear()
    Object.entries(listeners).forEach(([name, handler]) =>
      video.removeEventListener(name, handler),
    )
    document.removeEventListener('visibilitychange', visibility)
    motion.removeEventListener('change', preference)
    video.removeAttribute('src')
    video.load()
    video.style.visibility = ''
    video.style.opacity = ''
    if (surface) surface.style.backgroundColor = ''
    if (heldFrame) {
      heldFrame.hidden = true
      heldFrame.style.opacity = ''
    }
  }
  return { update, setTimeScale, restoreFrame, destroy }
}
