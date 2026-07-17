import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react'
import type { PortfolioProject } from '@/lib/portfolio'
import { positiveModulo } from '@/components/portfolio/domain/carousel'
import { projectUrl } from '@/components/portfolio/domain/routing'
import {
  isModalScreenshotSlide,
  modalMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import type { SlideIndicatorMotionController } from '@/components/portfolio/navigation/SlideNavigation'
import type { ModalTransitionRect } from '@/components/portfolio/presentation/ImageModal'
import type { PendingNavigation } from './types'

function snapshotClientRect(rect: DOMRectReadOnly): ModalTransitionRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function getVisibleScreenshotButtonRect(
  screenshotId: string,
): ModalTransitionRect | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-portfolio-screenshot-id]'),
  ).filter(node => node.dataset.portfolioScreenshotId === screenshotId)
  let bestRect: DOMRect | undefined
  let bestVisibleArea = 0

  nodes.forEach(node => {
    const rect = node.getBoundingClientRect()
    const visibleWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight)
    if (visibleArea > bestVisibleArea) {
      bestVisibleArea = visibleArea
      bestRect = rect
    }
  })

  return bestRect ? snapshotClientRect(bestRect) : null
}

type UsePortfolioModalRuntimeOptions = {
  activeProject: PortfolioProject | undefined
  activeProjectIndex: number
  activeSlide: ProjectSlide | undefined
  activeSlideIndex: number
  projectSlides: Record<string, ProjectSlide[]>
  shouldShowModal: boolean
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
  isModalClosing: boolean
  setIsModalClosing: Dispatch<SetStateAction<boolean>>
  modalTransitionRect: ModalTransitionRect | null
  setModalTransitionRect: Dispatch<SetStateAction<ModalTransitionRect | null>>
  modalHistoryEntryRef: MutableRefObject<boolean>
  slideIndicatorMotionControllerRef: RefObject<SlideIndicatorMotionController | null>
  setActiveSlideIndexes: Dispatch<SetStateAction<number[]>>
  prepareMediaNavigation: (
    pending: Exclude<PendingNavigation, null>,
    mediaKeys?: string | string[],
  ) => Promise<boolean>
  beginHorizontalScrollSync: (project: PortfolioProject) => void
  clearHorizontalScrollSync: (project?: PortfolioProject) => void
  scrollHorizontalToRealIndex: (
    project: PortfolioProject,
    slideIndex: number,
    behavior: ScrollBehavior,
    onComplete?: () => void,
  ) => void
  replaceModalUrl: (project: PortfolioProject, slide: ProjectSlide) => void
}

export function usePortfolioModalRuntime({
  activeProject,
  activeProjectIndex,
  activeSlide,
  activeSlideIndex,
  projectSlides,
  shouldShowModal,
  setIsModalOpen,
  isModalClosing,
  setIsModalClosing,
  modalTransitionRect,
  setModalTransitionRect,
  modalHistoryEntryRef,
  slideIndicatorMotionControllerRef,
  setActiveSlideIndexes,
  prepareMediaNavigation,
  beginHorizontalScrollSync,
  clearHorizontalScrollSync,
  scrollHorizontalToRealIndex,
  replaceModalUrl,
}: UsePortfolioModalRuntimeOptions) {
  const setActiveModalSlide = useCallback(
    async (slide: ProjectSlide, behavior: ScrollBehavior = 'smooth') => {
      if (!activeProject || activeProjectIndex < 0) return
      const slides = projectSlides[activeProject.slug]
      if (!isModalScreenshotSlide(activeProject, slide)) return

      const nextSlideIndex = Math.max(
        0,
        slides.findIndex(projectSlide => projectSlide.id === slide.id),
      )
      const canNavigate = await prepareMediaNavigation(
        { kind: 'modal', screenshotId: slide.screenshot.id },
        modalMediaKey(slide.screenshot),
      )
      if (!canNavigate) return

      const modalIndex = slides
        .filter(projectSlide =>
          isModalScreenshotSlide(activeProject, projectSlide),
        )
        .findIndex(projectSlide => projectSlide.id === slide.id)
      slideIndicatorMotionControllerRef.current?.begin(Math.max(0, modalIndex))
      setActiveSlideIndexes(indexes =>
        indexes.map((index, projectIndex) =>
          projectIndex === activeProjectIndex ? nextSlideIndex : index,
        ),
      )
      if (behavior === 'smooth') beginHorizontalScrollSync(activeProject)
      scrollHorizontalToRealIndex(activeProject, nextSlideIndex, behavior)
      replaceModalUrl(activeProject, slide)
      modalHistoryEntryRef.current = false
    },
    [
      activeProject,
      activeProjectIndex,
      beginHorizontalScrollSync,
      modalHistoryEntryRef,
      prepareMediaNavigation,
      projectSlides,
      replaceModalUrl,
      scrollHorizontalToRealIndex,
      setActiveSlideIndexes,
      slideIndicatorMotionControllerRef,
    ],
  )

  const moveModalHorizontal = useCallback(
    (direction: -1 | 1) => {
      if (!activeProject || activeProjectIndex < 0) return
      const modalSlides = projectSlides[activeProject.slug].filter(slide =>
        isModalScreenshotSlide(activeProject, slide),
      )
      if (modalSlides.length < 2) return
      const currentIndex = Math.max(
        0,
        modalSlides.findIndex(slide => slide.id === activeSlide?.id),
      )
      void setActiveModalSlide(
        modalSlides[
          positiveModulo(currentIndex + direction, modalSlides.length)
        ],
      )
    },
    [
      activeProject,
      activeProjectIndex,
      activeSlide,
      projectSlides,
      setActiveModalSlide,
    ],
  )

  const finishCloseModal = useCallback(() => {
    setIsModalClosing(false)
    setModalTransitionRect(null)
    setIsModalOpen(false)
    if (modalHistoryEntryRef.current) {
      modalHistoryEntryRef.current = false
      window.history.back()
      return
    }
    if (activeProject && activeSlide) {
      window.history.replaceState(
        {},
        '',
        projectUrl(activeProject, activeSlide),
      )
    }
  }, [
    activeProject,
    activeSlide,
    modalHistoryEntryRef,
    setIsModalClosing,
    setIsModalOpen,
    setModalTransitionRect,
  ])

  const closeModal = useCallback(() => {
    if (!shouldShowModal || isModalClosing) return
    const beginClose = () => {
      const nextRect =
        activeSlide?.kind === 'screenshot'
          ? getVisibleScreenshotButtonRect(activeSlide.screenshot.id)
          : modalTransitionRect
      if (!nextRect) {
        finishCloseModal()
        return
      }
      setModalTransitionRect(nextRect)
      setIsModalClosing(true)
    }

    if (!activeProject) {
      beginClose()
      return
    }
    clearHorizontalScrollSync(activeProject)
    scrollHorizontalToRealIndex(
      activeProject,
      activeSlideIndex,
      'auto',
      beginClose,
    )
  }, [
    activeProject,
    activeSlide,
    activeSlideIndex,
    clearHorizontalScrollSync,
    finishCloseModal,
    isModalClosing,
    modalTransitionRect,
    scrollHorizontalToRealIndex,
    setIsModalClosing,
    setModalTransitionRect,
    shouldShowModal,
  ])

  const reopenModal = useCallback(() => {
    if (shouldShowModal && isModalClosing) setIsModalClosing(false)
  }, [isModalClosing, setIsModalClosing, shouldShowModal])

  return {
    closeModal,
    finishCloseModal,
    moveModalHorizontal,
    reopenModal,
    setActiveModalSlide,
    shouldShowModal,
  }
}
