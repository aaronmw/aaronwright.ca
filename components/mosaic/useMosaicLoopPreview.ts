import { useCallback, useRef, useState } from 'react'
import type { MosaicProject } from './types'

export function useMosaicLoopPreview() {
  const [selection, setSelection] = useState({
    mediaId: null as string | null,
    index: 0,
    mode: 'segment' as 'segment' | 'sequence',
    revision: 0,
  })
  const selectionRef = useRef(selection)
  const [previewing, setPreviewing] = useState(false)
  const completed = useCallback(() => setPreviewing(false), [])
  // Gesture callbacks need the latest selection before React's next render, and
  // stable callbacks so each crop edit doesn't tear down pointer capture.
  const selectSegment = useCallback(
    (index: number, mediaId?: string | null) => {
      setPreviewing(false)
      const previous = selectionRef.current
      const next = {
        mediaId: mediaId === undefined ? previous.mediaId : mediaId,
        index,
        mode: 'segment' as const,
        revision: previous.revision + 1,
      }
      selectionRef.current = next
      setSelection(next)
    },
    [],
  )
  const selectProject = useCallback(
    (project: MosaicProject) => {
      const mediaId = project.media[0]?.id ?? null
      const previous = selectionRef.current
      selectSegment(previous.mediaId === mediaId ? previous.index : 0, mediaId)
    },
    [selectSegment],
  )
  function preview() {
    setPreviewing(true)
    const previous = selectionRef.current
    const next = {
      ...previous,
      mode: 'sequence' as const,
      revision: previous.revision + 1,
    }
    selectionRef.current = next
    setSelection(next)
  }
  return {
    selection,
    selectionRef,
    previewing,
    completed,
    selectProject,
    selectSegment,
    preview,
  }
}
