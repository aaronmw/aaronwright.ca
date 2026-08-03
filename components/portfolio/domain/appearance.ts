export const PORTFOLIO_THEME_STORAGE_KEY = 'portfolio-theme'

export type PortfolioThemePreference = 'system' | 'light' | 'dark'
export type ResolvedPortfolioTheme = 'light' | 'dark'

export function parsePortfolioThemePreference(
  value: unknown,
): PortfolioThemePreference {
  if (value === 'light' || value === 'dark') {
    return value
  }

  return 'system'
}

export function resolvePortfolioTheme(
  preference: PortfolioThemePreference,
  systemPrefersDark: boolean,
): ResolvedPortfolioTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return preference
}
