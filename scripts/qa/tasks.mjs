import { expect } from '@playwright/test'

const project = 'aarons-toolbox'
const mediaSelector = `[data-portfolio-carousel="${project}"]`

async function activate(locator, touch) {
  if (touch) await locator.tap()
  else await locator.click()
}

// A URL can update before the carousel has stopped. Wait for the actual tracks
// and viewer to hold still, without adding arbitrary seconds to every task.
async function settled(page) {
  await page.evaluate(() => {
    delete window.__qaSettle
  })
  await page.waitForFunction(
    () => {
      const elements = document.querySelectorAll(
        '[data-portfolio-vertical-carousel] > div, [data-portfolio-carousel] > div, .portfolio-viewer, .yarl__slide_current .yarl__slide_wrapper',
      )
      const positions = Array.from(elements, element => {
        const box = element.getBoundingClientRect()
        return [box.x, box.y, box.width, box.height]
          .map(value => Math.round(value * 2))
          .join(',')
      }).join('|')
      if (window.__qaSettle?.positions !== positions) {
        window.__qaSettle = { positions, since: performance.now() }
      }
      return performance.now() - window.__qaSettle.since >= 200
    },
    undefined,
    { timeout: 15_000, polling: 'raf' },
  )
}

async function activeSection(page, index) {
  await expect(
    page.locator(
      `[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="${index}"]`,
    ),
  ).toHaveAttribute('aria-current', 'page')
}

async function visibleMedia(page) {
  const source = page
    .locator(mediaSelector)
    .locator('[data-portfolio-viewer-source="active"]')
  await expect(source).toBeVisible()
  await expect
    .poll(
      () =>
        source
          .locator('img, video')
          .first()
          .evaluate(media =>
            media instanceof HTMLVideoElement
              ? media.readyState >= 2 && media.videoWidth > 0
              : media.complete && media.naturalWidth > 0,
          ),
      { timeout: 30_000 },
    )
    .toBe(true)
  const box = await source.boundingBox()
  const viewport = page.viewportSize()
  expect(box.width).toBeGreaterThan(40)
  expect(box.height).toBeGreaterThan(40)
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
}

async function swipe(page, cdp, selector, axis, touch) {
  const box = await page.locator(selector).boundingBox()
  expect(box).not.toBeNull()
  // Start horizontal gestures on the rendered media, not its seek controls.
  // Vertical gestures use the section edge, clear of narrative scroll regions
  // and media controls, with room to cross the outer snap midpoint.
  const media =
    axis === 'x'
      ? await page
          .locator(selector)
          .locator(
            '[data-portfolio-viewer-source="active"] [data-portfolio-media-action]',
          )
          .boundingBox()
      : null
  if (axis === 'x') expect(media).not.toBeNull()
  const start = media
    ? { x: media.x + media.width * 0.75, y: media.y + media.height * 0.5 }
    : { x: box.x + box.width * 0.9, y: box.y + box.height * 0.8 }
  expect(
    await page.evaluate(
      ({ x, y }) =>
        Boolean(
          document
            .elementFromPoint(x, y)
            ?.closest('[data-portfolio-carousel-drag-lock]'),
        ),
      start,
    ),
  ).toBe(false)
  const delta =
    axis === 'x'
      ? { x: -box.width * 0.6, y: -5 }
      : // The outer snap spans the viewport, not the shorter inner media stage.
        // Cross its midpoint so completion does not depend on flick velocity.
        { x: 5, y: -page.viewportSize().height * 0.6 }
  if (touch) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...start, id: 0 }],
    })
    for (let step = 1; step <= 12; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: start.x + (delta.x * step) / 12,
            y: start.y + (delta.y * step) / 12,
            id: 0,
          },
        ],
      })
      await page.waitForTimeout(16) // Gesture cadence, not an assertion sleep.
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
  } else {
    await page.mouse.move(start.x, start.y)
    for (let step = 0; step < 8; step++) {
      await page.mouse.wheel(axis === 'x' ? 100 : 5, axis === 'y' ? 90 : 5)
      await page.waitForTimeout(16)
    }
  }
}

