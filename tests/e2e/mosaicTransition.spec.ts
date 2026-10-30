import { expect, test, type Locator, type Page } from '@playwright/test'
import { gridReady } from '../../scripts/qa/tasks.mjs'

type Sample = {
  source: boolean
  overlay: boolean
  viewer: boolean
  phase: string | null
  sourceWidth: number
  sourceHeight: number
  overlayType: string | null
  videoReplaced: boolean
  portrait: boolean
  overlayOpacity: number
  viewerOpacity: number
  overlayAlignment: number | null
}
type Observation = { samples: Sample[]; stop: () => void }
type ObservedWindow = Window & {
  mosaicTransitionObservation?: Observation
  mosaicPhaseActions?: string[]
}

async function ready(page: Page, route: string) {
  await page.goto(route)
  await gridReady(page)
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
    function opacity(element: Element | null) {
      if (!element || !element.isConnected) return 0
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return 0
      let opacity = 1
      for (
        let node: Element | null = element;
        node;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility !== 'visible') return 0
        opacity *= Number(style.opacity)
      }
      return opacity
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
      const overlayVisual = overlay?.firstElementChild ?? null
      const overlayBox = overlayVisual?.getBoundingClientRect()
      const visualBox = visual?.getBoundingClientRect()
      const overlayOpacity = opacity(overlayVisual)
      const viewerOpacity = opacity(visual)
      samples.push({
        source: opacity(source) > 0 && opacity(media) > 0,
        overlay: overlayOpacity > 0,
        viewer: viewerOpacity > 0,
        portrait: Boolean(root?.querySelector('[data-mosaic-about-portrait]')),
        overlayOpacity,
        viewerOpacity,
        overlayAlignment:
          overlayBox && visualBox
            ? Math.max(
                Math.abs(overlayBox.left - visualBox.left),
                Math.abs(overlayBox.top - visualBox.top),
                Math.abs(overlayBox.width - visualBox.width),
                Math.abs(overlayBox.height - visualBox.height),
              )
            : null,
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
  for (const sample of samples) {
    // About intentionally reveals its copy over the landed portrait. A captured
    // hover portrait can crossfade at this same handoff. Both layers must align
    // and remain opaque as one composite; the grid source stays hidden.
    if (sample.phase === 'revealing' && sample.portrait) {
      expect(sample.source).toBe(false)
      expect(sample.viewer).toBe(true)
      expect(sample.viewerOpacity).toBeCloseTo(1, 3)
      if (sample.overlay) {
        expect(sample.overlayAlignment).not.toBeNull()
        expect(sample.overlayAlignment!).toBeLessThan(0.5)
        expect(
          sample.overlayOpacity +
            sample.viewerOpacity * (1 - sample.overlayOpacity),
        ).toBeCloseTo(1, 3)
      }
    } else {
      expect(
        Number(sample.source) + Number(sample.overlay) + Number(sample.viewer),
        'Outside the aligned About reveal, each paint has one selected-media owner',
      ).toBe(1)
    }
  }
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

const route = '/work'

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
    const openingSnapshot = await subject.evaluate(async element => {
      ;(element as HTMLElement).focus()
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
      const portrait = element.querySelector('[data-mosaic-portrait]')
      const base = portrait?.querySelector<HTMLImageElement>('img')
      const hover = portrait?.querySelector<HTMLImageElement>(
        '[data-mosaic-portrait-hover]',
      )
      // A decoded visible portrait overlay is captured into a canvas so its
      // painted blend survives the handoff, including the touch portrait.
      const compositePortrait = Boolean(
        base?.complete &&
        base.naturalWidth &&
        hover?.complete &&
        hover.naturalWidth &&
        Number(getComputedStyle(hover).opacity) > 0,
      )
      ;(element as HTMLButtonElement).click()
      return compositePortrait ? 'CANVAS' : 'IMG'
    })
    const viewer = page.locator('.yarl__root')
    await expect(viewer).toHaveAttribute('data-mosaic-transition-state', 'open')
    await page.waitForFunction(() =>
      (window as ObservedWindow).mosaicTransitionObservation?.samples.some(
        sample => sample.viewer && sample.phase === 'open',
      ),
    )
    await expect(subject).toHaveCSS('visibility', 'hidden')
    if (video) {
      await expect(page.locator('.yarl__slide_current video')).toHaveAttribute(
        'poster',
        /^blob:/,
      )
      await page.keyboard.press('Escape')
    } else {
      await expect(
        viewer.getByRole('heading', { name: /I design and build interfaces/ }),
      ).toBeVisible()
      await expect(
        viewer.getByRole('article', { name: 'Biography' }),
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
    const openingFrames = samples.filter(
      sample => sample.overlay && sample.phase === 'opening',
    )
    expect(openingFrames.length).toBeGreaterThan(0)
    for (const sample of openingFrames)
      expect(sample.overlayType).toBe(video ? 'CANVAS' : openingSnapshot)
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
  await expect(page).toHaveURL(`${route}/loopio`)
  await expect(viewer).toHaveAttribute('data-mosaic-transition-state', 'open')
  await armArrow(page, 'closing', 'reverse', true)
  await page.keyboard.press('Escape')
  await expectArrow(page, 'reverse')
  await expect(viewer).toHaveAttribute('data-mosaic-transition-state', 'open')
  await expect(page).toHaveURL(`${route}/loopio`)
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
  await ready(page, '/work')
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
