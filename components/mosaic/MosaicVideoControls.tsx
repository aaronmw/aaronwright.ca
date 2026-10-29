'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
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
  const slide = root?.closest('.yarl__slide')
  const getVideo = () => slide?.querySelector('video')
  const store = useMemo(() => createVideoTimelineStore(slide), [slide])
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
  const timeline = JSON.parse(snapshot)
  return (
    <div
      ref={setRoot}
      className={styles.videoControls}
      onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key !== 'Escape') event.stopPropagation()
      }}
    >
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
