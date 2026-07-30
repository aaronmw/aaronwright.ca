import { describe, expect, it, vi } from 'vitest'
import {
  NAVIGATION_RING_STROKE,
  TrackedNavigationController,
  getColorForPosition,
  getCoordinateForPosition,
  getNavigationRingRadius,
  getNavigationScale,
  getPositionForCoordinate,
} from '../../components/portfolio/navigation/navigationMotion'

describe('navigation geometry', () => {
  it('interpolates and clamps logical positions', () => {
    const centers = [10, 40, 100]

    expect(getCoordinateForPosition(centers, -1)).toBe(10)
    expect(getCoordinateForPosition(centers, 0.5)).toBe(25)
    expect(getCoordinateForPosition(centers, 1.5)).toBe(70)
    expect(getCoordinateForPosition(centers, 4)).toBe(100)

    expect(getPositionForCoordinate(centers, 0)).toBe(0)
    expect(getPositionForCoordinate(centers, 25)).toBe(0.5)
    expect(getPositionForCoordinate(centers, 70)).toBe(1.5)
    expect(getPositionForCoordinate(centers, 120)).toBe(2)
  })

  it('interpolates adjacent HSL colors over the shortest hue path', () => {
    expect(
      getColorForPosition(['hsl(342 78% 54%)', 'hsl(54 78% 54%)'], 0.5),
    ).toBe('hsla(18,78%,54%,1)')
  })

  it('keeps active scale and outer ring diameter stable', () => {
    expect(getNavigationScale(2, 2)).toBe(1.1)
    expect(getNavigationScale(1, 2)).toBe(1)
    expect(
      getNavigationRingRadius(1, NAVIGATION_RING_STROKE) * 2 +
        NAVIGATION_RING_STROKE,
    ).toBe(44)
  })
})

describe('TrackedNavigationController', () => {
  it('moves between source-linked, pointer, snap, and pinned modes', () => {
    const render = vi.fn()
    const controller = new TrackedNavigationController({
      geometry: {
        centers: [20, 60, 100],
        colors: ['hsl(0 80% 50%)', 'hsl(120 80% 50%)', 'hsl(240 80% 50%)'],
      },
      activeIndex: 0,
      reducedMotion: true,
      onRender: render,
    })

    expect(render.mock.lastCall?.[0]).toMatchObject({
      coordinate: 20,
      mode: 'source-linked',
      position: 0,
    })

    controller.engagePointer(58)
    expect(render.mock.lastCall?.[0]).toMatchObject({
      coordinate: 60,
      mode: 'snap',
      snappedIndex: 1,
      strokeWidth: 4,
    })

    controller.trackPointer(78)
    expect(render.mock.lastCall?.[0]).toMatchObject({
      coordinate: 78,
      mode: 'pointer-follow',
      snappedIndex: null,
    })

    controller.pin(2)
    expect(render.mock.lastCall?.[0]).toMatchObject({
      activeIndex: 2,
      coordinate: 100,
      mode: 'pinned',
      strokeWidth: 4,
    })

    controller.completePin(2)
    expect(render.mock.lastCall?.[0]).toMatchObject({
      activeIndex: 2,
      coordinate: 78,
      mode: 'pointer-follow',
    })

    controller.destroy()
  })

  it('queues release until the full press animation completes', async () => {
    const render = vi.fn()
    const controller = new TrackedNavigationController({
      geometry: { centers: [20], colors: ['white'] },
      activeIndex: 0,
      reducedMotion: true,
      onRender: render,
    })

    controller.press(0)
    controller.release(0)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(render.mock.lastCall?.[0]).toMatchObject({
      pressScale: 1,
      pressedIndex: null,
    })

    controller.destroy()
  })
})
