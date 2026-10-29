'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'portfolio:grid:visited-projects:v1'

function readVisitedProjects(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

export function useVisitedProjects() {
  // The server and first client render agree; null also prevents an early write
  // from erasing saved visits before browser storage has been read.
  const [visitedProjects, setVisitedProjects] = useState<string[] | null>(null)

  useEffect(() => {
    // Hydrate browser-owned history after mount, as with the gallery URL state.
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    setVisitedProjects(readVisitedProjects())
    const syncHistory = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        setVisitedProjects(readVisitedProjects())
    }
    window.addEventListener('storage', syncHistory)
    return () => window.removeEventListener('storage', syncHistory)
  }, [])

  useEffect(() => {
    if (visitedProjects === null) return
    try {
      // Preserve visits saved by another tab since this grid was opened.
      const saved = Array.from(
        new Set([...readVisitedProjects(), ...visitedProjects]),
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // The badge still works for this visit when browser storage is blocked.
    }
  }, [visitedProjects])

  const markVisited = useCallback((projectId: string) => {
    setVisitedProjects(current =>
      current?.includes(projectId) ? current : [...(current ?? []), projectId],
    )
  }, [])

  const clearViewHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Reset the in-memory badges even when browser storage is unavailable.
    }
    setVisitedProjects([])
  }, [])

  return { visitedProjects: visitedProjects ?? [], markVisited, clearViewHistory }
}
