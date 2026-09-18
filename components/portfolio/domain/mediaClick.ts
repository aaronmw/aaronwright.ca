const CLICK_MOVE_TOLERANCE_PX = 12

type PointerPoint = {
  pointerId: number
  clientX: number
  clientY: number
}

export function createMediaClickGuard() {
  let pointer: PointerPoint | null = null
  let clickAllowed = false

  function cancel() {
    pointer = null
    clickAllowed = false
  }

  function move(event: PointerPoint) {
    if (
      pointer?.pointerId === event.pointerId &&
      Math.hypot(event.clientX - pointer.clientX, event.clientY - pointer.clientY) >
        CLICK_MOVE_TOLERANCE_PX
    ) {
      cancel()
    }
  }

  return {
    down(event: PointerPoint & { button: number; isPrimary: boolean }) {
      cancel()
      if (event.button !== 0 || !event.isPrimary) return
      pointer = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      }
      clickAllowed = true
    },
    move,
    up(event: PointerPoint) {
      move(event)
      pointer = null
    },
    leave() {
      if (pointer) cancel()
    },
    cancel,
    consume(clickDetail: number) {
      // Native buttons also emit clicks for keyboard and assistive activation.
      const allowed = clickDetail === 0 || clickAllowed
      cancel()
      return allowed
    },
  }
}
