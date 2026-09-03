export type WheelGestureAxis = 'x' | 'y'

export type WheelAxisLockState = {
  axis: WheelGestureAxis | null
  accumulatedX: number
  accumulatedY: number
  lastEventAt: number | null
}

export type WheelAxisLockInput = {
  deltaX: number
  deltaY: number
  timeStamp: number
}

export const WHEEL_AXIS_LOCK_IDLE_MS = 180
export const WHEEL_AXIS_LOCK_MIN_DELTA = 6
export const WHEEL_AXIS_LOCK_DOMINANCE_RATIO = 1.15

export function createWheelAxisLockState(): WheelAxisLockState {
  return {
    axis: null,
    accumulatedX: 0,
    accumulatedY: 0,
    lastEventAt: null,
  }
}

function resetWheelAxisLock(state: WheelAxisLockState) {
  state.axis = null
  state.accumulatedX = 0
  state.accumulatedY = 0
}

export function updateWheelAxisLock(
  state: WheelAxisLockState,
  input: WheelAxisLockInput,
) {
  if (
    state.lastEventAt !== null &&
    input.timeStamp - state.lastEventAt > WHEEL_AXIS_LOCK_IDLE_MS
  ) {
    resetWheelAxisLock(state)
  }

  state.lastEventAt = input.timeStamp
  if (state.axis) return state.axis

  state.accumulatedX += input.deltaX
  state.accumulatedY += input.deltaY

  const absoluteX = Math.abs(state.accumulatedX)
  const absoluteY = Math.abs(state.accumulatedY)
  if (Math.max(absoluteX, absoluteY) < WHEEL_AXIS_LOCK_MIN_DELTA) {
    return null
  }

  if (absoluteX >= absoluteY * WHEEL_AXIS_LOCK_DOMINANCE_RATIO) {
    state.axis = 'x'
  } else if (absoluteY >= absoluteX * WHEEL_AXIS_LOCK_DOMINANCE_RATIO) {
    state.axis = 'y'
  }

  return state.axis
}

function constrainWheelEventToAxis(
  event: WheelEvent,
  axis: WheelGestureAxis | null,
) {
  Object.defineProperties(event, {
    deltaX: { value: axis === 'x' ? event.deltaX : 0 },
    deltaY: { value: axis === 'y' ? event.deltaY : 0 },
    deltaZ: { value: 0 },
  })
}

export function installPortfolioWheelAxisLock(
  root: HTMLElement,
  ignoreTarget?: (target: EventTarget | null) => boolean,
) {
  const state = createWheelAxisLockState()

  const handleWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return
    if (ignoreTarget?.(event.target)) {
      resetWheelAxisLock(state)
      return
    }

    const axis = updateWheelAxisLock(state, {
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      timeStamp: event.timeStamp,
    })

    if (!axis) event.preventDefault()
    constrainWheelEventToAxis(event, axis)
  }

  root.addEventListener('wheel', handleWheel, {
    capture: true,
    passive: false,
  })

  return () => {
    root.removeEventListener('wheel', handleWheel, { capture: true })
  }
}
