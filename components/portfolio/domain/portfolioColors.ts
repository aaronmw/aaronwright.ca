import { portfolioSlides } from '../../../lib/portfolio'
import { RESUME_SIGNAL_COLOR } from './theme'
import type { ResolvedPortfolioTheme } from './appearance'

export function getProjectColor(
  _projectIndex: number,
  _theme: ResolvedPortfolioTheme = 'dark',
) {
  return RESUME_SIGNAL_COLOR
}

export function getActiveProjectColor(
  _projectIndex: number,
  _theme: ResolvedPortfolioTheme = 'dark',
) {
  return RESUME_SIGNAL_COLOR
}

export function getProjectColorBySlug(projectSlug: string) {
  const projectExists = portfolioSlides.some(
    project => project.slug === projectSlug,
  )

  return projectExists ? RESUME_SIGNAL_COLOR : undefined
}
