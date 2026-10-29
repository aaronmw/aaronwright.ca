'use client'

import Image from 'next/image'
import { MosaicVideo } from './MosaicVideo'
import { MosaicMediaClip } from './MosaicMediaClip'
import { MosaicPortrait } from './MosaicPortrait'
import type { MosaicMedia, MosaicVideoPreview } from './types'
import treatment from './mediaTreatment.module.css'
import type { MosaicPlaybackTempo } from './mosaicPlaybackTempo'

/** Shared original-media renderer; each experiment owns only its framing. */
export function MosaicCoverMedia({
  media,
  paused,
  inspect = false,
  onDuration,
  preview,
  onReady,
  tempo,
}: {
  tempo?: MosaicPlaybackTempo
  onReady?: () => void
  preview?: MosaicVideoPreview
  media: MosaicMedia
  paused: boolean
  inspect?: boolean
  onDuration?: (id: string, duration: number) => void
}) {
  return (
    <MosaicMediaClip clip={media.clip}>
      {media.video ? (
        <MosaicVideo
          media={media}
          preview={preview}
          paused={paused}
          inspect={inspect}
          onDuration={onDuration}
          onReady={onReady}
          tempo={tempo}
        />
      ) : media.id === 'about-portrait' ? (
        <MosaicPortrait onReady={onReady} />
      ) : (
        <Image
          className={treatment.image}
          src={media.poster ?? media.src}
          alt=""
          fill
          unoptimized
          loading="eager"
          draggable={false}
          sizes="100vw"
          onLoad={onReady}
          onError={event => {
            const fallback = '/portfolio/missing-media.svg'
            if (!event.currentTarget.src.endsWith(fallback))
              event.currentTarget.src = fallback
            else onReady?.()
          }}
        />
      )}
    </MosaicMediaClip>
  )
}
