import { describe, expect, it } from 'vitest'
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
import { getCssColorContrastAgainstWhite } from '../../components/portfolio/domain/theme'

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
  it('preserves the existing dark project and active colors', () => {
    expect(
      portfolioSlides.map((_, index) => getProjectColor(index, 'dark')),
    ).toEqual(['#75A462', '#244ED0', '#7d45e4', '#F02D5D', '#C30000'])

    expect(
      portfolioSlides.map((_, index) => getActiveProjectColor(index, 'dark')),
    ).toEqual([
      'hsl(102.73 26.61% 95%)',
      'hsl(225.35 70.49% 95%)',
      'hsl(261.13 74.65% 95%)',
      'hsl(345.23 86.67% 95%)',
      'hsl(0 100% 95%)',
    ])
  })

  it('derives hue-preserving light colors with AA contrast against white', () => {
    portfolioSlides.forEach((_, projectIndex) => {
      expect(
        getCssColorContrastAgainstWhite(
          getProjectColor(projectIndex, 'light'),
        ),
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        getCssColorContrastAgainstWhite(
          getActiveProjectColor(projectIndex, 'light'),
        ),
      ).toBeGreaterThanOrEqual(4.5)
    })
  })
})
