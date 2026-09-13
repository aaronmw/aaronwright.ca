export const TYPOGRAPHY_STORAGE_KEY = 'aaronwright-dev-typography-v1'

export const DEFAULT_TYPOGRAPHY = {
  fontFamily: 'IBM Plex Mono',
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 2,
  tracking: 0,
  prettyText: true,
}

export type TypographySettings = typeof DEFAULT_TYPOGRAPHY

export const FONT_SIZE_LIMITS = { min: 8, max: 48 }
export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
export const LINE_HEIGHT_LIMITS = { min: 0.8, max: 3 }
export const TRACKING_LIMITS = { min: -0.1, max: 0.5 }

export function normalizeFontFamily(value: string) {
  const family = value.trim().replace(/\s+/g, ' ')
  if (
    !family ||
    family.length > 100 ||
    !/^[A-Za-z0-9][A-Za-z0-9 .'-]*$/.test(family)
  ) {
    throw new Error('Enter a Google Fonts family name, such as IBM Plex Mono.')
  }
  return family
}

export function googleFontStylesheetUrl(family: string) {
  const url = new URL('https://fonts.googleapis.com/css')
  // This endpoint returns the available styles even when a family lacks italics
  // or bold. CSS2 rejects a request that includes an unsupported style.
  url.searchParams.set(
    'family',
    `${normalizeFontFamily(family)}:${FONT_WEIGHTS.flatMap(weight => [String(weight), `${weight}i`]).join(',')}`,
  )
  url.searchParams.set('display', 'swap')
  return url.href
}

function validNumber(
  value: unknown,
  limits: { min: number; max: number },
  fallback: number,
) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= limits.min &&
    value <= limits.max
    ? value
    : fallback
}

export function parseTypographyPreference(raw: string | null) {
  const fallback = {
    settings: { ...DEFAULT_TYPOGRAPHY },
    recentFonts: [] as string[],
  }
  if (!raw) return fallback
  try {
    const value = JSON.parse(raw)
    if (value?.version !== 1) return fallback
    const settings = value.settings
    return {
      settings: {
        fontFamily: normalizeFontFamily(settings.fontFamily),
        fontSize: validNumber(
          settings.fontSize,
          FONT_SIZE_LIMITS,
          DEFAULT_TYPOGRAPHY.fontSize,
        ),
        fontWeight: FONT_WEIGHTS.includes(settings.fontWeight)
          ? (settings.fontWeight as number)
          : DEFAULT_TYPOGRAPHY.fontWeight,
        lineHeight: validNumber(
          settings.lineHeight,
          LINE_HEIGHT_LIMITS,
          DEFAULT_TYPOGRAPHY.lineHeight,
        ),
        tracking: validNumber(
          settings.tracking,
          TRACKING_LIMITS,
          DEFAULT_TYPOGRAPHY.tracking,
        ),
        prettyText:
          typeof settings.prettyText === 'boolean'
            ? settings.prettyText
            : typeof settings.balanceText === 'boolean'
              ? settings.balanceText
              : DEFAULT_TYPOGRAPHY.prettyText,
      },
      recentFonts: Array.isArray(value.recentFonts)
        ? Array.from(
            new Set<string>(
              value.recentFonts
                .filter(
                  (family: unknown): family is string =>
                    typeof family === 'string',
                )
                .map(normalizeFontFamily),
            ),
          ).slice(0, 5)
        : [],
    }
  } catch {
    return fallback
  }
}

function waitForFonts<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort, { once: true })
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort))
  })
}

export async function loadGoogleFont(family: string, signal: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort(signal.reason)
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(
    () =>
      controller.abort(new Error('Font loading timed out. Please try again.')),
    15_000,
  )
  const style = document.createElement('style')
  style.dataset.portfolioPreviewFont = family

  try {
    const response = await fetch(googleFontStylesheetUrl(family), {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(
        response.status === 400
          ? `Google Fonts couldn’t find “${family}”. Check the family name.`
          : 'Google Fonts is unavailable. Please try again.',
      )
    }
    style.textContent = await response.text()
    controller.signal.throwIfAborted()
    document.head.appendChild(style)
    const rules = Array.from(style.sheet?.cssRules ?? [])
    const face = rules.find(rule => rule.type === CSSRule.FONT_FACE_RULE) as
      CSSFontFaceRule | undefined
    const cssFamily = face?.style.getPropertyValue('font-family')
    if (!cssFamily)
      throw new Error('Google Fonts returned no usable font styles.')

    const faces = await waitForFonts(
      Promise.all(
        FONT_WEIGHTS.flatMap(weight =>
          ['normal', 'italic'].map(fontStyle =>
            document.fonts.load(`${fontStyle} ${weight} 16px ${cssFamily}`),
          ),
        ),
      ),
      controller.signal,
    )
    controller.signal.throwIfAborted()
    if (faces.some(matches => matches.length === 0))
      throw new Error(
        'The font could not be loaded. Your current font is still active.',
      )
    return { family: cssFamily.replace(/^['"]|['"]$/g, ''), style }
  } catch (error) {
    style.remove()
    throw controller.signal.aborted ? controller.signal.reason : error
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}
