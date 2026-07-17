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
