import { useLayoutEffect, useRef, useState, useCallback } from 'react'
import { createBlurbMotion } from './blurbMotion'
import { useMosaicRectangleRefs } from './MosaicRectangleInk'

export function useMosaicBlurbMotion(visible: boolean, present: boolean) {
  const { readInk, bindings } = useMosaicRectangleRefs()
  const layer = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const control = useRef<HTMLButtonElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const controlRef = useCallback((node: HTMLButtonElement | null) => {
    control.current = node
  }, [])
  const motion = useRef<ReturnType<typeof createBlurbMotion> | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [settledCollapsed, setSettledCollapsed] = useState(false)
  const [animating, setAnimating] = useState(true)
  const requested = useRef(true)
  const appeared = useRef(false)
  useLayoutEffect(() => {
    if (!visible || !present) return
    const nodes = readInk()
    if (
      !nodes ||
      !layer.current ||
      !panel.current ||
      !control.current ||
      !anchor.current
    )
      return
    motion.current = createBlurbMotion(
      {
        ...nodes,
        layer: layer.current,
        panel: panel.current,
        toggle: control.current,
        anchor: anchor.current,
      },
      {
        expanded: requested.current,
        intro: !appeared.current,
        onMoving: () => setAnimating(true),
        onSettled: expanded => {
          appeared.current = true
          setSettledCollapsed(!expanded)
          setAnimating(false)
        },
      },
    )
    return () => {
      motion.current?.dispose()
      motion.current = null
    }
  }, [visible, present, readInk])
  return {
    bindings,
    layer,
    panel,
    control: controlRef,
    anchor,
    collapsed,
    settledCollapsed,
    animating,
    toggle() {
      if (!visible || !motion.current) return
      requested.current = !requested.current
      if (!requested.current && panel.current?.contains(document.activeElement))
        control.current?.focus({ preventScroll: true })
      setCollapsed(!requested.current)
      motion.current.setExpanded(requested.current)
    },
  }
}
