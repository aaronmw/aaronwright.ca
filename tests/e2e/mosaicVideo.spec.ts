import { expect, test, type Locator, type Page } from '@playwright/test'

declare global {
  interface Window {
    mosaicVideoClipboard: { fail: boolean; writes: string[] }
  }
}

const backgrounds = (page: Page) => page.locator('[data-mosaic-video]')
const toolbox = (page: Page) =>
  page.locator('[data-mosaic-project="aarons-toolbox"]')
const toolbar = (page: Page) =>
  page.getByRole('complementary', { name: 'Project cell adjustments' })

async function ready(page: Page) {
  await page.goto('/grid-version')
  await expect(backgrounds(page)).toHaveCount(4)
  await expect
    .poll(() =>
      backgrounds(page).evaluateAll(videos =>
        videos.every(item => {
          const video = item as HTMLVideoElement
          return (
            video.readyState >= 2 &&
            Number.isFinite(video.duration) &&
            video.duration > 0
          )
        }),
      ),
    )
    .toBe(true)
}

async function playing(page: Page, value: boolean) {
  await expect
    .poll(() =>
      backgrounds(page).evaluateAll(
        (videos, expected) =>
          videos.every(item => (item as HTMLVideoElement).paused !== expected),
        value,
      ),
    )
    .toBe(true)
}

async function stubClipboard(page: Page, fail = false) {
  await page.addInitScript(failed => {
    window.mosaicVideoClipboard = { fail: failed, writes: [] }
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          window.mosaicVideoClipboard.writes.push(text)
          if (window.mosaicVideoClipboard.fail)
            throw new DOMException('Clipboard denied', 'NotAllowedError')
        },
      },
    })
  }, fail)
}

async function editVideo(page: Page) {
  await page.getByRole('button', { name: 'Project development tools' }).click()
  await page.getByRole('button', { name: 'Adjust project cells' }).click()
  await toolbox(page).focus()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('spinbutton', { name: 'Loop start', exact: true }),
  ).toBeEnabled()
  await expect(
    page.getByRole('spinbutton', { name: 'Loop end', exact: true }),
  ).toBeEnabled()
  return toolbox(page).locator('[data-mosaic-video]')
}

async function range(page: Page, start: string, end: string) {
  await page
    .getByRole('spinbutton', { name: 'Loop start', exact: true })
    .fill(start)
  await page
    .getByRole('spinbutton', { name: 'Loop end', exact: true })
    .fill(end)
}

async function observe(video: Locator, milliseconds: number) {
  // A new range may still be seeking while the prior decoded frame is held.
  // Start the timed sample only once the new range is presenting live frames.
  await expect
    .poll(() =>
      video.evaluate(element => {
        const media = element as HTMLVideoElement
        return (
          !media.seeking &&
          media.readyState >= 2 &&
          !media.paused &&
          media
            .closest('[data-mosaic-video-state]')
            ?.getAttribute('data-mosaic-video-state') === 'playing'
        )
      }),
    )
    .toBe(true)
  // Sample actual playback rather than dispatching synthetic timeupdate events.
  return video.evaluate(
    (element, duration) =>
      new Promise<{ times: number[]; seeks: number }>(resolve => {
        const media = element as HTMLVideoElement
        const times: number[] = []
        let seeks = 0
        const seek = () => {
          seeks++
        }
        media.addEventListener('seeking', seek)
        const start = performance.now()
        function sample() {
          times.push(media.currentTime)
          if (performance.now() - start < duration)
            requestAnimationFrame(sample)
          else {
            media.removeEventListener('seeking', seek)
            resolve({ times, seeks })
          }
        }
        requestAnimationFrame(sample)
      }),
    milliseconds,
  )
}

