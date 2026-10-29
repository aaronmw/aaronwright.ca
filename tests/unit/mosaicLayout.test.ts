import { describe, expect, it } from 'vitest'
import {
  balancedLayout,
  shuffleMosaicLayout,
  type MosaicLayout,
} from '@/components/mosaic/layout'
import { mosaicProjects } from '@/lib/mosaic'

function checkLayout(layout: MosaicLayout) {
  expect(Object.keys(layout.projectAreas).sort()).toEqual(
    mosaicProjects.map(p => p.slug).sort(),
  )
  for (const arrangement of Object.values(layout.arrangements)) {
    expect(arrangement.areas).toHaveLength(arrangement.rows.length)
    expect(
      arrangement.areas.every(row => row.length === arrangement.columns.length),
    ).toBe(true)
    expect(
      [...arrangement.columns, ...arrangement.rows].every(n => n > 0),
    ).toBe(true)
    expect(Array.from(new Set(arrangement.areas.flat())).sort()).toEqual(
      Object.values(layout.projectAreas).sort(),
    )
    for (const area of Object.values(layout.projectAreas)) {
      const cells = arrangement.areas.flatMap((row, y) =>
        row.flatMap((name, x) => (name === area ? [{ x, y }] : [])),
      )
      const xs = cells.map(c => c.x),
        ys = cells.map(c => c.y)
      expect(cells.length).toBe(
        (Math.max(...xs) - Math.min(...xs) + 1) *
          (Math.max(...ys) - Math.min(...ys) + 1),
      )
    }
  }
}

describe('Mondrian layout generation', () => {
  it('keeps every project in a single rectangular area in both orientations', () => {
    checkLayout(balancedLayout)
    const before = JSON.stringify(mosaicProjects)
    const arrangements = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      let state = seed
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0
        return state / 2 ** 32
      }
      const layout = shuffleMosaicLayout(
        mosaicProjects,
        seed % 2 ? 16 / 9 : 9 / 19,
        random,
      )
      checkLayout(layout)
      const roundTrip = JSON.parse(JSON.stringify(layout))
      expect(roundTrip).toEqual(layout)
      arrangements.add(JSON.stringify(layout))
    }
    expect(arrangements.size).toBe(60)
    expect(JSON.stringify(mosaicProjects)).toBe(before)
  })
})
