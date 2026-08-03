import { expect, test, type Page } from '@playwright/test'

async function waitForPortfolio(page: Page) {
  const curtain = page.locator('[data-portfolio-loading-curtain]')
  await expect(curtain).toHaveAttribute('data-phase', 'ready')
  await expect(curtain).toHaveCSS('visibility', 'hidden')
}

async function openThemeMenu(page: Page) {
  const trigger = page.locator('[data-portfolio-theme-trigger]')
  await trigger.click()
  await expect(page.locator('[data-portfolio-theme-menu]')).toBeVisible()
}

test('System follows the emulated color scheme and updates live', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/work')
  await waitForPortfolio(page)

  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme-preference',
    'system',
  )
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  await expect(page.locator('main')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  )
  await expect(page.locator('[data-portfolio-theme-trigger]')).toHaveAttribute(
    'data-portfolio-theme-icon',
    'system',
  )

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'dark',
  )
  await expect(page.locator('main')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  )
})

test('explicit appearance persists, overrides System, and closes the menu', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/work')
  await waitForPortfolio(page)

  await openThemeMenu(page)
  await expect(
    page.locator('[data-portfolio-theme-option="system"]'),
  ).toHaveAttribute('aria-checked', 'true')

  const menuBox = await page
    .locator('[data-portfolio-theme-menu]')
    .boundingBox()
  const viewport = page.viewportSize()
  expect(menuBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(menuBox!.x).toBeGreaterThanOrEqual(8)
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport!.width - 8)

  await page.locator('[data-portfolio-theme-option="light"]').click()
  await expect(page.locator('[data-portfolio-theme-menu]')).toBeHidden()
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeFocused()
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  expect(
    await page.evaluate(() => window.localStorage.getItem('portfolio-theme')),
  ).toBe('light')

  await page.reload()
  await waitForPortfolio(page)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme-preference',
    'light',
  )
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  await expect(page.locator('[data-portfolio-theme-trigger]')).toHaveAttribute(
    'data-portfolio-theme-icon',
    'light',
  )

  await openThemeMenu(page)
  await page.locator('[data-portfolio-theme-option="system"]').click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'dark',
  )
})

test('theme menu supports roving keyboard focus and restores the trigger', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'))
  await page.goto('/work')
  await waitForPortfolio(page)

  const trigger = page.locator('[data-portfolio-theme-trigger]')
  const system = page.locator('[data-portfolio-theme-option="system"]')
  const light = page.locator('[data-portfolio-theme-option="light"]')
  const dark = page.locator('[data-portfolio-theme-option="dark"]')

  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(system).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(light).toBeFocused()
  await page.keyboard.press('End')
  await expect(dark).toBeFocused()
  await page.keyboard.press('Home')
  await expect(system).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-portfolio-theme-menu]')).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('data-portfolio-theme-icon', 'light')

  await page.keyboard.press('Enter')
  await expect(light).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-portfolio-theme-menu]')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('appearance changes synchronize across tabs', async ({
  context,
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'))
  const otherPage = await context.newPage()

  await Promise.all([page.goto('/work'), otherPage.goto('/work')])
  await Promise.all([waitForPortfolio(page), waitForPortfolio(otherPage)])

  await openThemeMenu(page)
  await page.locator('[data-portfolio-theme-option="light"]').click()
  await expect(otherPage.locator('html')).toHaveAttribute(
    'data-portfolio-theme-preference',
    'light',
  )
  await expect(otherPage.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  await otherPage.close()
})

