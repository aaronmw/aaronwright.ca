import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MosaicEntranceInk } from '@/components/mosaic/MosaicEntranceInk'
import type { useMosaicEntrance } from '@/components/mosaic/useMosaicEntrance'
import { afterEach, expect, it, vi } from 'vitest'
vi.hoisted(() => {
  vi.stubGlobal('window', {})
})
import { gsap } from '@/components/mosaic/motion'
import { motionInk } from './mosaicMotionFixture'
afterEach(() => {
  gsap.globalTimeline.clear()
  gsap.ticker.sleep()
})
import { createMosaicEntranceGroup } from '@/components/mosaic/playMosaicEntrance'
import { mosaicCornerPaths, mosaicEntrance } from '@/components/mosaic/entrance'
import { packProjects, type PackingApproach } from '@/components/mosaic/packing'
import { mosaicProjects } from '@/lib/mosaic'

it('sweeps clockwise from the facing edge above the logo, nearest first on a ray', () => {
  const boxes = [
    { index: 0, left: 20, top: -70, width: 70, height: 50 }, // northeast
    { index: 1, left: -200, top: -40, width: 210, height: 30 }, // above, centre is far left
    { index: 2, left: -10, top: 15, width: 30, height: 70 }, // south
    { index: 3, left: 15, top: -10, width: 70, height: 30 }, // east
    { index: 4, left: -60, top: -10, width: 45, height: 30 }, // west
    { index: 5, left: -10, top: -100, width: 30, height: 40 }, // farther north
  ]
  const result = mosaicEntrance(boxes, { x: 0, y: 0, size: 10 })
  const order = boxes
    .map(box => box.index)
    .sort((a, b) => result[a].order - result[b].order)
  expect(order).toEqual([1, 5, 0, 3, 2, 4])
  expect(
    mosaicEntrance([...boxes].reverse(), { x: 0, y: 0, size: 10 }),
  ).toEqual(result)
})

it('starts every rectangle at the logo centre with a single-logo-pixel square', () => {
  const boxes = [
    { index: 0, left: 20, top: 40, width: 400, height: 200 },
    { index: 1, left: 550, top: 610, width: 170, height: 300 },
  ]
  const origin = { x: 500, y: 600, size: 30 }
  const result = mosaicEntrance(boxes, origin)
  for (const box of boxes) {
    const entry = result[box.index]
    expect(box.left + box.width / 2 + entry.x).toBe(origin.x)
    expect(box.top + box.height / 2 + entry.y).toBe(origin.y)
    const points = pathPoints(mosaicCornerPaths(entry, [0, 1, 2, 3])[0])
    expect(points[1][0] - points[0][0]).toBeCloseTo(origin.size / 5)
    expect(points[2][1] - points[1][1]).toBeCloseTo(origin.size / 5)
    expect((points[0][0] + points[2][0]) / 2).toBeCloseTo(box.width / 2)
    expect((points[0][1] + points[2][1]) / 2).toBeCloseTo(box.height / 2)
  }
})

function pathPoints(path: string) {
  const coordinates = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  return Array.from({ length: 4 }, (_, index) =>
    coordinates.slice(index * 2, index * 2 + 2),
  )
}

function permutations(values: number[]): number[][] {
  return values.length === 0
    ? [[]]
    : values.flatMap(value =>
        permutations(values.filter(candidate => candidate !== value)).map(
          rest => [value, ...rest],
        ),
      )
}

it('moves only the chosen corner in all 24 orders and ends at the exact rectangle', () => {
  for (const [width, height, pixel] of [
    [400, 200, 6],
    [170.5, 310.25, 4],
  ]) {
    const targets = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ]
    for (const order of permutations([0, 1, 2, 3])) {
      const paths = mosaicCornerPaths({ width, height, pixel }, order)
      expect(paths).toHaveLength(5)
      const states = paths.map(pathPoints)
      for (let step = 0; step < 4; step++) {
        for (let corner = 0; corner < 4; corner++) {
          expect(states[step + 1][corner]).toEqual(
            corner === order[step] ? targets[corner] : states[step][corner],
          )
        }
      }
      expect(states[4]).toEqual(targets)
      // Each independently stroked edge follows the same two polygon vertices.
      for (let edge = 0; edge < 4; edge++) {
        const edgePaths = mosaicCornerPaths(
          { width, height, pixel },
          order,
          edge,
        )
        for (let step = 0; step < 5; step++) {
          expect(pathPoints(edgePaths[step]).slice(0, 2)).toEqual([
            states[step][edge],
            states[step][(edge + 1) % 4],
          ])
        }
      }
      // Same commands and winding let the browser interpolate without a path jump.
      expect(
        new Set(paths.map(path => path.match(/[MLZ]/g)!.join(''))),
      ).toEqual(new Set(['MLLLZ']))
    }
  }
})