test('all video backgrounds play inline together and pause/resume around gallery and simulated page visibility', async ({
  page,
}) => {
  await ready(page)
  await playing(page, true)
  expect(
    await backgrounds(page).evaluateAll(videos =>
      videos.map(item => {
        const video = item as HTMLVideoElement
        return {
          muted: video.muted,
          inline: video.playsInline,
          controls: video.controls,
        }
      }),
    ),
  ).toEqual(
    Array.from({ length: 4 }, () => ({
      muted: true,
      inline: true,
      controls: false,
    })),
  )
  const initial = await backgrounds(page).evaluateAll(videos =>
    videos.map(item => (item as HTMLVideoElement).currentTime),
  )
  await expect
    .poll(() =>
      backgrounds(page).evaluateAll(
        (videos, before) =>
          videos.every(
            (item, index) =>
              (item as HTMLVideoElement).currentTime !== before[index],
          ),
        initial,
      ),
    )
    .toBe(true)
  await expect(page.locator('[data-mosaic-project="loopio"] img')).toBeVisible()
  await expect(
    page.locator('[data-mosaic-project="loopio"] video'),
  ).toHaveCount(0)
  await toolbox(page).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await playing(page, false)
  const viewer = page.locator('.yarl__slide_current video')
  await expect(viewer).toBeVisible()
  await expect(viewer).toHaveAttribute('poster', /^blob:/)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await playing(page, true)

  // This instruments the visibility API; it does not claim physical tab switching.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await playing(page, false)
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'visibilityState')
    Reflect.deleteProperty(document, 'hidden')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await playing(page, true)
})

test('reduced motion keeps background posters still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/grid-version')
  await expect(page.locator('[data-mosaic-project]')).toHaveCount(7)
  await expect
    .poll(() =>
      backgrounds(page).evaluateAll(items =>
        items.every(item => (item as HTMLVideoElement).paused),
      ),
    )
    .toBe(true)
  for (const slug of [
    'cycles-dot-money',
    'aarons-toolbox',
    'informal-systems',
    'nextphrase-dot-app',
  ]) {
    const media = page.locator(
      `[data-mosaic-project="${slug}"] [data-mosaic-video-state]`,
    )
    await expect(media).toHaveAttribute(
      'data-mosaic-video-state',
      'reduced-motion',
    )
    await expect(media.locator('img:not([hidden])')).toBeVisible()
    await expect(media.locator('video')).not.toHaveAttribute('src', /.+/)
  }
})

