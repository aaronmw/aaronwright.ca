import { expect, it } from 'vitest'
import {
  addSegment,
  segmentMoveBounds,
  translateSegment,
  updateMosaicFraming,
} from '@/components/mosaic/segmentEditing'
import {
  getSegmentComposition,
  serializeMosaicCompositions,
} from '@/components/mosaic/composition'
import type { MosaicProject } from '@/components/mosaic/types'

const segment = (start: number, end: number) => ({
  start,
  end,
  fadeIn: false,
  fadeOut: false,
})

it('clamps translation to temporal neighbors regardless of playback order and preserves length', () => {
  const segments = [segment(8, 10), segment(3, 5), segment(0, 2)]
  expect(segmentMoveBounds(segments, 1, 12)).toEqual({ min: 2, max: 6 })
  expect(translateSegment(segments, 1, 12, -100)).toMatchObject({
    start: 2,
    end: 4,
  })
  expect(translateSegment(segments, 1, 12, 100)).toMatchObject({
    start: 6,
    end: 8,
  })
  expect(translateSegment(segments, 1, 12, 0.43)).toMatchObject({
    start: 3.43,
    end: 5.43,
  })
  expect(segments[1]).toMatchObject({ start: 3, end: 5 })
})
it('stops at touching neighbors and does not drag through an existing overlap', () => {
  const segments = [segment(0, 2), segment(2, 4), segment(4, 6)]
  expect(segmentMoveBounds(segments, 1, 6)).toEqual({ min: 2, max: 2 })
  expect(
    translateSegment([segment(0, 3), segment(2, 4)], 1, 10, 5),
  ).toMatchObject({ start: 2, end: 4 })
})
it('adds in a free gap, or splits the selected segment when there is no gap', () => {
  expect(
    addSegment([segment(2, 4), segment(8, 10)], 0, 12, 'new')[1],
  ).toMatchObject({ id: 'new', start: 4, end: 8 })
  const split = addSegment([segment(0, 10)], 0, 10, 'new')
  expect(split.map(({ start, end }) => [start, end])).toEqual([
    [0, 5],
    [5, 10],
  ])
})

const base = { focal: { x: 0.5, y: 0.5 }, target: { x: 0.5, y: 0.5 }, zoom: 2 }
const project: MosaicProject = {
  id: 'example',
  slug: 'example',
  title: 'Example',
  summary: 'An example video project.',
  media: [
    {
      id: 'video',
      slug: 'video',
      src: '/video.mp4',
      alt: '',
      width: 100,
      height: 100,
      video: true,
      segments: [segment(0, 2), segment(3, 5)],
    },
  ],
  composition: base,
}

it('keeps each segment crop independent and exports one shared framing value', () => {
  const crop = { ...base, focal: { x: 0.3, y: 0.2 }, zoom: 4 }
  const updated = updateMosaicFraming(project, 1, crop)
  expect(getSegmentComposition(updated, 0)).toEqual(base)
  expect(getSegmentComposition(updated, 1)).toEqual(crop)
  expect(updated.composition).toEqual(project.composition)
  expect(project.media[0].segments?.[1].composition).toBeUndefined()
  const exported = JSON.parse(serializeMosaicCompositions([updated]))
  expect(exported.schemaVersion).toBe(6)
  expect(exported.cells.video.composition).toEqual(base)
  expect(exported.cells.video.segments[1].composition).toEqual(crop)
  const added = addSegment(updated.media[0].segments!, 1, 10, 'new')
  expect(added[2].composition).toEqual(crop)
  expect(added[2].composition).not.toBe(added[1].composition)
  expect(translateSegment(added, 1, 10, -0.5).composition).toEqual(crop)
})

it('makes a full-length segment on the first video crop edit, after metadata is available', () => {
  const full = {
    ...project,
    media: [{ ...project.media[0], segments: undefined }],
  }
  const crop = { ...base, zoom: 5 }
  expect(updateMosaicFraming(full, 0, crop)).toBe(full)
  const updated = updateMosaicFraming(full, 0, crop, 10)
  expect(updated.media[0].segments).toEqual([
    {
      id: 'video-segment-1',
      start: 0,
      end: 10,
      fadeIn: false,
      fadeOut: false,
      composition: crop,
    },
  ])
  expect(updated.composition).toEqual(full.composition)
  const image = {
    ...project,
    media: [{ ...project.media[0], video: false, segments: undefined }],
  }
  expect(updateMosaicFraming(image, 0, crop).composition).toEqual(crop)
})

it('preserves speed through splitting, moving, crop editing, and clipboard export', () => {
  const segments = addSegment([{ ...segment(0, 10), speed: 0.3 }], 0, 10, 'new')
  expect(segments.map(item => item.speed)).toEqual([0.3, 0.3])
  expect(translateSegment(segments, 0, 10, 0).speed).toBe(0.3)
  const updated = updateMosaicFraming(
    { ...project, media: [{ ...project.media[0], segments }] },
    0,
    base,
  )
  const exported = JSON.parse(serializeMosaicCompositions([updated]))
  expect(
    exported.cells.video.segments.map((item: { speed: number }) => item.speed),
  ).toEqual([0.3, 0.3])
})

it('preserves independent fade colors through moving, crop editing, and clipboard export', () => {
  const fading = {
    ...segment(1, 2),
    fadeIn: true,
    fadeOut: true,
    fadeInColor: 'white' as const,
    fadeOutColor: 'black' as const,
  }
  const moved = translateSegment([fading], 0, 10, 1)
  const updated = updateMosaicFraming(
    { ...project, media: [{ ...project.media[0], segments: [moved] }] },
    0,
    { ...base, zoom: 3 },
  )
  const exported = JSON.parse(serializeMosaicCompositions([updated]))
  expect(exported.cells.video.segments[0]).toMatchObject({
    ...fading,
    start: 2,
    end: 3,
    composition: { ...base, zoom: 3 },
  })
})