for (const approach of ['justified', 'rectangles'] as PackingApproach[]) {
  it(`${approach} launches its top framing project first with one rank per project`, () => {
    const ratios = mosaicProjects.map(
      project => project.media[0].width / project.media[0].height,
    )
    const reserved = { left: 855, top: 455, width: 90, height: 90 }
    for (const seed of [1, 42, 939]) {
      const { boxes } = packProjects(
        ratios,
        1800,
        1000,
        30,
        { approach, seed },
        reserved,
      )
      const entries = mosaicEntrance(boxes, { x: 900, y: 500, size: 30 })
      const first = boxes.find(box => entries[box.index].order === 0)!
      expect(first.top + first.height).toBeCloseTo(reserved.top)
      expect(first.left).toBeLessThanOrEqual(900)
      expect(first.left + first.width).toBeGreaterThanOrEqual(900)
      expect(
        Object.values(entries)
          .map(entry => entry.order)
          .sort((a, b) => a - b),
      ).toEqual(boxes.map((_, i) => i))
    }
  })
}

it('waits for geometry, holds after the last corners, and gates media after every fill', () => {
  const group = createMosaicEntranceGroup(3)
  const members = [0, 1, 2].map(order => ({
    ink: motionInk(),
    sequence: {
      order,
      x: 80,
      y: 50,
      width: 400,
      height: 200,
      pixel: 6,
    },
    complete: vi.fn(),
  }))
  const stops = members
    .slice(0, 2)
    .map((member, i) => group.register(String(i), member))
  expect(group.timeline).toBeNull()
  stops.push(group.register('2', members[2]))
  const timeline = group.timeline!.pause()
  expect(timeline.labels['corners-complete']).toBeCloseTo(1)
  expect(timeline.labels['hold-complete']).toBeCloseTo(1.5)
  expect(timeline.duration()).toBeCloseTo(1.76)
  timeline.seek('corners-complete')
  for (const member of members) {
    expect(member.ink.shape.getAttribute('d')).toBe(
      'M 0 0 L 400 0 L 400 200 L 0 200 Z',
    )
    expect(Number(member.ink.stroke.getAttribute('stroke-width'))).toBe(12)
    expect(Number(member.ink.paint.getAttribute('fill-opacity'))).toBe(0)
  }
  timeline.time(timeline.duration() - 0.001, false)
  members.forEach(member => expect(member.complete).not.toHaveBeenCalled())
  timeline.progress(1, false)
  members.forEach(member => {
    expect(member.complete).toHaveBeenCalledOnce()
    expect(Number(member.ink.stroke.getAttribute('stroke-width'))).toBe(12)
    expect(Number(member.ink.paint.getAttribute('fill-opacity'))).toBe(1)
  })
  stops.forEach(stop => stop())
  expect(group.timeline).toBeNull()
})

it('keeps random fill order across setup cleanup and permits internal seek/speed controls', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.4)
  const group = createMosaicEntranceGroup(1)
  const member = {
    ink: motionInk(),
    sequence: {
      order: 0,
      x: 80,
      y: 50,
      width: 400,
      height: 200,
      pixel: 6,
    },
    complete: vi.fn(),
  }
  const unregister = group.register('tile', member)
  const old = group.timeline!
  old.pause().timeScale(0.2).seek(0.5)
  expect(old.paused()).toBe(true)
  expect(old.timeScale()).toBe(0.2)
  unregister()
  expect(member.complete).not.toHaveBeenCalled()
  const stop = group.register('tile', member)
  expect(random).toHaveBeenCalledOnce()
  group.timeline!.pause().seek(0.65 + 0.045)
  expect(member.ink.shape.getAttribute('d')).toBe(
    'M 197 97 L 203 97 L 400 200 L 197 103 Z',
  )
  group.settle()
  group.settle()
  expect(member.complete).toHaveBeenCalledOnce()
  stop()
})

it('settles members that arrive after reduced motion or resize has skipped the sequence', () => {
  const group = createMosaicEntranceGroup(2)
  group.settle()
  const complete = vi.fn()
  const stop = group.register('late', {
    ink: motionInk(),
    complete,
    sequence: {
      order: 0,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      pixel: 6,
    },
  })
  expect(group.timeline).toBeNull()
  expect(complete).toHaveBeenCalledOnce()
  stop()
})

it('retains the red ink after arrival until the project has covered it', () => {
  const geometry = { order: 0, x: 0, y: 0, width: 400, height: 200, pixel: 6 }
  const entry: ReturnType<typeof useMosaicEntrance> = {
    arrived: true,
    phase: 'arrived',
    bindings: {
      svg: { current: null },
      shape: { current: null },
      origin: { current: null },
      travel: { current: null },
      paint: { current: null },
      stroke: { current: null },
      edges: Array.from({ length: 4 }, () => ({ current: null })),
    },
    sequence: geometry,
  }
  const visible = renderToStaticMarkup(
    createElement(MosaicEntranceInk, { entry, covered: false }),
  )
  expect(visible).toContain('<svg')
  expect(visible).toContain('<clipPath')
  expect(visible).not.toContain('<animate')
  expect(
    renderToStaticMarkup(
      createElement(MosaicEntranceInk, { entry, covered: true }),
    ),
  ).toBe('')
})
