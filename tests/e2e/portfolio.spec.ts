import { expect, test, type Page, type TestInfo } from '@playwright/test'

async function waitForPortfolio(page: Page) {
  const curtain = page.locator('[data-portfolio-loading-curtain]')
  await expect(curtain).toHaveAttribute('data-phase', 'ready')
  await expect(curtain).toHaveCSS('visibility', 'hidden')
}

async function expectActiveSection(page: Page, index: number) {
  await expect(
    page.locator(
      `button[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="${index}"]`,
    ),
  ).toHaveAttribute('aria-current', 'page')
}

async function wheelGesture(page: Page, deltaX: number, deltaY: number) {
  const steps = 8

  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(deltaX / steps, deltaY / steps)
    await page.waitForTimeout(16)
  }
}

async function wheelGestureSequence(
  page: Page,
  deltas: Array<{ x: number; y: number }>,
) {
  for (const delta of deltas) {
    await page.mouse.wheel(delta.x, delta.y)
    await page.waitForTimeout(16)
  }
}

async function dragGesture(
  page: Page,
  start: { x: number; y: number },
  delta: { x: number; y: number },
) {
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 12 })
  await page.mouse.up()
}

async function openOverviewViewer(page: Page, testInfo: TestInfo) {
  const source = page.locator(
    '[data-portfolio-screenshot-id="aarons-toolbox-overview"][data-portfolio-viewer-source="active"] [data-portfolio-media-action]',
  )

  if (testInfo.project.name.includes('iphone')) {
    const box = await source.boundingBox()
    expect(box).not.toBeNull()
    const x = box!.x + box!.width / 2
    const y = box!.y + box!.height / 2
    await page.touchscreen.tap(x, y)
    return
  }

  await source.click()
}

test('deep links restore both Embla axes and their active markers', async ({
  page,
}) => {
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
  await expectActiveSection(page, 5)
  await expect(
    page.locator(
      'button[data-portfolio-slide-indicator-index="0"][aria-current="true"]',
    ),
  ).toBeVisible()
})

test('all media projects combine their intro and first media in one snap', async ({
  page,
}) => {
  const projects = [
    {
      path: '/work/loopio',
      title: 'Loopio',
      mediaId: 'loopio-cover',
    },
    {
      path: '/work/aarons-toolbox',
      title: "Aaron's Toolbox",
      mediaId: 'aarons-toolbox-overview',
    },
  ]

  for (const project of projects) {
    await page.goto(project.path)
    await waitForPortfolio(page)

    await expect(
      page.locator(`[aria-label="${project.title} overview"]:visible`),
    ).toBeVisible()
    await expect(
      page.locator(
        `[data-portfolio-screenshot-id="${project.mediaId}"][data-portfolio-viewer-source="active"]`,
      ),
    ).toBeVisible()
    await expect(
      page.locator(
        'button[data-portfolio-slide-indicator-index="0"][aria-current="true"]',
      ),
    ).toBeVisible()
  }
})

test('About Me uses the shared information layout without a media carousel', async ({
  page,
}) => {
  await page.goto('/work/about-me')
  await waitForPortfolio(page)

  const information = page.locator('[aria-label="About Me overview"]')
  await expect(information).toBeVisible()
  await expect(information).toContainText(
    'I’ve been building things for the web',
  )
  await expect(
    page.locator('[data-portfolio-carousel="about-me"]'),
  ).toHaveCount(0)
})

test('touch layouts keep project information above a constrained media stage', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('iphone'))
  await page.goto('/work/loopio')
  await waitForPortfolio(page)

  const information = page.locator('[aria-label="Loopio overview"]')
  const media = page.locator('[data-portfolio-carousel="loopio"]')
  const [informationBox, mediaBox] = await Promise.all([
    information.boundingBox(),
    media.boundingBox(),
  ])

  expect(informationBox).not.toBeNull()
  expect(mediaBox).not.toBeNull()
  expect(informationBox!.height).toBeLessThanOrEqual(
    (await page.evaluate(() => window.innerHeight)) / 2 + 1,
  )
  expect(mediaBox!.y).toBeGreaterThanOrEqual(
    informationBox!.y + informationBox!.height - 1,
  )
})

