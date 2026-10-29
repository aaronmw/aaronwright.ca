import type { MosaicRect } from './types'

export type MosaicEntranceOrigin = { x: number; y: number; size: number }
export type MosaicTileEntrance = {
  order: number
  x: number
  y: number
  width: number
  height: number
  pixel: number
}

export const MOSAIC_ENTRANCE_TIMING = {
  travel: 650,
  stagger: 85,
  corners: 180,
  hold: 500,
  fill: 90,
} as const

export const MOSAIC_ENTRANCE_EASING = {
  travel: '0.16 1 0.3 1',
  corners: '0.333333 0 0.666667 0.333333',
} as const

export const MOSAIC_ENTRANCE_FILL_OPACITY = 1

/** Fixed winding keeps four-point paths compatible while one corner moves. */
export function mosaicCornerPaths(
  {
    width,
    height,
    pixel,
    center = { x: width / 2, y: height / 2 },
  }: Pick<MosaicTileEntrance, 'width' | 'height' | 'pixel'> & {
    center?: { x: number; y: number }
  },
  order: readonly number[],
  edge?: number,
): string[] {
  const left = center.x - pixel / 2,
    right = center.x + pixel / 2
  const top = center.y - pixel / 2,
    bottom = center.y + pixel / 2
  const points = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ]
  const targets = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ]
  const path = () =>
    edge === undefined
      ? `M ${points.map(point => point.join(' ')).join(' L ')} Z`
      : `M ${points[edge].join(' ')} L ${points[(edge + 1) % 4].join(' ')}`
  return [
    path(),
    ...order.map(corner => {
      points[corner] = targets[corner]
      return path()
    }),
  ]
}

/** Sweep clockwise from twelve o'clock, taking nearer cells first on each ray. */
export function mosaicEntrance(
  boxes: (MosaicRect & { index: number })[],
  origin: MosaicEntranceOrigin,
): Record<number, MosaicTileEntrance> {
  const ordered = boxes
    .map(box => {
      // Use the facing edge, not the centre: the project framing the logo above
      // must lead even when its rectangle extends far off to one side.
      const x =
        Math.max(box.left, Math.min(origin.x, box.left + box.width)) - origin.x
      const y =
        Math.max(box.top, Math.min(origin.y, box.top + box.height)) - origin.y
      const angle = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2)
      return { box, angle, distance: Math.hypot(x, y) }
    })
    .sort((a, b) =>
      Math.abs(a.angle - b.angle) > 1e-6
        ? a.angle - b.angle
        : a.distance - b.distance || a.box.index - b.box.index,
    )
  return Object.fromEntries(
    ordered.map(({ box }, order) => [
      box.index,
      {
        order,
        x: origin.x - box.left - box.width / 2,
        y: origin.y - box.top - box.height / 2,
        width: box.width,
        height: box.height,
        pixel: origin.size / 5,
      },
    ]),
  )
}
