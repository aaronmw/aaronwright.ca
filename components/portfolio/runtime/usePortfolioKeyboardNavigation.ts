import { useCallback, useEffect, useEffectEvent, type RefObject } from 'react'
import type { SectionNavigationHandle } from '@/components/portfolio/navigation/SectionNavigation'
import {
  resetInlineMediaZoom,
  zoomVisibleInlineMediaIn,
} from './useInlineZoomPresentation'

const START_SCREEN_INDEX = -1

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [contenteditable="true"]',
    ),
  )
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  )
}

type UsePortfolioKeyboardNavigationOptions = {
  projectCount: number
  keyboardSurfaceRef: RefObject<HTMLElement | null>
  sectionNavigationControllerRef: RefObject<SectionNavigationHandle | null>
  shouldShowModal: boolean
  isModalClosing: boolean
  isInlineZoomPresentationActive: boolean
  closeModal: () => void
  reopenModal: () => void
  exitInlineZoomPresentation: () => void
  clickHorizontalSlideIndicator: (direction: -1 | 1) => boolean
  clickVerticalSectionNavButton: (direction: -1 | 1) => boolean
  moveHorizontal: (direction: -1 | 1) => void
  moveModalHorizontal: (direction: -1 | 1) => void
  moveVertical: (direction: -1 | 1) => void
  setActiveProject: (
    projectIndex: number,
    mode: 'push' | 'replace',
    behavior?: ScrollBehavior,
    targetSlideIndex?: number,
  ) => void
}

export function usePortfolioKeyboardNavigation({
  projectCount,
  keyboardSurfaceRef,
  sectionNavigationControllerRef,
  shouldShowModal,
  isModalClosing,
  isInlineZoomPresentationActive,
  closeModal,
  reopenModal,
  exitInlineZoomPresentation,
  clickHorizontalSlideIndicator,
  clickVerticalSectionNavButton,
  moveHorizontal,
  moveModalHorizontal,
  moveVertical,
  setActiveProject,
}: UsePortfolioKeyboardNavigationOptions) {
  const focusKeyboardSurface = useCallback(() => {
    keyboardSurfaceRef.current?.focus({ preventScroll: true })
  }, [keyboardSurfaceRef])

  const handleKeyDownEvent = useEffectEvent((event: KeyboardEvent) => {
    if (shouldShowModal) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }
      if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        if (isModalClosing) reopenModal()
        else closeModal()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (!clickHorizontalSlideIndicator(1)) moveModalHorizontal(1)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (!clickHorizontalSlideIndicator(-1)) moveModalHorizontal(-1)
      }
      return
    }

    if (event.key === 'Escape' && isInlineZoomPresentationActive) {
      event.preventDefault()
      exitInlineZoomPresentation()
      return
    }
    if (isTextEntryTarget(event.target)) return

    if (
      event.key === 'Enter' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isEditableTarget(event.target) &&
      zoomVisibleInlineMediaIn()
    ) {
      event.preventDefault()
      focusKeyboardSurface()
      return
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      exitInlineZoomPresentation()
    } else if (
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      !isInlineZoomPresentationActive
    ) {
      resetInlineMediaZoom()
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key === '0') {
        event.preventDefault()
        exitInlineZoomPresentation()
        focusKeyboardSurface()
        sectionNavigationControllerRef.current?.pin(0, 'vertical', true)
        setActiveProject(START_SCREEN_INDEX, 'push')
        return
      }
      if (/^[1-9]$/.test(event.key)) {
        const projectIndex = Number(event.key) - 1
        if (projectIndex < projectCount) {
          event.preventDefault()
          exitInlineZoomPresentation()
          focusKeyboardSurface()
          sectionNavigationControllerRef.current?.pin(
            projectIndex + 1,
            'vertical',
            true,
          )
          setActiveProject(projectIndex, 'push', 'smooth', 0)
          return
        }
      }
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!clickVerticalSectionNavButton(1)) {
        focusKeyboardSurface()
        moveVertical(1)
      }
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!clickVerticalSectionNavButton(-1)) {
        focusKeyboardSurface()
        moveVertical(-1)
      }
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (!clickHorizontalSlideIndicator(1)) {
        focusKeyboardSurface()
        moveHorizontal(1)
      }
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (!clickHorizontalSlideIndicator(-1)) {
        focusKeyboardSurface()
        moveHorizontal(-1)
      }
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDownEvent)
    return () => window.removeEventListener('keydown', handleKeyDownEvent)
  }, [])

  return focusKeyboardSurface
}
