'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import type { MosaicOrigin, MosaicProject, MosaicVideoPreview } from './types'
import styles from './Mosaic.module.css'
import treatment from './mediaTreatment.module.css'
import { mediaMask } from './mediaClip'
import { MosaicCoverMedia } from './MosaicCoverMedia'
import { MosaicProjectLabel } from './MosaicProjectLabel'
import { MosaicVisitedBadge } from './MosaicVisitedBadge'
import { captureMosaicOrigin } from './mediaSnapshot'
import { mosaicCompositionProperties } from './composition'
import type { MosaicTileEntrance } from './entrance'
import { useMosaicEntrance } from './useMosaicEntrance'
import { MosaicEntranceInk } from './MosaicEntranceInk'
import { useMosaicMediaReveal } from './useMosaicMediaReveal'
import type { MosaicEntranceGroup } from './playMosaicEntrance'
import {
  createMosaicPlaybackTempo,
  DEFAULT_IDLE_PLAYBACK_SPEED,
} from './mosaicPlaybackTempo'
import { preloadMosaicViewer } from './MosaicViewerLoader'
import {
  MosaicAdjustmentLayer,
  type MosaicLayerSettings,
} from './MosaicAdjustmentLayer'

export function MosaicTile({
  project,
  visited = false,
  area,
  placement,
  onOpen,
  adjusting = false,
  onSelect,
  playbackPaused,
  onVideoDuration,
  preview,
  entrance,
  entranceGroup,
  adjustmentLayer,
  idlePlaybackSpeed = DEFAULT_IDLE_PLAYBACK_SPEED,
  skipEntrance = false,
}: {
  entrance?: MosaicTileEntrance
  entranceGroup: MosaicEntranceGroup
  adjustmentLayer?: MosaicLayerSettings
  idlePlaybackSpeed?: number
  skipEntrance?: boolean
  preview?: MosaicVideoPreview
  project: MosaicProject
  visited?: boolean
  area?: string
  placement?: CSSProperties
  adjusting?: boolean
  onSelect?: (project: MosaicProject) => void
  playbackPaused: boolean
  onVideoDuration?: (mediaId: string, duration: number) => void
  onOpen: (
    project: MosaicProject,
    origin: MosaicOrigin,
    trigger: HTMLButtonElement,
  ) => void
}) {
  const summaryId = useId()
  const visitedId = useId()
  const [playbackTempo] = useState(() =>
    createMosaicPlaybackTempo(idlePlaybackSpeed),
  )
  useEffect(() => {
    playbackTempo.setIdleSpeed(idlePlaybackSpeed)
  }, [playbackTempo, idlePlaybackSpeed])
  const entry = useMosaicEntrance(entrance, skipEntrance, entranceGroup)
  const [mediaReady, setMediaReady] = useState(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const onMediaReady = useCallback(() => setMediaReady(true), [])
  const entranceCovered = useMosaicMediaReveal(
    surfaceRef,
    entry.arrived,
    mediaReady,
    entranceGroup.settle,
  )
  const first = project.media[0]
  const poster = first.poster ?? first.src
  const style = {
    ...(area ? { gridArea: area } : {}),
    ...placement,
    '--mosaic-ratio': first.width / first.height,
    ...mosaicCompositionProperties(project.composition),
  } as CSSProperties

  function activate(event: MouseEvent<HTMLButtonElement>) {
    if (adjusting) {
      onSelect?.(project)
      return
    }
    const tile = event.currentTarget
    onOpen(project, captureMosaicOrigin(tile, poster), tile)
  }

  return (
    <div
      className={styles.cell}
      inert={!entry.arrived || !mediaReady}
      data-mosaic-entrance={entry.phase}
      data-mosaic-media-ready={mediaReady || undefined}
      style={style}
      data-mosaic-cell={area ?? 'adaptive'}
    >
      <MosaicEntranceInk
        entry={entry}
        covered={entranceCovered}
      />
      <div
        ref={surfaceRef}
        className={styles.cellSurface}
      >
        <button
          type="button"
          className={`${styles.tile} ${first.clip ? treatment.masked : ''}`}
          style={first.clip ? {
            '--mosaic-media-mask': mediaMask(first.clip),
          } as CSSProperties : undefined}
          data-mosaic-project={project.slug}
          aria-label={`${adjusting ? 'Adjust' : 'View'} ${project.title.replace(/\u00ad/g, '')} media`}
          aria-haspopup={adjusting ? undefined : 'dialog'}
          aria-describedby={
            adjusting
              ? 'mosaic-adjustment-help'
              : `${summaryId}${visited ? ` ${visitedId}` : ''}`
          }
          onClick={activate}
          onPointerEnter={event => {
            if (
              event.pointerType !== 'touch' &&
              matchMedia('(hover: hover) and (pointer: fine)').matches
            )
              playbackTempo.setHovered(true)
            if (!adjusting) preloadMosaicViewer()
          }}
          onPointerLeave={() => playbackTempo.setHovered(false)}
          onPointerCancel={() => playbackTempo.setHovered(false)}
          onFocus={event => {
            playbackTempo.setFocused(
              event.currentTarget.matches(':focus-visible'),
            )
            if (adjusting) onSelect?.(project)
            else preloadMosaicViewer()
          }}
          onBlur={() => playbackTempo.setFocused(false)}
        >
          <span
            className={styles.media}
            data-mosaic-media
          >
            <MosaicCoverMedia
              media={first}
              preview={preview}
              paused={playbackPaused || !entry.arrived}
              tempo={playbackTempo}
              onReady={onMediaReady}
              inspect={adjusting}
              onDuration={onVideoDuration}
            />
          </span>
          <MosaicAdjustmentLayer settings={adjustmentLayer} />
          <MosaicProjectLabel
            project={project}
            summaryId={summaryId}
          />
        </button>
        {visited ? <MosaicVisitedBadge id={visitedId} /> : null}
      </div>
    </div>
  )
}