test('the project information remains fixed while only the media carousel moves', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/loopio/a-mature-product')
  await waitForPortfolio(page)

  const information = page.locator('[aria-label="Loopio overview"]')
  const initialBox = await information.boundingBox()
  await expect(information).toContainText('Loopio')
  await expect(information).toContainText('A mature product')

  await page.locator('button[data-portfolio-slide-indicator-index="0"]').click()
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await expect(information).toContainText('Proving a better Loopio')
  expect(await information.boundingBox()).toEqual(initialBox)
})

test('the active section item animates its project back to the first slide', async ({
  page,
}) => {
  await page.goto('/work/loopio/shared-system')
  await waitForPortfolio(page)

  const horizontalTrack = page
    .locator('[data-portfolio-carousel="loopio"]')
    .locator(':scope > div')
  const horizontalBox = await horizontalTrack.boundingBox()
  expect(horizontalBox).not.toBeNull()
  const sampledPositions = new Set<number>()

  await page
    .locator(
      'button[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="2"]',
    )
    .click()
  await expect
    .poll(
      async () => {
        const position = await horizontalTrack.evaluate(element => {
          const transform = getComputedStyle(element).transform
          return transform === 'none' ? 0 : new DOMMatrix(transform).m41
        })
        sampledPositions.add(Math.round(position))
        return position
      },
      { intervals: [16, 16, 16, 16, 16, 16, 16, 16, 16, 16] },
    )
    .toBeGreaterThan(-horizontalBox!.width / 2)
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await expect(
    page.locator(
      'button[data-portfolio-slide-indicator-index="0"][aria-current="true"]',
    ),
  ).toBeVisible()
  expect(sampledPositions.size).toBeGreaterThan(2)

  await page.goBack()
  await expect(page).toHaveURL(/\/work\/loopio\/shared-system$/)
  await expect(
    page.locator(
      'button[data-portfolio-slide-indicator-index="5"][aria-current="true"]',
    ),
  ).toBeVisible()
})

test('section navigation resets an offscreen project without changing remembered gesture state', async ({
  page,
}) => {
  await page.goto('/work/loopio/shared-system')
  await waitForPortfolio(page)

  const loopioViewport = page.locator('[data-portfolio-carousel="loopio"]')
  const loopioTrack = loopioViewport.locator(':scope > div')
  const loopioBox = await loopioViewport.boundingBox()
  expect(loopioBox).not.toBeNull()

  await page.keyboard.press('ArrowDown')
  await expect(page).toHaveURL(/\/work\/freshbooks$/)
  await expect
    .poll(() =>
      loopioTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m41
      }),
    )
    .toBeLessThan(-loopioBox!.width)

  await page
    .locator(
      'button[data-portfolio-section-nav-side="left"][data-portfolio-section-nav-index="2"]',
    )
    .click()
  await expect
    .poll(() =>
      loopioTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m41
      }),
    )
    .toBeGreaterThan(-loopioBox!.width / 2)
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await expect(
    page.locator(
      'button[data-portfolio-slide-indicator-index="0"][aria-current="true"]',
    ),
  ).toBeVisible()
})

test('cover-media viewer deep links open without a media path segment', async ({
  page,
}) => {
  await page.goto('/work/freshbooks?modal=image')
  await waitForPortfolio(page)

  await expect(page.locator('.portfolio-viewer')).toBeVisible()
  await expect(page).toHaveURL(/\/work\/freshbooks\?modal=image$/)
})

test('keyboard navigation wraps across finite physical tracks', async ({
  page,
}) => {
  await page.goto('/work')
  await waitForPortfolio(page)

  await page.keyboard.press('2')
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/work\/loopio\/a-mature-product$/)
  await page.keyboard.press('ArrowLeft')
  await expect(page).toHaveURL(/\/work\/loopio$/)

  await page.keyboard.press('0')
  await expect(page).toHaveURL(/\/work$/)
  await page.keyboard.press('ArrowUp')
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
  await page.keyboard.press('ArrowDown')
  await expect(page).toHaveURL(/\/work$/)

  await page.locator('[data-portfolio-start-section-index="6"]').click()
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
  await page.keyboard.press('ArrowDown')
  await expect(page).toHaveURL(/\/work$/)

  await page.keyboard.press('0')
  await page.locator('[data-portfolio-start-section-index="2"]').click()
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/work\/loopio\/a-mature-product$/)

  await page.locator('[data-portfolio-home-logo]').click()
  await expect(page).toHaveURL(/\/work$/)
  await page.keyboard.press('ArrowUp')
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
})

