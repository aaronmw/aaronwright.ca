import { useCallback, useRef, useState } from 'react'
import type { PendingNavigation } from './types'

type UsePortfolioMediaNavigationOptions = {
  ensureMediaReady: (mediaKeys: string[]) => Promise<void>
  isMediaReady: (mediaKey: string) => boolean
}

export function usePortfolioMediaNavigation({
  ensureMediaReady,
  isMediaReady,
}: UsePortfolioMediaNavigationOptions) {
  const intentRef = useRef(0)
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation>(null)

  const invalidateNavigation = useCallback(() => {
    intentRef.current += 1
    setPendingNavigation(null)
  }, [])

  const prepareMediaNavigation = useCallback(
    async (
      pending: Exclude<PendingNavigation, null>,
      mediaKeys?: string | string[],
    ) => {
      const intent = intentRef.current + 1
      intentRef.current = intent
      const requiredKeys = (
        Array.isArray(mediaKeys) ? mediaKeys : [mediaKeys]
      ).filter((key): key is string => Boolean(key))

      if (requiredKeys.every(isMediaReady)) {
        setPendingNavigation(null)
        return true
      }

      setPendingNavigation(pending)

      try {
        await ensureMediaReady(requiredKeys)
      } catch {
        return false
      }

      if (intentRef.current !== intent) {
        return false
      }

      setPendingNavigation(null)
      return true
    },
    [ensureMediaReady, isMediaReady],
  )

  return {
    invalidateNavigation,
    pendingNavigation,
    prepareMediaNavigation,
  }
}
