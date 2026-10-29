import { expect, test } from '@playwright/test'

const route = '/grid-version'

test(`${route} opens the first slide without navigation or zoom and preserves Back/Forward`, async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(route)
  const subject = page.locator('[data-mosaic-project="loopio"]')
  await expect
    .poll(() =>
      subject.evaluate(element => Boolean(element.closest('[inert]'))),
    )
    .toBe(false)
  await subject.focus()
  await subject.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(`${route}?project=loopio&slide=cover`)
  await expect(
    page.getByRole('button', {
      name: /^(Zoom in|Zoom out|Fit image to screen|Previous image|Next image)$/,
    }),
  ).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(`${route}?project=loopio&slide=cover`)
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(route)
  await expect(subject).toBeFocused()
  await page.goForward()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(`${route}?project=loopio&slide=cover`)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(route)
  await expect(subject).toBeFocused()
  expect(errors).toEqual([])
})

test(`${route} closes a reduced-motion direct link on its own route`, async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route}?project=nextphrase-dot-app&slide=intro`)
  const video = page.locator('.yarl__slide_current video')
  await expect(video).toBeVisible()
  await expect
    .poll(() => video.evaluate(element => (element as HTMLVideoElement).paused))
    .toBe(true)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(route)
  await expect(
    page.locator('[data-mosaic-project="nextphrase-dot-app"]'),
  ).toBeFocused()
  for (const slug of [
    'cycles-dot-money',
    'aarons-toolbox',
    'informal-systems',
    'nextphrase-dot-app',
  ]) {
    const media = page.locator(
      `[data-mosaic-project="${slug}"] [data-mosaic-video-state]`,
    )
    await expect(media).toHaveAttribute(
      'data-mosaic-video-state',
      'reduced-motion',
    )
    await expect(media.locator('img:not([hidden])')).toBeVisible()
    await expect(media.locator('video')).not.toHaveAttribute('src', /.+/)
  }
})

test('legacy v2 redirects with gallery and unrelated query parameters intact', async ({
  page,
}) => {
  await page.goto('/v2?project=loopio&slide=a-mature-product&ref=legacy')
  await expect(page).toHaveURL(
    '/grid-version?project=loopio&slide=a-mature-product&ref=legacy',
  )
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page).toHaveURL('/grid-version')
})