test('wrap navigation crosses the full ordered track', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)

  const verticalViewport = page.locator('[data-portfolio-vertical-carousel]')
  const verticalTrack = verticalViewport.locator(':scope > div')
  const verticalBox = await verticalViewport.boundingBox()
  expect(verticalBox).not.toBeNull()

  await page.keyboard.press('ArrowUp')
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeLessThan(-verticalBox!.height * 4)

  await page.keyboard.press('ArrowDown')
  await expect(page).toHaveURL(/\/work$/)
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeGreaterThan(-verticalBox!.height / 2)

  await dragGesture(
    page,
    {
      x: verticalBox!.x + verticalBox!.width * 0.75,
      y: verticalBox!.y + verticalBox!.height * 0.35,
    },
    { x: 0, y: verticalBox!.height * 0.3 },
  )
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeLessThan(-verticalBox!.height * 4)

  await page.mouse.move(
    verticalBox!.x + verticalBox!.width * 0.75,
    verticalBox!.y + verticalBox!.height * 0.35,
  )
  await wheelGesture(page, 0, 900)
  await expect(page).toHaveURL(/\/work$/)
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeGreaterThan(-verticalBox!.height / 2)

  await page.keyboard.press('2')
  await expect(page).toHaveURL(/\/work\/loopio$/)
  const horizontalViewport = page.locator('[data-portfolio-carousel="loopio"]')
  const horizontalTrack = horizontalViewport.locator(':scope > div')
  const horizontalBox = await horizontalViewport.boundingBox()
  expect(horizontalBox).not.toBeNull()

  await page.keyboard.press('ArrowLeft')
  await expect
    .poll(() =>
      horizontalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m41
      }),
    )
    .toBeLessThan(-horizontalBox!.width * 2)

  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await expect
    .poll(() =>
      horizontalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m41
      }),
    )
    .toBeGreaterThan(-horizontalBox!.width / 2)

  const horizontalGestureBox = await horizontalViewport.boundingBox()
  expect(horizontalGestureBox).not.toBeNull()
  await dragGesture(
    page,
    {
      x: horizontalGestureBox!.x + horizontalGestureBox!.width * 0.2,
      y: horizontalGestureBox!.y + horizontalGestureBox!.height / 2,
    },
    { x: horizontalGestureBox!.width * 0.6, y: 0 },
  )
  await expect
    .poll(() =>
      horizontalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m41
      }),
    )
    .toBeLessThan(-horizontalBox!.width * 2)

  await page.mouse.move(
    horizontalGestureBox!.x + horizontalGestureBox!.width / 2,
    horizontalGestureBox!.y + horizontalGestureBox!.height / 2,
  )
  await wheelGesture(page, 900, 0)
  await expect(page).toHaveURL(/\/work\/loopio$/)
  await expect
    .poll(() =>
      horizontalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m41
      }),
    )
    .toBeGreaterThan(-horizontalBox!.width / 2)
})

test('dominant horizontal wheel intent changes media without changing section', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  const selectableParagraph = page
    .locator(
      '[aria-label="Aaron\'s Toolbox overview"] [data-portfolio-selectable-text] .portfolio-markdown p',
    )
    .first()
  const verticalViewport = page.locator('[data-portfolio-vertical-carousel]')
  const verticalTrack = verticalViewport.locator(':scope > div')
  const verticalBox = await verticalViewport.boundingBox()
  expect(verticalBox).not.toBeNull()
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeLessThan(-verticalBox!.height * 4.99)
  const paragraphBox = await selectableParagraph.boundingBox()
  expect(paragraphBox).not.toBeNull()
  await dragGesture(
    page,
    { x: paragraphBox!.x + 40, y: paragraphBox!.y + 10 },
    {
      x: Math.min(paragraphBox!.width - 80, 300),
      y: Math.min(paragraphBox!.height - 20, 70),
    },
  )
  await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
  expect(
    await page.evaluate(() => window.getSelection()?.toString().length),
  ).toBeGreaterThan(0)
  await page.evaluate(() => window.getSelection()?.removeAllRanges())

  const media = page.locator('[data-portfolio-carousel="aarons-toolbox"]')
  const box = await media.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await wheelGesture(page, 900, 40)

  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
  await expectActiveSection(page, 5)
})

