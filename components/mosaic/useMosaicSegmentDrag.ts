import { useRef, type PointerEvent, type KeyboardEvent } from 'react'
import type { MosaicSegment } from './types'
import { translateSegment } from './segmentEditing'

type Drag = {
  pointer: number
  x: number
  secondsPerPixel: number
  index: number
  segments: MosaicSegment[]
}

export function useMosaicSegmentDrag({
  segments,
  duration,
  disabled,
  select,
  change,
}: {
  segments: MosaicSegment[]
  duration: number
  disabled: boolean
  select: (index: number) => void
  change: (segments: MosaicSegment[], index: number) => void
}) {
  const drag = useRef<Drag | null>(null)
  function start(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (disabled || event.button !== 0) return
    const width =
      event.currentTarget.parentElement!.getBoundingClientRect().width
    if (!width) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      secondsPerPixel: duration / width,
      index,
      segments,
    }
    select(index)
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active || disabled || active.pointer !== event.pointerId) return
    const delta = (event.clientX - active.x) * active.secondsPerPixel
    const moved = translateSegment(
      active.segments,
      active.index,
      duration,
      delta,
    )
    const current = segments[active.index]
    if (current.start === moved.start && current.end === moved.end) return
    change(
      active.segments.map((segment, i) =>
        i === active.index ? moved : segment,
      ),
      active.index,
    )
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointer !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    const delta =
      (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : 0.1)
    const moved = translateSegment(segments, index, duration, delta)
    change(
      segments.map((segment, i) => (i === index ? moved : segment)),
      index,
    )
  }
  return { start, move, end, key }
}
