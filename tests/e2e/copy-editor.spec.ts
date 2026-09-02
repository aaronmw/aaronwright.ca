import { expect, test } from '@playwright/test'

test('edits, persists, exports, and resets copy changes', async ({
  context,
  page,
}, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.goto('/copy-editor')
  await expect(
    page.getByRole('heading', { name: 'Rewrite it in context.' }),
  ).toBeVisible()

  const fields = page.locator('textarea, input[type="text"]')
  await expect(fields).not.toHaveCount(0)
  expect(await fields.count()).toBeGreaterThanOrEqual(40)
  expect(await page.locator('img').count()).toBeGreaterThan(0)

  const roleField = page
    .getByText('portfolio.projects.loopio.rolesMarkdown', { exact: true })
    .locator('xpath=ancestor::article')
  await expect(roleField.getByText('Text only', { exact: true })).toHaveCount(0)
  await expect(roleField.locator('img, video')).toHaveCount(0)

  const coverDescriptionField = page
    .getByText('portfolio.projects.loopio.cover_image.alt', { exact: true })
    .locator('xpath=ancestor::article')
  await expect(coverDescriptionField.locator('img')).toHaveCount(1)
  await expect(coverDescriptionField.locator('input[type="text"]')).toHaveCount(
    1,
  )
  const [coverFieldBox, coverMediaBox] = await Promise.all([
    coverDescriptionField.locator('input[type="text"]').boundingBox(),
    coverDescriptionField.locator('figure').boundingBox(),
  ])
  expect(coverFieldBox).not.toBeNull()
  expect(coverMediaBox).not.toBeNull()
  expect(coverMediaBox!.x).toBeGreaterThan(coverFieldBox!.x)
  expect(coverMediaBox!.width).toBeGreaterThanOrEqual(540)
  expect(coverMediaBox!.height).toBeGreaterThanOrEqual(400)

  const screenshotBlock = page
    .getByText('portfolio.projects.loopio.screenshots.dense-work.alt', {
      exact: true,
    })
    .locator('xpath=ancestor::article')
  await expect(
    screenshotBlock.getByText(
      'portfolio.projects.loopio.screenshots.dense-work.description',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(screenshotBlock.locator('input[type="text"]')).toHaveCount(1)
  await expect(screenshotBlock.locator('textarea')).toHaveCount(1)
  await expect(screenshotBlock.locator('img')).toHaveCount(1)

  const firstField = fields.first()
  const originalValue = await firstField.inputValue()
  const editedValue = 'Aaron Wright — product designer and frontend engineer'
  await firstField.fill(editedValue)
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible()

  const copyButton = page.getByRole('button', {
    name: 'Copy JSON for Codex',
  })
  await expect(copyButton).toBeEnabled()
  await copyButton.click()
  await expect(
    page.getByText('Copied 1 change for Codex', { exact: true }),
  ).toBeVisible()

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(JSON.parse(clipboard)).toEqual({
    format: 'aaronwright-copy-edits/v1',
    changes: { 'site.home.name': editedValue },
  })

  await page.reload()
  await expect(fields.first()).toHaveValue(editedValue)

  await page.screenshot({
    path: testInfo.outputPath('copy-editor-desktop.png'),
    fullPage: false,
  })

  await screenshotBlock.scrollIntoViewIfNeeded()
  await expect(
    page.locator('img[src*="loopio-case-study"]').first(),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('copy-editor-media.png'),
    fullPage: false,
  })

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reset changes' }).click()
  await expect(
    page.getByText('Reset to current app copy', { exact: true }),
  ).toBeVisible()
  await expect(fields.first()).toHaveValue(originalValue)
  await expect(copyButton).toBeDisabled()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Rewrite it in context.' }),
  ).toBeVisible()
  await expect(fields.first()).toBeVisible()
  await expect(copyButton).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
  await page.screenshot({
    path: testInfo.outputPath('copy-editor-mobile.png'),
    fullPage: false,
  })

  expect(consoleErrors).toEqual([])
})