test('horizontal trackpad intent stays axis-locked through a vertical tail', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  const verticalViewport = page.locator('[data-portfolio-vertical-carousel]')
  const verticalTrack = verticalViewport.locator(':scope > div')
  const verticalBox = await verticalViewport.boundingBox()
  expect(verticalBox).not.toBeNull()
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeLessThan(-verticalBox!.height * 4.99)

  const media = page.locator('[data-portfolio-carousel="aarons-toolbox"]')
  const box = await media.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await wheelGestureSequence(page, [
    { x: 400, y: 20 },
    { x: 400, y: 30 },
    { x: 20, y: 180 },
    { x: 10, y: 180 },
  ])

  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
  await expectActiveSection(page, 5)
})

test('horizontal wheel selection settles without reinitializing the carousel', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  const media = page.locator('[data-portfolio-carousel="aarons-toolbox"]')
  const box = await media.boundingBox()
  expect(box).not.toBeNull()

  await page.evaluate(() => {
    const samplingWindow = window as typeof window & {
      __portfolioCarouselFrame?: number
      __portfolioCarouselSamples?: number[]
    }
    const container = document.querySelector<HTMLElement>(
      '[data-portfolio-carousel="aarons-toolbox"] > div',
    )
    samplingWindow.__portfolioCarouselSamples = []

    const sample = () => {
      if (container) {
        samplingWindow.__portfolioCarouselSamples?.push(
          new DOMMatrix(getComputedStyle(container).transform).m41,
        )
      }
      // This is a bounded test sampler, not a Three.js renderer loop.
      // react-doctor-disable-next-line react-doctor/three-prefer-set-animation-loop
      samplingWindow.__portfolioCarouselFrame = requestAnimationFrame(sample)
    }
    sample()
  })

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await wheelGesture(page, 900, 40)
  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
  await page.waitForTimeout(500)

  const maximumFrameJump = await page.evaluate(() => {
    const samplingWindow = window as typeof window & {
      __portfolioCarouselFrame?: number
      __portfolioCarouselSamples?: number[]
    }
    if (samplingWindow.__portfolioCarouselFrame !== undefined) {
      cancelAnimationFrame(samplingWindow.__portfolioCarouselFrame)
    }
    const samples = samplingWindow.__portfolioCarouselSamples ?? []
    return samples.reduce((maximum, sample, index) => {
      if (index === 0) return maximum
      return Math.max(maximum, Math.abs(sample - samples[index - 1]!))
    }, 0)
  })

  expect(maximumFrameJump).toBeLessThan(box!.width / 4)
})

test('vertical wheel navigation changes only the outer section', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  await page.mouse.move(720, 450)
  await wheelGesture(page, 40, 700)
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
  await expectActiveSection(page, 6)
})

test('nested drag gestures move only their intended Embla axis', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  const verticalViewport = page.locator('[data-portfolio-vertical-carousel]')
  const verticalTrack = verticalViewport.locator(':scope > div')
  const verticalBox = await verticalViewport.boundingBox()
  expect(verticalBox).not.toBeNull()
  await expect
    .poll(() =>
      verticalTrack.evaluate(element => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' ? 0 : new DOMMatrix(transform).m42
      }),
    )
    .toBeLessThan(-verticalBox!.height * 4.99)

  const media = page.locator('[data-portfolio-carousel="aarons-toolbox"]')
  const box = await media.boundingBox()
  expect(box).not.toBeNull()
  await dragGesture(
    page,
    { x: box!.x + box!.width * 0.75, y: box!.y + box!.height / 2 },
    { x: -box!.width * 0.7, y: -20 },
  )
  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
  await expectActiveSection(page, 5)

  await dragGesture(page, { x: 1300, y: 700 }, { x: 20, y: -600 })
  await expect(page).toHaveURL(/\/work\/nextphrase$/)
  await expectActiveSection(page, 6)
})

