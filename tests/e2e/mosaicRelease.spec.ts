import { expect, test, type Locator, type Page } from '@playwright/test'

async function gridReady(page: Page) {
  await expect(page.locator('[data-mosaic-project]')).toHaveCount(10)
  await expect(page.locator('[data-mosaic-layout]')).toHaveAttribute(
    'data-mosaic-layout',
    'packed',
  )
  await expect(page.locator('[data-mosaic-entrance="arrived"]')).toHaveCount(10)
  await expect(page.locator('[data-mosaic-project="about-me"]')).toBeVisible()
}

async function expectEveryVideoPlaying(backgrounds: Locator) {
  // Each segmented loop can briefly hold a canvas while seeking. Require every
  // video to present live frames, without requiring nine seek cycles to align.
  const observedPlaying = new Set<string>()
  await expect
    .poll(
      async () => {
        const states = await backgrounds.evaluateAll(elements =>
          elements.map(element => {
            const video = element as HTMLVideoElement
            return {
              id: video
                .closest('[data-mosaic-project]')!
                .getAttribute('data-mosaic-project')!,
              ready: video.readyState,
              paused: video.paused,
              muted: video.muted,
              inline: video.playsInline,
              error: video.error?.message,
            }
          }),
        )
        for (const state of states) {
          if (state.ready >= 2 && !state.paused && state.muted && state.inline)
            observedPlaying.add(state.id)
        }
        return states.filter(state => !observedPlaying.has(state.id))
      },
      { timeout: 15_000 },
    )
    .toEqual([])
}

test('production grid loads all projects without editor controls or indexing', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (
      new URL(response.url()).origin === new URL(page.url()).origin &&
      response.status() >= 400
    )
      errors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto('/grid-version')
  await gridReady(page)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  )
  await expect(
    page.getByRole('button', { name: 'Project development tools' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('complementary', { name: 'Project cell adjustments' }),
  ).toHaveCount(0)
  const viewport = page.viewportSize()!
  for (const box of await page
    .locator('[data-mosaic-project]')
    .evaluateAll(elements =>
      elements.map(element => element.getBoundingClientRect().toJSON()),
    )) {
    expect(box.width).toBeGreaterThan(44)
    expect(box.height).toBeGreaterThan(44)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(viewport.width + 1)
    expect(box.bottom).toBeLessThanOrEqual(viewport.height + 1)
  }
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).not.toContain('/grid-version')
  expect(await sitemap.text()).toContain('/work/nextphrase<')
  expect(errors).toEqual([])
})

test('About opens with its grid copy and returns keyboard focus after Escape', async ({
  page,
}) => {
  await page.goto('/grid-version')
  await gridReady(page)
  const about = page.locator('[data-mosaic-project="about-me"]')
  await about.focus()
  await about.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('region', { name: 'About Aaron Wright' }),
  ).toBeVisible()
  await expect(dialog.getByText(/I’m hooked on turning ideas/)).toBeVisible()
  await expect(dialog.locator('[data-mosaic-about-portrait]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(about).toBeFocused()
  await expect(page).toHaveURL('/grid-version')
})

test('grid videos load inline, pause behind the viewer, and retain their separate media', async ({
  page,
}) => {
  await page.goto('/grid-version')
  await gridReady(page)
  const backgrounds = page.locator('[data-mosaic-video]')
  await expect(backgrounds).toHaveCount(9)
  await expectEveryVideoPlaying(backgrounds)
  await page.locator('[data-mosaic-project="informal-systems"]').click()
  const video = page.locator('.yarl__slide_current video')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect
    .poll(() =>
      video.evaluate(element => (element as HTMLVideoElement).currentSrc),
    )
    .toContain('/portfolio/mosaic/informal-systems-walkthrough.mp4')
  await expect
    .poll(() => video.evaluate(element => (element as HTMLVideoElement).paused))
    .toBe(false)
  await expect
    .poll(() =>
      backgrounds.evaluateAll(elements =>
        elements.every(element => (element as HTMLVideoElement).paused),
      ),
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Pause video', exact: true }).click()
  await expect
    .poll(() => video.evaluate(element => (element as HTMLVideoElement).paused))
    .toBe(true)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expectEveryVideoPlaying(backgrounds)
})

for (const colorScheme of ['dark', 'light'] as const) {
  test(`grid styling does not leak into the ${colorScheme} portfolio after client navigation`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/work')
    const portfolio = page.locator('main[data-portfolio-phase]:visible')
    await expect(portfolio).toHaveAttribute('data-portfolio-phase', 'ready')
    const original = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      surface: getComputedStyle(document.documentElement).getPropertyValue(
        '--portfolio-surface',
      ),
    }))
    await page.goto('/grid-version')
    await gridReady(page)
    await page.locator('[data-mosaic-logo]').click()
    await expect(page).toHaveURL('/work')
    await expect(portfolio).toHaveAttribute('data-portfolio-phase', 'ready')
    expect(
      await page.evaluate(() => ({
        body: getComputedStyle(document.body).backgroundColor,
        surface: getComputedStyle(document.documentElement).getPropertyValue(
          '--portfolio-surface',
        ),
      })),
    ).toEqual(original)
    await expect(page.locator('[data-mosaic-root]')).toHaveCount(0)
    await page.goBack()
    await gridReady(page)
  })
}
