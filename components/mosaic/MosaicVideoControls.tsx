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
  const [playbackFlash, setPlaybackFlash] = useState<{
    id: number
    paused: boolean
  } | null>(null)
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
    let active = true
    let revision = 0
    const toggleVideo = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement)) return
      const video = event.target
      revision += 1
      const id = revision
      if (video.paused) {
        setPlaybackFlash(null)
        void video
          .play()
          .then(() => {
            if (active && revision === id && !video.paused)
              setPlaybackFlash({ id, paused: false })
          })
          .catch(() => undefined)
      } else {
        video.pause()
        setPlaybackFlash({ id, paused: true })
      }
    }
    const clearFlash = () => {
      revision += 1
      setPlaybackFlash(null)
    }
    // Capture also handles a plugin video that mounts after the controls.
    slide.addEventListener('click', toggleVideo, true)
    slide.addEventListener('ended', clearFlash, true)
    return () => {
      active = false
      slide.removeEventListener('click', toggleVideo, true)
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
        playbackFlash &&
        playbackFlash.paused === timeline.paused &&
        videoContainer &&
        createPortal(
          <span
            key={playbackFlash.id}
            className={styles.videoPlaybackFlash}
            aria-hidden="true"
          >
            <PortfolioIcon
              name={playbackFlash.paused ? 'circlePause' : 'circlePlay'}
              inline
              className={styles.videoPlaybackIcon}
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
          setPlaybackFlash(null)
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