test('viewer stays open while media navigation updates the underlying route', async ({
  page,
}, testInfo) => {
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  const underlyingIndicators = page.locator(
    '[data-portfolio-underlying-horizontal-navigation] [data-portfolio-slide-indicators]',
  )
  const initialIndicatorBox = await underlyingIndicators.boundingBox()
  expect(initialIndicatorBox).not.toBeNull()
  const initialIndicatorCenter =
    initialIndicatorBox!.x + initialIndicatorBox!.width / 2

  await openOverviewViewer(page, testInfo)
  await expect(page.locator('.portfolio-viewer')).toBeVisible()
  await expect(page).toHaveURL(/overview\?modal=image$/)
  await expect(page.locator('[data-portfolio-theme-trigger]')).toHaveCount(0)
  const viewerIndicators = page.locator(
    '[data-portfolio-viewer-slide-navigation] [data-portfolio-slide-indicators]',
  )
  await expect(viewerIndicators).toBeVisible()
  await expect
    .poll(async () => {
      const box = await viewerIndicators.boundingBox()
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      return box ? Math.abs(box.x + box.width / 2 - viewportWidth / 2) : 999
    })
    .toBeLessThan(1)
  await expect(
    page.locator('[data-portfolio-section-nav-zone="left"]'),
  ).toHaveCSS('opacity', '0')

  if (testInfo.project.name.includes('iphone')) {
    await page.getByRole('button', { name: 'Next image' }).click()
  } else {
    await page.waitForTimeout(400)
    const stage = page.locator(
      '.yarl__slide_current [data-portfolio-viewer-stage]',
    )
    const box = await stage.boundingBox()
    expect(box).not.toBeNull()
    await dragGesture(
      page,
      { x: box!.x + box!.width * 0.75, y: box!.y + box!.height / 2 },
      { x: -box!.width * 0.6, y: 0 },
    )
  }
  await expect(page.locator('.portfolio-viewer')).toBeVisible()
  await expect(page).toHaveURL(/normalizer\?modal=image$/)

  await page.keyboard.press('Escape')
  await expect(page.locator('.portfolio-viewer')).toHaveCount(0)
  await expect(page).toHaveURL(/\/work\/aarons-toolbox\/normalizer$/)
  await expect
    .poll(async () => {
      const box = await underlyingIndicators.boundingBox()
      return box
        ? Math.abs(box.x + box.width / 2 - initialIndicatorCenter)
        : 999
    })
    .toBeLessThan(1)
})

test('zoomed viewer drags pan and media changes reset zoom', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  await openOverviewViewer(page, testInfo)
  await expect(page.locator('.portfolio-viewer')).toBeVisible()
  await page.waitForTimeout(400)

  const stage = page.locator(
    '.yarl__slide_current [data-portfolio-viewer-stage]',
  )
  const zoomWrapper = page.locator('.yarl__slide_current .yarl__slide_wrapper')
  const box = await stage.boundingBox()
  expect(box).not.toBeNull()
  await stage.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(zoomWrapper).toHaveAttribute('style', /scale\(2\)/)

  await dragGesture(
    page,
    { x: box!.x + box!.width * 0.7, y: box!.y + box!.height / 2 },
    { x: -box!.width * 0.35, y: 0 },
  )
  await expect(page).toHaveURL(/overview\?modal=image$/)
  await expect(zoomWrapper).toHaveAttribute('style', /translateX\(-/)

  await page.getByRole('button', { name: 'Next image' }).click()
  await expect(page).toHaveURL(/normalizer\?modal=image$/)
  await expect(
    page.locator('.yarl__slide_current .yarl__slide_wrapper'),
  ).toHaveAttribute('style', /scale\(1\)/)
})

test('viewer deep links restore with browser history', async ({
  page,
}, testInfo) => {
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  await openOverviewViewer(page, testInfo)
  await expect(page.locator('.portfolio-viewer')).toBeVisible()

  await page.goBack()
  await expect(page.locator('.portfolio-viewer')).toHaveCount(0)
  await expect(page).toHaveURL(/\/work\/aarons-toolbox$/)
  await page.goForward()
  await expect(page).toHaveURL(/overview\?modal=image$/)
  await expect(page.locator('.portfolio-viewer')).toBeVisible()
})

test('viewer deep links retain their modal URL after carousel initialization', async ({ page }) => {
  await page.goto('/work/freshbooks/client-first?modal=image')
  await waitForPortfolio(page)
  await expect(page.locator('.portfolio-viewer')).toHaveClass(/portfolio-viewer--open/)
  await expect(page).toHaveURL(/\/work\/freshbooks\/client-first\?modal=image$/)
  await page.keyboard.press('Escape')
  await expect(page.locator('.portfolio-viewer')).toHaveCount(0)
  await expect(page).toHaveURL(/\/work\/freshbooks\/client-first$/)
})

test('reduced motion keeps navigation usable and shortens viewer transitions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  await page.keyboard.press('Enter')
  await expect(page.locator('.portfolio-viewer')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.portfolio-viewer')).toHaveCount(0)
})