test('theme trigger aligns with the desktop rail or mobile logo', async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === 'chromium-desktop'
  const isMobilePortrait = testInfo.project.name === 'webkit-iphone-portrait'
  test.skip(!isDesktop && !isMobilePortrait)

  await page.goto('/work')
  await waitForPortfolio(page)

  const trigger = page.locator('[data-portfolio-theme-trigger]')
  const triggerBox = await trigger.boundingBox()
  expect(triggerBox).not.toBeNull()

  if (isMobilePortrait) {
    const logoBox = await page
      .locator('[data-portfolio-mobile-logo] svg')
      .boundingBox()
    const viewport = page.viewportSize()
    expect(logoBox).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(
      Math.abs(
        triggerBox!.y +
          triggerBox!.height / 2 -
          (logoBox!.y + logoBox!.height / 2),
      ),
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs(
        viewport!.width -
          (triggerBox!.x + triggerBox!.width / 2) -
          (logoBox!.x + logoBox!.width / 2),
      ),
    ).toBeLessThanOrEqual(0.5)
  } else {
    const desktopLogoBox = await page
      .locator('[data-portfolio-desktop-identity] svg')
      .boundingBox()
    const leftRailSvgBox = await page
      .locator('[data-portfolio-section-nav-zone="left"] svg')
      .boundingBox()
    const rightRailSvgBox = await page
      .locator('[data-portfolio-section-nav-zone="right"] svg')
      .boundingBox()
    const viewport = page.viewportSize()
    expect(desktopLogoBox).not.toBeNull()
    expect(leftRailSvgBox).not.toBeNull()
    expect(rightRailSvgBox).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(
      Math.abs(
        triggerBox!.y +
          triggerBox!.height / 2 -
          (desktopLogoBox!.y + desktopLogoBox!.height / 2),
      ),
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs(
        triggerBox!.x +
          triggerBox!.width / 2 -
          (rightRailSvgBox!.x + rightRailSvgBox!.width / 2),
      ),
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs(
        desktopLogoBox!.x +
          desktopLogoBox!.width / 2 -
          (leftRailSvgBox!.x + leftRailSvgBox!.width / 2),
      ),
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs(
        desktopLogoBox!.x +
          desktopLogoBox!.width / 2 -
          (viewport!.width - (triggerBox!.x + triggerBox!.width / 2)),
      ),
    ).toBeLessThanOrEqual(0.5)

    const name = page.locator('[data-portfolio-desktop-name]')
    await expect(name).toHaveCSS('opacity', '1')
    await page
      .locator('[data-portfolio-vertical-scroll]')
      .evaluate((source: HTMLDivElement) => {
        source.style.scrollSnapType = 'none'
        source.scrollTop = source.clientHeight * 0.2
        source.dispatchEvent(new Event('scroll'))
      })
    await expect(name).toHaveCSS('opacity', '0')
  }

  await openThemeMenu(page)
  const menuBox = await page
    .locator('[data-portfolio-theme-menu]')
    .boundingBox()
  const viewport = page.viewportSize()
  expect(menuBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(menuBox!.x).toBeGreaterThanOrEqual(8)
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport!.width - 8)
})

test('theme control yields its corner to inline zoom and image modals', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'))
  const trigger = page.locator('[data-portfolio-theme-trigger]')

  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  await expect(trigger).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(
    page.locator('[data-portfolio-inline-zoomed="true"]'),
  ).toBeVisible()
  await expect(trigger).toBeHidden()

  await page.keyboard.press('ArrowDown')
  await expect(
    page.locator('[data-portfolio-inline-zoomed="true"]'),
  ).toHaveCount(0)
  await expect(trigger).toBeVisible()

  await page.goto('/work/aarons-toolbox/overview?modal=image')
  await waitForPortfolio(page)
  await expect(page.locator('[data-portfolio-modal-root]')).toBeVisible()
  await expect(trigger).toBeHidden()
})

test('theme changes leave project media unfiltered', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)

  await openThemeMenu(page)
  await page.locator('[data-portfolio-theme-option="light"]').click()
  const media = page
    .locator('[data-portfolio-screenshot-id="aarons-toolbox-overview"] img')
    .first()
  await expect(media).toHaveCSS('filter', 'none')
  await expect(media).toHaveCSS('mix-blend-mode', 'normal')
})

test('reduced motion disables theme and menu transitions', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/work')
  await waitForPortfolio(page)

  await expect(page.locator('[data-portfolio-theme-root]')).toHaveCSS(
    'transition-duration',
    '0s',
  )
  await openThemeMenu(page)
  await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCSS(
    'transition-duration',
    '0s',
  )
})
