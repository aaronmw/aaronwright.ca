export type PageActivity = {
  isActive: () => boolean
  subscribe: (listener: () => void) => () => void
}

export function isBrowserPageActive() {
  // Visible pages must load before a tap or keyboard focus. Only background
  // visibility should suspend media loading and its timeout budget.
  return document.visibilityState === 'visible'
}

const browserPageActivity: PageActivity = {
  isActive: isBrowserPageActive,
  subscribe: listener => {
    document.addEventListener('visibilitychange', listener)

    return () => {
      document.removeEventListener('visibilitychange', listener)
    }
  },
}

export function waitForPageActivity(
  activity: PageActivity = browserPageActivity,
) {
  if (activity.isActive()) {
    return Promise.resolve()
  }

  return new Promise<void>(resolve => {
    const handleActivityChange = () => {
      if (!activity.isActive()) return
      unsubscribe()
      resolve()
    }
    const unsubscribe = activity.subscribe(handleActivityChange)
  })
}

export function withPageActivityTimeout<T>(
  promise: Promise<T>,
  duration: number,
  timeoutError: () => Error,
  activity: PageActivity = browserPageActivity,
) {
  return new Promise<T>((resolve, reject) => {
    let remaining = duration
    let startedAt = 0
    let timeout: ReturnType<typeof setTimeout> | null = null
    let settled = false

    const clearTimer = () => {
      if (timeout === null) return
      clearTimeout(timeout)
      timeout = null
    }
    const cleanup = () => {
      clearTimer()
      unsubscribe()
    }
    const settle = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const handleTimeout = () => {
      timeout = null

      if (!activity.isActive()) {
        return
      }

      settle(() => reject(timeoutError()))
    }
    const pause = () => {
      if (timeout === null) return
      remaining = Math.max(0, remaining - (performance.now() - startedAt))
      clearTimer()
    }
    const resume = () => {
      if (settled || timeout !== null || !activity.isActive()) return

      if (remaining <= 0) {
        settle(() => reject(timeoutError()))
        return
      }

      startedAt = performance.now()
      timeout = setTimeout(handleTimeout, remaining)
    }
    const handleActivityChange = () => {
      if (activity.isActive()) {
        resume()
      } else {
        pause()
      }
    }
    const unsubscribe = activity.subscribe(handleActivityChange)

    promise.then(
      value => settle(() => resolve(value)),
      error => settle(() => reject(error)),
    )
    handleActivityChange()
  })
}
