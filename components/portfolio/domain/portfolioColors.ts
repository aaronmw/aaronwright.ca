import { portfolioSlides } from '../../../lib/portfolio'
import {
  buildActiveProjectColorFromHex,
  buildActiveProjectColors,
  buildLightActiveProjectColor,
  buildLightProjectColor,
  buildProjectColors,
  getProjectColor as getThemeProjectColor,
} from './theme'
import type { ResolvedPortfolioTheme } from './appearance'

const PROJECT_COLOR_OVERRIDES: Record<string, string> = {
  'loopio': '#00A99D',
  'freshbooks': '#0075DD',
  'about-me': '#75A462',
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
const LIGHT_PROJECT_COLORS = PROJECT_COLORS.map(buildLightProjectColor)
const LIGHT_ACTIVE_PROJECT_COLORS = PROJECT_COLORS.map(
  buildLightActiveProjectColor,
)

export function getProjectColor(
  projectIndex: number,
  theme: ResolvedPortfolioTheme = 'dark',
) {
  return getThemeProjectColor(
    theme === 'light' ? LIGHT_PROJECT_COLORS : PROJECT_COLORS,
    projectIndex,
  )
}

export function getActiveProjectColor(
  projectIndex: number,
  theme: ResolvedPortfolioTheme = 'dark',
) {
  return getThemeProjectColor(
    theme === 'light' ? LIGHT_ACTIVE_PROJECT_COLORS : ACTIVE_PROJECT_COLORS,
    projectIndex,
  )
}

export function getProjectColorBySlug(projectSlug: string) {
  const projectIndex = portfolioSlides.findIndex(
    project => project.slug === projectSlug,
  )

  return projectIndex >= 0 ? getProjectColor(projectIndex) : undefined
}
