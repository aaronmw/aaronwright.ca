import { expect, test, type Locator, type Page } from '@playwright/test'
import { gridReady } from '../../scripts/qa/tasks.mjs'

type Adjustment = {
  focal: { x: number; y: number }
  target: { x: number; y: number }
  zoom: number
}
type Export = {
  schemaVersion: number
  cells: Record<string, { composition: Adjustment }>
}

declare global {
  interface Window {
    adjustmentClipboard: { fail: boolean; writes: string[] }
  }
}

const tile = (page: Page) => page.locator('[data-mosaic-project="loopio"]')

async function enterEditor(page: Page) {
  await page.getByRole('button', { name: 'Project development tools' }).click()
  await page.getByRole('button', { name: 'Adjust project cells' }).click()
}

async function ready(page: Page, failCopy = false) {
  await page.addInitScript(fail => {
    window.adjustmentClipboard = { fail, writes: [] }
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          window.adjustmentClipboard.writes.push(text)
          if (window.adjustmentClipboard.fail)
            throw new DOMException('Clipboard denied', 'NotAllowedError')
        },
      },
    })
  }, failCopy)
  await page.goto('/work')
  await gridReady(page)
  await enterEditor(page)
  await tile(page).focus()
  await page
    .getByRole('button', { name: 'Use full video', exact: true })
    .click()
  await expect(page.locator('main')).toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
}

async function frame(subject: Locator) {
  return subject.evaluate(element => {
    const t = element.getBoundingClientRect()
    const m = element
      .querySelector('[data-mosaic-media]')!
      .getBoundingClientRect()
    return {
      left: t.left,
      top: t.top,
      width: t.width,
      height: t.height,
      mediaWidth: m.width,
      mediaHeight: m.height,
      x: m.left - t.left,
      y: m.top - t.top,
      ratio: Number(
        getComputedStyle(element).getPropertyValue('--mosaic-ratio'),
      ),
    }
  })
}

async function covered(subject: Locator) {
  const f = await frame(subject)
  expect(f.x).toBeLessThanOrEqual(0.2)
  expect(f.y).toBeLessThanOrEqual(0.2)
  expect(f.x + f.mediaWidth).toBeGreaterThanOrEqual(f.width - 0.2)
  expect(f.y + f.mediaHeight).toBeGreaterThanOrEqual(f.height - 0.2)
}

async function wheel(subject: Locator, deltaY: number, metaKey = true) {
  return subject.evaluate(
    (element, options) => {
      const box = element.getBoundingClientRect()
      const event = new WheelEvent('wheel', {
        ...options,
        clientX: Math.round(box.left + box.width * 0.6),
        clientY: Math.round(box.top + box.height * 0.6),
        bubbles: true,
        cancelable: true,
      })
      element.dispatchEvent(event)
      return event.defaultPrevented
    },
    { deltaY, metaKey },
  )
}

async function copied(page: Page): Promise<Export> {
  await page.getByRole('button', { name: 'Done & copy', exact: true }).click()
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
  await expect(
    page.getByText('Adjustments copied.', { exact: true }),
  ).toBeVisible()
  const text = await page.evaluate(() =>
    window.adjustmentClipboard.writes.at(-1)!,
  )
  const result = JSON.parse(text) as Export
  expect(text).toBe(JSON.stringify(result, null, 2))
  expect(result.schemaVersion).toBe(6)
  expect(Object.keys(result.cells).sort()).toEqual(
    [
      'aarons-toolbox-overview',
      'about-portrait',
      'cycles-scrollthrough',
      'freshbooks-before-after',
      'informal-systems-walkthrough',
      'loopio-before-after',
      'age-scrollthrough',
      'radio-app-demo',
      'gift-exchanges-demo',
      'nextphrase-intro',
    ].sort(),
  )
  return result
}

test('editing preserves crops and peers, blocks the gallery, and restores normal activation on exit', async ({
  page,
  isMobile,
}) => {
  await ready(page)
  const subject = tile(page)
  const before = await frame(subject)
  await subject.focus()
  if (!isMobile) await subject.hover()
  await subject.press('Enter')
  await subject.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-mosaic-project]')).toHaveCount(10)
  await expect(page.locator('[data-mosaic-media]')).toHaveCount(10)
  expect(await frame(subject)).toEqual(before)
  for (const peer of await page.locator('[data-mosaic-project]').all()) {
    await expect(peer).toHaveCSS('opacity', '1')
    await covered(peer)
  }
  await copied(page)
  await subject.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Project development tools' }),
  ).not.toBeVisible()
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Project development tools' }),
  ).toBeVisible()
})

