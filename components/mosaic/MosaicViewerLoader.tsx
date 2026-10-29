'use client'

import { useEffect, useState } from 'react'
import { FiveByFive } from '@/components/portfolio/presentation/FiveByFive'
import type { MosaicViewerProps } from './useMosaicViewerTransition'
import styles from './ExperimentGallery.module.css'

type ViewerComponent = (typeof import('./MosaicViewer'))['MosaicViewer']
let loadedViewer: ViewerComponent | null = null
let viewerPromise: Promise<ViewerComponent> | null = null

function loadViewer() {
  return (viewerPromise ??= import('./MosaicViewer')
    .then(module => {
      loadedViewer = module.MosaicViewer
      return loadedViewer
    })
    .catch(error => {
      viewerPromise = null
      throw error
    }))
}

export function preloadMosaicViewer() {
  // A failed speculative load can retry when the visitor actually opens a cell.
  void loadViewer().catch(() => {})
}

/** Keep code splitting without React.lazy's first-open Suspense retry delay. */
export function MosaicViewerLoader(props: MosaicViewerProps) {
  const [Viewer, setViewer] = useState<ViewerComponent | null>(
    () => loadedViewer,
  )
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)

  useEffect(() => {
    if (Viewer) return
    let active = true
    void loadViewer().then(
      component => {
        if (active) setViewer(() => component)
      },
      error => {
        if (active) setFailure({ error })
      },
    )
    return () => {
      active = false
    }
  }, [Viewer])

  // Preserve the route error boundary for a failed requested load.
  if (failure) throw failure.error
  if (Viewer) return <Viewer {...props} />
  return (
    <div
      className={styles.loading}
      role="status"
      aria-label="Opening image gallery"
    >
      <FiveByFive variant="snake" className={styles.loadingIndicator} />
    </div>
  )
}
