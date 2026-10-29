import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ControllerRef } from 'yet-another-react-lightbox'
import { portfolioMotion } from '@/lib/portfolioTokens'
import { gsap, mosaicEase, seconds } from './motion'
import { createViewerMotion } from './viewerMotion'
import {
  prepareMosaicViewerVideo,
  waitForMosaicViewerVisual,
} from './viewerMedia'
import type { MosaicMedia, MosaicOrigin, MosaicProject } from './types'
import styles from './MosaicViewer.module.css'
import theme from './MosaicTheme.module.css'
import treatment from './mediaTreatment.module.css'
import { capturePortraitCanvas, captureVideoCanvas } from './mediaSnapshot'
import { mediaMask } from './mediaClip'
import {
  hideMosaicSource,
  prepareMosaicReturn,
  releaseMosaicSource,
  restoreMosaicReturnFrame,
} from './sourceVisual'

type Rect = MosaicOrigin['media']
type Visual = HTMLImageElement | HTMLCanvasElement
type TransitionLayer = { layer: HTMLDivElement; image: Visual }
type ViewerMotion = ReturnType<typeof createViewerMotion>

const viewerImageSelector =
  '.yarl__slide_current img.yarl__slide_image, .yarl__slide_current img[data-mosaic-about-portrait]'
export type MosaicViewerProps = {
  project: MosaicProject
  index: number
  open: boolean
  origin: MosaicOrigin | null
  onIndexChange: (index: number) => void
  onRequestClose: () => void
  onOpened?: () => void
  onExited: () => void
}

function fitRect(
  media: MosaicMedia,
  bounds: Rect = { left: 0, top: 0, width: innerWidth, height: innerHeight },
): Rect {
  const scale = Math.min(
    1,
    bounds.width / media.width,
    bounds.height / media.height,
  )
  const width = media.width * scale
  const height = media.height * scale
  return {
    left: bounds.left + (bounds.width - width) / 2,
    top: bounds.top + (bounds.height - height) / 2,
    width,
    height,
  }
}

