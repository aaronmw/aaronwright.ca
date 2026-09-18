'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEventHandler,
} from 'react'
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

export function usePortfolioViewerOpenSurface({
  active,
  screenshotId,
  onOpen,
}: {
  active: boolean
  screenshotId: string
  onOpen: (intent: ViewerOpenIntent) => void
}) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const touchPinchRef = useRef<TouchPinchState | null>(null)
  const [trackpadPinchState] = useState(createTrackpadPinchState)

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
      const points = touchPoints(event.touches)
      touchPinchRef.current =
        points.length >= 2 ? beginTouchPinch(points) : null
    }

    const handleTouchMove = (event: TouchEvent) => {
      const points = touchPoints(event.touches)
      const opening = updateTouchPinch(touchPinchRef.current, points)
      if (!opening) return
      event.preventDefault()
      event.stopPropagation()
      openViewerFromEffect(
        'touch-pinch',
        opening.focalPoint,
        opening.initialPinchScale,
      )
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) touchPinchRef.current = null
    }

    const handleTouchCancel = () => {
      touchPinchRef.current = null
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
  }, [trackpadPinchState])

  const onClick: MouseEventHandler<HTMLButtonElement> = event =>
    openViewer(
      event.detail === 0 ? 'keyboard' : 'click',
      event.detail === 0
        ? undefined
        : { x: event.clientX, y: event.clientY },
    )

  return { surfaceRef, onClick }
}
