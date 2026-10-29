import { gsap, mosaicEase, seconds } from './motion'
import {
  mosaicCornerPaths,
  MOSAIC_ENTRANCE_TIMING,
  MOSAIC_ENTRANCE_FILL_OPACITY,
} from './entrance'

/** One corner-order policy for project entrances and notes, with no caller override. */
export const rectangleMotionSettings: {
  cornerOrder: 'clockwise' | 'counter-clockwise' | 'random'
} = { cornerOrder: 'clockwise' }

export type RectangleInkElements = {
  svg: SVGSVGElement
  origin: SVGGElement
  travel: SVGGElement
  shape: SVGPathElement
  paint: SVGUseElement
  stroke: SVGGElement
  edges: SVGPathElement[]
}

export function rectangleInk(elements: Partial<RectangleInkElements>) {
  return elements.svg &&
    elements.origin &&
    elements.travel &&
    elements.shape &&
    elements.paint &&
    elements.stroke &&
    elements.edges?.length === 4 &&
    [0, 1, 2, 3].every(index => elements.edges?.[index])
    ? (elements as RectangleInkElements)
    : null
}

export type RectangleGeometry = {
  width: number
  height: number
  pixel: number
  center?: { x: number; y: number }
  /** Launch point relative to the final rectangle; defaults to the seed centre. */
  origin?: { x: number; y: number }
}

export function rectangleCornerOrder(geometry: RectangleGeometry) {
  const order = [0, 1, 2, 3]
  if (rectangleMotionSettings.cornerOrder === 'random') {
    for (let index = order.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[order[index], order[swap]] = [order[swap], order[index]]
    }
    return order
  }
  const { width, height } = geometry
  const { x, y } = geometry.origin ??
    geometry.center ?? { x: width / 2, y: height / 2 }
  const distances = [
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(width - x, height - y),
    Math.hypot(x, height - y),
  ]
  const first = distances.indexOf(Math.min(...distances))
  const direction = rectangleMotionSettings.cornerOrder === 'clockwise' ? 1 : -1
  return order.map(step => (first + direction * step + 4) % 4)
}

export function rectanglePaths(geometry: RectangleGeometry) {
  const order = rectangleCornerOrder(geometry)
  return [
    mosaicCornerPaths(geometry, order),
    ...[0, 1, 2, 3].map(edge => mosaicCornerPaths(geometry, order, edge)),
  ]
}

export function setRectanglePath(
  ink: RectangleInkElements,
  paths: string[][],
  step: number,
) {
  ;[ink.shape, ...ink.edges].forEach((target, index) => {
    gsap.set(target, { attr: { d: paths[index][step] } })
  })
}

/** Shared four-corner choreography. Keep the stroke until content covers the ink. */
export function createRectangleTimeline(
  ink: RectangleInkElements,
  geometry: RectangleGeometry,
  fillDelay = 0,
) {
  const paths = rectanglePaths(geometry)
  const targets = [ink.shape, ...ink.edges]
  const duration = seconds(MOSAIC_ENTRANCE_TIMING.corners)
  const timeline = gsap.timeline({ paused: true })
  setRectanglePath(ink, paths, 0)
  gsap.set(ink.paint, { attr: { 'fill-opacity': 0 } })
  gsap.set(ink.stroke, { attr: { 'stroke-width': geometry.pixel * 2 } })
  timeline.addLabel('pixel', 0)
  for (let step = 1; step <= 4; step++) {
    const at = ((step - 1) * duration) / 4
    timeline.addLabel(`corner-${step}`, at)
    targets.forEach((target, index) =>
      timeline.fromTo(
        target,
        { attr: { d: paths[index][step - 1] } },
        {
          attr: { d: paths[index][step] },
          duration: duration / 4,
          ease: mosaicEase.corners,
          immediateRender: false,
        },
        at,
      ),
    )
  }
  timeline.addLabel('outline', duration)
  timeline.addLabel('fill', duration + fillDelay)
  timeline.fromTo(
    ink.paint,
    { attr: { 'fill-opacity': 0 } },
    {
      attr: { 'fill-opacity': MOSAIC_ENTRANCE_FILL_OPACITY },
      duration: seconds(MOSAIC_ENTRANCE_TIMING.fill),
      ease: 'none',
      immediateRender: false,
    },
    'fill',
  )
  timeline.addLabel('filled')
  return timeline
}