test('Meta+wheel keeps the image point under the pointer and clamps zoom; normal wheel is untouched', async ({
  page,
}) => {
  await ready(page)
  const subject = tile(page)
  const before = await frame(subject)
  expect(await wheel(subject, -100, false)).toBe(false)
  expect(await frame(subject)).toEqual(before)
  expect(await wheel(subject, -100)).toBe(true)
  await expect
    .poll(async () => (await frame(subject)).mediaWidth)
    .toBeGreaterThan(before.mediaWidth)
  const after = await frame(subject)
  // MouseEvent client coordinates are integer-valued in WebKit. Compare
  // against the actual dispatched point rather than the fractional tile point.
  const anchorX = Math.round(before.left + before.width * 0.6) - before.left
  const anchorY = Math.round(before.top + before.height * 0.6) - before.top
  expect((anchorX - after.x) / after.mediaWidth).toBeCloseTo(
    (anchorX - before.x) / before.mediaWidth,
    4,
  )
  expect((anchorY - after.y) / after.mediaHeight).toBeCloseTo(
    (anchorY - before.y) / before.mediaHeight,
    4,
  )
  await subject.press('ArrowLeft')
  await expect.poll(async () => (await frame(subject)).x).toBeLessThan(after.x)
  const panned = await frame(subject)
  await subject.press('ArrowRight')
  await expect
    .poll(async () => (await frame(subject)).x)
    .toBeGreaterThan(panned.x)
  await subject.press('+')
  await expect
    .poll(async () => (await frame(subject)).mediaWidth)
    .toBeGreaterThan(after.mediaWidth)
  const zoomed = await frame(subject)
  await subject.press('-')
  await expect
    .poll(async () => (await frame(subject)).mediaWidth)
    .toBeLessThan(zoomed.mediaWidth)
  await wheel(subject, -100000)
  const coverWidth = Math.max(before.width, before.height * before.ratio)
  await expect
    .poll(async () => (await frame(subject)).mediaWidth / coverWidth)
    .toBeCloseTo(20, 3)
  await covered(subject)
  await wheel(subject, 100000)
  await expect
    .poll(async () => (await frame(subject)).mediaWidth / coverWidth)
    .toBeCloseTo(1, 3)
  await covered(subject)
})

test('crop drafts stay shared across orientations, persist on re-entry, and reset on refresh', async ({
  page,
}) => {
  await ready(page)
  const baseline = await copied(page)
  await enterEditor(page)
  await page.setViewportSize({ width: 900, height: 900 })
  await wheel(tile(page), -100)
  const landscapeDraft = await copied(page)
  await enterEditor(page)
  await page.setViewportSize({ width: 600, height: 900 })
  expect(await copied(page)).toEqual(landscapeDraft)
  await enterEditor(page)
  await wheel(tile(page), -50)
  const exported = await copied(page)
  const original = baseline.cells['loopio-before-after']
  const adjusted = exported.cells['loopio-before-after']
  expect(adjusted.composition.zoom).toBeGreaterThan(original.composition.zoom)
  expect(adjusted.composition.zoom).toBeGreaterThan(
    landscapeDraft.cells['loopio-before-after'].composition.zoom,
  )
  expect(adjusted.composition.target).toEqual(original.composition.target)
  expect(adjusted).not.toHaveProperty('landscape')
  expect(adjusted).not.toHaveProperty('portrait')
  for (const [id, cell] of Object.entries(exported.cells)) {
    if (id !== 'loopio-before-after') expect(cell).toEqual(baseline.cells[id])
  }
  await enterEditor(page)
  expect(await copied(page)).toEqual(exported)
  await page.reload()
  await gridReady(page)
  await enterEditor(page)
  await tile(page).focus()
  await page
    .getByRole('button', { name: 'Use full video', exact: true })
    .click()
  expect(await copied(page)).toEqual(baseline)
})

