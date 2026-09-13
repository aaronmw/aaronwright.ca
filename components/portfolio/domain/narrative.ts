import type { PortfolioProject } from '@/lib/portfolio'
import { parsePortfolioNarrative } from '../../../lib/portfolioNarrative'
import type { ProjectSlide } from './slides'

export type ResolvedProjectNarrative = {
  sourceId: string
  titleMarkdown?: string
  bodyMarkdown: string
}

export const parseSlideNarrative = parsePortfolioNarrative

export function getProjectNarratives(
  project: PortfolioProject,
  slides: ProjectSlide[],
): ResolvedProjectNarrative[] {
  let current: ResolvedProjectNarrative = {
    sourceId: `project:${project.id}`,
    ...parsePortfolioNarrative(project.overviewMarkdown),
  }

  return slides.map(slide => {
    if (slide.kind === 'details') {
      return {
        sourceId: `slide:${slide.id}`,
        bodyMarkdown: project.detailsMarkdown ?? '',
      }
    }
    if (slide.kind === 'screenshot' && slide.screenshot.description?.trim()) {
      const parsed = parseSlideNarrative(slide.screenshot.description)
      current = {
        sourceId: `slide:${slide.id}`,
        titleMarkdown: parsed.titleMarkdown,
        bodyMarkdown: parsed.bodyMarkdown,
      }
    }

    return current
  })
}
