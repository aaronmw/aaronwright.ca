import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PortfolioScreenshot } from '@/lib/portfolio'
import {
  INLINE_MEDIA_RESET_EVENT,
  INLINE_MEDIA_ZOOM_IN_EVENT,
} from '@/components/portfolio/useInlineMediaZoom'

export function resetInlineMediaZoom() {
  document
    .querySelectorAll<HTMLElement>('[data-portfolio-inline-zoomed="true"]')
    .forEach(surface => {
      surface.dispatchEvent(new Event(INLINE_MEDIA_RESET_EVENT))
    })
}

export function zoomVisibleInlineMediaIn() {
  const surfaces = Array.from(
    document.querySelectorAll<HTMLElement>('[data-portfolio-inline-zoomed]'),
  )
  let visibleSurface: HTMLElement | null = null
  let largestVisibleArea = 0

  for (const surface of surfaces) {
    if (surface.closest('article')?.getAttribute('aria-hidden') === 'true') {
      continue
    }

    const rect = surface.getBoundingClientRect()
    const visibleWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight)

    if (visibleArea > largestVisibleArea) {
      largestVisibleArea = visibleArea
      visibleSurface = surface
    }
  }

  if (!visibleSurface) {
    return false
  }

  visibleSurface.dispatchEvent(new Event(INLINE_MEDIA_ZOOM_IN_EVENT))
  return true
}

export function useInlineZoomPresentation({
  activeProjectIndex,
  activeScreenshot,
}: {
  activeProjectIndex: number
  activeScreenshot?: PortfolioScreenshot
}) {
  const handoffScreenshotIdRef = useRef<string | null>(null)
  const [screenshotId, setScreenshotId] = useState<string | null>(null)

  const handlePresentationChange = (
    nextScreenshotId: string,
    presented: boolean,
  ) => {
    setScreenshotId(currentId =>
      presented
        ? nextScreenshotId
        : handoffScreenshotIdRef.current
          ? currentId
          : currentId === nextScreenshotId
            ? null
            : currentId,
    )
  }

  const exitPresentation = () => {
    handoffScreenshotIdRef.current = null
    resetInlineMediaZoom()
  }

  useLayoutEffect(() => {
    const handoffScreenshotId = handoffScreenshotIdRef.current

    if (!handoffScreenshotId || activeScreenshot?.id !== handoffScreenshotId) {
      return
    }

    const frame = requestAnimationFrame(() => {
      if (zoomVisibleInlineMediaIn()) {
        handoffScreenshotIdRef.current = null
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [activeScreenshot])

  useEffect(() => {
    handoffScreenshotIdRef.current = null
  }, [activeProjectIndex])

  return {
    exitPresentation,
    handoffScreenshotIdRef,
    handlePresentationChange,
    isPresentationActive: screenshotId !== null,
    screenshotId,
  }
}
