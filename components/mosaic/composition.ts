import type {
  MosaicComposition,
  MosaicLoop,
  MosaicPoint,
  MosaicProject,
  MosaicRect,
} from './types'
import { DEFAULT_MOSAIC_BLURB_POSITION } from './blurbPosition'

export const DEFAULT_MOSAIC_ZOOM = 5
export const MIN_MOSAIC_ZOOM = 1
export const MAX_MOSAIC_ZOOM = 20

/** Shared by the CSS-owned tile frame and the playback controller's overrides. */
export function mosaicCompositionProperties(
  composition: MosaicComposition | undefined,
  prefix = '--mosaic-default',
): Record<string, number> {
  if (!composition) return {}
  return {
    [`${prefix}-focal-x`]: composition.focal.x,
    [`${prefix}-focal-y`]: composition.focal.y,
    [`${prefix}-x`]: composition.target.x,
    [`${prefix}-y`]: composition.target.y,
    [`${prefix}-zoom`]: composition.zoom,
  }
}

export function getSegmentComposition(
  project: MosaicProject,
  index: number,
): MosaicComposition {
  return project.media[0]?.segments?.[index]?.composition ?? project.composition
}

/** Duration must come from the video's metadata, never a guessed source value. */
export function validateMosaicLoop(
  loop: MosaicLoop,
  duration: number,
): string | null {
  if (!Number.isFinite(duration) || duration <= 0)
    return 'Wait for the video duration before setting a loop.'
  if (!Number.isFinite(loop.start) || !Number.isFinite(loop.end))
    return 'Enter a start and end time in seconds.'
  if (loop.start < 0) return 'Loop start must be zero or greater.'
  if (loop.start >= loop.end) return 'Loop end must be after loop start.'
  if (loop.end > duration) return 'Loop end must not exceed the video duration.'
  return null
}

export const MIN_SEGMENT_SPEED = 0.1

export function validateSegmentSpeed(speed: number): string | null {
  return Number.isFinite(speed) && speed >= MIN_SEGMENT_SPEED
    ? null
    : 'Enter a speed of 0.1 or greater.'
}

type TileSize = { width: number; height: number }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function copyComposition(composition: MosaicComposition): MosaicComposition {
  return {
    focal: { ...composition.focal },
    target: { ...composition.target },
    zoom: composition.zoom,
  }
}

/** Mirrors the media's CSS cover dimensions and edge-clamped focal placement. */
export function getMosaicGeometry(
  composition: MosaicComposition,
  mediaRatio: number,
  tileSize: TileSize,
): MosaicRect {
  const zoom = clamp(composition.zoom, MIN_MOSAIC_ZOOM, MAX_MOSAIC_ZOOM)
  const width = Math.max(tileSize.width, tileSize.height * mediaRatio) * zoom
  const height = Math.max(tileSize.height, tileSize.width / mediaRatio) * zoom
  return {
    width,
    height,
    left: clamp(
      tileSize.width * composition.target.x - width * composition.focal.x,
      tileSize.width - width,
      0,
    ),
    top: clamp(
      tileSize.height * composition.target.y - height * composition.focal.y,
      tileSize.height - height,
      0,
    ),
  }
}

function compositionAtOffset(
  composition: MosaicComposition,
  tileSize: TileSize,
  geometry: MosaicRect,
  offset: MosaicPoint,
): MosaicComposition {
  if (geometry.width === 0 || geometry.height === 0)
    return copyComposition(composition)

  const left = clamp(offset.x, tileSize.width - geometry.width, 0)
  const top = clamp(offset.y, tileSize.height - geometry.height, 0)
  return {
    focal: {
      x: clamp(
        (tileSize.width * composition.target.x - left) / geometry.width,
        0,
        1,
      ),
      y: clamp(
        (tileSize.height * composition.target.y - top) / geometry.height,
        0,
        1,
      ),
    },
    target: { ...composition.target },
    zoom: clamp(composition.zoom, MIN_MOSAIC_ZOOM, MAX_MOSAIC_ZOOM),
  }
}

/** Pixel deltas move the visible image, starting at its actual clamped offset. */
export function panMosaicComposition(
  composition: MosaicComposition,
  mediaRatio: number,
  tileSize: TileSize,
  delta: MosaicPoint,
): MosaicComposition {
  const geometry = getMosaicGeometry(composition, mediaRatio, tileSize)
  return compositionAtOffset(composition, tileSize, geometry, {
    x: geometry.left + delta.x,
    y: geometry.top + delta.y,
  })
}

/** Keep the source point under the tile-local pointer, unless an edge intervenes. */
export function zoomMosaicComposition(
  composition: MosaicComposition,
  mediaRatio: number,
  tileSize: TileSize,
  nextZoom: number,
  pointer: MosaicPoint,
): MosaicComposition {
  const previous = getMosaicGeometry(composition, mediaRatio, tileSize)
  if (previous.width === 0 || previous.height === 0)
    return copyComposition(composition)

  const next = {
    ...composition,
    zoom: clamp(nextZoom, MIN_MOSAIC_ZOOM, MAX_MOSAIC_ZOOM),
  }
  const geometry = getMosaicGeometry(next, mediaRatio, tileSize)
  return compositionAtOffset(next, tileSize, geometry, {
    x:
      pointer.x -
      ((pointer.x - previous.left) / previous.width) * geometry.width,
    y:
      pointer.y -
      ((pointer.y - previous.top) / previous.height) * geometry.height,
  })
}

/** Export every project's copy and first-media cell, including untouched defaults. */
export function serializeMosaicCompositions(
  projects: readonly MosaicProject[],
): string {
  const cells = Object.fromEntries(
    projects.flatMap(project => {
      const first = project.media[0]
      return first
        ? [
            [
              first.id,
              {
                composition: copyComposition(project.composition),
                ...(first.video && first.segments?.length
                  ? {
                      segments: first.segments.map(segment => ({ ...segment })),
                    }
                  : {}),
              },
            ],
          ]
        : []
    }),
  )
  const projectCopy = Object.fromEntries(
    projects.map(project => [
      project.id,
      {
        title: project.title,
        summary: project.summary,
        longSummary: project.longSummary ?? '',
        blurbPosition: {
          ...(project.blurbPosition ?? DEFAULT_MOSAIC_BLURB_POSITION),
        },
      },
    ]),
  )
  return JSON.stringify(
    { schemaVersion: 6, cells, projects: projectCopy },
    null,
    2,
  )
}
