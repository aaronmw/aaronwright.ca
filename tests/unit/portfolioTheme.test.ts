import { describe, expect, it } from 'vitest'
import colors from 'tailwindcss/colors'
import { portfolioSlides } from '../../lib/portfolio'
import {
  PORTFOLIO_THEME_STORAGE_KEY,
  parsePortfolioThemePreference,
  resolvePortfolioTheme,
} from '../../components/portfolio/domain/appearance'
import {
  getActiveProjectColor,
  getProjectColor,
} from '../../components/portfolio/domain/portfolioColors'

describe('portfolio appearance preference', () => {
  it('uses System for missing or invalid stored values', () => {
    expect(PORTFOLIO_THEME_STORAGE_KEY).toBe('portfolio-theme')
    expect(parsePortfolioThemePreference(null)).toBe('system')
    expect(parsePortfolioThemePreference(undefined)).toBe('system')
    expect(parsePortfolioThemePreference('sepia')).toBe('system')
  })

  it('preserves every supported stored value', () => {
    expect(parsePortfolioThemePreference('system')).toBe('system')
    expect(parsePortfolioThemePreference('light')).toBe('light')
    expect(parsePortfolioThemePreference('dark')).toBe('dark')
  })

  it('resolves explicit themes and follows the system when requested', () => {
    expect(resolvePortfolioTheme('light', true)).toBe('light')
    expect(resolvePortfolioTheme('dark', false)).toBe('dark')
    expect(resolvePortfolioTheme('system', true)).toBe('dark')
    expect(resolvePortfolioTheme('system', false)).toBe('light')
  })
})

describe('portfolio project colors by appearance', () => {
  it('uses decorative red-600 for every project color', () => {
    for (const theme of ['dark', 'light'] as const) {
      expect(
        portfolioSlides.map((_, index) => getProjectColor(index, theme)),
      ).toEqual(portfolioSlides.map(() => colors.red[600]))
      expect(
        portfolioSlides.map((_, index) => getActiveProjectColor(index, theme)),
      ).toEqual(portfolioSlides.map(() => colors.red[600]))
    }
  })
})
