import { afterEach, expect, it, vi } from 'vitest'
vi.hoisted(() => {
  vi.stubGlobal('window', {})
})
import { gsap } from '@/components/mosaic/motion'
import {
  rectangleCornerOrder,
  rectangleMotionSettings,
} from '@/components/mosaic/rectangleMotion'
import {
  blurbMotionGeometry,
  createBlurbTimeline,
} from '@/components/mosaic/blurbMotion'
import { createMosaicEntranceGroup } from '@/components/mosaic/playMosaicEntrance'
import { MOSAIC_ENTRANCE_TIMING } from '@/components/mosaic/entrance'
import { MotionElement, motionInk } from './mosaicMotionFixture'

const configuredOrder = rectangleMotionSettings.cornerOrder
afterEach(() => {
  rectangleMotionSettings.cornerOrder = configuredOrder
  gsap.globalTimeline.clear()
  gsap.ticker.sleep()
})

it.each([
  [{ x: -30, y: -30 }, [0, 1, 2, 3]],
  [{ x: 430, y: -30 }, [1, 2, 3, 0]],
  [{ x: 430, y: 230 }, [2, 3, 0, 1]],
  [{ x: -30, y: 230 }, [3, 0, 1, 2]],
])('starts clockwise at the corner nearest origin %j', (origin, order) => {
  expect(
    rectangleCornerOrder({ width: 400, height: 200, pixel: 6, origin }),
  ).toEqual(order)
})

it.each([
  ['clockwise', [3, 0, 1, 2]],
  ['counter-clockwise', [3, 2, 1, 0]],
  ['random', [2, 0, 3, 1]],
] as const)(
  'applies the shared %s setting to both actual timelines',
  (mode, order) => {
    rectangleMotionSettings.cornerOrder = mode
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    const cell = motionInk(),
      notes = motionInk()
    const group = createMosaicEntranceGroup(1)
    const unregister = group.register('project', {
      ink: cell,
      sequence: {
        order: 0,
        x: -200,
        y: 130,
        width: 400,
        height: 200,
        pixel: 6,
      },
      complete: () => {},
    })
    const panel = new MotionElement({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
    })
    const notesTimeline = createBlurbTimeline(
      notes,
      panel as unknown as HTMLElement,
      blurbMotionGeometry(
        panel.bounds,
        { left: -15, top: 215, width: 30, height: 30 },
        6,
      ),
      'red',
    )
    const cellTimeline = group.timeline!.pause()
    const targets = [
      [0, 0],
      [400, 0],
      [400, 200],
      [0, 200],
    ]
    const points = (path: string | null) => {
      const values = path!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      return targets.map((_, index) => values.slice(index * 2, index * 2 + 2))
    }
    for (let step = 1; step <= 4; step++) {
      const elapsed = ((MOSAIC_ENTRANCE_TIMING.corners / 1000) * step) / 4
      cellTimeline.time(MOSAIC_ENTRANCE_TIMING.travel / 1000 + elapsed)
      notesTimeline.time(notesTimeline.labels.pixel + elapsed)
      for (const ink of [cell, notes]) {
        const corners = points(ink.shape.getAttribute('d'))
        order.forEach((corner, index) => {
          if (index < step || (ink === notes && corner === 3))
            expect(corners[corner]).toEqual(targets[corner])
          else expect(corners[corner]).not.toEqual(targets[corner])
        })
      }
    }
    notesTimeline.progress(1).reverse().pause()
    notesTimeline.time(
      notesTimeline.labels.pixel + MOSAIC_ENTRANCE_TIMING.corners / 2000,
    )
    const reversed = points(notes.shape.getAttribute('d'))
    order.forEach((corner, index) => {
      if (index < 2 || corner === 3)
        expect(reversed[corner]).toEqual(targets[corner])
      else expect(reversed[corner]).not.toEqual(targets[corner])
    })
    unregister()
  },
)
