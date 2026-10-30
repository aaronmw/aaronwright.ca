import { expect, test, type Locator, type Page } from '@playwright/test'
import { gridReady, notesReady, viewerReady } from '../../scripts/qa/tasks.mjs'

async function everyVideoPlaying(backgrounds: Locator) {
  // Segment seeks briefly hold a canvas. Observe every video's live frames
  // without requiring all nine independent seek cycles to align in one sample.
  const observed = new Set<string>()
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
              playing:
                video.readyState >= 2 &&
                !video.paused &&
                video.muted &&
                video.playsInline,
            }
          }),
        )
        for (const state of states) if (state.playing) observed.add(state.id)
        return states.filter(state => !observed.has(state.id))
      },
      { timeout: 30_000 },
    )
    .toEqual([])
}

test('production grid has ten projects and no retired theme or development controls', async ({
  page,
  request,
}) => {
  expect((await request.get('/copy-editor')).status()).toBe(404)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (
      new URL(response.url()).origin === new URL(page.url()).origin &&
      response.status() >= 400
    )
      errors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto('/work')
  await gridReady(page)
  await expect(
    page.getByRole('button', { name: 'Project development tools' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('complementary', { name: 'Project cell adjustments' }),
  ).toHaveCount(0)
  await expect(
    page.locator(
      '[data-portfolio-theme-trigger], [data-portfolio-vertical-carousel]',
    ),
  ).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const colorScheme of ['dark', 'light'] as const) {
  test(`the ${colorScheme} system preference retains the grid's dark appearance`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    // A preference saved by the retired portfolio must not override the grid.
    await page.addInitScript(() =>
      localStorage.setItem('portfolio-theme', 'light'),
    )
    await page.goto('/work')
    await gridReady(page)
    await expect(page.locator('main')).toHaveCSS(
      'background-color',
      'rgb(0, 0, 0)',
    )
    await page.locator('[data-mosaic-project="loopio"]').click()
    await viewerReady(page)
    await expect(
      page.getByRole('complementary', { name: 'Loopio overview' }),
    ).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })
}

test('About opens its biography and portrait, then Escape returns keyboard focus', async ({
  page,
}) => {
  await page.goto('/work')
  await gridReady(page)
  const about = page.locator('[data-mosaic-project="about-me"]')
  await about.focus()
  await about.press('Enter')
  await viewerReady(page)
  const dialog = page.getByRole('dialog')
  await expect(page).toHaveURL('/work/about-me')
  await expect(
    dialog.getByRole('region', { name: 'About Aaron Wright' }),
  ).toBeVisible()
  await expect(dialog.getByText(/I’m hooked on turning ideas/)).toBeVisible()
  await expect(dialog.locator('[data-mosaic-about-portrait]')).toBeVisible()
  await expect(
    dialog.getByRole('button', {
      name: /^(Play video|Pause video|Show project details|Hide project details)$/,
    }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(about).toBeFocused()
  await expect(page).toHaveURL('/work')
})

test('inline videos pause behind the viewer; pause, seek, resume and close work', async ({
  page,
}) => {
  await page.goto('/work')
  await gridReady(page)
  const backgrounds = page.locator('[data-mosaic-video]')
  await expect(backgrounds).toHaveCount(9)
  await everyVideoPlaying(backgrounds)
  await page.locator('[data-mosaic-project="informal-systems"]').click()
  await viewerReady(page)
  const video = page.locator('.yarl__slide_current video')
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
  const seek = page.getByRole('slider', { name: /^Seek through / })
  await seek.focus()
  await seek.press('Home')
  await seek.press('ArrowRight')
  await expect
    .poll(() =>
      video.evaluate(element => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0)
  await expect(seek).toBeFocused()
  await page.getByRole('button', { name: 'Play video', exact: true }).click()
  await expect
    .poll(() => video.evaluate(element => (element as HTMLVideoElement).paused))
    .toBe(false)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await everyVideoPlaying(backgrounds)
})

type InkSample = { points: number[]; expanded: string | null }
type NotesObservation = {
  samples: InkSample[]
  stop: () => void
  width: number
  height: number
  pixel: number
}
type NotesWindow = Window & { qaNotes?: NotesObservation }

async function observeNotes(page: Page) {
  await page.evaluate(() => {
    const layer = document.querySelector('.yarl__root [data-controls-ready]')!
    const panel = layer.querySelector('aside')!
    const svg = layer.querySelector(':scope > svg')!
    const path = svg.querySelector('defs > path')!
    const button = layer.querySelector('button[aria-expanded]')!
    let stopped = false
    const samples: InkSample[] = []
    const box = panel.getBoundingClientRect()
    const pixel = parseFloat(getComputedStyle(panel).borderTopWidth)
    ;(window as NotesWindow).qaNotes = {
      samples,
      stop: () => {
        stopped = true
      },
      width: box.width,
      height: box.height,
      pixel,
    }
    const sample = () => {
      if (stopped) return
      if (
        layer.hasAttribute('data-animating') &&
        Number(svg.getAttribute('opacity')) > 0
      )
        samples.push({
          points: (path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g) ?? []).map(
            Number,
          ),
          expanded: button.getAttribute('aria-expanded'),
        })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

async function finishNotes(page: Page) {
  return page.evaluate(() => {
    const observation = (window as NotesWindow).qaNotes!
    observation.stop()
    return {
      samples: observation.samples,
      width: observation.width,
      height: observation.height,
      pixel: observation.pixel,
    }
  })
}

function distance(points: number[], expected: number[]) {
  return Math.max(
    ...points.map((point, index) => Math.abs(point - expected[index])),
  )
}

function assertNotesChoreography(
  observation: Awaited<ReturnType<typeof finishNotes>>,
  opening: boolean,
) {
  const { width, height, pixel } = observation
  const samples = opening
    ? observation.samples
    : [...observation.samples].reverse()
  expect(samples.length).toBeGreaterThan(5)
  const seed = [
    0,
    height - pixel,
    pixel,
    height - pixel,
    pixel,
    height,
    0,
    height,
  ]
  const landed = samples.findIndex(
    sample => distance(sample.points, seed) < 0.001,
  )
  expect(
    landed,
    'The travelling square reaches the panel bottom-left before unfolding',
  ).toBeGreaterThan(0)
  for (const sample of samples.slice(0, landed)) {
    const [
      left,
      top,
      right,
      rightTop,
      bottomRight,
      bottom,
      bottomLeft,
      leftBottom,
    ] = sample.points
    expect(right - left).toBeCloseTo(pixel, 1)
    expect(bottom - top).toBeCloseTo(pixel, 1)
    expect(rightTop).toBeCloseTo(top, 1)
    expect(bottomRight).toBeCloseTo(right, 1)
    expect(bottomLeft).toBeCloseTo(left, 1)
    expect(leftBottom).toBeCloseTo(bottom, 1)
  }
  const unfolded = samples.slice(landed)
  for (const sample of unfolded) {
    expect(sample.points[6]).toBeCloseTo(0, 1)
    expect(sample.points[7]).toBeCloseTo(height, 1)
  }
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
  ]
  const arrivals = corners.map((target, corner) =>
    unfolded.findIndex(
      sample =>
        distance(sample.points.slice(corner * 2, corner * 2 + 2), target) < 0.2,
    ),
  )
  expect(arrivals[0]).toBeGreaterThan(0)
  expect(arrivals[1]).toBeGreaterThan(arrivals[0])
  expect(arrivals[2]).toBeGreaterThan(arrivals[1])
}

test('Notes travels as a square to the bottom-left, unfolds three corners, and retraces on close', async ({
  page,
}) => {
  await page.goto('/work/loopio')
  await viewerReady(page)
  await page
    .getByRole('button', { name: 'Hide project details', exact: true })
    .click()
  await notesReady(page, false)
  await observeNotes(page)
  await page
    .getByRole('button', { name: 'Show project details', exact: true })
    .click()
  await notesReady(page, true)
  const opening = await finishNotes(page)
  assertNotesChoreography(opening, true)
  await observeNotes(page)
  await page
    .getByRole('button', { name: 'Hide project details', exact: true })
    .click()
  await notesReady(page, false)
  const closing = await finishNotes(page)
  assertNotesChoreography(closing, false)
  await test.info().attach('notes-motion.json', {
    body: JSON.stringify({ opening, closing }),
    contentType: 'application/json',
  })
})

test('rapid Notes reversals settle to the final request without stale inert content', async ({
  page,
}) => {
  await page.goto('/work/loopio')
  await viewerReady(page)
  const control = page.locator('.yarl__root button[aria-expanded]')
  // Start from a settled collapsed state. A single browser-frame observer
  // drives open → close → open → close at substantial intermediate polygon
  // areas, without protocol round trips that can miss a short reversed phase.
  await notesReady(page, true)
  await control.click()
  await notesReady(page, false)
  const reversals = await page.evaluate(
    () =>
      new Promise<
        Array<{
          expanded: boolean
          area: number
          animating: boolean
        }>
      >((resolve, reject) => {
        const layer = document.querySelector(
          '.yarl__root [data-controls-ready]',
        )!
        const panel = layer.querySelector('aside')!
        const path = layer.querySelector('svg defs > path')!
        const button = layer.querySelector<HTMLButtonElement>(
          'button[aria-expanded]',
        )!
        const box = panel.getBoundingClientRect()
        const reversals: Array<{
          expanded: boolean
          area: number
          animating: boolean
        }> = []
        let frame = 0
        const timer = setTimeout(() => {
          cancelAnimationFrame(frame)
          reject(
            new Error(
              `Notes did not reach three intermediate reversal points: ${JSON.stringify(reversals)}; expanded=${button.getAttribute('aria-expanded')}; animating=${layer.hasAttribute('data-animating')}`,
            ),
          )
        }, 10_000)
        function sample() {
          const points = (
            path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g) ?? []
          ).map(Number)
          const area =
            Math.abs(
              [0, 1, 2, 3].reduce((sum, index) => {
                const next = (index + 1) % 4
                return (
                  sum +
                  points[index * 2] * points[next * 2 + 1] -
                  points[next * 2] * points[index * 2 + 1]
                )
              }, 0),
            ) /
            (2 * box.width * box.height)
          const expanded = button.getAttribute('aria-expanded') === 'true'
          const animating = layer.hasAttribute('data-animating')
          const opening = reversals.length !== 1
          const intermediate = opening
            ? area >= 0.55 && area < 0.9
            : area <= 0.35 && area > 0.1
          if (animating && expanded === opening && intermediate) {
            reversals.push({ expanded, area, animating })
            button.click()
            if (reversals.length === 3) {
              clearTimeout(timer)
              resolve(reversals)
              return
            }
          }
          frame = requestAnimationFrame(sample)
        }
        frame = requestAnimationFrame(sample)
        button.click()
      }),
  )
  expect(reversals.map(reversal => reversal.expanded)).toEqual([
    true,
    false,
    true,
  ])
  for (const reversal of reversals) {
    expect(reversal.animating).toBe(true)
    expect(reversal.area).toBeGreaterThan(0.1)
    expect(reversal.area).toBeLessThan(0.9)
  }
  await test.info().attach('notes-reversals.json', {
    body: JSON.stringify(reversals),
    contentType: 'application/json',
  })
  await notesReady(page, false)
  await expect(
    page.getByRole('region', { name: 'Loopio description' }),
  ).toHaveCount(0)
  await control.click()
  await notesReady(page, true)
  const content = page.getByRole('region', { name: 'Loopio description' })
  await content.focus()
  await expect(content).toBeFocused()
  // Safari pointer activation does not focus buttons. Exercise the keyboard
  // collapse contract explicitly before asserting focus moves out of the panel.
  const minimize = page.getByRole('button', {
    name: 'Minimize project details',
    exact: true,
  })
  await minimize.focus()
  await minimize.press('Enter')
  await notesReady(page, false)
  await expect(control).toBeFocused()
})

test('Notes uses 1.625 line height and inline links underline only on hover or keyboard focus', async ({
  page,
  isMobile,
}) => {
  await page.goto('/work/nextphrase')
  await viewerReady(page)
  const description = page.getByRole('region', {
    name: 'NextPhrase description',
  })
  expect(
    await description.evaluate(element => {
      const style = getComputedStyle(element)
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize)
    }),
  ).toBe(1.625)
  const link = description.getByRole('link', { name: 'NextPhrase.app' })
  await expect(link).toHaveCSS('text-decoration-line', 'none')
  await link.focus()
  await expect(link).toHaveCSS('text-decoration-line', 'underline')
  await link.evaluate(element => (element as HTMLElement).blur())
  if (!isMobile) {
    await link.hover()
    await expect(link).toHaveCSS('text-decoration-line', 'underline')
    await page.mouse.move(0, 0)
    await expect(link).toHaveCSS('text-decoration-line', 'none')
  }
})
