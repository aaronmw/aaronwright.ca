import { describe, expect, it } from 'vitest'
import {
  getAffordanceOpacity,
  getCenteredSectionCenters,
  getOutsideInDelay,
  getSectionArrowRotation,
  getSectionItemBounds,
  getSlideCenters,
  getSlideLatticeCoordinate,
  getSlideSlotIds,
  getTitleLinkedSectionCenters,
} from '../../components/portfolio/navigation/navigationGeometry'

describe('slide navigation lattice', () => {
  it('keeps every marker on an evenly spaced permanent lattice', () => {
    expect(getSlideSlotIds(1)).toEqual([0])
    expect(getSlideSlotIds(5)).toEqual([-2, -1, 0, 1, 2])
    expect(getSlideSlotIds(6)).toEqual([-2, -1, 0, 1, 2, 3])
    expect(getSlideCenters(5, 180)).toEqual([18, 54, 90, 126, 162])
    expect(getSlideCenters(6, 216)).toEqual([18, 54, 90, 126, 162, 198])
    expect(getSlideLatticeCoordinate(5, 180)).toBe(90)
    expect(getSlideLatticeCoordinate(6, 216)).toBe(90)
  })

  it('stages additions and removals from the outside in, right first', () => {
    expect(Array.from({ length: 5 }, (_, index) => getOutsideInDelay(index, 5)))
      .toEqual([30, 120, 180, 90, 0])
  })
})

describe('section navigation geometry', () => {
  it('centers fixed-step rails and derives title-linked work position', () => {
    expect(getCenteredSectionCenters(5, 400)).toEqual([80, 140, 200, 260, 320])
    expect(getTitleLinkedSectionCenters([120, 180, 240])).toEqual([
      60,
      120,
      180,
      240,
    ])
  })

  it('turns center points into contiguous hit regions', () => {
    expect(getSectionItemBounds([50, 100, 170], 220, 0)).toEqual({
      top: 0,
      height: 75,
    })
    expect(getSectionItemBounds([50, 100, 170], 220, 1)).toEqual({
      top: 75,
      height: 60,
    })
    expect(getSectionItemBounds([50, 100, 170], 220, 2)).toEqual({
      top: 135,
      height: 85,
    })
  })

  it('interpolates arrow rotation and arrow/dot crossfades', () => {
    const items = [{ hasSlides: false }, { hasSlides: true }]

    expect(getSectionArrowRotation(0, 0.5, 'left', items)).toBe(90)
    expect(getSectionArrowRotation(0, 0.5, 'right', items)).toBe(-90)
    expect(getAffordanceOpacity(0.25)).toEqual({
      arrowOpacity: 0.75,
      dotOpacity: 0.25,
    })
  })
})
