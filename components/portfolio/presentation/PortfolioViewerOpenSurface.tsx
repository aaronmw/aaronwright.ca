'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createTouchDoubleTapRecognizer } from '../domain/touchDoubleTap'
import {
  beginTouchPinch,
  createTrackpadPinchState,
  updateTouchPinch,
  updateTrackpadPinch,
  type TouchPinchState,
  type TouchPoint,
} from '../domain/viewerOpenIntent'
import type {
  ViewerActivationKind,
  ViewerOpenIntent,
  ViewerPoint,
} from '../domain/viewer'

function snapshotSourceRect(node: HTMLElement) {
  const rect = node.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function touchPoints(touches: TouchList): TouchPoint[] {
  return Array.from(touches).map(touch => ({
    identifier: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
  }))
}

export function PortfolioViewerOpenSurface({
  active,
  screenshotId,
  concealed,
  className,
  style,
  children,
  onOpen,
}: {
  active: boolean
  screenshotId: string
  concealed: boolean
  className: string
  style?: CSSProperties
  children: ReactNode
  onOpen: (intent: ViewerOpenIntent) => void
}) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [doubleTapRecognizer] = useState(createTouchDoubleTapRecognizer)
  const touchPinchRef = useRef<TouchPinchState | null>(null)
  const [trackpadPinchState] = useState(createTrackpadPinchState)
  const lastTouchAtRef = useRef(-1)

  function openViewer(
    activationKind: ViewerActivationKind,
    focalPoint?: ViewerPoint,
    initialPinchScale?: number,
  ) {
    const surface = surfaceRef.current
    if (!active || !surface) return
    const sourceAspectRatio = Number(
      surface.querySelector<HTMLElement>('[data-portfolio-media-frame]')
        ?.style.getPropertyValue('--portfolio-media-aspect-ratio'),
    )
    onOpen({
      mediaId: screenshotId,
      sourceRect: snapshotSourceRect(surface),
      sourceAspectRatio: sourceAspectRatio > 0 ? sourceAspectRatio : undefined,
      activationKind,
      focalPoint,
      initialPinchScale,
    })
  }

  const openViewerFromEffect = useEffectEvent(openViewer)

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    const handleTouchStart = (event: TouchEvent) => {
      lastTouchAtRef.current = performance.now()
      const points = touchPoints(event.touches)

      if (points.length >= 2) {
        doubleTapRecognizer.reset()
        touchPinchRef.current = beginTouchPinch(points)
        return
      }

      touchPinchRef.current = null
      if (points.length === 1) {
        doubleTapRecognizer.start(
          {
            identifier: points[0].identifier,
            clientX: points[0].x,
            clientY: points[0].y,
          },
          performance.now(),
        )
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const points = touchPoints(event.touches)
      doubleTapRecognizer.move(
        points.map(point => ({
          identifier: point.identifier,
          clientX: point.x,
          clientY: point.y,
        })),
      )

      const opening = updateTouchPinch(touchPinchRef.current, points)
      if (!opening) return
      event.preventDefault()
      event.stopPropagation()
      openViewerFromEffect(
        'touch-pinch',
        opening.focalPoint,
        Math.min(4, opening.initialPinchScale),
      )
    }

    const handleTouchEnd = (event: TouchEvent) => {
      lastTouchAtRef.current = performance.now()
      if (event.touches.length < 2) touchPinchRef.current = null

      const doubleTapPoint = doubleTapRecognizer.end(
        Array.from(event.changedTouches).map(touch => ({
          identifier: touch.identifier,
          clientX: touch.clientX,
          clientY: touch.clientY,
        })),
        performance.now(),
      )
      if (!doubleTapPoint) return
      event.preventDefault()
      event.stopPropagation()
      openViewerFromEffect(
        'double-tap',
        { x: doubleTapPoint.clientX, y: doubleTapPoint.clientY },
        2,
      )
    }

    const handleTouchCancel = () => {
      touchPinchRef.current = null
      doubleTapRecognizer.reset()
    }

    const handleWheel = (event: WheelEvent) => {
      const opened = updateTrackpadPinch(trackpadPinchState, {
        ctrlKey: event.ctrlKey,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        timeStamp: performance.now(),
      })
      if (event.ctrlKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
        event.preventDefault()
        event.stopPropagation()
      }
      if (!opened) return
      openViewerFromEffect(
        'trackpad-pinch',
        { x: event.clientX, y: event.clientY },
        1.25,
      )
    }

    const listenerOptions: AddEventListenerOptions = { passive: false }
    surface.addEventListener('touchstart', handleTouchStart, listenerOptions)
    surface.addEventListener('touchmove', handleTouchMove, listenerOptions)
    surface.addEventListener('touchend', handleTouchEnd, listenerOptions)
    surface.addEventListener('touchcancel', handleTouchCancel, listenerOptions)
    surface.addEventListener('wheel', handleWheel, listenerOptions)

    return () => {
      surface.removeEventListener('touchstart', handleTouchStart)
      surface.removeEventListener('touchmove', handleTouchMove)
      surface.removeEventListener('touchend', handleTouchEnd)
      surface.removeEventListener('touchcancel', handleTouchCancel)
      surface.removeEventListener('wheel', handleWheel)
    }
  }, [doubleTapRecognizer, trackpadPinchState])

  return (
    <div
      ref={surfaceRef}
      data-portfolio-screenshot-id={screenshotId}
      data-portfolio-viewer-source={active ? 'active' : undefined}
      className={`relative overflow-hidden bg-[var(--portfolio-surface)] ${className} ${
        concealed ? 'invisible' : ''
      }`}
      style={{ ...style, touchAction: 'pan-x pan-y' }}
      onDoubleClick={event => {
        if (performance.now() - lastTouchAtRef.current <= 500 || !active) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        openViewer('double-click', { x: event.clientX, y: event.clientY })
      }}
    >
      <div className="pointer-events-none absolute inset-0 select-none">
        {children}
      </div>
    </div>
  )
}
