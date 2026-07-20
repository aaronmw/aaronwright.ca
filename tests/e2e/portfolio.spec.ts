import { expect, test, type Page } from '@playwright/test'

async function waitForPortfolio(page: Page) {
  const curtain = page.locator('[data-portfolio-loading-curtain]')
  await expect(curtain).toHaveAttribute('data-phase', 'ready')
  await expect(curtain).toHaveCSS('visibility', 'hidden')
}

async function expectRingCenteredOnActiveDot(page: Page) {
  const ring = page.locator('[data-portfolio-slide-indicator-marker="true"]')
  const activeButton = page.locator(
    'button[data-portfolio-slide-indicator-index][aria-current="true"]',
  )
  const activeIndex = await activeButton.getAttribute(
    'data-portfolio-slide-indicator-index',
  )
  const dot = page.locator(
    `[data-portfolio-slide-indicator-visual="${activeIndex}"]`,
  )
  const [ringBox, dotBox] = await Promise.all([
    ring.boundingBox(),
    dot.boundingBox(),
  ])

  expect(ringBox).not.toBeNull()
  expect(dotBox).not.toBeNull()
  expect(
    Math.abs(ringBox!.x + ringBox!.width / 2 - (dotBox!.x + dotBox!.width / 2)),
  ).toBeLessThanOrEqual(0.5)
  expect(
    Math.abs(
      ringBox!.y + ringBox!.height / 2 - (dotBox!.y + dotBox!.height / 2),
    ),
  ).toBeLessThanOrEqual(0.5)
}

async function expectSectionRingCenteredOnActiveItem(page: Page) {
  const activeButton = page.locator(
    'button[data-portfolio-section-nav-side="left"][aria-current="page"]',
  )
  const activeIndex = await activeButton.getAttribute(
    'data-portfolio-section-nav-index',
  )
  const ring = page.locator('[data-portfolio-section-nav-ring="left"]')
  const visual = page.locator(
    `[data-portfolio-section-nav-zone="left"] [data-portfolio-section-nav-visual-index="${activeIndex}"]`,
  )

  await expect.poll(async () => {
    const [ringBox, visualBox] = await Promise.all([
      ring.boundingBox(),
      visual.boundingBox(),
    ])

    if (!ringBox || !visualBox) {
      return Number.POSITIVE_INFINITY
    }

    return Math.max(
      Math.abs(
        ringBox.x + ringBox.width / 2 - (visualBox.x + visualBox.width / 2),
      ),
      Math.abs(
        ringBox.y + ringBox.height / 2 - (visualBox.y + visualBox.height / 2),
      ),
    )
  }).toBeLessThanOrEqual(0.5)
}

async function getSectionRingDistance(page: Page, index: number) {
  return page.evaluate((targetIndex) => {
    const distances = (['left', 'right'] as const).map((side) => {
      const ring = document.querySelector<SVGGraphicsElement>(
        `[data-portfolio-section-nav-ring="${side}"]`,
      )
      const visual = document.querySelector<SVGGraphicsElement>(
        `[data-portfolio-section-nav-zone="${side}"] [data-portfolio-section-nav-visual-index="${targetIndex}"]`,
      )

      if (!ring || !visual) {
        return Number.POSITIVE_INFINITY
      }

      const ringBox = ring.getBoundingClientRect()
      const visualBox = visual.getBoundingClientRect()

      return Math.max(
        Math.abs(
          ringBox.x + ringBox.width / 2 -
            (visualBox.x + visualBox.width / 2),
        ),
        Math.abs(
          ringBox.y + ringBox.height / 2 -
            (visualBox.y + visualBox.height / 2),
        ),
      )
    })

    return Math.max(...distances)
  }, index)
}

test('deep links reveal the requested section and preserve route state', async ({
  page,
}) => {
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/overview$/)
  await expect(
    page.locator(
      'button[data-portfolio-section-nav-side="left"][aria-current="page"]',
    ),
  ).toHaveAttribute('aria-label', /Aaron's Toolbox|Previous screen/)
  await expectRingCenteredOnActiveDot(page)
  await expectSectionRingCenteredOnActiveItem(page)
})

test('keyboard navigation retargets sections and slides', async ({
  page,
}, testInfo) => {
  await page.goto('/work')
  await waitForPortfolio(page)

  await page.keyboard.press('3')
  await expect(page).toHaveURL(/\/work\/informal-systems$/)

  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(
    testInfo.project.name.includes('portrait')
      ? /\/work\/informal-systems\/home-page$/
      : /\/work\/informal-systems\/hover-to-edit$/,
  )
  await expectRingCenteredOnActiveDot(page)

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
})

