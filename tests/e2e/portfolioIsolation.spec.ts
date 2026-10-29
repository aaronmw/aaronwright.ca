import { expect, test, type Page } from '@playwright/test'

// Frozen reference for the staged grid release; replace only with an intentional
// change to the published portfolio contract, never to conceal a regression.
const published = 'https://6abfdf405a2b121236f0bbbc--aaronwright.netlify.app'
const routes = [
  '/work',
  '/work/about-me',
  '/work/informal-systems',
  '/work/nextphrase',
]

async function settledPortfolio(page: Page) {
  const root = page.locator('main[data-portfolio-phase]:visible')
  await expect(root).toHaveAttribute('data-portfolio-phase', 'ready')
  await expect(root.locator('[data-portfolio-startup-loader]')).toHaveCount(0)
  await expect(root.locator('[data-portfolio-browser-chrome]')).toHaveCSS(
    'opacity',
    '1',
  )
  await page.evaluate(() => document.fonts.ready)
  // Compare a decoded frame, not a network-dependent poster/loading state.
  for (const video of await root.locator('video[src]').all()) {
    await expect
      .poll(
        () =>
          video.evaluate(element => (element as HTMLVideoElement).readyState),
        {
          timeout: 15_000,
        },
      )
      .toBeGreaterThanOrEqual(2)
    await video.evaluate(element => {
      const media = element as HTMLVideoElement
      media.pause()
      media.currentTime = Math.min(1, media.duration / 2)
    })
    await expect
      .poll(() =>
        video.evaluate(element => (element as HTMLVideoElement).seeking),
      )
      .toBe(false)
  }
  return {
    text: (await root.innerText()).replace(/\s+/g, ' ').trim(),
    presentation: await root.evaluate(element => {
      const style = getComputedStyle(element)
      const list = element.querySelector('.portfolio-list')
      const item = list?.querySelector('li')
      const marker = list?.querySelector('.portfolio-list-bullet')
      return {
        background: getComputedStyle(document.body).backgroundColor,
        surface: getComputedStyle(document.documentElement).getPropertyValue(
          '--portfolio-surface',
        ),
        color: style.color,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        listGap: list && getComputedStyle(list).rowGap,
        listColumns: item && getComputedStyle(item).gridTemplateColumns,
        itemGap: item && getComputedStyle(item).columnGap,
        markerColor: marker && getComputedStyle(marker).color,
      }
    }),
  }
}

for (const colorScheme of ['dark', 'light'] as const) {
  test(`published portfolio content and presentation remain unchanged in ${colorScheme}`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(180_000)
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    const reference = await context.newPage()
    await reference.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    try {
      for (const path of routes) {
        await reference.goto(`${published}${path}`)
        const original = await settledPortfolio(reference)
        await page.goto(path)
        const candidate = await settledPortfolio(page)
        expect(candidate, path).toEqual(original)
        await expect(page).toHaveURL(path)
        if (
          ['chromium-desktop', 'webkit-iphone-portrait'].includes(
            info.project.name,
          )
        ) {
          const name = path.replaceAll('/', '-')
          for (const [label, target] of [
            ['published', reference],
            ['candidate', page],
          ] as const) {
            const screenshot = info.outputPath(
              `${colorScheme}${name}-${label}.png`,
            )
            await target.screenshot({
              path: screenshot,
              animations: 'disabled',
            })
            await info.attach(`${colorScheme}${name}-${label}`, {
              path: screenshot,
              contentType: 'image/png',
            })
          }
        }
      }
    } finally {
      await reference.close()
    }
  })
}
