import { MaxRectsPacker } from 'maxrects-packer'
import type { MosaicRect } from './types'

import { MAX_PACKING_TOLERANCE, type PackingSettings } from './packingSettings'
export type { PackingApproach, PackingSettings } from './packingSettings'
type Box = MosaicRect & { index: number }
export type PackingResult = { boxes: Box[]; coverage: number }

function generator(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

// Fit entire rows inside a bounded viewport, keeping gaps constant. Transposing
// the inputs also evaluates columns without distorting any source rectangle.
function justified(
  ratios: number[],
  width: number,
  height: number,
  gap: number,
  random: () => number,
  tolerance = 0,
  reserved?: MosaicRect,
): Box[][] {
  if (reserved)
    return packAroundLogo(
      ratios,
      width,
      height,
      gap,
      random,
      tolerance,
      reserved,
      justified,
    )
  const candidates: Box[][] = []
  for (const transpose of [false, true]) {
    const w = transpose ? height : width,
      h = transpose ? width : height
    const rs = ratios.map(r => (transpose ? 1 / r : r))
    const order = ratios.map((_, i) => i)
    for (let trial = 0; trial < 12; trial++) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      // Exhaustive row breaks for the current small portfolio; bound work if it grows.
      const count = Math.min(2 ** (order.length - 1), 256)
      for (let mask = 0; mask < count; mask++) {
        const groups: number[][] = [[]]
        order.forEach((index, i) => {
          groups[groups.length - 1].push(index)
          if (i < order.length - 1 && mask & (1 << i)) groups.push([])
        })
        const sourceSums = groups.map(group =>
          group.reduce((sum, i) => sum + rs[i], 0),
        )
        const gaps = groups.map(group => (group.length - 1) * gap)
        // Adjust row ratios just enough to fill both axes, within the source's
        // allowed range. Inverted bounds keep transposed columns within it too.
        const availableHeight = h - (groups.length - 1) * gap
        if (availableHeight <= 0 || gaps.some(g => w <= g)) continue
        const fullWidthHeight = sourceSums.reduce(
          (sum, r, i) => sum + (w - gaps[i]) / r,
          0,
        )
        const factor = Math.max(
          transpose ? 1 / (1 + tolerance) : 1 - tolerance,
          Math.min(
            transpose ? 1 / (1 - tolerance) : 1 + tolerance,
            fullWidthHeight / availableHeight,
          ),
        )
        const sums = sourceSums.map(sum => sum * factor)
        // Sum((rowWidth - rowGaps) / rowRatioSum) + verticalGaps = height.
        const rowWidth = Math.min(
          w,
          (h -
            (groups.length - 1) * gap +
            gaps.reduce((sum, g, i) => sum + g / sums[i], 0)) /
            sums.reduce((sum, r) => sum + 1 / r, 0),
        )
        if (gaps.some(g => rowWidth <= g)) continue
        const heights = groups.map((_, i) => (rowWidth - gaps[i]) / sums[i])
        const usedHeight =
          heights.reduce((sum, n) => sum + n, 0) + (groups.length - 1) * gap
        let y = (h - usedHeight) / 2
        const boxes: Box[] = []
        groups.forEach((group, row) => {
          let x = (w - rowWidth) / 2
          group.forEach(index => {
            const bw = rs[index] * factor * heights[row],
              bh = heights[row]
            boxes.push({
              index,
              left: transpose ? y : x,
              top: transpose ? x : y,
              width: transpose ? bh : bw,
              height: transpose ? bw : bh,
            })
            x += bw + gap
          })
          y += heights[row] + gap
        })
        candidates.push(boxes)
      }
    }
  }
  return candidates
}

