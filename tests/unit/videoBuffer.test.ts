import { expect, it } from 'vitest'
import { readVideoBuffer } from '@/components/portfolio/presentation/videoBuffer'

function video(duration: number, ranges: number[][]) {
  return {
    duration,
    buffered: {
      length: ranges.length,
      start: (i: number) => ranges[i][0],
      end: (i: number) => ranges[i][1],
    },
  }
}
it('preserves gaps in loaded video ranges and clamps to the timeline', () => {
  expect(
    readVideoBuffer(
      video(100, [
        [0, 20],
        [60, 80],
        [95, 105],
      ]),
    ),
  ).toEqual([
    { start: 0, end: 20 },
    { start: 60, end: 80 },
    { start: 95, end: 100 },
  ])
})
it('has no loaded bar before metadata or after the buffer is cleared', () => {
  for (const duration of [0, NaN, Infinity])
    expect(readVideoBuffer(video(duration, [[0, 20]]))).toEqual([])
  expect(readVideoBuffer(video(100, []))).toEqual([])
})
