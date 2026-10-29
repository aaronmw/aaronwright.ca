import type { MosaicSegment } from './types'
import { validateMosaicLoop, validateSegmentSpeed } from './composition'

export type ResolvedVideoLoop =
  | { kind: 'waiting' }
  | { kind: 'invalid' }
  | { kind: 'full' }
  | ({ kind: 'segment' } & MosaicSegment)

export function canSeekTo(
  ranges: Pick<TimeRanges, 'length' | 'start' | 'end'>,
  time: number,
) {
  for (let index = 0; index < ranges.length; index += 1) {
    if (ranges.start(index) <= time && time <= ranges.end(index)) return true
  }
  return false
}

// Arbitrarily short valid segments can be shorter than a decoded frame. Hold
// that frame briefly instead of running an unbounded seek/seeked feedback loop.
export const MIN_SEGMENT_RESTART_MS = 100
export function segmentRestartDelay(now: number, previousRestart: number) {
  return Math.max(0, MIN_SEGMENT_RESTART_MS - (now - previousRestart))
}

// One shared internal duration for every enabled segment edge.
export const MOSAIC_SEGMENT_FADE_SECONDS = 0.5

export function resolveVideoSegments(
  segments: MosaicSegment[] | undefined,
  duration: number,
  index: number,
): ResolvedVideoLoop {
  if (!Number.isFinite(duration) || duration <= 0) return { kind: 'waiting' }
  if (!segments?.length) return { kind: 'full' }
  // Chromium rounds this MP4's duration to microseconds; WebKit retains the
  // track timescale. Normalize only that precision difference at the endpoint.
  const resolved = segments.map(segment =>
    segment.end > duration && segment.end - duration <= 0.000001
      ? { ...segment, end: duration }
      : segment,
  )
  if (
    resolved.some(
      segment =>
        validateMosaicLoop(segment, duration) !== null ||
        validateSegmentSpeed(segment.speed ?? 1) !== null,
    )
  )
    return { kind: 'invalid' }
  const segment = resolved[index % resolved.length]
  return { kind: 'segment', ...segment }
}

export function segmentOpacity(time: number, segment: MosaicSegment) {
  const length = segment.end - segment.start
  if (![time, segment.start, segment.end].every(Number.isFinite) || length <= 0)
    return 1
  const fade = Math.min(
    MOSAIC_SEGMENT_FADE_SECONDS * (segment.speed ?? 1),
    length / (segment.fadeIn && segment.fadeOut ? 2 : 1),
  )
  return Math.max(
    0,
    Math.min(
      1,
      segment.fadeIn ? (time - segment.start) / fade : 1,
      segment.fadeOut ? (segment.end - time) / fade : 1,
    ),
  )
}

export function segmentFadeColor(time: number, segment: MosaicSegment) {
  // Both fades fit within their half of the segment, so changing the backdrop
  // at the midpoint happens while the video is fully opaque.
  if (
    segment.fadeOut &&
    (!segment.fadeIn || time >= (segment.start + segment.end) / 2)
  )
    return segment.fadeOutColor ?? 'black'
  return segment.fadeIn ? (segment.fadeInColor ?? 'black') : 'black'
}
