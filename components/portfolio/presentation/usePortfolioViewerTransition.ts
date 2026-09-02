'use client'

import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'
import type { ControllerRef } from 'yet-another-react-lightbox'
import type {
  PortfolioViewerSlide,
  ViewerOpenIntent,
  ViewerSourceRect,
} from '../domain/viewer'

type ZoomController = {
  zoom: number
  minZoom: number
  maxZoom: number
  offsetX: number
  offsetY: number
  disabled: boolean
  zoomIn: () => void
  zoomOut: () => void
  changeZoom: (
    targetZoom: number,
    rapid?: boolean,
    dx?: number,
    dy?: number,
  ) => void
}

function getViewerRoot() {
  return document.querySelector<HTMLElement>('.portfolio-viewer')
}

function getBrowserChrome() {
  return document.querySelector<HTMLElement>('[data-portfolio-browser-chrome]')
}

function getMediaBackdrop() {
  return document.querySelector<HTMLElement>('[data-portfolio-media-backdrop]')
}

function getUnderlyingNavigationCenter() {
  const navigation = document.querySelector<HTMLElement>(
    '[data-portfolio-underlying-horizontal-navigation] [data-portfolio-slide-indicators]',
  )
  if (!navigation) return null
  const rect = navigation.getBoundingClientRect()
  return rect.left + rect.width / 2
}

function findMediaFrame(node: ParentNode) {
  return node.querySelector<HTMLElement>('[data-portfolio-media-frame]')
}

