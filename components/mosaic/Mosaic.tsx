'use client'

import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { ExperimentGallery, useExperimentGallery } from './ExperimentGallery'
import { MosaicTile } from './MosaicTile'
import type { MosaicProject, MosaicVideoPreview } from './types'
import styles from './Mosaic.module.css'

import { usePackedLayout, type PackingStatus } from './usePackedLayout'
import { balancedLayout, type MosaicLayout } from './layout'
import { DEFAULT_PACKING_SETTINGS } from './packingSettings'
import { mosaicEntrance } from './entrance'
import { createMosaicEntranceGroup } from './playMosaicEntrance'
import type { MosaicLayerSettings } from './MosaicAdjustmentLayer'

type MosaicProps = {
  galleryTitle: string
  projects: MosaicProject[]
  layout?: MosaicLayout
  adjustmentLayer?: MosaicLayerSettings
  adjustment?: {
    active: boolean
    preview?: { mediaId: string | null; request: MosaicVideoPreview }
    toolbar: ReactNode
    onSelect?: (project: MosaicProject) => void
  }
  onPackingStatus?: (status: PackingStatus) => void
  onVideoDuration?: (mediaId: string, duration: number) => void
}

function MosaicGrid({
  projects,
  layout = balancedLayout,
  adjustment,
  adjustmentLayer,
  onVideoDuration,
  onPackingStatus,
}: Omit<MosaicProps, 'galleryTitle'>) {
  const { open, playbackPaused, logoReady, visitedProjects } =
    useExperimentGallery()
  const visitedProjectIds = useMemo(
    () => new Set(visitedProjects),
    [visitedProjects],
  )
  const gridRef = useRef<HTMLDivElement>(null)
  const entranceGroup = useMemo(
    () => createMosaicEntranceGroup(projects.length),
    [projects.length],
  )
  const { layout: packed, failed: packingFailed } = usePackedLayout(
    gridRef,
    projects.map(p => p.media[0].width / p.media[0].height),
    layout.packing ?? DEFAULT_PACKING_SETTINGS,
    onPackingStatus,
  )
  const entrances =
    logoReady && packed
      ? mosaicEntrance(packed.boxes, packed.origin)
      : undefined
  const areas = layout.projectAreas
  const gridStyle = Object.fromEntries(
    Object.entries(layout.arrangements).flatMap(
      ([orientation, arrangement]) => [
        [
          `--${orientation}-columns`,
          arrangement.columns.map(n => `minmax(0, ${n}fr)`).join(' '),
        ],
        [
          `--${orientation}-rows`,
          arrangement.rows.map(n => `minmax(0, ${n}fr)`).join(' '),
        ],
        [
          `--${orientation}-areas`,
          arrangement.areas.map(row => `"${row.join(' ')}"`).join(' '),
        ],
      ],
    ),
  ) as CSSProperties
  const designedComposition =
    projects.length === Object.keys(areas).length &&
    projects.every(project => areas[project.slug])

  return (
    <div
      ref={gridRef}
      className={styles.grid}
      style={designedComposition ? gridStyle : undefined}
      data-mosaic-layout={
        packed ? 'packed' : designedComposition ? 'composed' : 'adaptive'
      }
    >
      {projects.map((project, index) => (
        <MosaicTile
          key={project.id}
          project={project}
          visited={visitedProjectIds.has(project.id)}
          adjustmentLayer={adjustmentLayer}
          entrance={entrances?.[index]}
          entranceGroup={entranceGroup}
          skipEntrance={packingFailed}
          area={
            packed
              ? undefined
              : designedComposition
                ? areas[project.slug]
                : undefined
          }
          placement={
            packed?.boxes[index]
              ? {
                  position: 'absolute',
                  left: packed.boxes[index].left + packed.inset,
                  top: packed.boxes[index].top + packed.inset,
                  width: packed.boxes[index].width,
                  height: packed.boxes[index].height,
                }
              : undefined
          }
          onOpen={open}
          adjusting={Boolean(adjustment?.active && !playbackPaused)}
          onSelect={adjustment?.onSelect}
          playbackPaused={playbackPaused}
          onVideoDuration={onVideoDuration}
          preview={
            adjustment?.active &&
            adjustment.preview?.mediaId === project.media[0]?.id
              ? adjustment.preview.request
              : undefined
          }
        />
      ))}
    </div>
  )
}

export function Mosaic({
  projects,
  galleryTitle,
  layout = balancedLayout,
  adjustment,
  adjustmentLayer,
  onVideoDuration,
  onPackingStatus,
}: MosaicProps) {
  return (
    <ExperimentGallery
      projects={projects}
      basePath="/work"
      galleryTitle={galleryTitle}
      className={styles.root}
      adjusting={adjustment?.active}
      toolbar={adjustment?.toolbar}
    >
      <MosaicGrid
        projects={projects}
        layout={layout}
        adjustment={adjustment}
        adjustmentLayer={adjustmentLayer}
        onPackingStatus={onPackingStatus}
        onVideoDuration={onVideoDuration}
      />
    </ExperimentGallery>
  )
}
