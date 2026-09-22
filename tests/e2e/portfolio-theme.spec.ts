import { expect, test, type Page } from '@playwright/test'
import { themeSettled } from '../../scripts/qa/tasks.mjs'

async function waitForPortfolio(page: Page) {
  // Next's streamed HTML can temporarily include a second, hidden copy.
  const portfolio = page.locator('main[data-portfolio-phase]:visible')
  await expect(portfolio).toHaveAttribute('data-portfolio-phase', 'ready')
  await expect(
    portfolio.locator('[data-portfolio-startup-loader]'),
  ).toHaveCount(0)
  await expect(portfolio.locator('[data-portfolio-browser-chrome]')).toHaveCSS(
    'opacity',
    '1',
  )
}

async function openThemeMenu(page: Page) {
  const trigger = page.locator('[data-portfolio-theme-trigger]')
  await trigger.click()
  await expect(page.locator('[data-portfolio-theme-menu]')).toBeVisible()
}

test('pointer opening keeps the appearance menu open until a choice is made', async ({
  page,
}, testInfo) => {
  await page.goto('/work')
  await waitForPortfolio(page)
  const trigger = page.locator('[data-portfolio-theme-trigger]')
  const menu = page.locator('[data-portfolio-theme-menu]')

  if (testInfo.project.use.hasTouch) {
    await trigger.tap()
  } else {
    await trigger.hover()
    await page.mouse.down()
    await expect(menu).toBeVisible()
    // Let the overlapping first row appear before releasing the opening press.
    await expect(menu).toHaveCSS('opacity', '1')
    await page.mouse.up()
  }

  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(menu).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme-preference',
    'system',
  )

  const light = page.getByRole('menuitemradio', { name: 'Light', exact: true })
  if (testInfo.project.use.hasTouch) await light.tap()
  else await light.click()
  await expect(menu).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  expect(
    await page.evaluate(() => localStorage.getItem('portfolio-theme')),
  ).toBe('light')
})

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

test('theme selection waits for the menu to close without reordering its visible rows', async ({
  page,
}) => {
  await page.emulateMedia({
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  })
  await page.goto('/work')
  await waitForPortfolio(page)
  // Keep the exit observable without depending on machine or frame timing.
  await page.addStyleTag({
    content:
      '.portfolio-theme-control, .portfolio-theme-menu { --portfolio-motion-menu: 2s; } ' +
      '[data-portfolio-theme-root] { --portfolio-motion-theme: 1s; }',
  })
  await openThemeMenu(page)
  const menu = page.locator('[data-portfolio-theme-menu]')
  const options = menu.locator('[data-portfolio-theme-option]')
  const initialOrder = await options.allTextContents()
  await expect(menu).toHaveCSS('opacity', '1')

  await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click()

  await expect(menu).toHaveAttribute('data-exiting', 'true')
  expect(await options.allTextContents()).toEqual(initialOrder)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'light',
  )
  await expect(page.locator('[data-portfolio-theme-menu-scrim]')).not.toHaveCSS(
    'opacity',
    '0',
  )

  await expect(menu).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme',
    'dark',
  )
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeFocused()
  await themeSettled(page)
  expect(await page.locator('[data-portfolio-theme-root]').evaluate(
    element => element.getAnimations().length,
  )).toBe(0)
})

test('choosing the current appearance closes the menu with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/work')
  await waitForPortfolio(page)
  await openThemeMenu(page)
  await page.getByRole('menuitemradio', { name: 'System', exact: true }).click()
  await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCount(0)
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeFocused()

  await openThemeMenu(page)
  await page.getByRole('menuitemradio', { name: 'Light', exact: true }).click()
  await expect(page.locator('[data-portfolio-theme-menu]')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute(
    'data-portfolio-theme-preference',
    'light',
  )
  await themeSettled(page)
})

test('React Aria menu persists selection and restores trigger focus', async ({
  page,
}) => {
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
}) => {
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
}) => {
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
}) => {
  await page.goto('/work/aarons-toolbox/overview')
  await waitForPortfolio(page)
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-portfolio-theme-trigger]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-portfolio-theme-trigger]')).toBeVisible()
})
