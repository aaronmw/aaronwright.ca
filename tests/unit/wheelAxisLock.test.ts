import { describe, expect, it } from 'vitest'
import {
  createWheelAxisLockState,
  updateWheelAxisLock,
  WHEEL_AXIS_LOCK_IDLE_MS,
} from '../../components/portfolio/runtime/wheelAxisLock'

describe('wheel gesture axis lock', () => {
  it('keeps the first resolved axis for the rest of the gesture', () => {
    const state = createWheelAxisLockState()

    expect(
      updateWheelAxisLock(state, {
        deltaX: 12,
        deltaY: 2,
        timeStamp: 10,
      }),
    ).toBe('x')
    expect(
      updateWheelAxisLock(state, {
        deltaX: 1,
        deltaY: 40,
        timeStamp: 30,
      }),
    ).toBe('x')
  })

  it('waits for a dominant axis instead of guessing from diagonal jitter', () => {
    const state = createWheelAxisLockState()

    expect(
      updateWheelAxisLock(state, {
        deltaX: 4,
        deltaY: 4,
        timeStamp: 10,
      }),
    ).toBeNull()
    expect(
      updateWheelAxisLock(state, {
        deltaX: 5,
        deltaY: 1,
        timeStamp: 25,
      }),
    ).toBe('x')
  })

  it('allows a new axis after the gesture stream goes idle', () => {
    const state = createWheelAxisLockState()

    expect(
      updateWheelAxisLock(state, {
        deltaX: 12,
        deltaY: 1,
        timeStamp: 10,
      }),
    ).toBe('x')
    expect(
      updateWheelAxisLock(state, {
        deltaX: 1,
        deltaY: 12,
        timeStamp: 10 + WHEEL_AXIS_LOCK_IDLE_MS + 1,
      }),
    ).toBe('y')
  })
})
