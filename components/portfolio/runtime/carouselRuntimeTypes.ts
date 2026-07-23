import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from 'react'
import type { PortfolioProject } from '@/lib/portfolio'
import type { ProjectSlide } from '@/components/portfolio/domain/slides'
import type { SlideIndicatorMotionController } from '@/components/portfolio/navigation/SlideNavigation'
import type { PendingNavigation } from './types'

export type HorizontalScrollOptions = {
  syncIndicator?: boolean
  boundarySourceIndex?: number
}

export type PortfolioCarouselRuntimeOptions = {
  projects: PortfolioProject[]
  projectSlides: Record<string, ProjectSlide[]>
  activeProjectIndex: number
  activeSlideIndexes: number[]
  setActiveSlideIndexes: Dispatch<SetStateAction<number[]>>
  isWideLayout: boolean
  isModalOpen: boolean
  isModalVisible: boolean
  isInlineZoomPresentationActive: boolean
  initialRevealCompleteRef: MutableRefObject<boolean>
  scrollSyncRef: MutableRefObject<boolean>
  verticalRef: RefObject<HTMLDivElement | null>
  slideIndicatorMotionControllerRef: RefObject<SlideIndicatorMotionController | null>
  inlineZoomHandoffScreenshotIdRef: MutableRefObject<string | null>
  prepareMediaNavigation: (
    pending: Exclude<PendingNavigation, null>,
    mediaKeys?: string | string[],
  ) => Promise<boolean>
  updateUrl: (
    project: PortfolioProject | undefined,
    slide: ProjectSlide | undefined,
    mode: 'push' | 'replace',
  ) => void
  replaceModalUrl: (project: PortfolioProject, slide: ProjectSlide) => void
  settleHorizontalNavigation: () => void
}
