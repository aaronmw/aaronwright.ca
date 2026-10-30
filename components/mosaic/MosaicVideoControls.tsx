'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { PortfolioIcon } from '../portfolio/presentation/PortfolioIcon'
import { MosaicViewerButton } from './MosaicViewerButton'
import { VideoScrubber } from '../portfolio/presentation/VideoScrubber'
import { createVideoTimelineStore } from './videoTimelineStore'
import styles from './MosaicViewer.module.css'

export function MosaicVideoControls({
  label,
  disabled,
}: {
  label: string
  disabled: boolean
}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const [pauseFlash, setPauseFlash] = useState(0)
  const slide = root?.closest('.yarl__slide')
  const getVideo = () => slide?.querySelector('video')
  const store = useMemo(
    () => createVideoTimelineStore(root?.closest('.yarl__slide')),
    [root],
  )
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
  const timeline = JSON.parse(snapshot)
  const videoContainer = getVideo()?.parentElement

  useEffect(() => {
    if (!slide || disabled) return
    const pauseVideo = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement)) return
      event.target.pause()
      setPauseFlash(value => value + 1)
    }
    const clearFlash = () => setPauseFlash(0)
    // Capture also handles a plugin video that mounts after the controls.
    slide.addEventListener('click', pauseVideo, true)
    slide.addEventListener('play', clearFlash, true)
    slide.addEventListener('ended', clearFlash, true)
    return () => {
      slide.removeEventListener('click', pauseVideo, true)
      slide.removeEventListener('play', clearFlash, true)
      slide.removeEventListener('ended', clearFlash, true)
    }
  }, [slide, disabled])

  return (
    <div
      ref={setRoot}
      className={styles.videoControls}
      onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key !== 'Escape') event.stopPropagation()
      }}
    >
      {!disabled &&
        pauseFlash > 0 &&
        timeline.paused &&
        videoContainer &&
        createPortal(
          <span
            key={pauseFlash}
            className={styles.videoPauseFlash}
            aria-hidden="true"
          >
            <PortfolioIcon
              name="circlePause"
              className={styles.videoPauseIcon}
            />
          </span>,
          videoContainer,
        )}
      <MosaicViewerButton
        className={styles.videoPlayPause}
        label={timeline.paused ? 'Play video' : 'Pause video'}
        disabled={disabled}
        onClick={() => {
          const video = getVideo()
          if (!video) return
          if (video.paused) void video.play().catch(() => undefined)
          else video.pause()
        }}
      >
        <PortfolioIcon name={timeline.paused ? 'play' : 'pause'} />
      </MosaicViewerButton>
      <VideoScrubber
        className={styles.videoScrubber}
        label={`Seek through ${label}`}
        currentTime={timeline.currentTime}
        duration={disabled ? 0 : timeline.duration}
        buffered={timeline.buffered}
        onScrub={time => {
          const video = getVideo()
          if (video) video.currentTime = time
        }}
      />
    </div>
  )
}
