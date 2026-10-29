import { expect, test, type Locator, type Page } from '@playwright/test'

type Sample = {
  source: boolean
  overlay: boolean
  viewer: boolean
  phase: string | null
  sourceWidth: number
  sourceHeight: number
  overlayType: string | null
  videoReplaced: boolean
}
type Observation = { samples: Sample[]; stop: () => void }
type ObservedWindow = Window & {
  mosaicTransitionObservation?: Observation
  mosaicPhaseActions?: string[]
}

async function ready(page: Page, route: string) {
  await page.goto(route)
  await expect(page.locator('[data-mosaic-project]')).toHaveCount(7)
  await page
    .locator('[data-mosaic-media] img')
    .evaluateAll(images =>
      Promise.all(images.map(image => (image as HTMLImageElement).decode())),
    )
}

async function settle(subject: Locator) {
  await subject.evaluate(async element => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map(animation => animation.finished.catch(() => {})),
    )
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  })
}

async function observe(page: Page, slug: string) {
  await page.evaluate(project => {
    const state = window as ObservedWindow
    state.mosaicTransitionObservation?.stop()
    const source = document.querySelector<HTMLElement>(
      `[data-mosaic-project="${project}"]`,
    )!
    const media = source.querySelector<HTMLElement>('[data-mosaic-media]')!
    let stopped = false
    let openVideo: HTMLVideoElement | null = null
    const samples: Sample[] = []
    function visible(element: Element | null) {
      if (!element || !element.isConnected) return false
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return false
      let opacity = 1
      for (
        let node: Element | null = element;
        node;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility !== 'visible')
          return false
        opacity *= Number(style.opacity)
      }
      return opacity > 0
    }
    function sample() {
      if (stopped) return
      const root = document.querySelector<HTMLElement>('.yarl__root')
      const phase = root?.dataset.mosaicTransitionState ?? null
      const overlay = document.querySelector<HTMLElement>(
        '[data-mosaic-transition]',
      )
      const visual =
        root?.querySelector<HTMLVideoElement | HTMLImageElement>(
          '.yarl__slide_current video, .yarl__slide_current img.yarl__slide_image, .yarl__slide_current img[data-mosaic-about-portrait]',
        ) ?? null
      if (phase === 'open' && visual instanceof HTMLVideoElement)
        openVideo ??= visual
      const box = media.getBoundingClientRect()
      samples.push({
        source: visible(source) && visible(media),
        overlay: visible(overlay?.firstElementChild ?? null),
        viewer: visible(visual),
        phase,
        sourceWidth: box.width,
        sourceHeight: box.height,
        overlayType: overlay?.firstElementChild?.tagName ?? null,
        videoReplaced: Boolean(openVideo && root && visual !== openVideo),
      })
      requestAnimationFrame(sample)
    }
    state.mosaicTransitionObservation = {
      samples,
      stop: () => {
        stopped = true
      },
    }
    sample()
  }, slug)
}

async function finishObservation(page: Page) {
  const samples = await page.evaluate(() => {
    const observation = (window as ObservedWindow).mosaicTransitionObservation!
    observation.stop()
    return observation.samples
  })
  await test.info().attach('transition-frames.json', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  })
  return samples
}

function expectSingleOwner(samples: Sample[], overlayExpected = true) {
  expect(samples.length).toBeGreaterThan(4)
  expect(
    samples.filter(
      sample =>
        Number(sample.source) +
          Number(sample.overlay) +
          Number(sample.viewer) !==
        1,
    ),
    'Every sampled paint must have exactly one selected-media representation',
  ).toEqual([])
  expect(samples.some(sample => sample.overlay)).toBe(overlayExpected)
  expect(samples.some(sample => sample.viewer && sample.phase === 'open')).toBe(
    true,
  )
}

async function armArrow(
  page: Page,
  phase: 'opening' | 'closing',
  name: string,
  forward = false,
) {
  // Observe in-page before the action: protocol scheduling can miss a 360 ms phase.
  await page.evaluate(
    ({ phase, name, forward }) => {
      const state = window as ObservedWindow
      state.mosaicPhaseActions ??= []
      const observer = new MutationObserver(() => {
        const root = document.querySelector<HTMLElement>('.yarl__root')
        if (root?.dataset.mosaicTransitionState !== phase) return
        observer.disconnect()
        ;(document.activeElement ?? root).dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        )
        state.mosaicPhaseActions!.push(name)
        if (forward) history.forward()
      })
      observer.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-mosaic-transition-state'],
      })
    },
    { phase, name, forward },
  )
}

async function expectArrow(page: Page, name: string) {
  await expect
    .poll(() =>
      page.evaluate(() => (window as ObservedWindow).mosaicPhaseActions ?? []),
    )
    .toContain(name)
}

const route = '/grid-version'

