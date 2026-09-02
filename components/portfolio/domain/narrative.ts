import type { PortfolioProject } from '@/lib/portfolio'
import type { ProjectSlide } from './slides'

export type ResolvedProjectNarrative = {
  sourceId: string
  titleMarkdown?: string
  bodyMarkdown: string
}

const MARKDOWN_HEADING_PATTERN = /^\s*#{1,6}\s+(.+?)\s*$/

export function parseSlideNarrative(markdown: string) {
  const lines = markdown.trim().split('\n')
  const headingIndex = lines.findIndex(line =>
    MARKDOWN_HEADING_PATTERN.test(line),
  )
  const headingMatch =
    headingIndex >= 0 ? lines[headingIndex].match(MARKDOWN_HEADING_PATTERN) : null

  return {
    titleMarkdown: headingMatch?.[1],
    bodyMarkdown: lines
      .filter((_, index) => index !== headingIndex)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

export function getProjectNarratives(
  project: PortfolioProject,
  slides: ProjectSlide[],
): ResolvedProjectNarrative[] {
  let current: ResolvedProjectNarrative = {
    sourceId: `project:${project.id}`,
    titleMarkdown: project.headlineMarkdown,
    bodyMarkdown: project.descriptionMarkdown,
  }

  return slides.map(slide => {
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
