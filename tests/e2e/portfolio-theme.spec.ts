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

test('System follows live color-scheme changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/work')
  await waitForPortfolio(page)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'dark',
  )
})

test('React Aria menu persists selection and restores trigger focus', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)
  const trigger = page.locator('[data-portfolio-theme-trigger]')

  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.locator('[data-portfolio-theme-option="system"]'),
  ).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('data-portfolio-theme-icon', 'light')
  expect(
    await page.evaluate(() => localStorage.getItem('portfolio-theme')),
  ).toBe('light')

  await page.reload()
  await waitForPortfolio(page)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme-preference',
    'light',
  )
})

test('React Aria menu supports Home, End, Escape, and outside dismissal', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)
  const trigger = page.locator('[data-portfolio-theme-trigger]')

  await trigger.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('End')
  await expect(
    page.locator('[data-portfolio-theme-option="dark"]'),
  ).toBeFocused()
  await page.keyboard.press('Home')
  await expect(
    page.locator('[data-portfolio-theme-option="system"]'),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await openThemeMenu(page)
  await page.mouse.click(300, 300)
  await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCount(0)
})

test('theme menu keeps arrow navigation local without trapping section numbers', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work')
  await waitForPortfolio(page)

  const trigger = page.locator('[data-portfolio-theme-trigger]')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.locator('[data-portfolio-theme-option="system"]'),
  ).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(
    page.locator('[data-portfolio-theme-option="light"]'),
  ).toBeFocused()
  await expect(page).toHaveURL(/\/work$/)

  await page.keyboard.press('2')
  await expect(page).toHaveURL(/\/work\/loopio$/)
})

test('viewer hides the appearance control and restores it on close', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('iphone'))
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-portfolio-theme-trigger]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeVisible()
})
