import { portfolioSlides } from '@/lib/portfolio'
import {
  buildActiveProjectColorFromHex,
  buildActiveProjectColors,
  buildProjectColors,
  getProjectColor as getThemeProjectColor,
} from './theme'

const PROJECT_COLOR_OVERRIDES: Record<string, string> = {
  'building-with-ai': '#75A462',
  'aarons-toolbox': '#7d45e4',
  'informal-systems': '#244ED0',
  'mini-series-browser': '#C30000',
  'nextphrase': '#F02D5D',
}
const GENERATED_PROJECT_COLORS = buildProjectColors(portfolioSlides.length)
const GENERATED_ACTIVE_PROJECT_COLORS = buildActiveProjectColors(
  portfolioSlides.length,
)
const PROJECT_COLORS = portfolioSlides.map(
  (project, projectIndex) =>
    PROJECT_COLOR_OVERRIDES[project.slug] ??
    GENERATED_PROJECT_COLORS[projectIndex],
)
const ACTIVE_PROJECT_COLORS = portfolioSlides.map((project, projectIndex) => {
  const override = PROJECT_COLOR_OVERRIDES[project.slug]
  return override
    ? buildActiveProjectColorFromHex(override)
    : GENERATED_ACTIVE_PROJECT_COLORS[projectIndex]
})

export function getProjectColor(projectIndex: number) {
  return getThemeProjectColor(PROJECT_COLORS, projectIndex)
}

export function getActiveProjectColor(projectIndex: number) {
  return getThemeProjectColor(ACTIVE_PROJECT_COLORS, projectIndex)
}

export function getProjectColorBySlug(projectSlug: string) {
  const projectIndex = portfolioSlides.findIndex(
    project => project.slug === projectSlug,
  )

  return projectIndex >= 0 ? getProjectColor(projectIndex) : undefined
}
