'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  PORTFOLIO_THEME_STORAGE_KEY,
  parsePortfolioThemePreference,
  resolvePortfolioTheme,
  type PortfolioThemePreference,
  type ResolvedPortfolioTheme,
} from './domain/appearance'

type PortfolioThemeContextValue = {
  preference: PortfolioThemePreference
  resolvedTheme: ResolvedPortfolioTheme
  setPreference: (preference: PortfolioThemePreference) => void
}

const PortfolioThemeContext = createContext<PortfolioThemeContextValue | null>(
  null,
)

function readStoredPreference() {
  try {
    return parsePortfolioThemePreference(
      window.localStorage.getItem(PORTFOLIO_THEME_STORAGE_KEY),
    )
  } catch {
    return 'system' as const
  }
}

function applyDocumentTheme(
  preference: PortfolioThemePreference,
  resolvedTheme: ResolvedPortfolioTheme,
) {
  const root = document.documentElement
  root.dataset.portfolioRoute = 'work'
  root.dataset.portfolioThemePreference = preference
  root.dataset.portfolioTheme = resolvedTheme
  root.style.colorScheme = resolvedTheme
}

export function PortfolioThemeProvider({ children }: { children: ReactNode }) {
  const mediaQueryRef = useRef<MediaQueryList | null>(null)
  const preferenceRef = useRef<PortfolioThemePreference>('system')
  const [preference, setPreferenceState] =
    useState<PortfolioThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedPortfolioTheme>('dark')

  const syncTheme = useCallback((nextPreference: PortfolioThemePreference) => {
    const mediaQuery =
      mediaQueryRef.current ??
      window.matchMedia('(prefers-color-scheme: dark)')
    const nextResolvedTheme = resolvePortfolioTheme(
      nextPreference,
      mediaQuery.matches,
    )

    preferenceRef.current = nextPreference
    setPreferenceState(nextPreference)
    setResolvedTheme(nextResolvedTheme)
    applyDocumentTheme(nextPreference, nextResolvedTheme)
  }, [])

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQueryRef.current = mediaQuery

    const initialPreference = parsePortfolioThemePreference(
      document.documentElement.dataset.portfolioThemePreference ??
        readStoredPreference(),
    )
    syncTheme(initialPreference)

    const handleSystemThemeChange = () => {
      if (preferenceRef.current === 'system') {
        syncTheme('system')
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (
        event.storageArea === window.localStorage &&
        event.key === PORTFOLIO_THEME_STORAGE_KEY
      ) {
        syncTheme(parsePortfolioThemePreference(event.newValue))
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
      window.removeEventListener('storage', handleStorage)
      mediaQueryRef.current = null

      const root = document.documentElement
      delete root.dataset.portfolioRoute
      delete root.dataset.portfolioThemePreference
      delete root.dataset.portfolioTheme
      root.style.removeProperty('color-scheme')
    }
  }, [syncTheme])

  const setPreference = useCallback(
    (nextPreference: PortfolioThemePreference) => {
      try {
        window.localStorage.setItem(
          PORTFOLIO_THEME_STORAGE_KEY,
          nextPreference,
        )
      } catch {}

      syncTheme(nextPreference)
    },
    [syncTheme],
  )

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  )

  return (
    <PortfolioThemeContext.Provider value={value}>
      {children}
    </PortfolioThemeContext.Provider>
  )
}

export function usePortfolioTheme() {
  const value = useContext(PortfolioThemeContext)

  if (!value) {
    throw new Error('usePortfolioTheme must be used within PortfolioThemeProvider')
  }

  return value
}
