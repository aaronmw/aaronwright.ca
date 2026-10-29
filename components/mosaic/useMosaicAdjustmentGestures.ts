import { useEffect, type RefObject } from 'react'
import { panMosaicComposition, zoomMosaicComposition } from './composition'
import type { MosaicComposition, MosaicProject } from './types'

/** Only the development editor imports this hook. Ordinary framing stays CSS-owned. */
export function useMosaicAdjustmentGestures({
  rootRef,
  projectsRef,
  active,
  composition,
  update,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  projectsRef: RefObject<MosaicProject[]>
  active: boolean
  composition: (project: MosaicProject) => MosaicComposition
  update: (mediaId: string, value: MosaicComposition) => void
}) {
  useEffect(() => {
    const root = rootRef.current
    if (!active || !root) return
    let drag: {
      tile: HTMLButtonElement
      id: number
      x: number
      y: number
      size: { width: number; height: number }
    } | null = null

    function tileFor(target: EventTarget | null) {
      const tile =
        target instanceof Element
          ? target.closest<HTMLButtonElement>('[data-mosaic-project]')
          : null
      return tile &&
        root!.contains(tile) &&
        tile.closest('[data-mosaic-adjusting="true"]')
        ? tile
        : null
    }
    function projectFor(tile: HTMLButtonElement) {
      return projectsRef.current.find(
        project => project.slug === tile.dataset.mosaicProject,
      )!
    }
    function cancelDrag() {
      const previous = drag
      drag = null
      if (!previous) return
      delete previous.tile.dataset.mosaicDragging
      if (previous.tile.hasPointerCapture(previous.id))
        previous.tile.releasePointerCapture(previous.id)
    }
    function down(event: PointerEvent) {
      const tile = tileFor(event.target)
      if (!tile || !event.isPrimary || event.button !== 0 || drag) return
      event.preventDefault()
      tile.focus({ preventScroll: true })
      tile.setPointerCapture(event.pointerId)
      const { width, height } = tile.getBoundingClientRect()
      drag = {
        tile,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        size: { width, height },
      }
      tile.dataset.mosaicDragging = 'true'
    }
    function move(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return
      const project = projectFor(drag.tile)
      const media = project.media[0]
      update(
        media.id,
        panMosaicComposition(
          composition(project),
          media.width / media.height,
          drag.size,
          { x: event.clientX - drag.x, y: event.clientY - drag.y },
        ),
      )
      drag.x = event.clientX
      drag.y = event.clientY
    }
    function end(event: PointerEvent) {
      if (event.pointerId === drag?.id) cancelDrag()
    }
    function wheel(event: WheelEvent) {
      const tile = tileFor(event.target)
      if (!tile || !event.metaKey || drag) return
      event.preventDefault()
      const project = projectFor(tile)
      const media = project.media[0]
      const current = composition(project)
      const rect = tile.getBoundingClientRect()
      const pixels =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1)
      update(
        media.id,
        zoomMosaicComposition(
          current,
          media.width / media.height,
          rect,
          current.zoom * Math.exp(-pixels * 0.002),
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
        ),
      )
    }
    function key(event: KeyboardEvent) {
      const tile = tileFor(event.target)
      if (!tile || event.metaKey || event.ctrlKey || event.altKey || drag)
        return
      const deltas: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -8, y: 0 },
        ArrowRight: { x: 8, y: 0 },
        ArrowUp: { x: 0, y: -8 },
        ArrowDown: { x: 0, y: 8 },
      }
      const delta = deltas[event.key]
      const zoomDirection =
        event.key === '+' || event.key === '=' ? 1 : event.key === '-' ? -1 : 0
      if (!delta && !zoomDirection) return
      event.preventDefault()
      const project = projectFor(tile)
      const media = project.media[0]
      const current = composition(project)
      const rect = tile.getBoundingClientRect()
      const next = delta
        ? panMosaicComposition(current, media.width / media.height, rect, delta)
        : zoomMosaicComposition(
            current,
            media.width / media.height,
            rect,
            current.zoom * Math.pow(1.1, zoomDirection),
            { x: rect.width / 2, y: rect.height / 2 },
          )
      update(media.id, next)
    }
    root.addEventListener('pointerdown', down)
    root.addEventListener('pointermove', move)
    root.addEventListener('pointerup', end)
    root.addEventListener('pointercancel', end)
    root.addEventListener('lostpointercapture', end)
    root.addEventListener('wheel', wheel, { passive: false })
    root.addEventListener('keydown', key)
    window.addEventListener('resize', cancelDrag)
    window.addEventListener('blur', cancelDrag)
    return () => {
      cancelDrag()
      root.removeEventListener('pointerdown', down)
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerup', end)
      root.removeEventListener('pointercancel', end)
      root.removeEventListener('lostpointercapture', end)
      root.removeEventListener('wheel', wheel)
      root.removeEventListener('keydown', key)
      window.removeEventListener('resize', cancelDrag)
      window.removeEventListener('blur', cancelDrag)
    }
  }, [active, projectsRef, rootRef, composition, update])
}
