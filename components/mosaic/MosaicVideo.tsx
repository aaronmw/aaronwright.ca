'use client'

import type { MosaicMedia, MosaicVideoPreview } from './types'
import { useMosaicVideoPlayback } from './useMosaicVideoPlayback'
import styles from './MosaicVideo.module.css'
import type { MosaicPlaybackTempo } from './mosaicPlaybackTempo'

export type MosaicVideoProps = {
  tempo?: MosaicPlaybackTempo
  preview?: MosaicVideoPreview
  media: MosaicMedia
  paused: boolean
  inspect?: boolean
  onDuration?: (id: string, duration: number) => void
  onReady?: () => void
}

export function MosaicVideo(props: MosaicVideoProps) {
  const { videoRef, frameRef, posterRef, state } = useMosaicVideoPlayback(props)
  const showingFrame = state === 'playing' || state === 'paused'
  return (
    <span
      className={styles.root}
      data-mosaic-video-state={state}
      data-mosaic-video-reason={showingFrame ? undefined : state}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        data-mosaic-video={props.media.id}
        className={styles.video}
        muted
        playsInline
        tabIndex={-1}
        poster={props.media.poster}
        disablePictureInPicture
      />
      <canvas
        ref={frameRef}
        className={styles.frame}
        data-mosaic-video-frame
        hidden
      />
      <img
        ref={posterRef}
        className={styles.poster}
        src={props.media.poster ?? '/portfolio/missing-media.svg'}
        alt=""
        draggable={false}
        hidden={showingFrame}
        onLoad={() => {
          if (state !== 'loading') props.onReady?.()
        }}
        onError={event => {
          const fallback = '/portfolio/missing-media.svg'
          if (!event.currentTarget.src.endsWith(fallback))
            event.currentTarget.src = fallback
          else props.onReady?.()
        }}
      />
    </span>
  )
}