test('video loop inputs validate metadata bounds and preview bounded and very short segments without seek storms', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Detailed timeline behavior is exercised on both desktop engines.',
  )
  await ready(page)
  const video = await editVideo(page)
  const start = page.getByRole('spinbutton', {
    name: 'Loop start',
    exact: true,
  })
  const end = page.getByRole('spinbutton', { name: 'Loop end', exact: true })
  const duration = await video.evaluate(
    element => (element as HTMLVideoElement).duration,
  )
  await expect(start).toHaveAttribute('step', '0.01')
  await expect(end).toHaveAttribute('step', '0.01')
  expect(Number(await end.inputValue())).toBeCloseTo(duration, 1)
  await range(page, '1', '1.4')
  await expect
    .poll(() =>
      video.evaluate(element => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThanOrEqual(0.99)
  const sample = await observe(video, 1200)
  expect(Math.min(...sample.times)).toBeGreaterThanOrEqual(0.99)
  expect(Math.max(...sample.times)).toBeLessThan(1.55)
  expect(sample.seeks).toBeGreaterThanOrEqual(1)
  expect(sample.seeks).toBeLessThan(10)
  await end.fill(String(duration + 1))
  await expect(end).toHaveAttribute('aria-invalid', 'true')
  await expect(toolbar(page).getByRole('alert')).toBeVisible()
  const invalid = await observe(video, 650)
  expect(Math.min(...invalid.times)).toBeGreaterThanOrEqual(0.99)
  expect(Math.max(...invalid.times)).toBeLessThan(1.55)
  await end.fill('0.5')
  await expect(end).toHaveAttribute('aria-invalid', 'true')
  await end.fill('1.1')
  await expect(end).not.toHaveAttribute('aria-invalid', 'true')
  const short = await observe(video, 750)
  expect(Math.min(...short.times)).toBeGreaterThanOrEqual(0.99)
  expect(Math.max(...short.times)).toBeLessThan(1.25)
  expect(short.seeks).toBeGreaterThanOrEqual(1)
  expect(short.seeks).toBeLessThan(20)
  await page
    .getByRole('button', { name: 'Use full video', exact: true })
    .click()
  await expect(start).toHaveValue('0')
  expect(Number(await end.inputValue())).toBeCloseTo(duration, 1)
  await expect
    .poll(() =>
      video.evaluate(element => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(1.5)
})

test('loop drafts export with crop settings, survive copy failure, and disappear when full playback is restored', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Detailed export workflow is exercised on both desktop engines.',
  )
  await stubClipboard(page, true)
  await ready(page)
  await editVideo(page)
  await toolbox(page).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await range(page, '1', '2')
  await page.getByRole('button', { name: 'Done & copy', exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Adjustment JSON' })
  await expect(json).toBeVisible()
  const text = await json.inputValue()
  const exported = JSON.parse(text)
  expect(text).toBe(JSON.stringify(exported, null, 2))
  expect(exported.schemaVersion).toBe(5)
  expect(exported.cells['aarons-toolbox-overview'].segments).toMatchObject([
    { start: 1, end: 2, fadeIn: false, fadeOut: false },
  ])
  expect(exported.cells['aarons-toolbox-overview'].composition.zoom).toBe(5)
  for (const id of [
    'loopio-cover',
    'freshbooks-cover',
    'about-portrait',
    'nextphrase-intro',
  ]) {
    expect(exported.cells[id]).not.toHaveProperty('segments')
  }
  expect(exported.cells['informal-systems-walkthrough'].segments).toMatchObject(
    [{ start: 1, end: 6, fadeIn: false, fadeOut: false }],
  )
  expect(exported.cells['informal-systems-walkthrough'].composition.zoom).toBe(
    2.5908862535031325,
  )
  expect(
    exported.cells['informal-systems-walkthrough'].composition.focal,
  ).toEqual({
    x: 0.7606876985275945,
    y: 0.12865610479141412,
  })
  expect(exported.cells['aarons-toolbox-overview'].composition.focal).toEqual({
    x: 0.8376783392368743,
    y: 0.37840649240012547,
  })
  await page.evaluate(() => {
    window.mosaicVideoClipboard.fail = false
  })
  await page.getByRole('button', { name: 'Retry copy', exact: true }).click()
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
  expect(await page.evaluate(() => window.mosaicVideoClipboard.writes)).toEqual(
    [text, text],
  )
  await toolbox(page).click()
  const viewer = page.locator('.yarl__slide_current video')
  await expect(viewer).toBeVisible()
  await expect
    .poll(() =>
      viewer.evaluate(element => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThanOrEqual(2)
  expect(
    await viewer.evaluate(element => (element as HTMLVideoElement).loop),
  ).toBe(true)
  await viewer.evaluate(element => {
    ;(element as HTMLVideoElement).currentTime = 2.5
  })
  await expect
    .poll(() =>
      viewer.evaluate(element => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(2.4)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await editVideo(page)
  await expect(
    page.getByRole('spinbutton', { name: 'Loop start', exact: true }),
  ).toHaveValue('1')
  await expect(
    page.getByRole('spinbutton', { name: 'Loop end', exact: true }),
  ).toHaveValue('2')
  await page
    .getByRole('button', { name: 'Use full video', exact: true })
    .click()
  await page.getByRole('button', { name: 'Done & copy', exact: true }).click()
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
  const full = JSON.parse(
    await page.evaluate(() => window.mosaicVideoClipboard.writes.at(-1)!),
  )
  expect(full.cells['aarons-toolbox-overview']).not.toHaveProperty('segments')
  expect(full.cells['informal-systems-walkthrough']).toEqual(
    exported.cells['informal-systems-walkthrough'],
  )
  expect(full.cells['aarons-toolbox-overview'].landscape).toEqual(
    exported.cells['aarons-toolbox-overview'].landscape,
  )
  expect(full.cells['aarons-toolbox-overview'].portrait).toEqual(
    exported.cells['aarons-toolbox-overview'].portrait,
  )
})

test('denied background autoplay preserves a poster and does not interfere with the gallery', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Rejected-play fallback is exercised on both desktop engines.',
  )
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      if (this.hasAttribute('data-mosaic-video'))
        return Promise.reject(
          new DOMException('Autoplay denied', 'NotAllowedError'),
        )
      return play.call(this)
    }
  })
  await page.goto('/grid-version')
  await expect(backgrounds(page)).toHaveCount(4)
  await playing(page, false)
  for (const media of await page.locator('[data-mosaic-video-state]').all()) {
    await expect(media).toHaveAttribute(
      'data-mosaic-video-state',
      'autoplay-denied',
    )
    await expect(media.locator('img:not([hidden])')).toBeVisible()
  }
  await toolbox(page).click()
  const gallery = page.locator('.yarl__slide_current video')
  await expect(gallery).toBeVisible()
  await expect
    .poll(() =>
      gallery.evaluate(element => (element as HTMLVideoElement).paused),
    )
    .toBe(false)
})
