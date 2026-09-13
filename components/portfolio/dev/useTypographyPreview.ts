'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_TYPOGRAPHY,
  TYPOGRAPHY_STORAGE_KEY,
  loadGoogleFont,
  normalizeFontFamily,
  parseTypographyPreference,
  type TypographySettings,
} from './typographyPreview'

function applyTypography(settings: TypographySettings) {
  const root = document.documentElement
  root.dataset.portfolioDevTypography = ''
  root.style.setProperty(
    '--portfolio-dev-text-wrap',
    settings.prettyText ? 'pretty' : 'wrap',
  )
  root.style.setProperty('--portfolio-dev-font-size', `${settings.fontSize}px`)
  root.style.setProperty(
    '--portfolio-dev-font-weight',
    String(settings.fontWeight),
  )
  root.style.setProperty('--portfolio-dev-tracking', `${settings.tracking}em`)
  root.style.setProperty(
    '--portfolio-dev-line-height',
    String(settings.lineHeight),
  )
  if (settings.fontFamily === DEFAULT_TYPOGRAPHY.fontFamily) {
    delete root.dataset.portfolioDevFont
    root.style.removeProperty('--portfolio-dev-font-family')
  } else {
    root.dataset.portfolioDevFont = ''
    root.style.setProperty(
      '--portfolio-dev-font-family',
      `${JSON.stringify(settings.fontFamily)}, monospace`,
    )
  }
}

export function useTypographyPreview() {
  const [settings, setSettings] = useState(DEFAULT_TYPOGRAPHY)
  const [recentFonts, setRecentFonts] = useState<string[]>([])
  const [loadState, setLoadState] = useState({ pending: false, message: '' })
  const settingsRef = useRef(DEFAULT_TYPOGRAPHY)
  const recentFontsRef = useRef<string[]>([])
  const requestRef = useRef<AbortController | null>(null)
  const fontStyleRef = useRef<HTMLStyleElement | null>(null)

  const updateSettings = useCallback(
    (patch: Partial<TypographySettings>, persist = true) => {
      const next = { ...settingsRef.current, ...patch }
      settingsRef.current = next
      applyTypography(next)
      setSettings(next)
      if (persist) {
        try {
          localStorage.setItem(
            TYPOGRAPHY_STORAGE_KEY,
            JSON.stringify({
              version: 1,
              settings: next,
              recentFonts: recentFontsRef.current,
            }),
          )
        } catch {}
      }
    },
    [],
  )

  const applyFont = useCallback(
    async (input: string) => {
      if (requestRef.current) return false
      let family: string
      try {
        family = normalizeFontFamily(input)
      } catch (error) {
        setLoadState({ pending: false, message: (error as Error).message })
        return false
      }
      if (
        family.toLowerCase() === DEFAULT_TYPOGRAPHY.fontFamily.toLowerCase()
      ) {
        family = DEFAULT_TYPOGRAPHY.fontFamily
      }
      if (
        family.toLowerCase() === settingsRef.current.fontFamily.toLowerCase()
      ) {
        setLoadState({
          pending: false,
          message: `${settingsRef.current.fontFamily} is active.`,
        })
        return true
      }
      const controller = new AbortController()
      requestRef.current = controller
      setLoadState({ pending: true, message: `Loading ${family}…` })
      try {
        const loaded =
          family === DEFAULT_TYPOGRAPHY.fontFamily
            ? null
            : await loadGoogleFont(family, controller.signal)
        if (controller.signal.aborted) {
          loaded?.style.remove()
          return false
        }
        const resolvedFamily = loaded?.family ?? DEFAULT_TYPOGRAPHY.fontFamily
        recentFontsRef.current = [
          resolvedFamily,
          ...recentFontsRef.current.filter(font => font !== resolvedFamily),
        ].slice(0, 5)
        setRecentFonts(recentFontsRef.current)
        updateSettings({ fontFamily: resolvedFamily })
        fontStyleRef.current?.remove()
        fontStyleRef.current = loaded?.style ?? null
        setLoadState({
          pending: false,
          message: `${resolvedFamily} is active.`,
        })
        return true
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadState({
            pending: false,
            message:
              error instanceof Error
                ? error.message
                : 'Couldn’t load that font. Please try again.',
          })
        }
        return false
      } finally {
        if (requestRef.current === controller) requestRef.current = null
      }
    },
    [updateSettings],
  )

  const reset = useCallback(() => {
    requestRef.current?.abort()
    requestRef.current = null
    updateSettings(DEFAULT_TYPOGRAPHY)
    fontStyleRef.current?.remove()
    fontStyleRef.current = null
    setLoadState({ pending: false, message: 'Original typography restored.' })
  }, [updateSettings])

  useEffect(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(TYPOGRAPHY_STORAGE_KEY)
    } catch {}
    const saved = parseTypographyPreference(raw)
    recentFontsRef.current = saved.recentFonts
    // Hydrate browser-only preferences; typography is applied outside the React tree.
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setRecentFonts(saved.recentFonts)
    updateSettings(
      { ...saved.settings, fontFamily: DEFAULT_TYPOGRAPHY.fontFamily },
      false,
    )
    if (saved.settings.fontFamily !== DEFAULT_TYPOGRAPHY.fontFamily)
      void applyFont(saved.settings.fontFamily)

    return () => {
      requestRef.current?.abort()
      requestRef.current = null
      fontStyleRef.current?.remove()
      fontStyleRef.current = null
      const root = document.documentElement
      delete root.dataset.portfolioDevTypography
      delete root.dataset.portfolioDevFont
      for (const property of [
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'tracking',
        'text-wrap',
      ]) {
        root.style.removeProperty(`--portfolio-dev-${property}`)
      }
    }
  }, [applyFont, updateSettings])

  return { settings, recentFonts, loadState, updateSettings, applyFont, reset }
}