// Start each surrounding region at its inner corner. The first project must
// span that side of the logo's square; the remaining projects pack outward.
// Both windings retain normal gutters between the four framing projects.
function packAroundLogo(
  ratios: number[],
  width: number,
  height: number,
  gap: number,
  random: () => number,
  tolerance: number,
  reserved: MosaicRect,
  solver: typeof justified,
) {
  const { left: l, top: t } = reserved
  const r = l + reserved.width,
    b = t + reserved.height
  const partitions = [
    [
      [0, 0, r - gap, t, 1, 1, reserved.width],
      [r, 0, width - r, b - gap, 0, 1, reserved.height],
      [l + gap, b, width - l - gap, height - b, 0, 0, reserved.width],
      [0, t + gap, l, height - t - gap, 1, 0, reserved.height],
    ],
    [
      [l + gap, 0, width - l - gap, t, 0, 1, reserved.width],
      [r, t + gap, width - r, height - t - gap, 0, 0, reserved.height],
      [0, b, r - gap, height - b, 1, 0, reserved.width],
      [0, 0, l, b - gap, 1, 1, reserved.height],
    ],
  ]
  const candidates: Box[][] = []
  for (const partition of partitions) {
    const regions = partition
      .map((values, side) => ({ values, horizontal: side % 2 === 0 }))
      .filter(({ values: [, , w, h] }) => w > 0 && h > 0)
    if (!regions.length) continue
    const cache = new Map<string, Box[]>()
    for (let trial = 0; trial < 32; trial++) {
      const groups: number[][] = regions.map(() => [])
      const order = ratios.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      for (let position = 0; position < order.length; position++) {
        const index = order[position]
        // Every visible side gets a framing project before filling spare space.
        if (position < regions.length) {
          groups[position].push(index)
          continue
        }
        // Allocate comparable area per project, exploring adjacent allocations.
        const scores = regions.map(
          ({ values: [, , w, h] }, i) =>
            ((w * h) / (groups[i].length + 1)) *
            (trial === 0 ? 1 : 0.5 + random()),
        )
        groups[scores.indexOf(Math.max(...scores))].push(index)
      }
      const boxes = regions.flatMap(
        (
          { values: [left, top, w, h, right, bottom, span], horizontal },
          region,
        ) => {
          const group = groups[region].sort((a, b) => a - b)
          if (!group.length) return []
          const key = `${region}:${group.join(',')}`
          let best = cache.get(key)
          if (!best) {
            const layouts = solver(
              group.map(i => ratios[i]),
              w,
              h,
              gap,
              random,
              tolerance,
            )
            let bestArea = 0
            best = []
            for (const layout of layouts) {
              const x = Math.min(...layout.map(box => box.left))
              const y = Math.min(...layout.map(box => box.top))
              const corner = layout.find(
                box =>
                  Math.abs(box.left - x) < 1e-6 && Math.abs(box.top - y) < 1e-6,
              )
              if (
                !corner ||
                (horizontal ? corner.width : corner.height) < span - gap - 1e-6
              )
                continue
              const area = layout.reduce(
                (sum, box) => sum + box.width * box.height,
                0,
              )
              if (area <= bestArea) continue
              bestArea = area
              best = layout.map(box => ({
                ...box,
                left: right ? w - (box.left - x) - box.width : box.left - x,
                top: bottom ? h - (box.top - y) - box.height : box.top - y,
              }))
            }
            cache.set(key, best)
          }
          return best.map(box => ({
            ...box,
            index: group[box.index],
            left: box.left + left,
            top: box.top + top,
          }))
        },
      )
      if (boxes.length === ratios.length) candidates.push(boxes)
    }
  }
  return candidates
}

