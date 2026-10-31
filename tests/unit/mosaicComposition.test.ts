import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  getMosaicGeometry,
  panMosaicComposition,
  serializeMosaicCompositions,
  validateMosaicLoop,
  zoomMosaicComposition,
} from '@/components/mosaic/composition'
import type { MosaicComposition, MosaicRect } from '@/components/mosaic/types'
import { mosaicProjects } from '@/lib/mosaic'
import { portfolioSlides } from '@/lib/portfolio'

const tile = { width: 300, height: 200 }
const centered: MosaicComposition = {
  focal: { x: 0.5, y: 0.5 },
  target: { x: 0.5, y: 0.5 },
  zoom: 2,
}

function expectCoverage(rect: MosaicRect, size = tile) {
  expect(rect.left).toBeLessThanOrEqual(0)
  expect(rect.top).toBeLessThanOrEqual(0)
  expect(rect.left + rect.width).toBeGreaterThanOrEqual(size.width)
  expect(rect.top + rect.height).toBeGreaterThanOrEqual(size.height)
}

describe('mosaic composition geometry', () => {
  it('keeps the same relative crop at different sizes when cells match the source ratio', () => {
    for (const project of mosaicProjects) {
      const media = project.media[0]
      const ratio = media.width / media.height
      const small = { width: 120 * ratio, height: 120 }
      const large = { width: 600 * ratio, height: 600 }
      const first = getMosaicGeometry(project.composition, ratio, small)
      const second = getMosaicGeometry(project.composition, ratio, large)
      expect(first.left / small.width).toBeCloseTo(second.left / large.width)
      expect(first.top / small.height).toBeCloseTo(second.top / large.height)
      expect(first.width / small.width).toBeCloseTo(second.width / large.width)
      expect(first.height / small.height).toBeCloseTo(
        second.height / large.height,
      )
    }
  })

  it('matches CSS cover scaling for wide and tall source media', () => {
    expect(getMosaicGeometry(centered, 2, tile)).toEqual({
      width: 800,
      height: 400,
      left: -250,
      top: -100,
    })
    expect(getMosaicGeometry(centered, 0.5, tile)).toEqual({
      width: 600,
      height: 1200,
      left: -150,
      top: -500,
    })
  })

  it('pans by pixel deltas while keeping the composition target fixed', () => {
    const result = panMosaicComposition(centered, 2, tile, { x: 40, y: -30 })
    const rect = getMosaicGeometry(result, 2, tile)
    expect(rect.width).toBe(800)
    expect(rect.height).toBe(400)
    expect(rect.left).toBeCloseTo(-210)
    expect(rect.top).toBeCloseTo(-130)
    expect(result.target).toEqual(centered.target)
    expect(result.target).not.toBe(centered.target)
    expect(centered.focal).toEqual({ x: 0.5, y: 0.5 })
  })

  it('starts an inward drag at the actual clamped edge instead of the raw focal offset', () => {
    const edge: MosaicComposition = {
      focal: { x: 0, y: 0 },
      target: { x: 2 / 3, y: 1 / 3 },
      zoom: 5,
    }
    expect(getMosaicGeometry(edge, 2, tile).left).toBe(0)
    const result = panMosaicComposition(edge, 2, tile, { x: -20, y: -15 })
    const rect = getMosaicGeometry(result, 2, tile)
    expect(rect.left).toBeCloseTo(-20)
    expect(rect.top).toBeCloseTo(-15)
    expect(result.target).toEqual(edge.target)
  })

  it.each([-10000, 10000])(
    'keeps all edges covered after an extreme pan of %s pixels',
    delta => {
      const result = panMosaicComposition(centered, 2, tile, {
        x: delta,
        y: delta,
      })
      const rect = getMosaicGeometry(result, 2, tile)
      expectCoverage(rect)
      expect(rect.left).toBe(delta > 0 ? 0 : tile.width - rect.width)
      expect(rect.top).toBe(delta > 0 ? 0 : tile.height - rect.height)
      expect(result.focal.x).toBeGreaterThanOrEqual(0)
      expect(result.focal.x).toBeLessThanOrEqual(1)
      expect(result.focal.y).toBeGreaterThanOrEqual(0)
      expect(result.focal.y).toBeLessThanOrEqual(1)
    },
  )

  it.each([
    centered,
    {
      focal: { x: 0, y: 0 },
      target: { x: 2 / 3, y: 1 / 3 },
      zoom: 2,
    },
  ])(
    'preserves the source point under the zoom pointer, including a clamped starting crop',
    composition => {
      const pointer = { x: 75, y: 60 }
      const before = getMosaicGeometry(composition, 2, tile)
      const result = zoomMosaicComposition(composition, 2, tile, 4, pointer)
      const after = getMosaicGeometry(result, 2, tile)
      expect((pointer.x - after.left) / after.width).toBeCloseTo(
        (pointer.x - before.left) / before.width,
      )
      expect((pointer.y - after.top) / after.height).toBeCloseTo(
        (pointer.y - before.top) / before.height,
      )
      expect(result.target).toEqual(composition.target)
      expectCoverage(after)
    },
  )

  it('bounds zoom at 1–20 and lets coverage take precedence when zooming out near an edge', () => {
    const edge = panMosaicComposition(centered, 2, tile, { x: 10000, y: 10000 })
    const minimum = zoomMosaicComposition(edge, 2, tile, -5, { x: 290, y: 190 })
    const maximum = zoomMosaicComposition(centered, 2, tile, 100, {
      x: 150,
      y: 100,
    })
    expect(minimum.zoom).toBe(1)
    expect(maximum.zoom).toBe(20)
    expectCoverage(getMosaicGeometry(minimum, 2, tile))
    expectCoverage(getMosaicGeometry(maximum, 2, tile))
    expect(getMosaicGeometry(minimum, 2, tile).left).toBe(0)
    expect(getMosaicGeometry({ ...centered, zoom: 0 }, 2, tile).width).toBe(400)
    expect(getMosaicGeometry({ ...centered, zoom: 21 }, 2, tile).width).toBe(
      8000,
    )
  })

  it('handles a temporarily unmeasurable tile without invalid focal coordinates', () => {
    const hidden = { width: 0, height: 0 }
    expect(panMosaicComposition(centered, 2, hidden, { x: 10, y: 10 })).toEqual(
      centered,
    )
    expect(
      zoomMosaicComposition(centered, 2, hidden, 4, { x: 0, y: 0 }),
    ).toEqual(centered)
  })
})

