import { describe, expect, it } from 'vitest'
import {
  beginTouchPinch,
  createTrackpadPinchState,
  updateTouchPinch,
  updateTrackpadPinch,
} from '../../components/portfolio/domain/viewerOpenIntent'

describe('viewer touch pinch recognition', () => {
  it('does not open from two-finger contact without outward movement', () => {
    const state = beginTouchPinch([
      { identifier: 1, x: 0, y: 0 },
      { identifier: 2, x: 100, y: 0 },
    ])
    expect(
      updateTouchPinch(state, [
        { identifier: 1, x: 0, y: 0 },
        { identifier: 2, x: 100, y: 0 },
      ]),
    ).toBeNull()
  })

  it('requires at least six percent outward movement', () => {
    const state = beginTouchPinch([
      { identifier: 1, x: 0, y: 0 },
      { identifier: 2, x: 100, y: 0 },
    ])
    expect(
      updateTouchPinch(state, [
        { identifier: 1, x: 0, y: 0 },
        { identifier: 2, x: 105, y: 0 },
      ]),
    ).toBeNull()
    expect(
      updateTouchPinch(state, [
        { identifier: 1, x: 0, y: 0 },
        { identifier: 2, x: 106, y: 0 },
      ]),
    ).toEqual({
      focalPoint: { x: 53, y: 0 },
      initialPinchScale: 1.06,
    })
  })
})

describe('viewer trackpad pinch recognition', () => {
  it('accumulates ctrl-wheel zoom intent within 180ms', () => {
    const state = createTrackpadPinchState()
    expect(
      updateTrackpadPinch(state, {
        ctrlKey: true,
        deltaX: 0,
        deltaY: -9,
        timeStamp: 10,
      }),
    ).toBe(false)
    expect(
      updateTrackpadPinch(state, {
        ctrlKey: true,
        deltaX: 0,
        deltaY: -11,
        timeStamp: 120,
      }),
    ).toBe(true)
  })

  it('resets stale intent and rejects horizontal wheel gestures', () => {
    const state = createTrackpadPinchState()
    updateTrackpadPinch(state, {
      ctrlKey: true,
      deltaX: 0,
      deltaY: -15,
      timeStamp: 10,
    })
    expect(
      updateTrackpadPinch(state, {
        ctrlKey: true,
        deltaX: 0,
        deltaY: -10,
        timeStamp: 200,
      }),
    ).toBe(false)
    expect(
      updateTrackpadPinch(state, {
        ctrlKey: true,
        deltaX: 30,
        deltaY: -25,
        timeStamp: 210,
      }),
    ).toBe(false)
    expect(state.accumulatedDelta).toBe(0)
  })
})
