import type { MosaicComposition, MosaicProject, MosaicSegment } from './types'

/** Video crop edits affect one segment at every size, leaving the default intact. */
export function updateMosaicFraming(
  project: MosaicProject,
  index: number,
  value: MosaicComposition,
  duration?: number,
): MosaicProject {
  const media = project.media[0]
  if (!media.video)
    return {
      ...project,
      composition: value,
    }
  let segments = media.segments
  if (!segments?.length) {
    if (!duration || !Number.isFinite(duration) || duration <= 0) return project
    segments = [
      {
        id: `${media.id}-segment-1`,
        start: 0,
        end: duration,
        fadeIn: false,
        fadeOut: false,
      },
    ]
  }
  return {
    ...project,
    media: [
      {
        ...media,
        segments: segments.map((segment, i) =>
          i === index
            ? {
                ...segment,
                composition: value,
              }
            : segment,
        ),
      },
      ...project.media.slice(1),
    ],
  }
}

export function withSegmentIds(projects: MosaicProject[]): MosaicProject[] {
  return projects.map(project => ({
    ...project,
    media: project.media.map(media => ({
      ...media,
      ...(media.segments
        ? {
            segments: media.segments.map((segment, index) => ({
              ...segment,
              id: segment.id ?? `${media.id}-segment-${index + 1}`,
            })),
          }
        : {}),
    })),
  }))
}

export function segmentMoveBounds(
  segments: readonly MosaicSegment[],
  index: number,
  duration: number,
) {
  const current = segments[index]
  let left = 0,
    right = duration
  for (let i = 0; i < segments.length; i++) {
    if (i === index) continue
    const other = segments[i]
    if (other.end <= current.start) left = Math.max(left, other.end)
    else if (other.start >= current.end) right = Math.min(right, other.start)
    else return { min: current.start, max: current.start }
  }
  return { min: left, max: right - (current.end - current.start) }
}

export function translateSegment(
  segments: readonly MosaicSegment[],
  index: number,
  duration: number,
  delta: number,
): MosaicSegment {
  const segment = segments[index]
  const bounds = segmentMoveBounds(segments, index, duration)
  const start = Math.max(
    bounds.min,
    Math.min(bounds.max, Math.round((segment.start + delta) * 100) / 100),
  )
  return { ...segment, start, end: segment.end + (start - segment.start) }
}

export function addSegment(
  segments: readonly MosaicSegment[],
  index: number,
  duration: number,
  id: string,
) {
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const gaps: { start: number; end: number }[] = []
  let end = 0
  for (const segment of sorted) {
    if (segment.start - end >= 0.01)
      gaps.push({ start: end, end: segment.start })
    end = Math.max(end, segment.end)
  }
  if (duration - end >= 0.01) gaps.push({ start: end, end: duration })
  const selected = segments[index]
  const gap = gaps.find(gap => gap.start >= selected.end) ?? gaps[0]
  const next = [...segments]
  let start: number, finish: number
  if (gap) {
    start = gap.start
    finish = Math.min(gap.end, start + 5)
  } else {
    start = (selected.start + selected.end) / 2
    finish = selected.end
    next[index] = { ...selected, end: start }
  }
  next.splice(index + 1, 0, {
    id,
    start,
    end: finish,
    fadeIn: false,
    fadeOut: false,
    ...(selected.speed !== undefined ? { speed: selected.speed } : {}),
    ...(selected.composition
      ? { composition: structuredClone(selected.composition) }
      : {}),
  })
  return next
}
