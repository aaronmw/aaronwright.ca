import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_TYPOGRAPHY,
  googleFontStylesheetUrl,
  loadGoogleFont,
  normalizeFontFamily,
  parseTypographyPreference,
} from '../../components/portfolio/dev/typographyPreview'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('typography preferences', () => {
  it('encodes the display name as one family parameter, without guessing a font-file path', () => {
    const url = new URL(googleFontStylesheetUrl('  IBM   Plex Mono  '))
    expect(url.origin).toBe('https://fonts.googleapis.com')
    expect(url.searchParams.get('family')).toBe(
      'IBM Plex Mono:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i',
    )
    expect(url.searchParams.get('display')).toBe('swap')
    expect(() => normalizeFontFamily('Roboto&family=Other')).toThrow()
    expect(() => normalizeFontFamily('')).toThrow()
  })

  it('restores valid saved settings and bounds malformed numeric values', () => {
    expect(
      parseTypographyPreference(
        JSON.stringify({
          version: 1,
          settings: {
            fontFamily: 'Space Mono',
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.75,
            tracking: -0.025,
            prettyText: false,
          },
          recentFonts: ['Space Mono', 'Space Mono', 'IBM Plex Mono'],
        }),
      ),
    ).toEqual({
      settings: {
        fontFamily: 'Space Mono',
        fontSize: 18,
        fontWeight: 500,
        lineHeight: 1.75,
        tracking: -0.025,
        prettyText: false,
      },
      recentFonts: ['Space Mono', 'IBM Plex Mono'],
    })
    expect(
      parseTypographyPreference(
        JSON.stringify({
          version: 1,
          settings: {
            ...DEFAULT_TYPOGRAPHY,
            fontSize: -12,
            fontWeight: 555,
            lineHeight: 200,
            tracking: 12,
            prettyText: 'true',
          },
        }),
      ).settings,
    ).toEqual(DEFAULT_TYPOGRAPHY)
    const legacySettings = parseTypographyPreference(
      JSON.stringify({
        version: 1,
        settings: { fontFamily: 'Orbitron', fontSize: 16, lineHeight: 1.5 },
      }),
    ).settings
    expect(legacySettings.tracking).toBe(DEFAULT_TYPOGRAPHY.tracking)
    expect(legacySettings.fontWeight).toBe(DEFAULT_TYPOGRAPHY.fontWeight)
    expect(legacySettings.prettyText).toBe(DEFAULT_TYPOGRAPHY.prettyText)
    expect(
      parseTypographyPreference(
        JSON.stringify({
          version: 1,
          settings: { ...legacySettings, prettyText: undefined, balanceText: false },
        }),
      ).settings.prettyText,
    ).toBe(false)
    expect(parseTypographyPreference('{broken').settings).toEqual(
      DEFAULT_TYPOGRAPHY,
    )
    expect(parseTypographyPreference('{"version":2}').settings).toEqual(
      DEFAULT_TYPOGRAPHY,
    )
  })
})

function fontEnvironment() {
  const style = {
    dataset: {},
    textContent: '',
    remove: vi.fn(),
    sheet: {
      cssRules: [
        { type: 5, style: { getPropertyValue: () => "'IBM Plex Mono'" } },
      ],
    },
  }
  const fonts = { load: vi.fn().mockResolvedValue([{}]) }
  const appendChild = vi.fn()
  vi.stubGlobal('CSSRule', { FONT_FACE_RULE: 5 })
  vi.stubGlobal('document', {
    createElement: () => style,
    head: { appendChild },
    fonts,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, text: async () => '@font-face {}' }),
  )
  return { style, fonts, appendChild }
}

describe('Google font loading', () => {
  it('loads all selectable weights and italics before returning the replacement', async () => {
    const { style, fonts, appendChild } = fontEnvironment()
    const result = await loadGoogleFont(
      'IBM Plex Mono',
      new AbortController().signal,
    )
    expect(result).toEqual({ family: 'IBM Plex Mono', style })
    expect(appendChild).toHaveBeenCalledWith(style)
    expect(fonts.load).toHaveBeenCalledTimes(18)
    expect(fonts.load.mock.calls.map(([font]) => font)).toEqual(
      expect.arrayContaining([
        "normal 100 16px 'IBM Plex Mono'",
        "normal 400 16px 'IBM Plex Mono'",
        "normal 700 16px 'IBM Plex Mono'",
        "normal 900 16px 'IBM Plex Mono'",
        "italic 100 16px 'IBM Plex Mono'",
        "italic 900 16px 'IBM Plex Mono'",
      ]),
    )
    expect(style.remove).not.toHaveBeenCalled()
  })

  it('removes a failed candidate without changing the applied typography', async () => {
    const { style, fonts } = fontEnvironment()
    fonts.load.mockRejectedValue(new Error('Download failed'))
    await expect(
      loadGoogleFont('IBM Plex Mono', new AbortController().signal),
    ).rejects.toThrow('Download failed')
    expect(style.remove).toHaveBeenCalledOnce()
  })

  it('cancels pending font downloads when reset or unmounted', async () => {
    const { style, fonts } = fontEnvironment()
    fonts.load.mockImplementation(() => new Promise(() => {}))
    const controller = new AbortController()
    const result = loadGoogleFont('IBM Plex Mono', controller.signal)
    const rejection = expect(result).rejects.toMatchObject({
      name: 'AbortError',
    })
    await vi.waitFor(() => expect(fonts.load).toHaveBeenCalled())
    controller.abort()
    await rejection
    expect(style.remove).toHaveBeenCalledOnce()
  })

  it('times out stalled font loading and cleans up the candidate stylesheet', async () => {
    vi.useFakeTimers()
    const { style, fonts } = fontEnvironment()
    fonts.load.mockImplementation(() => new Promise(() => {}))
    const result = loadGoogleFont('IBM Plex Mono', new AbortController().signal)
    const rejection = expect(result).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(15_000)
    await rejection
    expect(style.remove).toHaveBeenCalledOnce()
  })

  it('reports invalid names without attaching a stylesheet', async () => {
    const { style, appendChild } = fontEnvironment()
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400 } as Response)
    await expect(
      loadGoogleFont('Misspelled Font', new AbortController().signal),
    ).rejects.toThrow('Check the family name')
    expect(appendChild).not.toHaveBeenCalled()
    expect(style.remove).toHaveBeenCalledOnce()
  })
})
