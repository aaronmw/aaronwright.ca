'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { balancedLayout, type MosaicLayout } from './layout'
import { updateMosaicFraming, withSegmentIds } from './segmentEditing'
import { useMosaicLoopPreview } from './useMosaicLoopPreview'
import { Mosaic } from './Mosaic'
import {
  DEFAULT_PACKING_TOLERANCE,
  DEFAULT_PACKING_SETTINGS,
  type PackingApproach,
} from './packingSettings'
import type { PackingStatus } from './usePackedLayout'
import { MosaicAdjustmentToolbar } from './MosaicAdjustmentToolbar'
import { MosaicProjectEditor } from './MosaicProjectEditor'
import { DEFAULT_ADJUSTMENT_LAYER } from './MosaicAdjustmentLayer'
import { MosaicAdjustmentLayerControls } from './MosaicAdjustmentLayerControls'
import {
  getSegmentComposition,
  serializeMosaicCompositions,
} from './composition'
import { useMosaicAdjustmentGestures } from './useMosaicAdjustmentGestures'
import type {
  MosaicComposition,
  MosaicSegment,
  MosaicProject,
  MosaicProjectCopy,
} from './types'

export function MosaicDevelopment({ projects }: { projects: MosaicProject[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef(false)
  const copyPending = useRef(false)
  const [draft, setDraft] = useState(() => withSegmentIds(projects))
  const [copyDraft, setCopyDraft] = useState<
    Record<string, Partial<MosaicProjectCopy>>
  >({})
  // Keep unedited copy current during hot reload without losing text or media edits.
  const displayedProjects = draft.map(project => {
    const current = projects.find(source => source.id === project.id)
    return {
      ...project,
      title: current?.title ?? project.title,
      url: current ? current.url : project.url,
      summary: current?.summary ?? project.summary,
      longSummary: current ? current.longSummary : project.longSummary,
      blurbPosition: current ? current.blurbPosition : project.blurbPosition,
      about: current ? current.about : project.about,
      ...copyDraft[project.id],
    }
  })
  const projectsRef = useRef(draft)
  const [layout, setLayout] = useState<MosaicLayout>(balancedLayout)
  const [adjustmentLayer, setAdjustmentLayer] = useState(
    DEFAULT_ADJUSTMENT_LAYER,
  )
  const [packingStatus, setPackingStatus] = useState<PackingStatus>({
    pending: false,
  })
  function changeApproach(approach: PackingApproach) {
    setPackingStatus({ pending: true })
    setLayout(previous => ({
      ...previous,
      packing: {
        approach,
        seed: previous.packing?.seed ?? DEFAULT_PACKING_SETTINGS.seed,
        tolerance: previous.packing?.tolerance ?? DEFAULT_PACKING_TOLERANCE,
      },
    }))
  }
  function changeTolerance(tolerance: number) {
    setPackingStatus({ pending: true })
    setLayout(previous => ({
      ...previous,
      packing: { ...(previous.packing ?? DEFAULT_PACKING_SETTINGS), tolerance },
    }))
  }
  const [shufflePending, setShufflePending] = useState(false)
  const [shuffleJson, setShuffleJson] = useState('')
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [message, setMessage] = useState('')
  const loopPreview = useMosaicLoopPreview()
  const { selectionRef, selectSegment } = loopPreview
  const selectedMediaId = loopPreview.selection.mediaId
  const [durations, setDurations] = useState<Record<string, number>>({})
  const durationsRef = useRef(durations)

  const update = useCallback(
    (id: string, value: MosaicComposition) => {
      if (copyPending.current) return
      const selection = selectionRef.current
      const index = selection.mediaId === id ? selection.index : 0
      const next = projectsRef.current.map(project =>
        project.media[0].id === id
          ? updateMosaicFraming(project, index, value, durationsRef.current[id])
          : project,
      )
      // Synchronous event snapshot prevents consecutive pointer/wheel events using stale state.
      projectsRef.current = next
      setDraft(next)
      selectSegment(index, id)
    },
    [selectionRef, selectSegment],
  )
  const composition = useCallback(
    (project: MosaicProject) => {
      const selection = selectionRef.current
      const index =
        selection.mediaId === project.media[0]?.id ? selection.index : 0
      return getSegmentComposition(project, index)
    },
    [selectionRef],
  )
  const receiveDuration = useCallback((mediaId: string, duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return
    if (durationsRef.current[mediaId] === duration) return
    durationsRef.current = { ...durationsRef.current, [mediaId]: duration }
    setDurations(durationsRef.current)
  }, [])
  const selectedProject = displayedProjects.find(
    project => project.media[0]?.id === selectedMediaId,
  )
  const selectedMedia = selectedProject?.media[0]
  const duration = selectedMediaId ? durations[selectedMediaId] : undefined
  function changeProjectCopy(patch: Partial<MosaicProjectCopy>) {
    if (!selectedProject || copyPending.current) return
    const id = selectedProject.id
    setCopyDraft(previous => ({
      ...previous,
      [id]: { ...previous[id], ...patch },
    }))
  }
  function changeSegments(
    segments: MosaicSegment[] | undefined,
    index: number,
  ) {
    if (!selectedMediaId || copyPending.current) return
    const next = projectsRef.current.map(project =>
      project.media[0]?.id === selectedMediaId
        ? {
            ...project,
            media: [
              { ...project.media[0], segments },
              ...project.media.slice(1),
            ],
          }
        : project,
    )
    projectsRef.current = next
    setDraft(next)
    loopPreview.selectSegment(index)
  }
  useMosaicAdjustmentGestures({
    rootRef,
    projectsRef,
    active: editing && !pending && !shufflePending,
    composition,
    update,
  })

  useEffect(() => {
    // Browser history can reopen a gallery while editing. Release editor handlers first.
    const leaveForHistory = () => setEditing(false)
    window.addEventListener('popstate', leaveForHistory)
    return () => window.removeEventListener('popstate', leaveForHistory)
  }, [])

  const entryRef = useCallback((node: HTMLButtonElement | null) => {
    if (node && restoreFocus.current) {
      restoreFocus.current = false
      node.focus({ preventScroll: true })
    }
  }, [])

  function finish(message: string) {
    restoreFocus.current = true
    setEditing(false)
    setFailed(false)
    setMessage(message)
  }

  async function copy() {
    if (copyPending.current) return
    copyPending.current = true
    setPending(true)
    const json = JSON.stringify(
      {
        ...JSON.parse(serializeMosaicCompositions(displayedProjects)),
        layout,
        adjustmentLayer,
      },
      null,
      2,
    )
    try {
      // Invoke during the click's user activation; don't delay behind an animation frame.
      await navigator.clipboard.writeText(json)
      finish('Adjustments copied.')
    } catch {
      setFailed(true)
    }
    copyPending.current = false
    setPending(false)
  }

  async function shuffle(retry = false) {
    if (copyPending.current) return
    copyPending.current = true
    setShufflePending(true)
    setMessage('')
    let json = shuffleJson
    try {
      if (!retry) {
        const next = {
          ...layout,
          packing: {
            ...(layout.packing ?? DEFAULT_PACKING_SETTINGS),
            seed: crypto.getRandomValues(new Uint32Array(1))[0],
          },
        }
        setPackingStatus({ pending: true })
        setLayout(next)
        json = JSON.stringify(
          {
            kind: 'mosaic-layout',
            schemaVersion: 1,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            layout: next,
            adjustmentLayer,
            adjustments: JSON.parse(
              serializeMosaicCompositions(displayedProjects),
            ),
          },
          null,
          2,
        )
      }
      // Keep clipboard invocation in the original click activation (Safari).
      await navigator.clipboard.writeText(json)
      setShuffleJson('')
      setMessage('Layout copied. Paste it back if you like this one.')
    } catch {
      setShuffleJson(json)
      setMessage(
        'Layout kept. Clipboard copy failed; retry or copy the JSON below.',
      )
    }
    copyPending.current = false
    setShufflePending(false)
  }

  return (
    <div ref={rootRef}>
      <Mosaic
        projects={displayedProjects}
        layout={layout}
        adjustmentLayer={adjustmentLayer}
        onVideoDuration={receiveDuration}
        onPackingStatus={setPackingStatus}
        adjustment={{
          active: editing,
          onSelect: loopPreview.selectProject,
          preview: {
            mediaId: selectedMediaId,
            request: {
              ...loopPreview.selection,
              onComplete: loopPreview.completed,
            },
          },
          toolbar: (
            <MosaicAdjustmentToolbar
              layerControls={
                <MosaicAdjustmentLayerControls
                  settings={adjustmentLayer}
                  change={setAdjustmentLayer}
                />
              }
              approach={
                layout.packing?.approach ?? DEFAULT_PACKING_SETTINGS.approach
              }
              changeApproach={changeApproach}
              tolerance={layout.packing?.tolerance ?? 0}
              changeTolerance={changeTolerance}
              packingStatus={packingStatus}
              shuffle={() => shuffle()}
              retryShuffle={() => shuffle(true)}
              shufflePending={shufflePending}
              shuffleJson={shuffleJson}
              editing={editing}
              pending={pending}
              failed={failed}
              json={
                failed
                  ? JSON.stringify(
                      {
                        ...JSON.parse(
                          serializeMosaicCompositions(displayedProjects),
                        ),
                        layout,
                        adjustmentLayer,
                      },
                      null,
                      2,
                    )
                  : ''
              }
              message={message}
              projectEditor={
                selectedProject ? (
                  <MosaicProjectEditor
                    project={selectedProject}
                    change={changeProjectCopy}
                    pending={pending || shufflePending}
                  />
                ) : undefined
              }
              videoLoop={
                selectedMedia?.video && selectedProject
                  ? {
                      title: selectedProject.title.replace(/\u00ad/g, ''),
                      duration,
                      media: selectedMedia,
                      change: changeSegments,
                      selected: loopPreview.selection.index,
                      select: loopPreview.selectSegment,
                      preview: loopPreview.preview,
                      previewing: loopPreview.previewing,
                      framing: getSegmentComposition(
                        selectedProject,
                        loopPreview.selection.index,
                      ),
                    }
                  : undefined
              }
              copy={copy}
              entryRef={entryRef}
              finish={() => finish('Adjustments kept for this page session.')}
              enter={() => {
                setMessage('')
                loopPreview.selectSegment(loopPreview.selection.index)
                setEditing(true)
              }}
            />
          ),
        }}
      />
    </div>
  )
}
