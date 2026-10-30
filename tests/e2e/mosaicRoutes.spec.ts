import { expect, test } from '@playwright/test'
import { gridReady, viewerReady } from '../../scripts/qa/tasks.mjs'

const projectPaths = [
  'about-me',
  'loopio',
  'freshbooks',
  'cycles-dot-money',
  'informal-systems',
  'aarons-toolbox',
  'nextphrase',
  'age-dot-fund',
  'radio-app',
  'gift-exchanges',
]

test('open, Back, Forward, close, and refresh retain native history and return focus', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/work?ref=one&ref=two')
  await gridReady(page)
  const initialTitle = await page.title()
  const subject = page.locator('[data-mosaic-project="loopio"]')
  await subject.evaluate(element =>
    element.setAttribute('data-qa-retained', 'yes'),
  )
  await subject.focus()
  await subject.press('Enter')
  await viewerReady(page)
  await expect(page).toHaveURL('/work/loopio?ref=one&ref=two')
  await expect(page).toHaveTitle(/Loopio/)
  await expect(
    page.getByRole('button', {
      name: /^(Zoom in|Zoom out|Fit image to screen|Previous image|Next image)$/,
    }),
  ).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL('/work/loopio?ref=one&ref=two')
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL('/work?ref=one&ref=two')
  await expect(page).toHaveTitle(initialTitle)
  await expect(subject).toBeFocused()
  await page.goForward()
  await viewerReady(page)
  await expect(page).toHaveURL('/work/loopio?ref=one&ref=two')
  await expect(subject).toHaveAttribute('data-qa-retained', 'yes')
  await page.reload()
  await viewerReady(page)
  await expect(page).toHaveURL('/work/loopio?ref=one&ref=two')
  await subject.evaluate(element =>
    element.setAttribute('data-qa-retained-after-refresh', 'yes'),
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL('/work?ref=one&ref=two')
  await expect(subject).toBeFocused()
  await expect(subject).toHaveAttribute('data-qa-retained-after-refresh', 'yes')
  expect(errors).toEqual([])
})

test('NextPhrase direct links use the public slug and reduced motion keeps media still', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/work/nextphrase?ref=direct')
  await viewerReady(page)
  const video = page.locator('.yarl__slide_current video')
  await expect
    .poll(() => video.evaluate(element => (element as HTMLVideoElement).paused))
    .toBe(true)
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL('/work?ref=direct')
  await expect(
    page.locator('[data-mosaic-project="nextphrase-dot-app"]'),
  ).toBeFocused()
  for (const media of await page.locator('[data-mosaic-video-state]').all()) {
    await expect(media).toHaveAttribute(
      'data-mosaic-video-state',
      'reduced-motion',
    )
    await expect(media.locator('img:not([hidden])')).toBeVisible()
    await expect(media.locator('video')).not.toHaveAttribute('src', /.+/)
  }
})

test('legacy entry and detail URLs permanently redirect and retain repeated unrelated parameters', async ({
  request,
}) => {
  const redirects = [
    ['/', '/work'],
    ['/projects/loopio?ref=one&ref=two', '/work/loopio?ref=one&ref=two'],
    ['/slides/nextphrase?ref=one&ref=two', '/work/nextphrase?ref=one&ref=two'],
    ['/grid-version?ref=one&ref=two', '/work?ref=one&ref=two'],
    [
      '/v2?project=loopio&slide=a-mature-product&modal=image&zoom=2&ref=one&ref=two',
      '/work/loopio?ref=one&ref=two',
    ],
    [
      '/grid-version?project=nextphrase-dot-app&slide=intro&modal=image&zoom=2&ref=one&ref=two',
      '/work/nextphrase?ref=one&ref=two',
    ],
    [
      '/work/loopio/a-mature-product?modal=image&zoom=2&ref=one&ref=two',
      '/work/loopio?ref=one&ref=two',
    ],
    ['/work/aarons-toolbox/normalizer?ref=old', '/work/aarons-toolbox?ref=old'],
    ['/work/nextphrase/intro?modal=image&ref=old', '/work/nextphrase?ref=old'],
    ['/work/nextphrase-dot-app?ref=old', '/work/nextphrase?ref=old'],
    [
      '/grid-version?project=loopio&slide=not-a-slide&ref=old',
      '/work/loopio?ref=old',
    ],
  ]
  for (const [source, expected] of redirects) {
    const response = await request.get(source, { maxRedirects: 0 })
    expect(response.status(), source).toBe(308)
    const target = new URL(response.headers().location, response.url())
    expect(target.pathname + target.search, source).toBe(expected)
  }
})

test('unknown projects and unknown legacy media remain 404s', async ({
  page,
  request,
}) => {
  for (const path of [
    '/work/not-a-project',
    '/work/loopio/not-a-slide',
    '/work/loopio/cover/extra',
    '/grid-version?project=not-a-project',
    '/v2?project=not-a-project',
  ]) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(404)
  }
  const response = await page.goto('/work/not-a-project')
  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: '404', exact: true }),
  ).toBeVisible()
  await expect(page.locator('[data-mosaic-root]')).toHaveCount(0)
})

test('the grid and all ten project pages have indexable canonical metadata', async ({
  page,
  request,
}) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  const xml = await sitemap.text()
  for (const path of ['/work', ...projectPaths.map(slug => `/work/${slug}`)]) {
    expect(xml).toContain(`https://aaronwright.ca${path}</loc>`)
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    const html = await response.text()
    expect(html, path).toContain(
      `rel="canonical" href="https://aaronwright.ca${path}"`,
    )
    expect(html, path).not.toMatch(/name="robots"[^>]*content="[^"]*noindex/)
  }
  expect(xml).not.toMatch(/grid-version|\/v2|nextphrase-dot-app/)
  expect(xml.match(/<loc>/g)).toHaveLength(11)
  await page.goto('/work/loopio')
  await viewerReady(page)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://aaronwright.ca/work/loopio',
  )
  await expect(page).toHaveTitle(/Loopio/)
})
