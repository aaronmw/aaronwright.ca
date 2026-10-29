import { expect, it } from 'vitest'
import { packProjects, type PackingApproach } from '@/components/mosaic/packing'
import { mosaicProjects } from '@/lib/mosaic'
const ratios = mosaicProjects.map(p => p.media[0].width / p.media[0].height)

for (const approach of ['justified', 'rectangles'] as PackingApproach[]) {
  for (const [width, height, top, size] of [
    [1800, 1000, 455, 90],
    [1800, 700, 455, 90],
    [360, 700, 320, 60],
    [360, 350, 145, 60],
  ]) {
    it(`${approach} frames all four sides of the logo at ${width}×${height} on every shuffle`, () => {
      const reserved = {
        left: (width - size) / 2,
        top,
        width: size,
        height: size,
      }
      const right = reserved.left + size
      const bottom = top + size
      const gap = Math.min(20, Math.min(width, height) / (ratios.length * 2))
      for (const seed of [1, 42, 939]) {
        for (const tolerance of [0, 0.3]) {
          const { boxes } = packProjects(
            ratios,
            width,
            height,
            20,
            { approach, seed, tolerance },
            reserved,
          )
          expect(boxes).toHaveLength(ratios.length)
          const coversSide = (start: number, length: number, edge: number) =>
            Math.min(start + length, edge + size) - Math.max(start, edge) >=
            size - gap - 1e-6
          expect(
            boxes.some(
              box =>
                Math.abs(box.top + box.height - top) < 1e-6 &&
                coversSide(box.left, box.width, reserved.left),
            ),
          ).toBe(true)
          expect(
            boxes.some(
              box =>
                Math.abs(box.left - right) < 1e-6 &&
                coversSide(box.top, box.height, top),
            ),
          ).toBe(true)
          expect(
            boxes.some(
              box =>
                Math.abs(box.top - bottom) < 1e-6 &&
                coversSide(box.left, box.width, reserved.left),
            ),
          ).toBe(true)
          expect(
            boxes.some(
              box =>
                Math.abs(box.left + box.width - reserved.left) < 1e-6 &&
                coversSide(box.top, box.height, top),
            ),
          ).toBe(true)
        }
      }
    })
  }

  it(`${approach} packs around the logo and its margin, including with the dock open`, () => {
    for (const [width, height, logoTop, logoSize] of [
      [1800, 1000, 455, 90],
      [1800, 700, 455, 90],
      [360, 700, 320, 60],
      [360, 350, 320, 60],
      [700, 120, 100, 90],
    ]) {
      const reserved = {
        left: (width - logoSize) / 2,
        top: logoTop,
        width: logoSize,
        height: logoSize,
      }
      for (const tolerance of [0, 0.3]) {
        const settings = { approach, seed: 42, tolerance }
        const result = packProjects(
          ratios,
          width,
          height,
          20,
          settings,
          reserved,
        )
        expect(result.boxes).toHaveLength(ratios.length)
        expect(
          packProjects(ratios, width, height, 20, settings, reserved),
        ).toEqual(result)
        const gap = Math.min(20, Math.min(width, height) / (ratios.length * 2))
        result.boxes.forEach((box, i) => {
          expect(box.index).toBe(i)
          const relativeRatio = box.width / box.height / ratios[i]
          expect(relativeRatio).toBeGreaterThanOrEqual(1 - tolerance - 1e-8)
          expect(relativeRatio).toBeLessThanOrEqual(1 + tolerance + 1e-8)
          expect(box.left).toBeGreaterThanOrEqual(-0.001)
          expect(box.top).toBeGreaterThanOrEqual(-0.001)
          expect(box.left + box.width).toBeLessThanOrEqual(width + 0.001)
          expect(box.top + box.height).toBeLessThanOrEqual(height + 0.001)
          expect(
            box.left + box.width <= reserved.left + 0.001 ||
              box.left >= reserved.left + reserved.width - 0.001 ||
              box.top + box.height <= reserved.top + 0.001 ||
              box.top >= reserved.top + reserved.height - 0.001,
          ).toBe(true)
          for (const other of result.boxes.slice(i + 1)) {
            expect(
              box.left + box.width + gap <= other.left + 0.001 ||
                other.left + other.width + gap <= box.left + 0.001 ||
                box.top + box.height + gap <= other.top + 0.001 ||
                other.top + other.height + gap <= box.top + 0.001,
            ).toBe(true)
          }
        })
      }
    }
  })

  it(`${approach} uses tolerance to improve fill while preserving bounds and gaps`, () => {
    let improvements = 0
    for (const [width, height] of [
      [1800, 1000],
      [1800, 700],
      [360, 700],
      [360, 350],
    ]) {
      const exact = packProjects(ratios, width, height, 20, {
        approach,
        seed: 42,
      })
      expect(
        packProjects(ratios, width, height, 20, {
          approach,
          seed: 42,
          tolerance: 0,
        }),
      ).toEqual(exact)
      for (const tolerance of [0.1, 0.3]) {
        const settings = { approach, seed: 42, tolerance }
        const result = packProjects(ratios, width, height, 20, settings)
        // The packer reduces gaps in short viewports as the project count grows.
        const gap = Math.min(20, Math.min(width, height) / (ratios.length * 2))
        expect(result.boxes).toHaveLength(ratios.length)
        expect(result.coverage).toBeGreaterThanOrEqual(exact.coverage)
        expect(result.coverage).toBeLessThanOrEqual(1)
        expect(packProjects(ratios, width, height, 20, settings)).toEqual(
          result,
        )
        if (result.coverage > exact.coverage + 0.001) improvements++
        result.boxes.forEach((box, i) => {
          const relativeRatio = box.width / box.height / ratios[box.index]
          expect(relativeRatio).toBeGreaterThanOrEqual(1 - tolerance - 1e-8)
          expect(relativeRatio).toBeLessThanOrEqual(1 + tolerance + 1e-8)
          expect(box.left).toBeGreaterThanOrEqual(-0.001)
          expect(box.top).toBeGreaterThanOrEqual(-0.001)
          expect(box.left + box.width).toBeLessThanOrEqual(width + 0.001)
          expect(box.top + box.height).toBeLessThanOrEqual(height + 0.001)
          for (const other of result.boxes.slice(i + 1)) {
            expect(
              box.left + box.width + gap <= other.left + 0.001 ||
                other.left + other.width + gap <= box.left + 0.001 ||
                box.top + box.height + gap <= other.top + 0.001 ||
                other.top + other.height + gap <= box.top + 0.001,
            ).toBe(true)
          }
        })
      }
    }
    expect(improvements).toBeGreaterThan(0)
  })

  it(`${approach} fits all projects, without overlaps, rotations, or aspect-ratio changes`, () => {
    for (const [width, height] of [
      [1800, 1000],
      [1800, 700],
      [360, 700],
      [360, 350],
    ]) {
      for (const seed of [1, 42, 939]) {
        const settings = { approach, seed }
        const result = packProjects(ratios, width, height, 20, settings)
        expect(result.boxes).toHaveLength(ratios.length)
        expect(result.coverage).toBeGreaterThan(0.5)
        expect(result.coverage).toBeLessThanOrEqual(1)
        expect(packProjects(ratios, width, height, 20, settings)).toEqual(
          result,
        )
        result.boxes.forEach((box, i) => {
          expect(box.index).toBe(i)
          expect(box.width / box.height).toBeCloseTo(ratios[i], 8)
          expect(box.left).toBeGreaterThanOrEqual(-0.001)
          expect(box.top).toBeGreaterThanOrEqual(-0.001)
          expect(box.left + box.width).toBeLessThanOrEqual(width + 0.001)
          expect(box.top + box.height).toBeLessThanOrEqual(height + 0.001)
          for (const other of result.boxes.slice(i + 1)) {
            const separated =
              box.left + box.width <= other.left + 0.001 ||
              other.left + other.width <= box.left + 0.001 ||
              box.top + box.height <= other.top + 0.001 ||
              other.top + other.height <= box.top + 0.001
            expect(separated).toBe(true)
          }
        })
      }
    }
    expect(
      packProjects(ratios, 1800, 1000, 20, { approach, seed: 1 }),
    ).not.toEqual(packProjects(ratios, 1800, 1000, 20, { approach, seed: 42 }))
  })
}
