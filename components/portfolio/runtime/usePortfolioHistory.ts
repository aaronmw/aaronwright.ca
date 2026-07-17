import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import type { PortfolioProject } from '@/lib/portfolio'
import {
  pageTitle,
  parsePortfolioRoute,
  projectUrl,
} from '@/components/portfolio/domain/routing'
import {
  isModalScreenshotSlide,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'

type UsePortfolioHistoryOptions = {
  projects: PortfolioProject[]
  projectSlides: Record<string, ProjectSlide[]>
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
}

export function usePortfolioHistory({
  projects,
  projectSlides,
  setIsModalOpen,
}: UsePortfolioHistoryOptions) {
  const modalHistoryEntryRef = useRef(false)

  const readLocationState = useCallback(() => {
    const { pathname, search } = window.location
    return parsePortfolioRoute(pathname, search, projects, projectSlides)
  }, [projects, projectSlides])

  const updateUrl = useCallback(
    (
      project: PortfolioProject | undefined,
      slide: ProjectSlide | undefined,
      mode: 'push' | 'replace',
    ) => {
      const nextPath = project && slide ? projectUrl(project, slide) : '/work'
      const currentPath = `${window.location.pathname}${window.location.search}`

      if (currentPath === nextPath) {
        return
      }

      window.history[`${mode}State`]({}, '', nextPath)
      document.title = pageTitle(project, slide)
      modalHistoryEntryRef.current = false
      setIsModalOpen(false)
    },
    [setIsModalOpen],
  )

  const replaceModalUrl = useCallback(
    (project: PortfolioProject, slide: ProjectSlide) => {
      if (!isModalScreenshotSlide(project, slide)) {
        return
      }

      window.history.replaceState(
        {},
        '',
        `${projectUrl(project, slide)}?modal=image`,
      )
      document.title = pageTitle(project, slide)
    },
    [],
  )

  return {
    modalHistoryEntryRef,
    readLocationState,
    replaceModalUrl,
    updateUrl,
  }
}
