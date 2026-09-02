import type { ViewerPoint } from './viewer'

export const TOUCH_PINCH_OPEN_RATIO = 1.06
export const TRACKPAD_PINCH_OPEN_THRESHOLD_PX = 20
export const TRACKPAD_PINCH_WINDOW_MS = 180

export type TouchPoint = ViewerPoint & { identifier: number }

export function getTouchDistance(touches: readonly TouchPoint[]) {
  if (touches.length < 2) return 0
  return Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y)
}

export function getTouchCenter(touches: readonly TouchPoint[]): ViewerPoint {
  if (touches.length < 2) return { x: 0, y: 0 }
  return {
    x: (touches[0].x + touches[1].x) / 2,
    y: (touches[0].y + touches[1].y) / 2,
  }
}

export type TouchPinchState = {
  initialDistance: number
  opened: boolean
}

export function beginTouchPinch(
  touches: readonly TouchPoint[],
): TouchPinchState | null {
  const initialDistance = getTouchDistance(touches)
  return initialDistance > 0 ? { initialDistance, opened: false } : null
}

export function updateTouchPinch(
  state: TouchPinchState | null,
  touches: readonly TouchPoint[],
) {
  if (!state || state.opened || touches.length < 2) return null
  const ratio = getTouchDistance(touches) / state.initialDistance
  if (ratio < TOUCH_PINCH_OPEN_RATIO) return null
  state.opened = true
  return { focalPoint: getTouchCenter(touches), initialPinchScale: ratio }
}

export type TrackpadPinchState = {
  accumulatedDelta: number
  lastEventAt: number
}

export function createTrackpadPinchState(): TrackpadPinchState {
  return { accumulatedDelta: 0, lastEventAt: Number.NEGATIVE_INFINITY }
}

export function updateTrackpadPinch(
  state: TrackpadPinchState,
  event: {
    ctrlKey: boolean
    deltaX: number
    deltaY: number
    timeStamp: number
  },
) {
  if (
    !event.ctrlKey ||
    event.deltaY >= 0 ||
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
  ) {
    state.accumulatedDelta = 0
    state.lastEventAt = Number.NEGATIVE_INFINITY
    return false
  }

  if (event.timeStamp - state.lastEventAt > TRACKPAD_PINCH_WINDOW_MS) {
    state.accumulatedDelta = 0
  }

  state.accumulatedDelta += -event.deltaY
  state.lastEventAt = event.timeStamp

  if (state.accumulatedDelta < TRACKPAD_PINCH_OPEN_THRESHOLD_PX) {
    return false
  }

  state.accumulatedDelta = 0
  state.lastEventAt = Number.NEGATIVE_INFINITY
  return true
}
