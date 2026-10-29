import { expect, test, type Locator, type Page } from '@playwright/test'

const tile = (page: Page, slug: string) =>
  page.locator(`[data-mosaic-project="${slug}"]`)

async function ready(page: Page) {
  await page.goto('/grid-version')
  await expect(page.locator('[data-mosaic-project]')).toHaveCount(7)
  await page
    .locator('[data-mosaic-media] img')
    .evaluateAll(images =>
      Promise.all(images.map(image => (image as HTMLImageElement).decode())),
    )
}

async function frame(subject: Locator) {
  return subject.evaluate(element => {
    const media = element.querySelector<HTMLElement>('[data-mosaic-media]')!
    const t = element.getBoundingClientRect(),
      m = media.getBoundingClientRect()
    return {
      width: t.width,
      height: t.height,
      mediaWidth: m.width,
      mediaHeight: m.height,
      x: m.x - t.x,
      y: m.y - t.y,
      ratio: Number(
        getComputedStyle(element).getPropertyValue('--mosaic-ratio'),
      ),
    }
  })
}

async function expectFit(subject: Locator) {
  await expect
    .poll(async () => {
      const f = await frame(subject)
      return (
        Math.abs(f.mediaWidth - Math.min(f.width, f.height * f.ratio)) +
        Math.abs(f.mediaHeight - Math.min(f.height, f.width / f.ratio))
      )
    })
    .toBeLessThan(0.2)
  const f = await frame(subject)
  expect(Math.abs(f.x - (f.width - f.mediaWidth) / 2)).toBeLessThan(0.1)
  expect(Math.abs(f.y - (f.height - f.mediaHeight) / 2)).toBeLessThan(0.1)
}

test('both compositions stay inside the viewport with shared gaps and approved focal framing', async ({
  page,
}) => {
  await ready(page)
  const viewport = page.viewportSize()!
  const boxes = await page
    .locator('[data-mosaic-project]')
    .evaluateAll(items =>
      items.map(item => item.getBoundingClientRect().toJSON()),
    )
  for (const b of boxes) {
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.right).toBeLessThanOrEqual(viewport.width + 0.1)
    expect(b.bottom).toBeLessThanOrEqual(viewport.height + 0.1)
    expect(b.width).toBeGreaterThan(44)
    expect(b.height).toBeGreaterThan(44)
  }
  for (const subject of await page.locator('[data-mosaic-project]').all()) {
    const f = await frame(subject)
    const zoom =
      (await subject.getAttribute('data-mosaic-project')) ===
        'informal-systems' && viewport.width >= viewport.height
        ? 2.5908862535031325
        : 5
    expect(
      Math.abs(f.mediaWidth - Math.max(f.width, f.height * f.ratio) * zoom),
    ).toBeLessThan(0.2)
    expect(f.x).toBeLessThanOrEqual(0.1)
    expect(f.y).toBeLessThanOrEqual(0.1)
    expect(f.x + f.mediaWidth).toBeGreaterThanOrEqual(f.width - 0.1)
    expect(f.y + f.mediaHeight).toBeGreaterThanOrEqual(f.height - 0.1)
  }
  await page
    .locator('main')
    .evaluate(root => root.style.setProperty('--mosaic-gap', '14px'))
  await expect(page.locator('[data-mosaic-layout]')).toHaveCSS('gap', '14px')
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })),
  ).toEqual(viewport)
  await expect(page.locator('[data-mosaic-layout]')).toHaveText('')
})

test('focus fits the whole cover and fades peers; hover interpolates without touch traps', async ({
  page,
  isMobile,
}) => {
  await ready(page)
  const subject = tile(page, 'loopio')
  await subject.focus()
  await expectFit(subject)
  await expect(tile(page, 'freshbooks')).toHaveCSS('opacity', '0.22')
  await expect(subject).toHaveCSS('outline-style', 'solid')
  await subject.evaluate(element => element.blur())
  if (!isMobile) {
    await expect
      .poll(async () => (await frame(subject)).mediaWidth)
      .toBeGreaterThan(1000)
    // Observe before hover so Playwright action scheduling cannot miss the motion.
    await subject.evaluate(element => {
      const media = element.querySelector('[data-mosaic-media]')!
      ;(window as unknown as { mosaicWidths: number[] }).mosaicWidths = []
      const start = performance.now()
      const tick = () => {
        ;(window as unknown as { mosaicWidths: number[] }).mosaicWidths.push(
          media.getBoundingClientRect().width,
        )
        if (performance.now() - start < 1200) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await subject.hover()
    await expectFit(subject)
    expect(
      await page.evaluate(
        () =>
          new Set(
            (window as unknown as { mosaicWidths: number[] }).mosaicWidths.map(
              Math.round,
            ),
          ).size,
      ),
    ).toBeGreaterThan(2)
    await page.mouse.move(0, 0)
  }
})

test('viewer opens only the first slide from keyboard and restores focus', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await ready(page)
  const subject = tile(page, 'loopio')
  await subject.focus()
  await subject.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: /^(Zoom in|Zoom out|Fit image to screen|Previous image|Next image)$/,
    }),
  ).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/slide=cover/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/grid-version$/)
  await expect(subject).toBeFocused()
  expect(errors).toEqual([])
})

test('one tap opens full video; only selected gallery media loads; Back and Forward restore the gallery', async ({
  page,
  isMobile,
}) => {
  const videos: string[] = []
  page.on('request', request => {
    if (/\.(webm|mp4)(?:\?|$)/.test(request.url())) videos.push(request.url())
  })
  await ready(page)
  await expect(page.locator('[data-mosaic-video]')).toHaveCount(4)
  const backgroundSources = await page
    .locator('[data-mosaic-video]')
    .evaluateAll(items => items.map(video => (video as HTMLVideoElement).src))
  expect(videos.every(url => backgroundSources.includes(url))).toBe(true)
  const subject = tile(page, 'aarons-toolbox')
  if (isMobile) await subject.tap()
  else await subject.click()
  const video = page.locator('.yarl__slide_current video')
  await expect(video).toBeVisible()
  await expect
    .poll(() => video.evaluate(v => (v as HTMLVideoElement).readyState))
    .toBeGreaterThanOrEqual(2)
  expect(
    await video.evaluate(v => ({
      muted: (v as HTMLVideoElement).muted,
      inline: (v as HTMLVideoElement).playsInline,
      controls: (v as HTMLVideoElement).controls,
    })),
  ).toEqual({ muted: true, inline: true, controls: true })
  expect(videos.every(url => backgroundSources.includes(url))).toBe(true)
  const openedUrl = page.url()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(openedUrl)
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(subject).toBeFocused()
  await page.goForward()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(openedUrl)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('reduced motion opens a fitted deep link and keeps video paused', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/grid-version?project=nextphrase-dot-app&slide=intro')
  const video = page.locator('.yarl__slide_current video')
  await expect(video).toBeVisible()
  await expect
    .poll(() => video.evaluate(v => (v as HTMLVideoElement).paused))
    .toBe(true)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/grid-version$/)
  await expect(tile(page, 'nextphrase-dot-app')).toBeFocused()
  await expect(page.locator('[data-mosaic-media]').first()).toHaveCSS(
    'transition-duration',
    '0s',
  )
})
