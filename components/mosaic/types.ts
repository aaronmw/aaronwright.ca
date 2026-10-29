import type { PortfolioMediaClip, PortfolioProject } from '@/lib/portfolio'

export type MosaicPoint = { x: number; y: number }

export type MosaicOrientation = 'landscape' | 'portrait'

export type MosaicComposition = {
  focal: MosaicPoint
  target: MosaicPoint
  zoom: number
}

export type MosaicLoop = { start: number; end: number }

export type MosaicFadeColor = 'black' | 'white'

export type MosaicSegment = MosaicLoop & {
  id?: string
  fadeIn: boolean
  fadeOut: boolean
  /** Omitted colors preserve the original black fades. */
  fadeInColor?: MosaicFadeColor
  fadeOutColor?: MosaicFadeColor
  /** Playback multiplier; omission means normal speed. */
  speed?: number
  /** Omission inherits the project's framing at every screen size. */
  composition?: MosaicComposition
}

export type MosaicMedia = {
  id: string
  slug: string
  src: string
  alt: string
  width: number
  height: number
  poster?: string
  clip?: PortfolioMediaClip
  video: boolean
  segments?: MosaicSegment[]
}

export type MosaicBlurbPosition = {
  vertical: 'top' | 'bottom'
  horizontal: 'left' | 'center' | 'right'
}

export type MosaicProjectCopy = {
  title: string
  summary: string
  /** Markdown shown over the expanded project. */
  longSummary?: string
  blurbPosition?: MosaicBlurbPosition
}

export type MosaicProject = MosaicProjectCopy & {
  id: string
  slug: string
  url?: string
  media: MosaicMedia[]
  composition: MosaicComposition
  about?: Pick<PortfolioProject, 'overviewMarkdown' | 'detailsMarkdown'>
}

export type MosaicRect = {
  left: number
  top: number
  width: number
  height: number
}

export type MosaicOrigin = {
  tile: MosaicRect
  media: MosaicRect
  poster: string
  /** Client-only painted frame; never serialized across a server boundary. */
  frame?: HTMLCanvasElement
  videoTime?: number
}

export type MosaicVideoPreview = {
  index: number
  mode: 'segment' | 'sequence'
  revision: number
  onComplete: () => void
}
