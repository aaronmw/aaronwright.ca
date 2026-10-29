import { useId, useMemo, useRef, useCallback } from 'react'
import { rectangleInk } from './rectangleMotion'

const emptyPath = 'M 0 0 L 0 0 L 0 0 L 0 0 Z'

export function useMosaicRectangleRefs() {
  const svg = useRef<SVGSVGElement>(null)
  const shape = useRef<SVGPathElement>(null)
  const origin = useRef<SVGGElement>(null)
  const travel = useRef<SVGGElement>(null)
  const paint = useRef<SVGUseElement>(null)
  const stroke = useRef<SVGGElement>(null)
  const edge0 = useRef<SVGPathElement>(null)
  const edge1 = useRef<SVGPathElement>(null)
  const edge2 = useRef<SVGPathElement>(null)
  const edge3 = useRef<SVGPathElement>(null)
  const bindings = useMemo(
    () => ({
      svg,
      shape,
      origin,
      travel,
      paint,
      stroke,
      edges: [edge0, edge1, edge2, edge3],
    }),
    [],
  )
  const readInk = useCallback(
    () =>
      rectangleInk({
        svg: svg.current ?? undefined,
        shape: shape.current ?? undefined,
        origin: origin.current ?? undefined,
        travel: travel.current ?? undefined,
        paint: paint.current ?? undefined,
        stroke: stroke.current ?? undefined,
        edges: [
          edge0.current,
          edge1.current,
          edge2.current,
          edge3.current,
        ] as SVGPathElement[],
      }),
    [],
  )
  return { readInk, bindings }
}
export type MosaicRectangleRefs = ReturnType<
  typeof useMosaicRectangleRefs
>['bindings']

/** One clipped, inside-stroked SVG surface for grid entrances and project blurbs. */
export function MosaicRectangleInk({
  svg: svgRef,
  shape: shapeRef,
  origin: originRef,
  travel: travelRef,
  paint: paintRef,
  stroke: strokeRef,
  edges,
  className,
  viewBox,
}: MosaicRectangleRefs & {
  className: string
  viewBox?: string
}) {
  const id = `mosaic-ink-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={viewBox}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path
          id={id}
          d={emptyPath}
          ref={shapeRef}
        />
        <clipPath
          id={`${id}-clip`}
          clipPathUnits="userSpaceOnUse"
        >
          <use href={`#${id}`} />
        </clipPath>
      </defs>
      <g ref={originRef}>
        <g ref={travelRef}>
          <use
            href={`#${id}`}
            fill="var(--portfolio-accent-decoration)"
            fillOpacity={0}
            ref={paintRef}
          />
          <g
            clipPath={`url(#${id}-clip)`}
            fill="none"
            stroke="var(--portfolio-accent-decoration)"
            strokeLinecap="square"
            ref={strokeRef}
          >
            {[0, 1, 2, 3].map(index => (
              <path
                key={index}
                d="M 0 0 L 0 0"
                vectorEffect="non-scaling-stroke"
                ref={edges[index]}
              />
            ))}
          </g>
        </g>
      </g>
    </svg>
  )
}