describe('mosaic composition configuration and export', () => {
  it('retains the approved landscape crops as shared defaults', () => {
    const gridCss = readFileSync('components/mosaic/Mosaic.module.css', 'utf8')
    expect(gridCss).toMatch(
      /\.grid \{[^}]*box-sizing: border-box;[^}]*flex: 1;[^}]*min-height: 0;[^}]*padding: var\(--mosaic-gap\);[^}]*gap: var\(--mosaic-gap\);/,
    )
    // Current authored grid: centered demo videos, retained Toolbox/NextPhrase crops,
    // and the three additional projects. Tuple: focal x/y, zoom, target x/y.
    const expected: Record<string, number[]> = {
      'about-portrait': [0.5, 0.5, 1, 0.5, 0.5],
      'loopio-before-after': [0.5, 0.5, 1, 0.5, 0.5],
      'freshbooks-before-after': [0.5, 0.5, 1, 0.5, 0.5],
      'cycles-scrollthrough': [0.333328823465743, 1 / 3, 1, 1 / 3, 1 / 3],
      'informal-systems-walkthrough': [0.5, 0.5, 1, 0.5, 0.5],
      'aarons-toolbox-overview': [
        0.8376783392368743,
        0.37840649240012547,
        5,
        1 / 3,
        1 / 3,
      ],
      'nextphrase-intro': [
        0.5704938101780288,
        0.2854641964592395,
        2.449784349327658,
        2 / 3,
        1 / 3,
      ],
      'age-scrollthrough': [0.5, 0.5, 1, 0.5, 0.5],
      'radio-app-demo': [0.5, 0.5, 1, 0.5, 0.5],
      'gift-exchanges-demo': [0.5, 0.5, 1, 0.5, 0.5],
    }
    const cyclesIndex = mosaicProjects.findIndex(
      project => project.slug === 'cycles-dot-money',
    )
    expect(cyclesIndex).toBeGreaterThan(-1)
    expect(mosaicProjects[cyclesIndex + 1].slug).toBe('informal-systems')
    expect(
      portfolioSlides.some(project => project.slug === 'cycles-dot-money'),
    ).toBe(false)
    expect(mosaicProjects).toHaveLength(Object.keys(expected).length)
    expect(
      mosaicProjects.find(project => project.id === 'about-me')?.media[0],
    ).toMatchObject({
      id: 'about-portrait',
      src: '/portfolio/about/portrait-away.webp',
      width: 1600,
      height: 1600,
      video: false,
    })
    for (const project of mosaicProjects) {
      const [x, y, zoom, targetX, targetY] = expected[project.media[0].id]
      expect(project.composition).toEqual({
        focal: { x, y },
        target: { x: targetX, y: targetY },
        zoom,
      })
    }
    const exported = JSON.parse(serializeMosaicCompositions(mosaicProjects))
    expect(exported.schemaVersion).toBe(6)
    expect(Object.keys(exported.cells).sort()).toEqual(
      Object.keys(expected).sort(),
    )
    for (const project of mosaicProjects) {
      expect(exported.cells[project.media[0].id]).toEqual({
        composition: project.composition,
        ...(project.media[0].segments
          ? { segments: project.media[0].segments }
          : {}),
      })
    }
  })

  it('exports every project’s copy by stable ID alongside its first-media crop', () => {
    const edited = mosaicProjects.map((project, index) =>
      index
        ? project
        : {
            ...project,
            title: 'A "candid" title — hello 👋',
            summary: '',
            longSummary: 'First paragraph.\n\nAnother paragraph with "quotes".',
            blurbPosition: {
              vertical: 'top' as const,
              horizontal: 'right' as const,
            },
            composition: {
              focal: { x: 0.21, y: 0.36 },
              target: { x: 0.5, y: 0.7 },
              zoom: 8,
            },
          },
    )
    const serialized = serializeMosaicCompositions(edited)
    const exported = JSON.parse(serialized)
    expect(Object.keys(exported)).toEqual([
      'schemaVersion',
      'cells',
      'projects',
    ])
    expect(exported.schemaVersion).toBe(6)
    expect(Object.keys(exported.projects)).toEqual(
      edited.map(project => project.id),
    )
    expect(Object.keys(exported.cells)).toEqual(
      edited.map(project => project.media[0].id),
    )
    for (const project of edited) {
      expect(exported.cells[project.media[0].id]).toEqual({
        composition: project.composition,
        ...(project.media[0].segments
          ? { segments: project.media[0].segments }
          : {}),
      })
      expect(exported.projects[project.id]).toEqual({
        title: project.title,
        summary: project.summary,
        longSummary: project.longSummary ?? '',
        blurbPosition: project.blurbPosition ?? {
          vertical: 'bottom',
          horizontal: 'left',
        },
      })
      expect(serialized).not.toContain(project.media[0].src)
    }
    expect(serializeMosaicCompositions(edited)).toBe(serialized)
    expect(mosaicProjects[0].title).not.toBe(edited[0].title)
  })

  it('exports ordered video segments with independent fades alongside the shared crop and excludes image segments', () => {
    const video = mosaicProjects.find(
      project => project.slug === 'informal-systems',
    )!
    const originalSegments = structuredClone(video.media[0].segments)
    const image = mosaicProjects.find(project => !project.media[0].video)!
    const editedVideo = {
      ...video,
      media: [
        {
          ...video.media[0],
          segments: [
            { start: 1.2, end: 4.8, fadeIn: true, fadeOut: false },
            { start: 8, end: 9, fadeIn: false, fadeOut: true },
          ],
        },
        ...video.media.slice(1),
      ],
    }
    const editedImage = {
      ...image,
      media: [
        {
          ...image.media[0],
          segments: [{ start: 1, end: 2, fadeIn: false, fadeOut: false }],
        },
        ...image.media.slice(1),
      ],
    }
    const exported = JSON.parse(
      serializeMosaicCompositions([editedVideo, editedImage]),
    )
    expect(exported.cells[video.media[0].id]).toEqual({
      composition: video.composition,
      segments: [
        { start: 1.2, end: 4.8, fadeIn: true, fadeOut: false },
        { start: 8, end: 9, fadeIn: false, fadeOut: true },
      ],
    })
    expect(exported.cells[image.media[0].id]).toEqual({
      composition: image.composition,
    })
    expect(editedVideo.composition).toBe(video.composition)
    expect(video.media[0].segments).toEqual(originalSegments)
  })

  it('exports authored excerpts with speeds and leaves unsegmented covers full-length', () => {
    const exported = JSON.parse(serializeMosaicCompositions(mosaicProjects))
    const expectedRanges: Record<string, number[][]> = {
      'loopio-before-after': [
        [0, 0.9009, 1],
        [0.9009, 4.170833, 2],
      ],
      'freshbooks-before-after': [
        [0, 0.967633, 1],
        [0.967633, 12.228883, 2],
      ],
      'informal-systems-walkthrough': [[0, 21.905217, 3]],
      'aarons-toolbox-overview': [[0.5, 1.75, 1]],
      'nextphrase-intro': [[0, 4.5, 1]],
      'gift-exchanges-demo': [[1.16, 8.89, 1]],
      'cycles-scrollthrough': [[2.99, 35.41, 5]],
      'age-scrollthrough': [[0, 9.125783, 3]],
      'radio-app-demo': [
        [0, 0.967633, 1],
        [10.51, 17.63, 2],
        [58.26, 61.027632999999994, 2],
      ],
    }
    for (const project of mosaicProjects) {
      const media = project.media[0]
      const ranges = expectedRanges[media.id]
      if (ranges) {
        expect(
          media.segments?.map(segment => [
            segment.start,
            segment.end,
            segment.speed ?? 1,
          ]),
        ).toEqual(ranges)
        expect(exported.cells[media.id].segments).toEqual(media.segments)
        for (const segment of media.segments!) {
          expect(validateMosaicLoop(segment, ranges.at(-1)![1])).toBeNull()
        }
      } else {
        expect(media.segments).toBeUndefined()
        expect(exported.cells[media.id]).not.toHaveProperty('segments')
      }
    }
  })
})

describe('video loop validation', () => {
  it('accepts exact duration boundaries and fractional second ranges', () => {
    expect(validateMosaicLoop({ start: 0, end: 59.101 }, 59.101)).toBeNull()
    expect(validateMosaicLoop({ start: 1.2, end: 4.8 }, 59.101)).toBeNull()
  })

  it.each([NaN, Infinity, -Infinity, 0, -1])(
    'requires a finite positive metadata duration (%s)',
    duration => {
      expect(validateMosaicLoop({ start: 0, end: 1 }, duration)).toBe(
        'Wait for the video duration before setting a loop.',
      )
    },
  )

  it.each([
    { start: NaN, end: 5 },
    { start: 0, end: NaN },
    { start: Infinity, end: 5 },
    { start: 0, end: Infinity },
    { start: -0.1, end: 5 },
    { start: 5, end: 5 },
    { start: 6, end: 5 },
    { start: 0, end: 10.01 },
  ])('rejects an invalid range without mutating it: %j', loop => {
    const previous = { ...loop }
    expect(validateMosaicLoop(loop, 10)).not.toBeNull()
    expect(loop).toEqual(previous)
  })
})