test('focused section navigation keeps its tooltip through navigation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)

  const destination = page.locator(
    'button[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="2"]',
  )
  await destination.focus()
  const tooltip = page.locator(
    '[data-portfolio-section-nav-zone="left"] [role="tooltip"]',
  )
  await expect(tooltip).toBeVisible()

  await destination.press('Enter')
  await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
  await expect(tooltip).toBeVisible()
})

test('section navigation tooltip follows the pointer within an item', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/nextphrase')
  await waitForPortfolio(page)

  const item = page.locator(
    'button[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="3"]',
  )
  const tooltip = page.locator(
    '[data-portfolio-section-nav-zone="left"] [role="tooltip"]',
  )
  const itemBox = await item.boundingBox()

  expect(itemBox).not.toBeNull()
  const pointerX = itemBox!.x + itemBox!.width / 2
  const firstPointerY = itemBox!.y + itemBox!.height * 0.35
  const secondPointerY = itemBox!.y + itemBox!.height * 0.65

  await page.mouse.move(pointerX, firstPointerY)
  await expect(tooltip).toBeVisible()
  await expect
    .poll(async () => {
      const tooltipBox = await tooltip.boundingBox()
      return tooltipBox
        ? Math.abs(tooltipBox.y + tooltipBox.height / 2 - firstPointerY)
        : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(1)

  await page.mouse.move(pointerX, secondPointerY)
  await expect
    .poll(async () => {
      const tooltipBox = await tooltip.boundingBox()
      return tooltipBox
        ? Math.abs(tooltipBox.y + tooltipBox.height / 2 - secondPointerY)
        : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(1)

  const zone = page.locator('[data-portfolio-section-nav-zone="left"]')
  const zoneBox = await zone.boundingBox()

  expect(zoneBox).not.toBeNull()
  await page.mouse.move(pointerX, zoneBox!.y + zoneBox!.height - 4)
  await expect(tooltip).toBeHidden()
})

test('pointer-clicked section navigation does not retain its tooltip', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/mini-series-browser/descriptions-only')
  await waitForPortfolio(page)

  const activeItem = page.locator(
    'button[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="4"]',
  )
  const tooltip = page.locator(
    '[data-portfolio-section-nav-zone="left"] [role="tooltip"]',
  )

  await activeItem.click()
  await page.mouse.move(
    page.viewportSize()!.width / 2,
    page.viewportSize()!.height / 2,
  )
  await expect(page).toHaveURL(/\/work\/mini-series-browser\/poster-grid$/)
  await expect(tooltip).toBeHidden()
})

test('homepage section preview remains pinned throughout pointer press', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)

  const destination = page.locator(
    'button[data-portfolio-start-section-index="2"]',
  )
  const destinationBox = await destination.boundingBox()

  expect(destinationBox).not.toBeNull()
  await page.mouse.move(
    destinationBox!.x + destinationBox!.width / 2,
    destinationBox!.y + destinationBox!.height / 2,
  )
  await expect
    .poll(() => getSectionRingDistance(page, 2))
    .toBeLessThanOrEqual(0.5)

  await page.mouse.down()
  const maximumDistance = await page.evaluate(async () => {
    let maximum = 0

    for (let frame = 0; frame < 8; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const ring = document.querySelector<SVGGraphicsElement>(
        '[data-portfolio-section-nav-ring="left"]',
      )
      const visual = document.querySelector<SVGGraphicsElement>(
        '[data-portfolio-section-nav-zone="left"] [data-portfolio-section-nav-visual-index="2"]',
      )

      if (!ring || !visual) {
        return Number.POSITIVE_INFINITY
      }

      const ringBox = ring.getBoundingClientRect()
      const visualBox = visual.getBoundingClientRect()
      maximum = Math.max(
        maximum,
        Math.abs(
          ringBox.x + ringBox.width / 2 -
            (visualBox.x + visualBox.width / 2),
        ),
        Math.abs(
          ringBox.y + ringBox.height / 2 -
            (visualBox.y + visualBox.height / 2),
        ),
      )
    }

    return maximum
  })

  expect(maximumDistance).toBeLessThanOrEqual(0.5)
  await page.mouse.up()
  await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
})