// IDs map directly to TASKS.md and qa/config.json. Every task asserts an outcome.
// Only recover after a prior task left the wrong state. A recovered run remains
// blocked, but its other tasks can still provide diagnostic evidence.
export async function prepareTask(page, task) {
  const starts = {
    'choose-project': '/work',
    'horizontal-gesture': '/work/aarons-toolbox',
    'image-viewer': '/work/aarons-toolbox/normalizer',
    'vertical-navigation': '/work/aarons-toolbox',
    'appearance': '/work',
  }
  const path = starts[task]
  if (!path) return
  const current = new URL(page.url())
  if (current.pathname + current.search === path) return
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const curtain = page.locator('[data-portfolio-loading-curtain]')
  await expect(curtain).toHaveAttribute('data-phase', 'ready', {
    timeout: 45_000,
  })
  await expect(curtain).toHaveCSS('visibility', 'hidden', { timeout: 15_000 })
  await settled(page)
  if (path.includes('aarons-toolbox')) await visibleMedia(page)
}

export async function runTasks({ page, cdp, profile, measure }) {
  await measure(
    'cold-entry',
    async () => {
      await page.goto('/work', { waitUntil: 'domcontentloaded' })
      const curtain = page.locator('[data-portfolio-loading-curtain]')
      await expect(curtain).toHaveAttribute('data-phase', 'ready', {
        timeout: 45_000,
      })
      await expect(curtain).toHaveCSS('visibility', 'hidden', {
        timeout: 15_000,
      })
      await expect(
        page.locator('[data-portfolio-start-section-index="5"]'),
      ).toBeVisible()
      await settled(page)
    },
    { navigation: true },
  )

  await measure('choose-project', async () => {
    await activate(
      page.locator('[data-portfolio-start-section-index="5"]'),
      profile.touch,
    )
    await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
    await activeSection(page, 5)
    await settled(page)
    await visibleMedia(page)
  })

  await measure('horizontal-gesture', async () => {
    await swipe(page, cdp, mediaSelector, 'x', profile.touch)
    await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
    await activeSection(page, 5)
    await settled(page)
    await visibleMedia(page)
  })

  await measure('image-viewer', async () => {
    const source = page.locator(
      '[data-portfolio-screenshot-id="normalizer"][data-portfolio-viewer-source="active"] [data-portfolio-media-action]',
    )
    await activate(source, profile.touch)
    await expect(page.locator('.portfolio-viewer')).toBeVisible()
    await expect(page).toHaveURL(/normalizer\?modal=image$/)
    await settled(page)
    await activate(
      page.getByRole('button', { name: 'Previous image', exact: true }),
      profile.touch,
    )
    await expect(page).toHaveURL(/overview\?modal=image$/)
    await settled(page)
    await activate(
      page.getByRole('button', { name: 'Close enlarged image', exact: true }),
      profile.touch,
    )
    await expect(page.locator('.portfolio-viewer')).toHaveCount(0)
    await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
    await settled(page)
    await visibleMedia(page)
  })

  await measure('vertical-navigation', async () => {
    await swipe(page, cdp, mediaSelector, 'y', profile.touch)
    await expect(page).toHaveURL(/\/work\/nextphrase$/)
    await activeSection(page, 6)
    await settled(page)
    const logo = page.locator('[data-portfolio-home-logo]:visible').first()
    await activate(logo, profile.touch)
    await expect(page).toHaveURL(/\/work$/)
    await settled(page)
  })

  await measure('appearance', async () => {
    await activate(
      page.locator('[data-portfolio-theme-trigger]'),
      profile.touch,
    )
    await expect(page.locator('[data-portfolio-theme-menu]')).toBeVisible()
    await activate(
      page.getByRole('menuitemradio', { name: 'Light', exact: true }),
      profile.touch,
    )
    await expect(page.locator('html')).toHaveAttribute(
      'data-portfolio-theme',
      'light',
    )
    await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCount(0)
    expect(
      await page.evaluate(() => localStorage.getItem('portfolio-theme')),
    ).toBe('light')
    await settled(page)
  })
}
