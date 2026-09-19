'use client'

import { portfolioMotion } from '@/lib/portfolioTokens'
import { useEffect, useRef, useState } from 'react'
import type { ControllerRef } from 'yet-another-react-lightbox'
import { getViewerMediaTransform } from '../domain/viewer'
import type { PortfolioViewerSlide, ViewerOpenIntent } from '../domain/viewer'

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

function getVisibleSourceMedia(mediaId: string) {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-portfolio-screenshot-id="${CSS.escape(mediaId)}"][data-portfolio-viewer-source="active"]`,
    ),
  )
  let bestFrame: HTMLElement | null = null
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
      bestFrame = frame
      bestArea = area
    }
  }

  return bestFrame
}

function getViewerMedia(mediaId: string) {
  const stage = document.querySelector<HTMLElement>(
    `.yarl__slide_current [data-portfolio-viewer-stage="${CSS.escape(mediaId)}"]`,
  )
  return stage ? findMediaFrame(stage) : null
}

type AnimatedStyle = Partial<
  Pick<CSSStyleDeclaration, 'transform' | 'opacity' | 'width' | 'height'>
>
type ViewerAnimation = {
  element: HTMLElement
  animation: Animation
  to: AnimatedStyle
}

const TRANSFORM_EASING = 'cubic-bezier(0.76, 0, 0.24, 1)'
const ENTER_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)'
const EXIT_EASING = 'cubic-bezier(0.32, 0, 0.67, 0)'

function translate(x: number) {
  return `translateX(${x}px)`
}

function mediaTransform(value: ReturnType<typeof getViewerMediaTransform>) {
  return `translate(${value.x}px, ${value.y}px) scale(${value.scaleX}, ${value.scaleY})`
}

function getMediaLayerTransitions(
  media: HTMLElement | null,
  thumbnail: HTMLElement | null,
) {
  if (!media || !thumbnail) return []

  return Array.from(
    media.querySelectorAll<HTMLElement>('[data-portfolio-media-layer]'),
  ).flatMap(element => {
    const target = thumbnail.querySelector<HTMLElement>(
      `[data-portfolio-media-layer="${element.dataset.portfolioMediaLayer}"]`,
    )
    if (!target) return []
    const measured = element.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (!measured.width || !measured.height) return []
    const style = getComputedStyle(element)
    const matrix = new DOMMatrixReadOnly(
      style.transform === 'none' ? undefined : style.transform,
    )
    const transform = getViewerMediaTransform(targetRect, measured, {
      x: matrix.m41,
      y: matrix.m42,
      scaleX: matrix.a,
      scaleY: matrix.d,
    })
    // Resize only the phone outline's SVG viewport, so its non-scaling stroke
    // keeps the same thickness. The image and rectangular frame use transforms.
    const resize = element.hasAttribute('data-portfolio-media-layer-resize')
    const current: AnimatedStyle = {
      transform: style.transform,
      ...(resize ? { width: style.width, height: style.height } : {}),
    }
    const collapsed: AnimatedStyle = {
      transform: resize
        ? `translate(${transform.x}px, ${transform.y}px)`
        : mediaTransform(transform),
      ...(resize
        ? { width: `${targetRect.width}px`, height: `${targetRect.height}px` }
        : {}),
    }
    return [{ element, current, collapsed }]
  })
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
  const notifiedIndexRef = useRef<number | null>(null)
  const animationsRef = useRef<ViewerAnimation[]>([])
  const animationGenerationRef = useRef(0)
  const openFrameRef = useRef<number | null>(null)
  const closeFrameRef = useRef<number | null>(null)
  const closingRef = useRef(false)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening')

  useEffect(() => {
    // A dragged slide can remove the focused media button. Chromium then
    // drops focus onto body, outside the lightbox's keyboard listener.
    // Preserve focus on persistent controls, but recover it when it was lost.
    if (document.activeElement === document.body) controllerRef.current?.focus()
  }, [index])

  function stopAnimations(freeze = false) {
    const animations = animationsRef.current
    // Read every animated value before cancelling or writing styles. A close
    // during opening must start at the image's current position, without a jump.
    const snapshots = freeze
      ? animations.map(({ element, to }) => {
          const style = getComputedStyle(element)
          return {
            element,
            style: Object.fromEntries(
              Object.keys(to).map(property => [
                property,
                style.getPropertyValue(property),
              ]),
            ),
          }
        })
      : []
    animationGenerationRef.current += 1
    animationsRef.current = []
    animations.forEach(({ animation }) => animation.cancel())
    snapshots.forEach(({ element, style }) =>
      Object.assign(element.style, style),
    )
  }

  function animate(
    element: HTMLElement | null,
    from: AnimatedStyle,
    to: AnimatedStyle,
    duration: number,
    easing = TRANSFORM_EASING,
    delay = 0,
  ) {
    if (!element) return null
    // The resting style already matches the final frame when the effect is
    // removed. Image transform/opacity interpolation stays with the compositor.
    Object.assign(element.style, to)
    const animation = element.animate([from, to], {
      duration,
      delay,
      easing,
      fill: 'both',
    })
    animationsRef.current.push({ element, animation, to })
    return animation
  }

  function afterAnimations(animations: Animation[], complete: () => void) {
    const generation = animationGenerationRef.current
    void Promise.all(animations.map(animation => animation.finished)).then(
      () => {
        if (animationGenerationRef.current === generation) complete()
      },
      // Cancelling an interrupted/unmounted transition rejects finished.
      () => {},
    )
  }

  useEffect(() => {
    return () => {
      animationGenerationRef.current += 1
      animationsRef.current.forEach(({ animation }) => animation.cancel())
      animationsRef.current = []
      if (openFrameRef.current !== null)
        cancelAnimationFrame(openFrameRef.current)
      if (closeFrameRef.current !== null)
        cancelAnimationFrame(closeFrameRef.current)
      getBrowserChrome()?.style.removeProperty('opacity')
      getMediaBackdrop()?.style.removeProperty('transform')
    }
  }, [])

  function applyInitialZoom() {
    const zoom = zoomRef.current
    if (!zoom) return
    const initialScale = Math.min(
      zoom.maxZoom,
      Math.max(1, intent.initialPinchScale ?? 1),
    )
    if (initialScale <= 1) return
    const focalPoint = intent.focalPoint
    zoom.changeZoom(
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
    const layers = media?.style.getPropertyValue(
      '--portfolio-media-aspect-ratio',
    )
      ? getMediaLayerTransitions(media, getVisibleSourceMedia(intent.mediaId))
      : []
    const backdropRect = backdrop?.getBoundingClientRect()
    const sourceCenter = navigation ? getUnderlyingNavigationCenter() : null
    const backdropX = backdropRect
      ? window.innerWidth / 2 - (backdropRect.left + backdropRect.width / 2)
      : 0
    const transforms = !reducedMotion && media && layers.length > 0
    const duration = transforms
      ? portfolioMotion.viewerTransform
      : portfolioMotion.viewerFade

    stopAnimations()
    root.style.opacity = '1'
    animate(
      chrome,
      { opacity: '1' },
      { opacity: '0' },
      transforms ? portfolioMotion.viewerChrome : duration,
      ENTER_EASING,
    )
    if (backdrop) {
      if (transforms)
        animate(
          backdrop,
          { transform: translate(0) },
          { transform: translate(backdropX) },
          duration,
        )
      else backdrop.style.transform = translate(backdropX)
    }
    let imageAnimation: Animation | null
    if (transforms) {
      media.style.opacity = '1'
      imageAnimation = null
      for (const { element, current, collapsed } of layers) {
        element.style.transformOrigin = '0 0'
        const animation = animate(element, collapsed, current, duration)
        if (element.dataset.portfolioMediaLayer === 'content')
          imageAnimation = animation
      }
      if (navigation) navigation.style.opacity = '1'
      animate(
        navigation,
        {
          transform: translate(
            sourceCenter === null ? 0 : sourceCenter - window.innerWidth / 2,
          ),
        },
        { transform: translate(0) },
        duration,
      )
    } else {
      imageAnimation = animate(
        media,
        { opacity: '0' },
        { opacity: '1' },
        duration,
      )
      animate(navigation, { opacity: '0' }, { opacity: '1' }, duration)
    }
    if (imageAnimation) afterAnimations([imageAnimation], applyInitialZoom)
    else applyInitialZoom()
    animate(
      controls,
      { opacity: '0' },
      { opacity: '1' },
      transforms
        ? portfolioMotion.viewerControlsEnter
        : portfolioMotion.viewerControlsReducedEnter,
      ENTER_EASING,
      transforms ? duration : portfolioMotion.viewerControlsEnterDelay,
    )
    afterAnimations(
      animationsRef.current.map(({ animation }) => animation),
      () => {
        stopAnimations()
        for (const { element, current } of layers) {
          Object.keys(current).forEach(property =>
            element.style.removeProperty(property),
          )
          element.style.removeProperty('transform-origin')
        }
        navigation?.style.removeProperty('transform')
        setPhase('open')
      },
    )
  }

  function animateOpen() {
    if (closingRef.current) return
    const readyDeadline = performance.now() + 1000
    const beginWhenReady = () => {
      if (closingRef.current) return
      const media = getViewerMedia(intent.mediaId)
      // Metadata must have committed the frame's aspect ratio before measuring it.
      const hasDimensions = media?.style.getPropertyValue(
        '--portfolio-media-aspect-ratio',
      )
      if (!hasDimensions && performance.now() < readyDeadline) {
        openFrameRef.current = requestAnimationFrame(beginWhenReady)
        return
      }
      openFrameRef.current = null
      animateOpenNow()
    }
    openFrameRef.current = requestAnimationFrame(beginWhenReady)
  }

  function requestClose() {
    if (closingRef.current) return
    closingRef.current = true
    if (openFrameRef.current !== null)
      cancelAnimationFrame(openFrameRef.current)
    openFrameRef.current = null
    stopAnimations(true)
    setPhase('closing')
    const root = getViewerRoot()
    if (!root) {
      onClose()
      return
    }
    // Reset an actual zoom/pan, not an already fitted image. The latter used to
    // trigger extra plugin measurement and rendering on every close.
    const zoom = zoomRef.current
    if (zoom && (zoom.zoom !== 1 || zoom.offsetX !== 0 || zoom.offsetY !== 0)) {
      zoom.changeZoom(1, true)
    }
    closeFrameRef.current = requestAnimationFrame(() => {
      closeFrameRef.current = null
      const chrome = getBrowserChrome()
      const backdrop = getMediaBackdrop()
      const currentSlide = slides[activeIndexRef.current]
      const media = currentSlide ? getViewerMedia(currentSlide.id) : null
      const controls = root.querySelector<HTMLElement>(
        '[data-portfolio-viewer-controls]',
      )
      const navigation = root.querySelector<HTMLElement>(
        '[data-portfolio-viewer-slide-navigation]',
      )
      const targetCenter = navigation ? getUnderlyingNavigationCenter() : null
      const layers = getMediaLayerTransitions(
        media,
        currentSlide ? getVisibleSourceMedia(currentSlide.id) : null,
      )
      const readStyle = (element: HTMLElement | null): AnimatedStyle => {
        if (!element) return {}
        const style = getComputedStyle(element)
        return { transform: style.transform, opacity: style.opacity }
      }
      const mediaStyle = readStyle(media)
      const chromeStyle = readStyle(chrome)
      const backdropStyle = readStyle(backdrop)
      const navigationStyle = readStyle(navigation)
      const controlsStyle = readStyle(controls)
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const transforms = !reducedMotion && media && layers.length > 0
      const duration = transforms
        ? portfolioMotion.viewerTransform
        : portfolioMotion.viewerFade

      // All geometry/style reads above precede the first write below.
      animate(
        controls,
        { opacity: controlsStyle.opacity },
        { opacity: '0' },
        reducedMotion
          ? portfolioMotion.viewerControlsReducedExit
          : portfolioMotion.viewerControlsExit,
        EXIT_EASING,
      )
      if (transforms) {
        for (const { element, current, collapsed } of layers) {
          element.style.transformOrigin = '0 0'
          animate(element, current, collapsed, duration)
        }
        animate(
          backdrop,
          { transform: backdropStyle.transform },
          { transform: translate(0) },
          duration,
        )
        animate(
          navigation,
          { transform: navigationStyle.transform },
          {
            transform: translate(
              targetCenter === null ? 0 : targetCenter - window.innerWidth / 2,
            ),
          },
          duration,
        )
      } else {
        if (backdrop) backdrop.style.transform = translate(0)
        animate(
          media,
          { opacity: mediaStyle.opacity },
          { opacity: '0' },
          duration,
        )
        animate(
          navigation,
          { opacity: navigationStyle.opacity },
          { opacity: '0' },
          portfolioMotion.viewerControlsReducedExit,
        )
      }
      animate(
        chrome,
        { opacity: chromeStyle.opacity },
        { opacity: '1' },
        transforms ? portfolioMotion.viewerChrome : duration,
        EXIT_EASING,
        transforms ? portfolioMotion.viewerFade : 0,
      )
      afterAnimations(
        animationsRef.current.map(({ animation }) => animation),
        onClose,
      )
    })
  }

  function handleView(nextIndex: number) {
    if (notifiedIndexRef.current === nextIndex) return
    notifiedIndexRef.current = nextIndex
    if (activeIndexRef.current !== nextIndex)
      zoomRef.current?.changeZoom(1, true)
    activeIndexRef.current = nextIndex
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
