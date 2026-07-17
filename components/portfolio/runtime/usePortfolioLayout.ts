import { useSyncExternalStore } from 'react'

const WIDE_LAYOUT_MEDIA_QUERY = '(min-aspect-ratio: 5/4) and (min-width: 43rem)'
const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)'

function subscribeToMediaQuery(query: string, callback: () => void) {
  const mediaQuery = window.matchMedia(query)
  mediaQuery.addEventListener('change', callback)

  return () => mediaQuery.removeEventListener('change', callback)
}

function getServerSnapshot() {
  return false
}

function subscribeToWideLayout(callback: () => void) {
  return subscribeToMediaQuery(WIDE_LAYOUT_MEDIA_QUERY, callback)
}

function subscribeToTouchInput(callback: () => void) {
  return subscribeToMediaQuery(TOUCH_INPUT_MEDIA_QUERY, callback)
}

function getWideLayoutSnapshot() {
  return window.matchMedia(WIDE_LAYOUT_MEDIA_QUERY).matches
}

function getTouchInputSnapshot() {
  return window.matchMedia(TOUCH_INPUT_MEDIA_QUERY).matches
}

export function usePortfolioLayout() {
  const isWideLayout = useSyncExternalStore(
    subscribeToWideLayout,
    getWideLayoutSnapshot,
    getServerSnapshot,
  )
  const isTouchInput = useSyncExternalStore(
    subscribeToTouchInput,
    getTouchInputSnapshot,
    getServerSnapshot,
  )

  return {
    isTouchInput,
    isTouchLandscapeLayout: isWideLayout && isTouchInput,
    isWideLayout,
  }
}
