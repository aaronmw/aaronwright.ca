import { expect, test, type Locator, type Page } from '@playwright/test'
import { gridReady, settled } from '../../scripts/qa/tasks.mjs'

const tile = (page: Page, slug: string) =>
  page.locator(`[data-mosaic-project="${slug}"]`)

async function frame(subject: Locator) {
  return subject.evaluate(element => {
    const media = element.querySelector<HTMLElement>('[data-mosaic-media]')!
    const t = element.getBoundingClientRect(),
      m = media.getBoundingClientRect()
    return {
      width: t.width,
      height: t.height,
      mediaWidth: m.width,
      mediaHeight: m.height,
      x: m.x - t.x,
      y: m.y - t.y,
      ratio: Number(
        getComputedStyle(element).getPropertyValue('--mosaic-ratio'),
      ),
    }
  })
}

async function expectFit(subject: Locator) {
  await expect
    .poll(async () => {
      const f = await frame(subject)
      return (
        Math.abs(f.mediaWidth - Math.min(f.width, f.height * f.ratio)) +
        Math.abs(f.mediaHeight - Math.min(f.height, f.width / f.ratio))
      )
    })
    .toBeLessThan(0.2)
  const f = await frame(subject)
  expect(Math.abs(f.x - (f.width - f.mediaWidth) / 2)).toBeLessThan(0.1)
  expect(Math.abs(f.y - (f.height - f.mediaHeight) / 2)).toBeLessThan(0.1)
}

test('ten packed projects stay inside the viewport without page overflow', async ({
  page,
}) => {
  await page.goto('/work')
  await gridReady(page)
  const viewport = page.viewportSize()!
  for (const box of await page
    .locator('[data-mosaic-project]')
    .evaluateAll(items =>
      items.map(item => item.getBoundingClientRect().toJSON()),
    )) {
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(viewport.width + 1)
    expect(box.bottom).toBeLessThanOrEqual(viewport.height + 1)
    expect(box.width).toBeGreaterThan(44)
    expect(box.height).toBeGreaterThan(44)
  }
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })),
  ).toEqual(viewport)
})

test('keyboard focus fits a whole cover and fades peers; pointer hover uses the same framing', async ({
  page,
  isMobile,
}) => {
  await page.goto('/work')
  await gridReady(page)
  const subject = tile(page, 'aarons-toolbox')
  await subject.focus()
  await expectFit(subject)
  await expect(tile(page, 'freshbooks')).toHaveCSS('opacity', '0.22')
  await expect(subject).toHaveCSS('outline-style', 'solid')
  const fitted = await frame(subject)
  await subject.evaluate(element => (element as HTMLElement).blur())
  if (!isMobile) {
    await subject.hover()
    await expectFit(subject)
    const hovered = await frame(subject)
    expect(hovered.mediaWidth).toBeCloseTo(fitted.mediaWidth, 1)
    expect(hovered.mediaHeight).toBeCloseTo(fitted.mediaHeight, 1)
    await expect(tile(page, 'freshbooks')).toHaveCSS('opacity', '0.22')
    await page.mouse.move(0, 0)
  }
})

test('QA settlement ignores recurring video frames while observing real UI motion', async ({
  page,
}) => {
  await page.goto('/work')
  await gridReady(page)
  const video = page.locator('[data-mosaic-project="gift-exchanges"] video')
  await expect
    .poll(() => video.evaluate(element => (element as HTMLVideoElement).paused))
    .toBe(false)
  const before = await video.evaluate(
    element => (element as HTMLVideoElement).currentTime,
  )
  await settled(page)
  await expect
    .poll(() =>
      video.evaluate(element => (element as HTMLVideoElement).currentTime),
    )
    .not.toBe(before)
  await tile(page, 'loopio').click()
  await settled(page)
  await expect(page.locator('.yarl__root')).toHaveAttribute(
    'data-mosaic-transition-state',
    'open',
  )
  await expect(page.locator('.yarl__root [data-animating]')).toHaveCount(0)
})
