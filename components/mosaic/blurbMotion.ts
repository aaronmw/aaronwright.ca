import { portfolioMotion } from '@/lib/portfolioTokens'
import { gsap, mosaicEase, seconds } from './motion'
import {
  createRectangleTimeline,
  type RectangleInkElements,
  type RectangleGeometry,
} from './rectangleMotion'

type Rect = { left: number; top: number; width: number; height: number }

export function blurbMotionGeometry(panel: Rect, button: Rect, pixel: number) {
  const x = button.left - panel.left,
    y = button.top - panel.top
  const center = { x: x + button.width / 2, y: y + button.height / 2 }
  return {
    width: panel.width,
    height: panel.height,
    pixel,
    center,
    buttonPaths: [
      `M ${x} ${y} L ${x + button.width} ${y} L ${x + button.width} ${y + button.height} L ${x} ${y + button.height} Z`,
      `M ${x} ${y} L ${x + button.width} ${y}`,
      `M ${x + button.width} ${y} L ${x + button.width} ${y + button.height}`,
      `M ${x + button.width} ${y + button.height} L ${x} ${y + button.height}`,
      `M ${x} ${y + button.height} L ${x} ${y}`,
    ],
  }
}

export type BlurbMotionElements = RectangleInkElements & {
  layer: HTMLDivElement
  panel: HTMLElement
  toggle: HTMLButtonElement
  anchor: HTMLSpanElement
}

/** Exactly one reversible timeline, from the notes-button silhouette to content. */
export function createBlurbTimeline(
  ink: RectangleInkElements,
  panel: HTMLElement,
  geometry: RectangleGeometry & { buttonPaths: string[] },
  controlFill: string,
) {
  const rectangle = createRectangleTimeline(ink, geometry)
  const timeline = gsap.timeline({ paused: true }).timeScale(0.5)
  // Content reveals above fully visible ink, keeping the border solid throughout.
  gsap.set(ink.svg, { attr: { opacity: 1 } })
  const seed = [ink.shape, ...ink.edges].map(target =>
    target.getAttribute('d')!,
  )
  const buttonDuration = seconds(portfolioMotion.state)
  timeline.addLabel('notes', 0)
  ;[ink.shape, ...ink.edges].forEach((target, index) => {
    timeline.fromTo(
      target,
      { attr: { d: geometry.buttonPaths[index] } },
      {
        attr: { d: seed[index] },
        duration: buttonDuration,
        ease: mosaicEase.travel,
        immediateRender: false,
      },
      0,
    )
  })
  gsap.set(ink.paint, { attr: { fill: controlFill } })
  timeline.fromTo(
    ink.stroke,
    { attr: { 'stroke-width': 0 } },
    {
      attr: { 'stroke-width': geometry.pixel * 2 },
      duration: buttonDuration,
      ease: mosaicEase.travel,
      immediateRender: false,
    },
    0,
  )
  timeline.fromTo(
    ink.paint,
    { attr: { 'fill-opacity': 1 } },
    {
      attr: { 'fill-opacity': 0 },
      duration: buttonDuration,
      ease: mosaicEase.travel,
      immediateRender: false,
    },
    0,
  )
  timeline.addLabel('pixel', buttonDuration)
  timeline.set(
    ink.paint,
    { attr: { fill: 'var(--portfolio-accent-decoration)' } },
    'pixel',
  )
  timeline.add(rectangle, 'pixel')
  rectangle.paused(false)
  timeline.addLabel('filled')
  timeline.fromTo(
    panel,
    { opacity: 0 },
    {
      opacity: 1,
      duration: seconds(portfolioMotion.viewerChrome),
      ease: mosaicEase.fade,
      immediateRender: false,
    },
    'filled',
  )
  timeline.addLabel('content')
  return timeline
}

/** Owns layout/lifecycle only. Direction changes preserve the timeline/playhead. */
export function createBlurbMotion(
  elements: BlurbMotionElements,
  options: {
    intro: boolean
    expanded: boolean
    onMoving: () => void
    onSettled: (expanded: boolean) => void
  },
) {
  const { layer, panel, anchor, toggle } = elements
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let requested = options.expanded
  let disposed = false
  let context: gsap.Context | null = null
  let timeline!: gsap.core.Timeline
  let bounds: DOMRect
  let button: DOMRect
  let root: DOMRect
  let pixel: number

  function finish(expanded: boolean) {
    if (disposed || expanded !== requested) return
    elements.svg.setAttribute('opacity', '0')
    layer.dataset.controlsReady = ''
    // React commits animating and collapsed together so the revealed panel
    // cannot briefly inherit the previous collapsed state's visibility.
    options.onSettled(expanded)
  }
  function build() {
    context?.revert()
    root = layer.getBoundingClientRect()
    bounds = panel.getBoundingClientRect()
    button = anchor.getBoundingClientRect()
    pixel = parseFloat(getComputedStyle(panel).borderTopWidth)
    const geometry = blurbMotionGeometry(bounds, button, pixel)
    context = gsap.context(() => {
      elements.svg.setAttribute('viewBox', `0 0 ${root.width} ${root.height}`)
      gsap.set(elements.origin, {
        attr: {
          transform: `translate(${bounds.left - root.left} ${bounds.top - root.top})`,
        },
      })
      gsap.set(elements.travel, { attr: { transform: 'translate(0 0)' } })
      gsap.set(panel, { opacity: 0 })
      timeline = createBlurbTimeline(
        elements,
        panel,
        geometry,
        getComputedStyle(toggle).backgroundColor,
      )
      timeline.eventCallback('onComplete', () => finish(true))
      timeline.eventCallback('onReverseComplete', () => finish(false))
    }, layer)
    layer.dataset.controlsReady = ''
  }
  function settle() {
    if (disposed) return
    build()
    timeline.progress(requested ? 1 : 0, true).pause()
    panel.style.opacity = requested ? '1' : '0'
    finish(requested)
  }
  build()
  const resize = new ResizeObserver(() => {
    const next = panel.getBoundingClientRect()
    if (next.width !== bounds.width || next.height !== bounds.height) settle()
  })
  resize.observe(panel)
  const changed = () => {
    if (media.matches) settle()
  }
  window.addEventListener('resize', settle)
  media.addEventListener('change', changed)
  if (options.intro && requested && !media.matches) {
    options.onMoving()
    timeline.play(0)
  } else settle()

  return {
    get timeline() {
      return timeline
    },
    setExpanded(expanded: boolean) {
      if (disposed) return
      requested = expanded
      if (media.matches) {
        settle()
        return
      }
      options.onMoving()
      elements.svg.setAttribute('opacity', '1')
      if (expanded) timeline.play()
      else timeline.reverse()
      // Repeated intent at an endpoint must not leave content inert.
      if (timeline.progress() === (expanded ? 1 : 0)) finish(expanded)
    },
    settle,
    dispose() {
      disposed = true
      resize.disconnect()
      window.removeEventListener('resize', settle)
      media.removeEventListener('change', changed)
      context?.revert()
      delete layer.dataset.controlsReady
    },
  }
}