test('clipboard failure keeps drafts and offers selectable JSON, retry, and explicit finish', async ({
  page,
}) => {
  await ready(page, true)
  await wheel(tile(page), -100)
  await page.getByRole('button', { name: 'Done & copy', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
  const json = page.getByRole('textbox', { name: 'Adjustment JSON' })
  await expect(json).toBeVisible()
  await expect(
    page
      .getByRole('complementary', { name: 'Project cell adjustments' })
      .getByRole('alert'),
  ).toHaveText('Copy failed. Retry or select the JSON and copy it manually.')
  const draft = await json.inputValue()
  expect(JSON.parse(draft).schemaVersion).toBe(6)
  await page.getByRole('button', { name: 'Select JSON', exact: true }).click()
  await expect(json).toBeFocused()
  expect(
    await json.evaluate(element => {
      const input = element as HTMLTextAreaElement
      return input.value.slice(input.selectionStart, input.selectionEnd)
    }),
  ).toBe(draft)
  expect(
    await json.evaluate(element => {
      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      })
      element.dispatchEvent(event)
      return event.defaultPrevented
    }),
  ).toBe(false)
  await page.evaluate(() => {
    window.adjustmentClipboard.fail = false
  })
  await page.getByRole('button', { name: 'Retry copy', exact: true }).click()
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
  await expect(
    page.getByText('Adjustments copied.', { exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => window.adjustmentClipboard.writes)).toEqual([
    draft,
    draft,
  ])
  await enterEditor(page)
  await page.evaluate(() => {
    window.adjustmentClipboard.fail = true
  })
  await page.getByRole('button', { name: 'Done & copy', exact: true }).click()
  await expect(json).toHaveValue(draft)
  await page
    .getByRole('button', { name: 'Finish without copying', exact: true })
    .click()
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-mosaic-adjusting',
    'true',
  )
  await expect(json).toHaveCount(0)
})

test('drag captures the pointer, pans media, and cancels on viewport change', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Real mouse capture is exercised by both desktop engines.',
  )
  await ready(page)
  const subject = tile(page)
  await wheel(subject, -500)
  const before = await frame(subject)
  await page.mouse.move(
    before.left + before.width / 2,
    before.top + before.height / 2,
  )
  await page.mouse.down()
  await expect(subject).toHaveAttribute('data-mosaic-dragging', 'true')
  expect(await subject.evaluate(element => element.hasPointerCapture(1))).toBe(
    true,
  )
  await page.mouse.move(
    before.left + before.width / 2 + 20,
    before.top + before.height / 2 + 16,
    { steps: 3 },
  )
  await expect
    .poll(async () => (await frame(subject)).x)
    .toBeCloseTo(before.x + 20, 0)
  await expect
    .poll(async () => (await frame(subject)).y)
    .toBeCloseTo(before.y + 16, 0)
  await covered(subject)
  await page.mouse.up()
  await expect(subject).not.toHaveAttribute('data-mosaic-dragging', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.mouse.down()
  await expect(subject).toHaveAttribute('data-mosaic-dragging', 'true')
  await page.setViewportSize({ width: 600, height: 900 })
  await expect(subject).not.toHaveAttribute('data-mosaic-dragging', 'true')
  await page.mouse.up()
  await covered(subject)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`inline development controls stay light with ${colorScheme} System appearance`, async ({
    page,
    request,
  }) => {
    for (const route of [
      '/copy-editor',
      '/case-study-intake',
      '/case-study-brochures',
    ]) {
      expect((await request.get(route)).status()).toBe(404)
    }
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/work')
    await gridReady(page)
    await page
      .getByRole('button', { name: 'Project development tools' })
      .click()
    const panel = page.getByRole('complementary', {
      name: 'Project cell adjustments',
    })
    await expect(panel).toBeVisible()
    await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await page.getByRole('button', { name: 'Adjust project cells' }).click()
    await tile(page).focus()
    await page.emulateMedia({
      colorScheme: colorScheme === 'light' ? 'dark' : 'light',
      reducedMotion: 'reduce',
    })
    await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('main')).toHaveAttribute(
      'data-mosaic-adjusting',
      'true',
    )
    await expect(panel).toHaveCSS(
      'color',
      await page
        .locator('body')
        .evaluate(element => getComputedStyle(element).color),
    )
  })
}
