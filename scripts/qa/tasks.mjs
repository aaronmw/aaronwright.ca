import { expect } from '@playwright/test'

const project = 'loopio'
const projectPath = `/work/${project}`
const notesSelector = '.yarl__root [data-controls-ready]'

async function activate(locator, touch) {
  if (touch) await locator.tap()
  else await locator.click()
}

// Readiness is observable UI state, not network-idle: nine background videos loop.
// Sampling on animation frames avoids assertion retry backoff in timed journeys.
export async function gridReady(page) {
  await page.waitForFunction(
    () => {
      const grid = document.querySelector('[data-mosaic-layout="packed"]')
      const cells = grid?.querySelectorAll('[data-mosaic-cell]')
      return (
        document.fonts.status === 'loaded' &&
        cells?.length === 10 &&
        [...cells].every(cell => {
          const tile = cell.querySelector('[data-mosaic-project]')
          return (
            cell.getAttribute('data-mosaic-entrance') === 'arrived' &&
            cell.hasAttribute('data-mosaic-media-ready') &&
            !tile?.closest('[inert]') &&
            tile &&
            getComputedStyle(tile.parentElement).opacity === '1'
          )
        })
      )
    },
    undefined,
    { timeout: 60_000, polling: 'raf' },
  )
}

export async function viewerReady(page) {
  await page.waitForFunction(
    async () => {
      const root = document.querySelector(
        '.yarl__root[data-mosaic-transition-state="open"]',
      )
      if (!root || root.querySelector('[data-animating]')) return false
      const media = root.querySelector(
        '.yarl__slide_current video, .yarl__slide_current img',
      )
      if (media instanceof HTMLVideoElement) {
        // Reduced motion intentionally leaves preload=none and presents a still
        // poster. A decoded video frame is required only for normal playback.
        if (
          matchMedia('(prefers-reduced-motion: reduce)').matches &&
          media.paused &&
          media.poster
        ) {
          const poster = new Image()
          poster.src = media.poster
          await poster.decode()
          return poster.naturalWidth > 0
        }
        return media.readyState >= 2 && media.videoWidth > 0
      }
      return (
        media instanceof HTMLImageElement &&
        media.complete &&
        media.naturalWidth > 0
      )
    },
    undefined,
    { timeout: 60_000, polling: 'raf' },
  )
}

export async function notesReady(page, expanded) {
  await page.waitForFunction(
    ({ selector, expanded }) => {
      const layer = document.querySelector(selector)
      const panel = layer?.querySelector('aside')
      const control = layer?.querySelector('button[aria-expanded]')
      return (
        layer &&
        !layer.hasAttribute('data-animating') &&
        layer.hasAttribute('data-collapsed') !== expanded &&
        control?.getAttribute('aria-expanded') === String(expanded) &&
        panel?.getAttribute('aria-hidden') === String(!expanded) &&
        getComputedStyle(panel).opacity === (expanded ? '1' : '0')
      )
    },
    { selector: notesSelector, expanded },
    { timeout: 15_000, polling: 'raf' },
  )
}

// Observe stable interaction surfaces for 200 ms. Do not inspect video pixels,
// playback time, segmented background crops, or infinite animation timelines.
// GSAP-owned viewer/Notes motion exposes its completion explicitly.
export async function settled(page) {
  await page.evaluate(() => {
    delete window.__qaSettle
  })
  await page.waitForFunction(
    () => {
      const root = document.querySelector('.yarl__root')
      if (
        (root &&
          root.getAttribute('data-mosaic-transition-state') !== 'open') ||
        root?.querySelector('[data-animating]') ||
        document.querySelector('[data-mosaic-transition]')
      ) {
        delete window.__qaSettle
        return false
      }
      const elements = document.querySelectorAll(
        '[data-mosaic-layout], [data-mosaic-cell], .yarl__root, ' +
          '.yarl__slide_current, .yarl__root [data-controls-ready] aside, ' +
          '[data-mosaic-return-focus] [data-mosaic-media]',
      )
      if (!elements.length) return false
      const positions = [...elements]
        .map(element => {
          const box = element.getBoundingClientRect()
          return [box.x, box.y, box.width, box.height]
            .map(value => Math.round(value * 2))
            .join(',')
        })
        .join('|')
      if (window.__qaSettle?.positions !== positions)
        window.__qaSettle = { positions, since: performance.now() }
      return performance.now() - window.__qaSettle.since >= 200
    },
    undefined,
    { timeout: 15_000, polling: 'raf' },
  )
}

async function videoState(page, paused) {
  await page.waitForFunction(
    paused => {
      const video = document.querySelector('.yarl__slide_current video')
      return (
        video instanceof HTMLVideoElement &&
        video.readyState >= 2 &&
        video.paused === paused
      )
    },
    paused,
    { timeout: 30_000, polling: 'raf' },
  )
}

