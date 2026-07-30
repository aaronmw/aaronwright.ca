'use client'

import {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { gsap } from 'gsap'
import {
  NavigationRenderState,
  TrackedNavigationController,
} from './navigationMotion'
import {
  getLongestDelay,
  getNavigationRingRadius,
  getNavigationScale,
  getOutsideInDelay,
  getSlideCenters,
  getSlideLatticeCoordinate,
  getSlideSlotIds,
} from './navigationGeometry'
import {
  NAVIGATION_DOT_RADIUS,
  NAVIGATION_RETURN_DELAY,
  NAVIGATION_RING_STROKE,
  NAVIGATION_SLIDE_STEP,
  NAVIGATION_SVG_CENTER,
  NAVIGATION_SVG_SIZE,
} from './navigationTokens'
import {
  SlideNavigationView,
  type SlideNavigationViewActions,
} from './SlideNavigationView'
import type {
  SlideIndicatorMotionController,
  SlideNavigationItem,
} from './slideNavigationTypes'

export type {
  SlideIndicatorMotionController,
  SlideNavigationItem,
} from './slideNavigationTypes'

const INDICATOR_TRANSITION_MS = 500
const SVG_HEIGHT = NAVIGATION_SVG_SIZE
const SVG_CENTER_Y = NAVIGATION_SVG_CENTER

type IndicatorTransitionState = {
  previousCount: number
  targetCount: number
  phase: 'idle' | 'preparing' | 'fading' | 'settling'
}

type MotionTargetState = {
  index: number
  itemsIdentity: string
  sourceIndex: number
}

export function SlideNavigation({
  controllerRef,
  items,
  activeIndex,
  pendingIndex,
  color,
  onSelect,
}: {
  controllerRef: MutableRefObject<SlideIndicatorMotionController | null>
  items: SlideNavigationItem[]
  activeIndex: number
  pendingIndex: number | null
  color: string
  onSelect: (index: number) => void
}) {
  const visibleItems = items.length > 1 ? items : []
  const targetCount = visibleItems.length
  const boundedActiveIndex = Math.max(
    0,
    Math.min(activeIndex, Math.max(targetCount - 1, 0)),
  )
  const itemsIdentity = visibleItems.map(item => item.id).join('|')
  const previousCountRef = useRef(targetCount)
  const transitionFrameRef = useRef<number | null>(null)
  const transitionStartFrameRef = useRef<number | null>(null)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const svgRef = useRef<SVGSVGElement | null>(null)
  const ringRef = useRef<SVGEllipseElement | null>(null)
  const latticeRef = useRef<SVGGElement | null>(null)
  const dotRefs = useRef(new Map<number, SVGCircleElement>())
  const slotRefs = useRef(new Map<number, SVGGElement>())
  const pointerFrameRef = useRef<number | null>(null)
  const pendingPointerXRef = useRef<number | null>(null)
  const pointerPinnedIndexRef = useRef<number | null>(null)
  const controllerInstanceRef = useRef<TrackedNavigationController | null>(null)
  const targetCountRef = useRef(targetCount)
  const boundedActiveIndexRef = useRef(boundedActiveIndex)
  const itemsIdentityRef = useRef(itemsIdentity)
  const [motionTarget, setMotionTarget] = useState<MotionTargetState | null>(
    null,
  )
  const [transitionState, setTransitionState] =
    useState<IndicatorTransitionState>({
      previousCount: targetCount,
      targetCount,
      phase: 'idle',
    })
  const surfaceCount =
    transitionState.phase === 'idle'
      ? transitionState.targetCount
      : Math.max(transitionState.previousCount, transitionState.targetCount)
  const surfaceWidth = Math.max(surfaceCount, 1) * NAVIGATION_SLIDE_STEP
  const targetWidth = Math.max(targetCount, 1) * NAVIGATION_SLIDE_STEP
  const surfaceLeft = (targetWidth - surfaceWidth) / 2
  const previousSlotIds = getSlideSlotIds(
    transitionState.phase === 'idle'
      ? transitionState.targetCount
      : transitionState.previousCount,
  )
  const targetSlotIds = getSlideSlotIds(transitionState.targetCount)
  const renderedSlotIds =
    transitionState.phase === 'idle'
      ? targetSlotIds
      : Array.from(new Set([...previousSlotIds, ...targetSlotIds])).sort(
          (a, b) => a - b,
        )
  const geometryCount =
    transitionState.phase === 'preparing'
      ? transitionState.previousCount
      : transitionState.targetCount
  const centers = useMemo(
    () => getSlideCenters(geometryCount, surfaceWidth),
    [geometryCount, surfaceWidth],
  )
  const initialCentersRef = useRef(centers)
  const initialColorRef = useRef(color)
  const visualActiveIndex =
    motionTarget?.itemsIdentity === itemsIdentity &&
    motionTarget.sourceIndex === boundedActiveIndex
      ? motionTarget.index
      : boundedActiveIndex
  useLayoutEffect(() => {
    targetCountRef.current = targetCount
    boundedActiveIndexRef.current = boundedActiveIndex
    itemsIdentityRef.current = itemsIdentity
  }, [boundedActiveIndex, itemsIdentity, targetCount])

  const renderNavigation = useCallback((state: NavigationRenderState) => {
    const ring = ringRef.current

    if (ring) {
      const ringPressScale = state.pressedIndex !== null ? state.pressScale : 1
      const radius = getNavigationRingRadius(
        state.ringScale * ringPressScale,
        state.strokeWidth,
      )

      ring.setAttribute(
        'cx',
        String(state.coordinate + radius * state.ringAxisOffset),
      )
      ring.setAttribute('cy', String(SVG_CENTER_Y))
      ring.setAttribute('rx', String(radius * state.ringAxisScale))
      ring.setAttribute('ry', String(radius * state.ringCrossAxisScale))
      ring.setAttribute('stroke', state.color)
      ring.setAttribute('stroke-width', String(state.strokeWidth))
      ring.setAttribute('opacity', targetCountRef.current > 0 ? '1' : '0')
      ring.dataset.navigationMode = state.mode
      ring.dataset.navigationPosition = String(state.position)
      ring.dataset.navigationCoordinate = String(state.coordinate)
    }

    dotRefs.current.forEach((dot, itemIndex) => {
      const activeScale =
        itemIndex === state.activeIndex
          ? getNavigationScale(state.position, state.activeIndex)
          : 1
      const pressScale = state.pressedIndex === itemIndex ? state.pressScale : 1

      dot.setAttribute(
        'r',
        String(NAVIGATION_DOT_RADIUS * activeScale * pressScale),
      )
    })
  }, [])

  useLayoutEffect(() => {
    const controller = new TrackedNavigationController({
      geometry: {
        centers: initialCentersRef.current,
        colors: Array(targetCountRef.current).fill(initialColorRef.current),
      },
      activeIndex: boundedActiveIndexRef.current,
      sourcePosition: boundedActiveIndexRef.current,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
      returnDelay: NAVIGATION_RETURN_DELAY,
      onRender: renderNavigation,
    })
    controllerInstanceRef.current = controller

    const motionController: SlideIndicatorMotionController = {
      begin: targetIndex => {
        setMotionTarget({
          index: targetIndex,
          itemsIdentity: itemsIdentityRef.current,
          sourceIndex: boundedActiveIndexRef.current,
        })
        if (pointerPinnedIndexRef.current !== targetIndex) {
          controller.pin(targetIndex, true)
        }
      },
      update: position => controller.setSourcePosition(position, true),
      complete: targetIndex => {
        pointerPinnedIndexRef.current = null
        controller.completePin(targetIndex)
      },
      cancel: () => {
        setMotionTarget(null)
        pointerPinnedIndexRef.current = null
        controller.cancelPin()
      },
    }
    controllerRef.current = motionController

    return () => {
      if (controllerRef.current === motionController) {
        controllerRef.current = null
      }
      controller.destroy()
      controllerInstanceRef.current = null
    }
  }, [controllerRef, renderNavigation])

  useLayoutEffect(() => {
    const controller = controllerInstanceRef.current

    if (!controller) {
      return
    }

    controller.updateGeometry(
      { centers, colors: Array(targetCount).fill(color) },
      transitionState.phase !== 'fading',
      INDICATOR_TRANSITION_MS / 1000,
    )
    controller.setActiveIndex(boundedActiveIndex)
    controller.setSourcePosition(boundedActiveIndex, false)
  }, [boundedActiveIndex, centers, color, targetCount, transitionState.phase])

  useEffect(() => {
    const controller = controllerInstanceRef.current

    if (!controller) {
      return
    }

    controller.releasePointer(false)
    pointerPinnedIndexRef.current = null
  }, [itemsIdentity])

  useLayoutEffect(() => {
    const previousCount = previousCountRef.current

    if (previousCount === targetCount) {
      return
    }

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current)
    }
    if (transitionStartFrameRef.current !== null) {
      cancelAnimationFrame(transitionStartFrameRef.current)
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }

    previousCountRef.current = targetCount
    setTransitionState({ previousCount, targetCount, phase: 'preparing' })
    transitionFrameRef.current = requestAnimationFrame(() => {
      transitionStartFrameRef.current = requestAnimationFrame(() => {
        transitionFrameRef.current = null
        transitionStartFrameRef.current = null
        setTransitionState({ previousCount, targetCount, phase: 'fading' })

        const longestStagger = Math.max(
          getLongestDelay(previousCount, getOutsideInDelay),
          getLongestDelay(targetCount, getOutsideInDelay),
        )

        transitionTimeoutRef.current = setTimeout(() => {
          setTransitionState({ previousCount, targetCount, phase: 'settling' })
          transitionTimeoutRef.current = setTimeout(() => {
            transitionTimeoutRef.current = null
            setTransitionState({
              previousCount: targetCount,
              targetCount,
              phase: 'idle',
            })
          }, INDICATOR_TRANSITION_MS)
        }, INDICATOR_TRANSITION_MS + longestStagger)
      })
    })
  }, [targetCount])

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const lattice = latticeRef.current
    const previousLatticeCoordinate = getSlideLatticeCoordinate(
      transitionState.previousCount,
      surfaceWidth,
    )
    const targetLatticeCoordinate = getSlideLatticeCoordinate(
      transitionState.targetCount,
      surfaceWidth,
    )

    if (lattice) {
      if (transitionState.phase === 'preparing') {
        gsap.set(lattice, {
          attr: {
            transform: `translate(${previousLatticeCoordinate} 0)`,
          },
        })
      } else if (transitionState.phase === 'fading') {
        gsap.to(lattice, {
          attr: { transform: `translate(${targetLatticeCoordinate} 0)` },
          duration: reducedMotion ? 0 : INDICATOR_TRANSITION_MS / 1000,
          ease: 'expo.out',
          overwrite: 'auto',
        })
      } else if (transitionState.phase === 'idle') {
        gsap.set(lattice, {
          attr: { transform: `translate(${targetLatticeCoordinate} 0)` },
        })
      }
    }

    renderedSlotIds.forEach(slotId => {
      const group = slotRefs.current.get(slotId)
      const previousIndex = previousSlotIds.indexOf(slotId)
      const targetIndex = targetSlotIds.indexOf(slotId)
      const isEntering = previousIndex < 0 && targetIndex >= 0
      const isExiting = previousIndex >= 0 && targetIndex < 0

      if (!group) {
        return
      }

      if (transitionState.phase === 'preparing') {
        gsap.set(group, {
          opacity: previousIndex >= 0 ? 1 : 0,
        })
        return
      }

      if (transitionState.phase === 'fading') {
        const delay =
          (isEntering
            ? getOutsideInDelay(targetIndex, transitionState.targetCount)
            : isExiting
              ? getOutsideInDelay(previousIndex, transitionState.previousCount)
              : 0) / 1000

        gsap.to(group, {
          opacity: targetIndex >= 0 ? 1 : 0,
          delay: reducedMotion ? 0 : delay,
          duration: reducedMotion ? 0 : INDICATOR_TRANSITION_MS / 1000,
          ease: 'expo.out',
          overwrite: 'auto',
        })
        return
      }

      if (transitionState.phase === 'idle') {
        gsap.set(group, {
          opacity: 1,
        })
      }
    })
  }, [
    previousSlotIds,
    renderedSlotIds,
    surfaceWidth,
    targetSlotIds,
    transitionState,
  ])

  useEffect(
    () => () => {
      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current)
      }
      if (transitionStartFrameRef.current !== null) {
        cancelAnimationFrame(transitionStartFrameRef.current)
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current)
      }
    },
    [],
  )

  const getLocalPointerX = (clientX: number) => {
    const svg = svgRef.current

    return svg ? clientX - svg.getBoundingClientRect().left : clientX
  }

  const schedulePointerTracking = (clientX: number) => {
    pendingPointerXRef.current = clientX

    if (pointerFrameRef.current !== null) {
      return
    }

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null
      const pointerX = pendingPointerXRef.current

      if (pointerX !== null) {
        controllerInstanceRef.current?.trackPointer(getLocalPointerX(pointerX))
      }
    })
  }

  const handlePointerRelease = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    controllerInstanceRef.current?.release(index)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const viewActions: SlideNavigationViewActions = {
    onPointerMove: event => {
      if (event.pointerType !== 'touch') {
        schedulePointerTracking(event.clientX)
      }
    },
    onPointerLeave: event => {
      if (event.pointerType !== 'touch') {
        controllerInstanceRef.current?.releasePointer(true)
      }
    },
    onPointerEnter: (_index, event) => {
      if (event.pointerType === 'touch') {
        return
      }

      const localX = getLocalPointerX(event.clientX)
      const controller = controllerInstanceRef.current

      if (controller?.isPointerArmed()) {
        controller.trackPointer(localX)
      } else {
        controller?.engagePointer(localX)
      }
    },
    onPointerDown: (index, event) => {
      if (event.pointerType === 'touch') {
        controllerInstanceRef.current?.releasePointer(false)
      }

      event.currentTarget.setPointerCapture?.(event.pointerId)
      pointerPinnedIndexRef.current = index
      controllerInstanceRef.current?.pin(index)
      controllerInstanceRef.current?.press(index)
    },
    onPointerRelease: (index, event) => {
      handlePointerRelease(event, index)
    },
    onKeyDown: (index, key, code, repeat) => {
      if (!repeat && (key === 'Enter' || code === 'Space')) {
        controllerInstanceRef.current?.press(index)
      }
    },
    onKeyUp: (index, key, code) => {
      if (key === 'Enter' || code === 'Space') {
        controllerInstanceRef.current?.release(index)
      }
    },
    onFocus: index => controllerInstanceRef.current?.focus(index),
    onBlur: index => controllerInstanceRef.current?.blur(index),
    onClick: (index, detail) => {
      if (detail === 0) {
        controllerInstanceRef.current?.triggerPress(index)
      }
      onSelect(index)
    },
  }

  return (
    <SlideNavigationView
      actions={viewActions}
      model={{
        activeIndex: boundedActiveIndex,
        items: visibleItems,
        pendingIndex,
        renderedSlotIds,
        surfaceLeft,
        surfaceWidth,
        targetSlotIds,
        targetWidth,
        visualActiveIndex,
      }}
      refs={{
        dotRefs,
        latticeRef,
        ringRef,
        slotRefs,
        svgRef,
      }}
    />
  )
}
