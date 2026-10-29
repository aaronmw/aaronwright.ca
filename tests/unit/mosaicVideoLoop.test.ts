import { describe, expect, it } from 'vitest'
import {
  canSeekTo,
  segmentOpacity,
  segmentFadeColor,
  resolveVideoSegments,
  segmentRestartDelay,
} from '@/components/mosaic/videoLoop'

const noFade = { fadeIn: false, fadeOut: false }
const resolveVideoLoop = (
  loop: { start: number; end: number } | undefined,
  duration: number,
) =>
  resolveVideoSegments(loop ? [{ ...loop, ...noFade }] : undefined, duration, 0)

describe('mosaic background video loop boundaries', () => {
  it('waits for actual finite metadata rather than guessing segment validity', () => {
    for (const duration of [NaN, Infinity, 0, -1])
      expect(resolveVideoLoop({ start: 1, end: 2 }, duration)).toEqual({
        kind: 'waiting',
      })
  })
  it('uses native full-video looping only when a segment is absent', () => {
    expect(resolveVideoLoop(undefined, 30)).toEqual({ kind: 'full' })
    for (const loop of [
      { start: -1, end: 5 },
      { start: 5, end: 5 },
      { start: 6, end: 5 },
      { start: 0, end: 30.01 },
      { start: NaN, end: 5 },
      { start: 0, end: Infinity },
    ])
      expect(resolveVideoLoop(loop, 30)).toEqual({ kind: 'invalid' })
  })
  it('accepts exact duration endpoints and subframe positive segments without broadening them', () => {
    expect(resolveVideoLoop({ start: 4, end: 30 }, 30)).toEqual({
      kind: 'segment',
      ...noFade,
      start: 4,
      end: 30,
    })
    expect(resolveVideoLoop({ start: 4, end: 4.001 }, 30)).toEqual({
      kind: 'segment',
      ...noFade,
      start: 4,
      end: 4.001,
    })
  })
  it('does not seek into unavailable gaps even if a later range is seekable', () => {
    const ranges = {
      length: 2,
      start: (i: number) => [0, 8][i],
      end: (i: number) => [2, 10][i],
    }
    expect(canSeekTo(ranges, 0)).toBe(true)
    expect(canSeekTo(ranges, 5)).toBe(false)
    expect(canSeekTo(ranges, 9)).toBe(true)
    expect(canSeekTo({ ...ranges, length: 0 }, 0)).toBe(false)
  })
  it('normalizes microsecond endpoint rounding without changing authored segments', () => {
    const segment = { start: 0, end: 21.905217, ...noFade }
    const duration = 21.905216666666668
    expect(resolveVideoSegments([segment], duration, 0)).toEqual({
      kind: 'segment',
      ...segment,
      end: duration,
    })
    expect(segment.end).toBe(21.905217)
    expect(
      resolveVideoLoop({ start: 0, end: duration + 0.00001 }, duration),
    ).toEqual({
      kind: 'invalid',
    })
    expect(
      resolveVideoLoop({ start: duration, end: 21.905217 }, duration),
    ).toEqual({
      kind: 'invalid',
    })
  })
  it('caps repeated segment seeks while allowing ordinary loops immediately', () => {
    expect(segmentRestartDelay(1000, 990)).toBe(90)
    expect(segmentRestartDelay(1000, 999)).toBe(99)
    expect(segmentRestartDelay(1000, 0)).toBe(0)
    expect(segmentRestartDelay(1000, -Infinity)).toBe(0)
  })
})

it('plays ordered segments including backwards jumps, and validates the whole sequence', () => {
  const segments = [
    { start: 8, end: 10, fadeIn: true, fadeOut: false },
    { start: 1, end: 3, fadeIn: false, fadeOut: true },
  ]
  expect(resolveVideoSegments(segments, 10, 1)).toEqual({
    kind: 'segment',
    ...segments[1],
  })
  expect(resolveVideoSegments(segments, 10, 2)).toEqual({
    kind: 'segment',
    ...segments[0],
  })
  expect(resolveVideoSegments(segments, 9, 1)).toEqual({ kind: 'invalid' })
})
it('uses independent half-second fades, including inside nonzero segments', () => {
  const segment = { start: 4, end: 15, fadeIn: true, fadeOut: false }
  expect(segmentOpacity(4, segment)).toBe(0)
  expect(segmentOpacity(4.25, segment)).toBe(0.5)
  expect(segmentOpacity(4.5, segment)).toBe(1)
  expect(segmentOpacity(15, segment)).toBe(1)
  const out = { ...segment, fadeIn: false, fadeOut: true }
  expect(segmentOpacity(4, out)).toBe(1)
  expect(segmentOpacity(14.5, out)).toBe(1)
  expect(segmentOpacity(14.75, out)).toBe(0.5)
  expect(segmentOpacity(15, out)).toBe(0)
})
it('fits short segments and supports both or neither edge fading', () => {
  const short = { start: 0, end: 0.2, fadeIn: true, fadeOut: true }
  expect(segmentOpacity(0, short)).toBe(0)
  expect(segmentOpacity(0.1, short)).toBe(1)
  expect(segmentOpacity(0.2, short)).toBe(0)
  expect(segmentOpacity(0.1, { ...short, fadeOut: false })).toBe(0.5)
  expect(segmentOpacity(0, { ...short, ...noFade })).toBe(1)
  expect(segmentOpacity(0, { ...short, end: NaN })).toBe(1)
})

it('keeps fades at half a second of playback at every supported speed', () => {
  for (const speed of [0.1, 0.5, 1, 2, 2.1, 4, 8]) {
    const segment = { start: 4, end: 15, fadeIn: true, fadeOut: true, speed }
    expect(segmentOpacity(4 + 0.25 * speed, segment)).toBeCloseTo(0.5)
    expect(segmentOpacity(15 - 0.25 * speed, segment)).toBeCloseTo(0.5)
    expect(resolveVideoSegments([segment], 20, 0)).toMatchObject({
      kind: 'segment',
      speed,
    })
  }
  for (const speed of [0, 0.09, NaN, Infinity]) {
    expect(
      resolveVideoSegments([{ start: 0, end: 3, ...noFade, speed }], 3, 0),
    ).toEqual({ kind: 'invalid' })
  }
})

it('defaults existing fades to black and ignores colors on disabled edges', () => {
  const segment = { start: 0, end: 3, fadeIn: true, fadeOut: true }
  expect(segmentFadeColor(0, segment)).toBe('black')
  expect(segmentFadeColor(3, segment)).toBe('black')
  expect(
    segmentFadeColor(0, { ...segment, ...noFade, fadeInColor: 'white' }),
  ).toBe('black')
  expect(
    segmentFadeColor(3, { ...segment, fadeOut: false, fadeInColor: 'white' }),
  ).toBe('white')
})

it.each([0.1, 1, 3, 8])(
  'switches independent fade colors only behind an opaque video at %s×',
  speed => {
    for (const end of [0.2, 3, 10]) {
      const segment = {
        start: 0,
        end,
        speed,
        fadeIn: true,
        fadeOut: true,
        fadeInColor: 'white' as const,
        fadeOutColor: 'black' as const,
      }
      expect(segmentFadeColor(0, segment)).toBe('white')
      expect(segmentOpacity(0, segment)).toBe(0)
      expect(segmentFadeColor(end / 2, segment)).toBe('black')
      expect(segmentOpacity(end / 2, segment)).toBe(1)
      expect(segmentFadeColor(end, segment)).toBe('black')
      expect(segmentOpacity(end, segment)).toBe(0)
    }
  },
)
