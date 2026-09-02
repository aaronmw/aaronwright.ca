import type { GenericSlide } from 'yet-another-react-lightbox'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import { getProjectMediaScreenshots } from './slides'

export type ViewerActivationKind =
  | 'double-click'
  | 'double-tap'
  | 'keyboard'
  | 'touch-pinch'
  | 'trackpad-pinch'
  | 'deep-link'

export type ViewerPoint = {
  x: number
  y: number
}

export type ViewerSourceRect = {
  left: number
  top: number
  width: number
  height: number
}

export type ViewerOpenIntent = {
  mediaId: string
  sourceRect: ViewerSourceRect | null
  activationKind: ViewerActivationKind
  focalPoint?: ViewerPoint
  initialPinchScale?: number
}

export type PortfolioViewerSlide = GenericSlide & {
  type: 'portfolio-media'
  id: string
  screenshot: PortfolioScreenshot
}

declare module 'yet-another-react-lightbox' {
  interface SlideTypes {
    'portfolio-media': PortfolioViewerSlide
  }
}

export function getPortfolioViewerSlides(
  project: PortfolioProject,
): PortfolioViewerSlide[] {
  return getProjectMediaScreenshots(project).map(screenshot => ({
    type: 'portfolio-media',
    id: screenshot.id,
    screenshot,
  }))
}

export function getViewerSlideIndex(
  slides: PortfolioViewerSlide[],
  mediaId: string,
) {
  const index = slides.findIndex(slide => slide.id === mediaId)
  return index < 0 ? 0 : index
}