for (const video of [false, true]) {
  test(`${route} hands off one ${video ? 'video frame' : 'image'} and restores stable source geometry`, async ({
    page,
    isMobile,
  }) => {
    await ready(page, route)
    const slug = video ? 'aarons-toolbox' : 'about-me'
    const subject = page.locator(`[data-mosaic-project="${slug}"]`)
    if (video) {
      await expect(
        subject.locator('[data-mosaic-video-state]'),
      ).toHaveAttribute('data-mosaic-video-state', 'playing')
    }
    await subject.focus()
    await settle(subject)
    const fitted = await subject.locator('[data-mosaic-media]').boundingBox()
    await subject.evaluate(element => (element as HTMLElement).blur())
    await settle(subject)
    await observe(page, slug)
    // Activate before the 500 ms grid fit transition completes.
    await subject.evaluate(async element => {
      ;(element as HTMLElement).focus()
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
      ;(element as HTMLButtonElement).click()
    })
    const viewer = page.locator('.yarl__root')
    await expect(viewer).toHaveAttribute('data-mosaic-transition-state', 'open')
    await expect(subject).toHaveCSS('visibility', 'hidden')
    if (video) {
      await expect(page.locator('.yarl__slide_current video')).toHaveAttribute(
        'poster',
        /^blob:/,
      )
      await page.keyboard.press('Escape')
    } else {
      await expect(
        viewer.getByRole('heading', { name: 'About Me', exact: true }),
      ).toBeVisible()
      await expect(
        viewer.getByRole('article', { name: 'Biography' }),
      ).toBeVisible()
      await expect(
        viewer.getByRole('article', { name: 'Working style and strengths' }),
      ).toBeVisible()
      await expect(
        viewer.getByRole('button', { name: 'Zoom in', exact: true }),
      ).toHaveCount(0)
      // Moving to the close button removes the source's pointer hover.
      await page
        .getByRole('button', { name: 'Close viewer', exact: true })
        .click()
    }
    await expect(viewer).toHaveCount(0)
    await expect(subject).toBeFocused()
    await settle(subject)
    const samples = await finishObservation(page)
    expectSingleOwner(samples)
    expect(
      samples.some(sample => sample.overlayType === (video ? 'CANVAS' : 'IMG')),
    ).toBe(true)
    expect(samples.filter(sample => sample.videoReplaced)).toEqual([])
    const lastViewer = samples.findLastIndex(sample => sample.phase !== null)
    const restored = samples
      .slice(lastViewer + 1)
      .filter(sample => sample.source)
    expect(restored.length).toBeGreaterThan(0)
    for (const sample of restored) {
      expect(sample.sourceWidth).toBeCloseTo(fitted!.width, 0)
      expect(sample.sourceHeight).toBeCloseTo(fitted!.height, 0)
    }
    await expect(
      page.locator(
        '[data-mosaic-source-hidden], [data-mosaic-source-fit], [data-mosaic-transition]',
      ),
    ).toHaveCount(0)
    await expect(page).toHaveURL(route)
    await subject.evaluate(element => (element as HTMLElement).blur())
    await expect(subject).not.toHaveAttribute('data-mosaic-return-focus')
    await settle(subject)
    if (!isMobile) {
      await subject.hover()
      await settle(subject)
      const hovered = await subject.locator('[data-mosaic-media]').boundingBox()
      expect(hovered!.width).toBeCloseTo(fitted!.width, 0)
      expect(hovered!.height).toBeCloseTo(fitted!.height, 0)
    }
  })
}

test(`${route} reverses a close and ignores arrow navigation until ownership settles`, async ({
  page,
}) => {
  await ready(page, route)
  const subject = page.locator('[data-mosaic-project="loopio"]')
  await subject.focus()
  await settle(subject)
  await observe(page, 'loopio')
  await armArrow(page, 'opening', 'opening-arrow')
  await subject.press('Enter')
  const viewer = page.locator('.yarl__root')
  await expectArrow(page, 'opening-arrow')
  await expect(page).toHaveURL(`${route}?project=loopio&slide=cover`)
  await expect(viewer).toHaveAttribute('data-mosaic-transition-state', 'open')
  await armArrow(page, 'closing', 'reverse', true)
  await page.keyboard.press('Escape')
  await expectArrow(page, 'reverse')
  await expect(viewer).toHaveAttribute('data-mosaic-transition-state', 'open')
  await expect(page).toHaveURL(`${route}?project=loopio&slide=cover`)
  await armArrow(page, 'closing', 'closing-arrow')
  await page.keyboard.press('Escape')
  await expectArrow(page, 'closing-arrow')
  await expect(viewer).toHaveCount(0)
  await expect(subject).toBeFocused()
  await settle(subject)
  expectSingleOwner(await finishObservation(page))
  await expect(
    page.locator('[data-mosaic-source-hidden], [data-mosaic-transition]'),
  ).toHaveCount(0)
})

test('reduced motion transfers single ownership without a spatial overlay', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ready(page, '/grid-version')
  const subject = page.locator('[data-mosaic-project="about-me"]')
  await subject.focus()
  await observe(page, 'about-me')
  await subject.press('Enter')
  await expect(page.locator('.yarl__root')).toHaveAttribute(
    'data-mosaic-transition-state',
    'open',
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(subject).toBeFocused()
  await settle(subject)
  expectSingleOwner(await finishObservation(page), false)
})