// Recovery happens outside measurement and cannot make a failed run eligible.
export async function prepareTask(page, task) {
  const starts = {
    'open-project': '/work',
    'toggle-notes': projectPath,
    'video-controls': projectPath,
    'close-viewer': projectPath,
    'open-about': '/work',
  }
  const path = starts[task]
  if (!path) return
  const current = new URL(page.url())
  if (current.pathname + current.search !== path) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    if (path === '/work') await gridReady(page)
    else await viewerReady(page)
    await settled(page)
  }
  // Expanded videos now stop at the end. The preceding Notes journey may
  // outlast this short clip; restore this journey's playing start state before
  // timing the same pause/seek/resume actions. Never recover a failed action.
  if (
    task === 'video-controls' &&
    (await page
      .locator('.yarl__slide_current video')
      .evaluate(video => video.ended))
  ) {
    await page.getByRole('button', { name: 'Play video', exact: true }).click()
    await videoState(page, false)
  }
}

export async function runTasks({ page, profile, measure }) {
  await measure(
    'cold-entry',
    async () => {
      await page.goto('/work', { waitUntil: 'domcontentloaded' })
      await gridReady(page)
      await settled(page)
    },
    {
      navigation: true,
      verify: async () => {
        await expect(page).toHaveURL('/work')
        await expect(page.locator('[data-mosaic-project]')).toHaveCount(10)
        await expect(page.locator('[data-mosaic-layout]')).toHaveAttribute(
          'data-mosaic-layout',
          'packed',
        )
      },
    },
  )

  await measure(
    'open-project',
    async () => {
      await activate(
        page.locator(`[data-mosaic-project="${project}"]`),
        profile.touch,
      )
      await viewerReady(page)
      await settled(page)
    },
    {
      verify: async () => {
        await expect(page).toHaveURL(projectPath)
        await expect(page.getByRole('dialog')).toBeVisible()
        await expect(
          page.getByRole('region', { name: 'Loopio description' }),
        ).toBeVisible()
      },
    },
  )

  await measure(
    'toggle-notes',
    async () => {
      await activate(
        page.getByRole('button', { name: 'Hide project details', exact: true }),
        profile.touch,
      )
      await notesReady(page, false)
      await activate(
        page.getByRole('button', { name: 'Show project details', exact: true }),
        profile.touch,
      )
      await notesReady(page, true)
      await settled(page)
    },
    {
      verify: async () => {
        await expect(
          page.getByRole('region', { name: 'Loopio description' }),
        ).toBeVisible()
        await expect(page).toHaveURL(projectPath)
      },
    },
  )

  await measure('video-controls', async () => {
    await videoState(page, false)
    await activate(
      page.getByRole('button', { name: 'Pause video', exact: true }),
      profile.touch,
    )
    await videoState(page, true)
    const seek = page.getByRole('slider', { name: /^Seek through / })
    const box = await seek.boundingBox()
    expect(box).not.toBeNull()
    if (profile.touch)
      await page.touchscreen.tap(
        box.x + box.width * 0.5,
        box.y + box.height * 0.5,
      )
    else
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await page.waitForFunction(
      () => {
        const video = document.querySelector('.yarl__slide_current video')
        return (
          video instanceof HTMLVideoElement &&
          !video.seeking &&
          Math.abs(video.currentTime / video.duration - 0.5) < 0.08
        )
      },
      undefined,
      { timeout: 30_000, polling: 'raf' },
    )
    await activate(
      page.getByRole('button', { name: 'Play video', exact: true }),
      profile.touch,
    )
    await videoState(page, false)
    await settled(page)
  })

  await measure(
    'close-viewer',
    async () => {
      await activate(
        page.getByRole('button', { name: 'Close viewer', exact: true }),
        profile.touch,
      )
      await page.waitForFunction(
        () =>
          !document.querySelector(
            '.yarl__root, [data-mosaic-source-hidden], [data-mosaic-transition]',
          ),
        undefined,
        { timeout: 15_000, polling: 'raf' },
      )
      await gridReady(page)
      await settled(page)
    },
    {
      verify: async () => {
        await expect(page).toHaveURL('/work')
      },
    },
  )

  await measure(
    'open-about',
    async () => {
      await activate(
        page.locator('[data-mosaic-project="about-me"]'),
        profile.touch,
      )
      await viewerReady(page)
      await settled(page)
    },
    {
      verify: async () => {
        await expect(page).toHaveURL('/work/about-me')
        await expect(
          page.getByRole('region', { name: 'About Aaron Wright' }),
        ).toBeVisible()
        await expect(
          page.getByRole('article', { name: 'Biography' }),
        ).toBeVisible()
      },
    },
  )
}