function destinationRect(viewer: HTMLElement, media: MosaicMedia): Rect {
  const video = media.video
    ? viewer.querySelector<HTMLVideoElement>('.yarl__slide_current video')
    : null
  const videoRect = video?.getBoundingClientRect()
  if (videoRect && videoRect.width > 0 && videoRect.height > 0) return videoRect
  // CSS owns the video inset and About layout. Measure once so the transition
  // lands on the same geometry, even before the video element is ready.
  const target = viewer.querySelector<HTMLElement>(
    media.video
      ? '.yarl__slide_current .yarl__video_container'
      : '.yarl__slide_current [data-mosaic-about-portrait]',
  )
  const rect = target?.getBoundingClientRect()
  if (rect && rect.width > 0 && rect.height > 0)
    return media.video ? fitRect(media, rect) : rect
  return fitRect(media)
}
function rectTransform(from: Rect, to: Rect) {
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`
}
function clipRect(rect: Rect) {
  return `inset(${Math.max(0, rect.top)}px ${Math.max(0, innerWidth - rect.left - rect.width)}px ${Math.max(0, innerHeight - rect.top - rect.height)}px ${Math.max(0, rect.left)}px)`
}
function setRect(image: Visual, rect: Rect) {
  Object.assign(image.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: 'none',
  })
}

export function useMosaicViewerTransition(props: MosaicViewerProps) {
  const { index, open } = props
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const controller = useRef<ControllerRef>(null)
  const transition = useRef<TransitionLayer | null>(null)
  const motion = useRef<ViewerMotion | null>(null)
  const preparation = useRef<AbortController | null>(null)
  const resumeTime = useRef<number | undefined>(undefined)
  const generation = useRef(0)
  const closing = useRef(false)
  const exited = useRef(false)
  const mounted = useRef(true)
  const busy = useRef(true)
  const previousIndex = useRef(index)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening')
  const [reducedMotion, setReducedMotion] = useState(true)

  function root() {
    return document.querySelector<HTMLElement>(`.${styles.root}`)
  }
  function tile() {
    return document.querySelector<HTMLElement>(
      `[data-mosaic-project="${CSS.escape(latest.current.project.slug)}"]`,
    )
  }
  function invalidatePreparation() {
    generation.current += 1
    preparation.current?.abort()
    preparation.current = new AbortController()
  }
  function cancelAnimations() {
    invalidatePreparation()
    const previous = motion.current
    motion.current = null
    previous?.context.revert()
  }
  function removeLayer() {
    transition.current?.layer.remove()
    transition.current = null
  }
  function driveMotion(expanded: boolean) {
    const active = motion.current
    const viewer = root()
    if (!active || !viewer) return false
    invalidatePreparation()
    closing.current = !expanded
    busy.current = true
    setPhase(expanded ? 'opening' : 'closing')
    // During the portrait crossfade both layers must remain visible until the
    // playhead returns to the full-opacity snapshot at the handoff boundary.
    viewer.dataset.mosaicTransitionState = !transition.current
      ? expanded
        ? 'opening-fade'
        : 'closing-fade'
      : active.handoffAt !== null && active.timeline.time() > active.handoffAt
        ? 'revealing'
        : expanded
          ? 'opening'
          : 'closing'
    if (!expanded)
      viewer.querySelectorAll('video').forEach(video => video.pause())
    active.setExpanded(expanded)
    return true
  }
  function tween(
    timeline: gsap.core.Timeline,
    element: HTMLElement,
    from: gsap.TweenVars,
    to: gsap.TweenVars,
    duration: number,
    at = 0,
  ) {
    timeline.fromTo(
      element,
      from,
      {
        ...to,
        duration: seconds(duration),
        ease: mosaicEase.viewer,
        immediateRender: false,
      },
      at,
    )
  }
  async function makeLayer(
    source: string | HTMLCanvasElement,
    rect: Rect,
    media: MosaicMedia,
  ): Promise<TransitionLayer> {
    const layer = document.createElement('div')
    layer.className = `${styles.transition} ${theme.scope} ${treatment.surface}`
    layer.dataset.mosaicTransition = 'true'
    layer.setAttribute('aria-hidden', 'true')
    let image: Visual
    if (typeof source === 'string') {
      image = document.createElement('img')
      image.src = source
      image.alt = ''
      image.draggable = false
      try {
        await image.decode()
      } catch {
        /* YARL provides the media error UI. */
      }
    } else {
      image = document.createElement('canvas')
      image.width = source.width
      image.height = source.height
      image.getContext('2d')?.drawImage(source, 0, 0)
    }
    setRect(image, rect)
    image.classList.add(treatment.masked)
    image.style.setProperty('--mosaic-media-mask', mediaMask(media.clip))
    layer.append(image)
    return { layer, image }
  }
  function installLayer(
    next: TransitionLayer,
    viewer: HTMLElement,
    state: 'opening' | 'closing',
  ) {
    // One synchronous ownership swap: ready pixels replace the whole source.
    removeLayer()
    document.body.append(next.layer)
    transition.current = next
    hideMosaicSource(tile())
    viewer.dataset.mosaicTransitionState = state
  }
  function finishExit() {
    if (exited.current || !mounted.current) return
    exited.current = true
    invalidatePreparation()
    motion.current?.timeline.pause()
    // Keep the last visual until unmount's layout cleanup restores the source.
    latest.current.onExited()
  }
  function valid(token: number) {
    return mounted.current && !exited.current && token === generation.current
  }

  function mediaPreparation(token: number) {
    if (!preparation.current) preparation.current = new AbortController()
    return {
      signal: preparation.current.signal,
      current: () => valid(token) && !closing.current,
    }
  }
  function waitForViewerVisual(viewer: HTMLElement, token: number) {
    return waitForMosaicViewerVisual(viewer, mediaPreparation(token))
  }
  function prepareViewerVideo(video: HTMLVideoElement, token: number) {
    const target =
      latest.current.index === 0
        ? (resumeTime.current ?? latest.current.origin?.videoTime)
        : undefined
    return prepareMosaicViewerVideo(video, {
      ...mediaPreparation(token),
      target,
    })
  }

  async function finishOpen(token: number) {
    if (!valid(token) || closing.current) return
    const viewer = root()
    if (!viewer) return
    if (!motion.current?.handoffBuilt) {
      await waitForViewerVisual(viewer, token)
      if (!valid(token) || closing.current) return
      const image = viewer.querySelector<HTMLImageElement>(viewerImageSelector)
      if (image) {
        try {
          await image.decode()
        } catch {
          /* Native error UI remains available. */
        }
      }
      if (!valid(token) || closing.current) return
      const video = viewer.querySelector<HTMLVideoElement>(
        '.yarl__slide_current video',
      )
      if (video && !matchMedia('(prefers-reduced-motion: reduce)').matches)
        await prepareViewerVideo(video, token)
      if (!valid(token) || closing.current) return
    }
    const active = motion.current
    const portrait =
      latest.current.project.about &&
      transition.current?.image instanceof HTMLCanvasElement
    const copy = viewer.querySelector<HTMLElement>(`.${styles.aboutCopy}`)
    if (
      active &&
      active.opensAtEnd &&
      !active.handoffBuilt &&
      (portrait || copy)
    ) {
      active.handoffBuilt = true
      const at = active.timeline.duration()
      active.handoffAt = at
      // Register deferred tweens with the same context so unmount/reversal can
      // clean them up without cancelling a new session's animation.
      active.context.add(() => {
        active.timeline.addLabel('handoff', at)
        active.timeline.call(
          () => {
            if (motion.current === active)
              viewer.dataset.mosaicTransitionState = closing.current
                ? 'closing'
                : 'revealing'
          },
          [],
          at,
        )
        if (portrait && transition.current)
          tween(
            active.timeline,
            transition.current.layer,
            { opacity: 1 },
            { opacity: 0 },
            portfolioMotion.viewerFade,
            at,
          )
        if (copy)
          active.timeline.fromTo(
            copy,
            { opacity: 0 },
            {
              opacity: 1,
              duration: seconds(portfolioMotion.viewerChrome),
              ease: mosaicEase.fade,
              immediateRender: false,
            },
            at,
          )
        active.timeline.addLabel('open')
      })
      viewer.dataset.mosaicTransitionState = 'revealing'
      active.timeline.play()
      return
    }
    // Only transfer ownership after decode/frame readiness and the handoff fade.
    hideMosaicSource(tile())
    removeLayer()
    cancelAnimations()
    viewer.style.opacity = '1'
    if (copy) copy.style.opacity = '1'
    viewer.dataset.mosaicTransitionState = 'open'
    busy.current = false
    setPhase('open')
    latest.current.onOpened?.()
  }

  function startMotion(
    opensAtEnd: boolean,
    build: (timeline: gsap.core.Timeline) => void,
  ) {
    const active = createViewerMotion(opensAtEnd, build, expanded => {
      if (motion.current !== active || !mounted.current) return
      if (expanded && latest.current.open && !closing.current)
        void finishOpen(generation.current)
      else if (!expanded && !latest.current.open && closing.current)
        finishExit()
    })
    motion.current = active
    active.timeline.play()
  }

  async function beginOpen() {
    if (!mounted.current) return
    if (!latest.current.open) {
      finishExit()
      return
    }
    const viewer = root()
    if (!viewer) return
    if (closing.current && driveMotion(true)) return
    if (
      closing.current &&
      !transition.current &&
      viewer.dataset.mosaicTransitionState === 'open'
    ) {
      // A return snapshot may still be decoding. The live viewer never left its
      // open endpoint, so cancel that obsolete preparation without replaying it.
      cancelAnimations()
      closing.current = false
      busy.current = false
      setPhase('open')
      return
    }
    const { project, index: currentIndex, origin } = latest.current
    const media = project.media[currentIndex]
    const sourceTile = tile()
    const sourceMedia = sourceTile?.querySelector<HTMLElement>(
      '[data-mosaic-media]',
    )
    const existing = transition.current
    const initialRect =
      existing?.image.getBoundingClientRect() ??
      sourceMedia?.getBoundingClientRect() ??
      origin?.media
    const initialClip = existing
      ? getComputedStyle(existing.layer).clipPath
      : origin
        ? clipRect(origin.tile)
        : 'inset(0px 0px 0px 0px)'
    const initialFilter = existing
      ? getComputedStyle(existing.layer).filter
      : sourceMedia
        ? getComputedStyle(sourceMedia).filter
        : 'none'
    const sourceOpacity = existing
      ? getComputedStyle(existing.layer).opacity
      : sourceTile
        ? getComputedStyle(sourceTile).opacity
        : '1'
    const initialOpacity = closing.current
      ? getComputedStyle(viewer).opacity
      : '0'
    const initialSource = existing
      ? existing.image instanceof HTMLCanvasElement
        ? existing.image
        : existing.image.src
      : (origin?.frame ?? origin?.poster)
    // Commit interrupted geometry before cancelling the old animation.
    if (existing && initialRect) {
      const opacity = getComputedStyle(existing.layer).opacity
      setRect(existing.image, initialRect)
      Object.assign(existing.layer.style, {
        clipPath: initialClip,
        filter: initialFilter,
        opacity,
      })
    }
    cancelAnimations()
    const token = generation.current
    closing.current = false
    busy.current = true
    setPhase('opening')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      await finishOpen(token)
      return
    }
    const duration = origin
      ? portfolioMotion.viewerTransform
      : portfolioMotion.viewerFade
    if (project.about || media.video) {
      await waitForViewerVisual(viewer, token)
      if (!valid(token) || closing.current) return
    }
    const fitted = destinationRect(viewer, media)
    let next: TransitionLayer | null = null
    if (origin && initialSource && initialRect)
      next = await makeLayer(initialSource, fitted, media)
    if (!valid(token) || closing.current) return
    if (next && initialRect) {
      next.layer.style.clipPath = initialClip
      next.layer.style.filter = initialFilter
      next.layer.style.opacity = sourceOpacity
      next.image.style.transform = rectTransform(fitted, initialRect)
      installLayer(next, viewer, 'opening')
    } else {
      hideMosaicSource(sourceTile)
      viewer.dataset.mosaicTransitionState = 'opening-fade'
    }
    startMotion(true, timeline => {
      timeline.addLabel('grid', 0)
      if (next && initialRect) {
        tween(
          timeline,
          next.layer,
          {
            clipPath: initialClip,
            filter: initialFilter,
            opacity: sourceOpacity,
          },
          {
            clipPath: 'inset(0px 0px 0px 0px)',
            filter: 'blur(0px)',
            opacity: 1,
          },
          duration,
        )
        tween(
          timeline,
          next.image,
          { transform: rectTransform(fitted, initialRect) },
          { transform: 'none' },
          duration,
        )
      }
      tween(
        timeline,
        viewer,
        { opacity: initialOpacity },
        { opacity: 1 },
        duration,
      )
      timeline.addLabel('visual-ready')
    })
  }

  async function beginClose() {
    if (closing.current || exited.current) return
    if (busy.current && driveMotion(false)) return
    closing.current = true
    busy.current = true
    const viewer = root()
    if (
      !viewer ||
      (!transition.current && viewer.dataset.mosaicTransitionState !== 'open')
    ) {
      finishExit()
      return
    }
    const sourceTile = tile()
    const sourceMedia = sourceTile?.querySelector<HTMLElement>(
      '[data-mosaic-media]',
    )
    const existing = transition.current
    const visible = viewer.querySelector<HTMLImageElement | HTMLVideoElement>(
      `${viewerImageSelector}, .yarl__slide_current video`,
    )
    const rect =
      existing?.image.getBoundingClientRect() ??
      visible?.getBoundingClientRect() ??
      destinationRect(
        viewer,
        latest.current.project.media[latest.current.index],
      )
    const clip = existing
      ? getComputedStyle(existing.layer).clipPath
      : 'inset(0px 0px 0px 0px)'
    const filter = existing ? getComputedStyle(existing.layer).filter : 'none'
    const opacity = getComputedStyle(viewer).opacity
    const source = existing
      ? existing.image instanceof HTMLCanvasElement
        ? existing.image
        : existing.image.src
      : visible instanceof HTMLVideoElement
        ? (captureVideoCanvas(visible) ?? visible.poster)
        : (capturePortraitCanvas(viewer) ?? visible?.currentSrc)
    if (visible instanceof HTMLVideoElement)
      resumeTime.current = visible.currentTime
    if (existing) {
      setRect(existing.image, rect)
      Object.assign(existing.layer.style, { clipPath: clip, filter })
    }
    if (
      visible instanceof HTMLVideoElement &&
      source instanceof HTMLCanvasElement &&
      sourceTile &&
      latest.current.index === 0
    ) {
      restoreMosaicReturnFrame(sourceTile, source, visible.currentTime)
    }
    // A returned playhead can select a different excerpt and composition.
    // Measure its destination only after the playback owner has accepted it.
    if (sourceTile) prepareMosaicReturn(sourceTile)
    const target =
      sourceTile && sourceMedia
        ? {
            tile: sourceTile.getBoundingClientRect(),
            media: sourceMedia.getBoundingClientRect(),
          }
        : null
    cancelAnimations()
    const token = generation.current
    viewer.querySelectorAll('video').forEach(video => video.pause())
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      finishExit()
      return
    }
    const canTransform =
      target &&
      source &&
      latest.current.index === 0 &&
      rect.width > 0 &&
      target.media.width > 0
    const duration = canTransform
      ? portfolioMotion.viewerTransform
      : portfolioMotion.viewerFade
    const next = source
      ? await makeLayer(
          source,
          rect,
          latest.current.project.media[latest.current.index],
        )
      : null
    if (!valid(token) || !closing.current) return
    if (next) {
      next.layer.style.clipPath = clip
      next.layer.style.filter = filter
      installLayer(next, viewer, 'closing')
    } else viewer.dataset.mosaicTransitionState = 'closing-fade'
    setPhase('closing')
    startMotion(false, timeline => {
      timeline.addLabel('open', 0)
      if (next) {
        if (canTransform) {
          tween(
            timeline,
            next.layer,
            { clipPath: clip, filter },
            {
              clipPath: clipRect(target.tile),
              filter: getComputedStyle(sourceMedia!).filter,
            },
            duration,
          )
          tween(
            timeline,
            next.image,
            { transform: 'none' },
            { transform: rectTransform(rect, target.media) },
            duration,
          )
        } else
          tween(timeline, next.layer, { opacity: 1 }, { opacity: 0 }, duration)
      }
      tween(timeline, viewer, { opacity }, { opacity: 0 }, duration)
      timeline.addLabel('grid')
    })
  }

  useLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelAnimations()
      removeLayer()
      releaseMosaicSource(tile())
    }
  }, [])
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const resized = () => {
      if (!busy.current && !motion.current && !transition.current) return
      if (!latest.current.open) {
        closing.current = true
        finishExit()
        return
      }
      cancelAnimations()
      const viewer = root()
      if (!viewer) return
      const snapshot = transition.current
      if (snapshot) {
        setRect(
          snapshot.image,
          destinationRect(
            viewer,
            latest.current.project.media[latest.current.index],
          ),
        )
        Object.assign(snapshot.layer.style, {
          clipPath: 'inset(0px 0px 0px 0px)',
          filter: 'none',
          opacity: '1',
        })
      }
      closing.current = false
      viewer.style.opacity = '1'
      viewer.dataset.mosaicTransitionState = 'opening'
      void finishOpen(generation.current)
    }
    const updateMotion = () => {
      setReducedMotion(query.matches)
      if (query.matches) {
        root()
          ?.querySelectorAll('video')
          .forEach(video => video.pause())
        if (motion.current || transition.current) resized()
      }
    }
    updateMotion()
    query.addEventListener('change', updateMotion)
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        event.preventDefault()
        event.stopPropagation()
        if (latest.current.open) latest.current.onRequestClose()
      } else if (
        busy.current &&
        ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', keyboard, true)
    window.addEventListener('resize', resized)
    return () => {
      query.removeEventListener('change', updateMotion)
      window.removeEventListener('keydown', keyboard, true)
      window.removeEventListener('resize', resized)
    }
  }, [])
  // Post-await writes use valid(token) plus closing; layout cleanup invalidates
  // mounted and generation. The rule does not follow those helper/ref guards.
  // react-doctor-disable-next-line react-doctor/no-set-state-after-await-in-effect
  useEffect(() => {
    if (!open) void beginClose()
    else if (closing.current) void beginOpen()
    return () => {
      // Invalidate awaited preparation when history reverses this effect.
      invalidatePreparation()
    }
  }, [open])
  function handleView({ index: nextIndex }: { index: number }) {
    if (closing.current) return
    if (previousIndex.current !== nextIndex) {
      previousIndex.current = nextIndex
      resumeTime.current = undefined
      cancelAnimations()
      removeLayer()
      const viewer = root()
      if (viewer) {
        viewer.style.opacity = '1'
        viewer.dataset.mosaicTransitionState = 'open'
      }
      busy.current = false
      setPhase('open')
    }
    if (document.activeElement === document.body) controller.current?.focus()
    if (latest.current.open && nextIndex !== latest.current.index)
      latest.current.onIndexChange(nextIndex)
  }
  function requestClose() {
    if (latest.current.open) latest.current.onRequestClose()
  }
  return {
    controller,
    phase,
    reducedMotion,
    beginOpen,
    handleView,
    requestClose,
  }
}