test('settled section navigation cross-fades its dot to a horizontal arrow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)

  await page.evaluate(() => {
    const samplingWindow = window as typeof window & {
      __portfolioAffordanceFrame?: number
      __portfolioAffordanceSamples?: Array<{ arrow: number; dot: number }>
    }

    samplingWindow.__portfolioAffordanceSamples = []
    const sample = () => {
      const arrow = document.querySelector<SVGGraphicsElement>(
        '[data-portfolio-section-nav-zone="left"] [data-portfolio-section-nav-arrow="2"]',
      )
      const dot = document.querySelector<SVGGraphicsElement>(
        '[data-portfolio-section-nav-zone="left"] [data-portfolio-section-nav-dot="2"]',
      )
      if (arrow && dot) {
        samplingWindow.__portfolioAffordanceSamples?.push({
          arrow: Number.parseFloat(getComputedStyle(arrow).opacity),
          dot: Number.parseFloat(getComputedStyle(dot).opacity),
        })
      }
      samplingWindow.__portfolioAffordanceFrame = requestAnimationFrame(sample)
    }
    sample()
  })

  await page
    .locator('button[data-portfolio-start-section-index="2"]')
    .click()
  await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
  await page.waitForTimeout(1_000)

  const samples = await page.evaluate(() => {
    const samplingWindow = window as typeof window & {
      __portfolioAffordanceFrame?: number
      __portfolioAffordanceSamples?: Array<{ arrow: number; dot: number }>
    }
    if (samplingWindow.__portfolioAffordanceFrame !== undefined) {
      cancelAnimationFrame(samplingWindow.__portfolioAffordanceFrame)
    }
    return samplingWindow.__portfolioAffordanceSamples ?? []
  })
  expect(
    samples.some(
      ({ arrow, dot }) =>
        arrow > 0.1 && arrow < 0.9 && dot > 0.1 && dot < 0.9,
    ),
  ).toBe(true)
  expect(samples.at(-1)?.arrow).toBeGreaterThanOrEqual(0.99)
  expect(samples.at(-1)?.dot).toBeLessThanOrEqual(0.01)
  await expect(
    page.locator(
      '[data-portfolio-section-nav-zone="left"] [data-portfolio-section-nav-arrow="2"]',
    ),
  ).toHaveAttribute('transform', /rotate\(90\)/)
  await expect(
    page.locator(
      '[data-portfolio-section-nav-zone="right"] [data-portfolio-section-nav-arrow="2"]',
    ),
  ).toHaveAttribute('transform', /rotate\(-90\)/)
})

test('inline zoom keeps navigation available and exits with vertical intent', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  await page.keyboard.press('Enter')
  await expect(
    page.locator('[data-portfolio-inline-zoomed="true"]'),
  ).toBeVisible()

  const nextSlideSurface = page.locator(
    '[data-portfolio-screenshot-id="normalizer"]',
  )
  await expect
    .poll(async () => (await nextSlideSurface.boundingBox())?.width ?? 0)
    .toBe(page.viewportSize()!.width)

  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
  await expect(
    page.locator('[data-portfolio-inline-zoomed="true"]'),
  ).toBeVisible()

  await page.keyboard.press('ArrowDown')
  await expect(page).toHaveURL(/\/work\/informal-systems$/)
  await expect(
    page.locator('[data-portfolio-inline-zoomed="true"]'),
  ).toHaveCount(0)
})

test('modal deep links close without losing the selected slide', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes('chromium'),
    'The existing modal query route is Chromium-specific.',
  )
  await page.goto('/work/aarons-toolbox/overview?modal=image')
  await waitForPortfolio(page)
  await expect(page.locator('[data-portfolio-modal-root]')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-portfolio-modal-root]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/overview$/)
})

test('mobile carousels retain pull boundaries and one vertical rail', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('iphone'))
  await page.goto('/work/nextphrase/home')
  await waitForPortfolio(page)

  const carousel = page.locator('[data-portfolio-carousel="nextphrase"]')
  const expectsPullBoundaries = testInfo.project.name.includes('portrait')
  await expect(
    carousel.locator('[data-portfolio-carousel-boundary="before"]'),
  ).toHaveCount(expectsPullBoundaries ? 1 : 0)
  await expect(
    carousel.locator('[data-portfolio-carousel-boundary="after"]'),
  ).toHaveCount(expectsPullBoundaries ? 1 : 0)
  await expect(
    page.locator('[data-portfolio-section-nav-zone="left"]'),
  ).toHaveCount(1)
  await expect(
    page.locator('[data-portfolio-section-nav-zone="right"]'),
  ).toHaveCount(0)
  await expectRingCenteredOnActiveDot(page)
  await expectSectionRingCenteredOnActiveItem(page)
})

test('reduced motion still completes the loading curtain', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/work/mini-series-browser/expanded-card')
  await waitForPortfolio(page)
  await expect(page).toHaveURL(/\/work\/mini-series-browser\/expanded-card$/)
})
