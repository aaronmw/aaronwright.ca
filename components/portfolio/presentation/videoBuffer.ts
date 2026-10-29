export type BufferedRange = { start: number; end: number }

export function readVideoBuffer(
  video: Pick<HTMLVideoElement, 'duration' | 'buffered'>,
): BufferedRange[] {
  if (!Number.isFinite(video.duration) || video.duration <= 0) return []
  return Array.from({ length: video.buffered.length }, (_, index) => ({
    start: Math.max(
      0,
      Math.min(100, (video.buffered.start(index) / video.duration) * 100),
    ),
    end: Math.max(
      0,
      Math.min(100, (video.buffered.end(index) / video.duration) * 100),
    ),
  })).filter(range => range.end > range.start)
}
