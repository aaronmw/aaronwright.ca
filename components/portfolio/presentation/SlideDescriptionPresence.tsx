'use client'

import { useEffect, useState } from 'react'
import { SlideDescription } from './PortfolioText'

const TRANSITION_DURATION_MS = 280

type DescriptionContent = {
  id: string
  markdown: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
}

type DescriptionEntry = DescriptionContent & {
  state: 'entering' | 'visible' | 'exiting'
}

export function SlideDescriptionPresence({
  screenshotId,
  description,
  projectColor,
  projectBodyColor,
  projectContentColor,
  hidden,
}: {
  screenshotId?: string
  description?: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  hidden: boolean
}) {
  const target =
    screenshotId && description
      ? {
          id: screenshotId,
          markdown: description,
          projectColor,
          projectBodyColor,
          projectContentColor,
        }
      : undefined
  const [entries, setEntries] = useState<DescriptionEntry[]>(() =>
    target ? [{ ...target, state: 'entering' }] : [],
  )

  useEffect(() => {
    setEntries(currentEntries => {
      const outgoingEntries = currentEntries
        .filter(entry => entry.id !== target?.id)
        .map(entry => ({ ...entry, state: 'exiting' as const }))

      if (!target) {
        return outgoingEntries
      }

      const existingEntry = currentEntries.find(entry => entry.id === target.id)

      return [
        ...outgoingEntries,
        {
          ...target,
          state: existingEntry?.state === 'visible' ? 'visible' : 'entering',
        },
      ]
    })

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!target) {
          return
        }

        setEntries(currentEntries =>
          currentEntries.map(entry =>
            entry.id === target.id ? { ...entry, state: 'visible' } : entry,
          ),
        )
      })
    })
    const cleanupTimer = window.setTimeout(() => {
      setEntries(currentEntries =>
        target ? currentEntries.filter(entry => entry.id === target.id) : [],
      )
    }, TRANSITION_DURATION_MS)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.clearTimeout(cleanupTimer)
    }
  }, [
    description,
    projectBodyColor,
    projectColor,
    projectContentColor,
    screenshotId,
  ])

  return entries.map(entry => (
    <SlideDescription
      key={entry.id}
      projectColor={entry.projectColor}
      projectBodyColor={entry.projectBodyColor}
      projectContentColor={entry.projectContentColor}
      hidden={hidden}
      transitionState={entry.state}
    >
      {entry.markdown}
    </SlideDescription>
  ))
}