function rectangles(
  ratios: number[],
  width: number,
  height: number,
  gap: number,
  random: () => number,
  tolerance = 0,
  reserved?: MosaicRect,
): Box[][] {
  if (reserved)
    return packAroundLogo(
      ratios,
      width,
      height,
      gap,
      random,
      tolerance,
      reserved,
      rectangles,
    )
  const candidates: Box[][] = []
  for (let trial = 0; trial < 24; trial++) {
    // Similar areas keep every project useful; varied weights allow better fits.
    const weights = ratios.map(() => (trial === 0 ? 1 : 0.65 + random() * 0.7))
    // Try independent bounded ratios as well as all-wide/all-tall candidates.
    const trialRatios = tolerance
      ? ratios.map(
          ratio =>
            ratio *
            (1 +
              tolerance *
                (trial === 0 ? 1 : trial === 1 ? -1 : random() * 2 - 1)),
        )
      : ratios
    let low = 0,
      high = (width * height) / weights.reduce((sum, n) => sum + n, 0)
    for (let step = 0; step < 16; step++) {
      const area = (low + high) / 2
      const packer = new MaxRectsPacker<{
        index: number
        x: number
        y: number
        width: number
        height: number
      }>(width, height, gap, {
        smart: false,
        pot: false,
        square: false,
        allowRotation: false,
      })
      const input = trialRatios.map((ratio, index) => ({
        index,
        x: 0,
        y: 0,
        width: Math.sqrt(area * weights[index] * ratio),
        height: Math.sqrt((area * weights[index]) / ratio),
      }))
      packer.addArray(input)
      const fits =
        packer.bins.length === 1 &&
        input.every(
          b =>
            b.x + b.width <= width + 0.001 && b.y + b.height <= height + 0.001,
        )
      if (fits) {
        low = area
        candidates.push(
          input.map(b => ({
            index: b.index,
            left: b.x,
            top: b.y,
            width: b.width,
            height: b.height,
          })),
        )
      } else high = area
    }
  }
  return candidates
}

export function packProjects(
  ratios: number[],
  width: number,
  height: number,
  requestedGap: number,
  settings: PackingSettings,
  reservation?: MosaicRect,
): PackingResult {
  if (
    !ratios.length ||
    width <= 0 ||
    height <= 0 ||
    ratios.some(r => !Number.isFinite(r) || r <= 0)
  )
    return { boxes: [], coverage: 0 }
  const gap = Math.max(
    0,
    Math.min(requestedGap, Math.min(width, height) / (ratios.length * 2)),
  )
  const tolerance = Number.isFinite(settings.tolerance)
    ? Math.max(0, Math.min(MAX_PACKING_TOLERANCE, settings.tolerance!))
    : 0
  const solver = settings.approach === 'justified' ? justified : rectangles
  const left = Math.max(0, reservation?.left ?? 0)
  const top = Math.max(0, reservation?.top ?? 0)
  const right = Math.min(
    width,
    (reservation?.left ?? 0) + (reservation?.width ?? 0),
  )
  const bottom = Math.min(
    height,
    (reservation?.top ?? 0) + (reservation?.height ?? 0),
  )
  const reserved =
    right > left && bottom > top
      ? { left, top, width: right - left, height: bottom - top }
      : undefined
  // Keep the exact-ratio result as a fallback: flexibility must earn its place.
  const candidates = solver(
    ratios,
    width,
    height,
    gap,
    generator(settings.seed),
    0,
    reserved,
  )
  const flexible = tolerance
    ? solver(
        ratios,
        width,
        height,
        gap,
        generator(settings.seed),
        tolerance,
        reserved,
      )
    : []
  let best: Box[] = [],
    bestScore = -Infinity,
    coverage = 0
  for (const boxes of candidates) {
    const areas = boxes.map(b => b.width * b.height)
    const fill = areas.reduce((sum, n) => sum + n, 0) / (width * height)
    const score =
      fill - 0.04 * Math.log(Math.max(...areas) / Math.min(...areas))
    if (score > bestScore) {
      best = boxes
      bestScore = score
      coverage = fill
    }
  }
  const exactCoverage = coverage
  for (const boxes of flexible) {
    const areas = boxes.map(b => b.width * b.height)
    const fill = areas.reduce((sum, n) => sum + n, 0) / (width * height)
    const score =
      fill - 0.04 * Math.log(Math.max(...areas) / Math.min(...areas))
    if (fill > exactCoverage && score > bestScore) {
      best = boxes
      bestScore = score
      coverage = fill
    }
  }
  return { boxes: best.sort((a, b) => a.index - b.index), coverage }
}