function getVisibleSourceMediaRect(mediaId: string) {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-portfolio-screenshot-id="${CSS.escape(mediaId)}"][data-portfolio-viewer-source="active"]`,
    ),
  )
  let bestRect: ViewerSourceRect | null = null
  let bestArea = 0

  for (const node of nodes) {
    const frame = findMediaFrame(node)
    const rect = (frame ?? node).getBoundingClientRect()
    const visibleWidth = Math.max(
      0,
      Math.min(rect.left + rect.width, window.innerWidth) -
        Math.max(rect.left, 0),
    )
    const visibleHeight = Math.max(
      0,
      Math.min(rect.top + rect.height, window.innerHeight) -
        Math.max(rect.top, 0),
    )
    const area = visibleWidth * visibleHeight
    if (area > bestArea) {
      bestRect = rect
      bestArea = area
    }
  }

  return bestRect
}

function getViewerMedia(mediaId: string) {
  const stage = document.querySelector<HTMLElement>(
    `.yarl__slide_current [data-portfolio-viewer-stage="${CSS.escape(mediaId)}"]`,
  )
  return stage ? findMediaFrame(stage) : null
}

function getMediaTransform(from: ViewerSourceRect, media: HTMLElement) {
  const mediaRect = media.getBoundingClientRect()
  const scale = Math.min(
    from.width / mediaRect.width,
    from.height / mediaRect.height,
  )
  return {
    x: from.left - mediaRect.left,
    y: from.top - mediaRect.top,
    scale,
  }
}

export function usePortfolioViewerTransition({
  index,
  intent,
  slides,
  onClose,
  onView,
}: {
  index: number
  intent: ViewerOpenIntent
  slides: PortfolioViewerSlide[]
  onClose: () => void
  onView: (index: number) => void
}) {
  const controllerRef = useRef<ControllerRef>(null)
  const zoomRef = useRef<ZoomController>(null)
  const activeIndexRef = useRef(index)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const openFrameRef = useRef<number | null>(null)
  const closeFrameRef = useRef<number | null>(null)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening')

  useEffect(() => {
    return () => {
      const root = getViewerRoot()
      const chrome = getBrowserChrome()
      const backdrop = getMediaBackdrop()
      timelineRef.current?.kill()
      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current)
      }
      if (closeFrameRef.current !== null) {
        window.cancelAnimationFrame(closeFrameRef.current)
      }
      if (root) gsap.killTweensOf(root)
      if (chrome) gsap.set(chrome, { clearProps: 'opacity,willChange' })
      if (backdrop) {
        gsap.killTweensOf(backdrop)
        gsap.set(backdrop, { clearProps: 'transform,willChange' })
      }
    }
  }, [])

  function applyInitialZoom() {
    const initialScale = Math.min(4, Math.max(1, intent.initialPinchScale ?? 1))
    if (initialScale <= 1) return
    const focalPoint = intent.focalPoint
    zoomRef.current?.changeZoom(
      initialScale,
      true,
      focalPoint ? focalPoint.x - window.innerWidth / 2 : 0,
      focalPoint ? focalPoint.y - window.innerHeight / 2 : 0,
    )
  }

  function animateOpenNow() {
    const root = getViewerRoot()
    if (!root) return
    const chrome = getBrowserChrome()
    const backdrop = getMediaBackdrop()
    const controls = root.querySelector<HTMLElement>(
      '[data-portfolio-viewer-controls]',
    )
    const navigation = root.querySelector<HTMLElement>(
      '[data-portfolio-viewer-slide-navigation]',
    )
    const media = getViewerMedia(intent.mediaId)
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const sourceRect =
      getVisibleSourceMediaRect(intent.mediaId) ?? intent.sourceRect
    const destinationRect = media?.getBoundingClientRect() ?? null
    const backdropRect = backdrop?.getBoundingClientRect()
    const backdropX = backdropRect
      ? window.innerWidth / 2 - (backdropRect.left + backdropRect.width / 2)
      : 0

    timelineRef.current?.kill()
    gsap.set(root, { opacity: 1 })
    if (controls) gsap.set(controls, { opacity: 0 })
    if (navigation) gsap.set(navigation, { opacity: 0 })
    if (chrome) gsap.set(chrome, { willChange: 'opacity' })
    if (backdrop) gsap.set(backdrop, { willChange: 'transform' })

    const timeline = gsap.timeline({
      onComplete: () => {
        if (chrome) gsap.set(chrome, { clearProps: 'willChange' })
        if (backdrop) gsap.set(backdrop, { clearProps: 'willChange' })
        if (media) {
          gsap.set(media, {
            clearProps: 'transform,transformOrigin,willChange',
          })
        }
        if (navigation) {
          gsap.set(navigation, {
            clearProps: 'opacity,transform,willChange',
          })
        }
        setPhase('open')
      },
    })
    timelineRef.current = timeline

    if (reducedMotion || !media || !sourceRect || !destinationRect) {
      if (backdrop) timeline.set(backdrop, { x: backdropX }, 0)
      if (media) gsap.set(media, { opacity: 0 })
      if (chrome) timeline.to(chrome, { opacity: 0, duration: 0.12 }, 0)
      if (media) timeline.to(media, { opacity: 1, duration: 0.12 }, 0)
      if (navigation) {
        timeline.to(navigation, { opacity: 1, duration: 0.12 }, 0)
      }
      timeline.call(applyInitialZoom, [], 0.12)
      if (controls) timeline.to(controls, { opacity: 1, duration: 0.1 }, 0.14)
      return
    }

    gsap.set(media, {
      ...getMediaTransform(sourceRect, media),
      opacity: 1,
      transformOrigin: '0 0',
      willChange: 'transform',
    })
    if (chrome) {
      timeline.to(chrome, { opacity: 0, duration: 0.24, ease: 'power2.out' }, 0)
    }
    if (backdrop) {
      timeline.to(
        backdrop,
        { x: backdropX, duration: 0.36, ease: 'power3.inOut' },
        0,
      )
    }
    if (navigation) {
      const sourceCenter = getUnderlyingNavigationCenter()
      gsap.set(navigation, {
        x: sourceCenter === null ? 0 : sourceCenter - window.innerWidth / 2,
        opacity: 1,
        willChange: 'transform',
      })
      timeline.to(navigation, { x: 0, duration: 0.36, ease: 'power3.inOut' }, 0)
    }
    timeline.to(
      media,
      { x: 0, y: 0, scale: 1, duration: 0.36, ease: 'power3.inOut' },
      0,
    )
    timeline.call(applyInitialZoom)
    if (controls) {
      timeline.to(controls, { opacity: 1, duration: 0.14, ease: 'power2.out' })
    }
  }

  function animateOpen() {
    let attempts = 0
    const beginWhenReady = () => {
      const media = getViewerMedia(intent.mediaId)
      if (!media && attempts < 4) {
        attempts += 1
        openFrameRef.current = window.requestAnimationFrame(beginWhenReady)
        return
      }
      openFrameRef.current = null
      animateOpenNow()
    }
    openFrameRef.current = window.requestAnimationFrame(beginWhenReady)
  }

  function requestClose() {
    if (phase === 'closing') return
    setPhase('closing')
    const root = getViewerRoot()
    const backdrop = getMediaBackdrop()
    const currentSlide = slides[activeIndexRef.current]
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!root) {
      onClose()
      return
    }

    timelineRef.current?.kill()
    const controls = root.querySelector<HTMLElement>(
      '[data-portfolio-viewer-controls]',
    )
    const navigation = root.querySelector<HTMLElement>(
      '[data-portfolio-viewer-slide-navigation]',
    )
    const beginImageClose = () => {
      zoomRef.current?.changeZoom(1, true)
      closeFrameRef.current = window.requestAnimationFrame(() => {
        closeFrameRef.current = null
        const chrome = getBrowserChrome()
        const media = currentSlide ? getViewerMedia(currentSlide.id) : null
        const targetRect = currentSlide
          ? getVisibleSourceMediaRect(currentSlide.id)
          : intent.sourceRect
        const sourceRect = media?.getBoundingClientRect() ?? null
        const timeline = gsap.timeline({
          onComplete: () => {
            if (chrome) gsap.set(chrome, { clearProps: 'opacity,willChange' })
            onClose()
          },
        })
        timelineRef.current = timeline

        if (chrome) gsap.set(chrome, { willChange: 'opacity' })
        if (backdrop) gsap.set(backdrop, { willChange: 'transform' })

        if (reducedMotion || !media || !sourceRect || !targetRect) {
          if (backdrop) timeline.set(backdrop, { x: 0 }, 0)
          if (media) timeline.to(media, { opacity: 0, duration: 0.12 }, 0)
          if (chrome) timeline.to(chrome, { opacity: 1, duration: 0.12 }, 0)
          return
        }

        gsap.set(media, { transformOrigin: '0 0', willChange: 'transform' })
        timeline.to(
          media,
          {
            ...getMediaTransform(targetRect, media),
            duration: 0.36,
            ease: 'power3.inOut',
          },
          0,
        )
        if (backdrop) {
          timeline.to(
            backdrop,
            { x: 0, duration: 0.36, ease: 'power3.inOut' },
            0,
          )
        }
        if (chrome) {
          timeline.to(
            chrome,
            { opacity: 1, duration: 0.24, ease: 'power2.in' },
            0.12,
          )
        }
      })
    }

    const controlsTimeline = gsap.timeline()
    timelineRef.current = controlsTimeline
    if (controls) {
      controlsTimeline.to(controls, {
        opacity: 0,
        duration: reducedMotion ? 0.08 : 0.12,
        ease: 'power2.in',
      })
    }
    if (navigation) {
      const targetCenter = getUnderlyingNavigationCenter()
      if (reducedMotion) {
        controlsTimeline.to(
          navigation,
          { opacity: 0, duration: 0.08, ease: 'power2.in' },
          0,
        )
      } else {
        controlsTimeline.to(
          navigation,
          {
            x: targetCenter === null ? 0 : targetCenter - window.innerWidth / 2,
            duration: 0.36,
            ease: 'power3.inOut',
          },
          0,
        )
      }
    }
    beginImageClose()
  }

  function handleView(nextIndex: number) {
    activeIndexRef.current = nextIndex
    zoomRef.current?.changeZoom(1, true)
    onView(nextIndex)
  }

  return {
    animateOpen,
    controllerRef,
    handleView,
    phase,
    requestClose,
    zoomRef,
  }
}
