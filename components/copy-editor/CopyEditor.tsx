'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { copyEditorEntries, type CopyEditorEntry } from '@/lib/copyEditor'
import {
  CopyEditorScrollRail,
  type CopyEditorSectionMarker,
} from './CopyEditorScrollRail'
import styles from './CopyEditor.module.css'

const STORAGE_KEY = 'aaronwright-copy-editor-v1'
const COPY_EDITOR_SLIDE_SELECTOR = '[data-copy-editor-slide]'
const COPY_EDITOR_SECTION_START_SELECTOR = '[data-copy-editor-section-start]'
const COPY_EDITOR_FOOTER_SELECTOR = '[data-copy-editor-footer]'

type CopyValues = Record<string, string>

type CopyEditorBlock = {
  id: string
  entries: CopyEditorEntry[]
  media?: CopyEditorEntry['media']
}

function initialValues() {
  return Object.fromEntries(
    copyEditorEntries.map(entry => [entry.id, entry.value]),
  )
}

function wordCount(value: string) {
  const words = value.trim().match(/\S+/g)
  return words?.length ?? 0
}

function sectionId(group: string) {
  return `copy-editor-${group
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`
}

function getSlides(workspace: HTMLElement) {
  return Array.from(
    workspace.querySelectorAll<HTMLElement>(COPY_EDITOR_SLIDE_SELECTOR),
  )
}

function getSlideViewport(workspace: HTMLElement) {
  const workspaceBounds = workspace.getBoundingClientRect()
  const bottom =
    workspace
      .querySelector<HTMLElement>(COPY_EDITOR_FOOTER_SELECTOR)
      ?.getBoundingClientRect().top ?? workspaceBounds.bottom

  return { top: workspaceBounds.top, bottom }
}

function getCurrentSlideIndex(
  workspace: HTMLElement,
  slides = getSlides(workspace),
) {
  if (slides.length === 0) return -1

  const viewport = getSlideViewport(workspace)
  let currentIndex = 0
  let greatestVisibleHeight = -1
  let closestDistance = Number.POSITIVE_INFINITY

  slides.forEach((slide, index) => {
    const bounds = slide.getBoundingClientRect()
    const visibleHeight = Math.max(
      0,
      Math.min(bounds.bottom, viewport.bottom) -
        Math.max(bounds.top, viewport.top),
    )
    const distance = Math.abs(bounds.top - viewport.top)

    if (
      visibleHeight > greatestVisibleHeight + 0.5 ||
      (Math.abs(visibleHeight - greatestVisibleHeight) <= 0.5 &&
        distance < closestDistance)
    ) {
      currentIndex = index
      greatestVisibleHeight = visibleHeight
      closestDistance = distance
    }
  })

  return currentIndex
}

function scrollToSlide(workspace: HTMLElement, slideIndex: number) {
  const target = getSlides(workspace)[slideIndex]
  if (!target) return

  const snapLine = getSlideViewport(workspace).top
  const targetTop =
    workspace.scrollTop + target.getBoundingClientRect().top - snapLine

  workspace.scrollTo({
    top: targetTop,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}

function getLastPassedSectionId(workspace: HTMLElement) {
  const viewportTop = getSlideViewport(workspace).top
  const sectionStarts = Array.from(
    workspace.querySelectorAll<HTMLElement>(COPY_EDITOR_SECTION_START_SELECTOR),
  )
  let activeSectionId: string | null = null

  for (const sectionStart of sectionStarts) {
    if (sectionStart.getBoundingClientRect().top > viewportTop + 1) break
    activeSectionId = sectionStart.dataset.copyEditorSectionStart ?? null
  }

  return activeSectionId
}

function nextPaint() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function ContentSizedTextarea({
  id,
  value,
  className,
  onChange,
}: {
  id: string
  value: string
  className: string
  onChange: (value: string) => void
}) {
  return (
    <textarea
      className={className}
      id={id}
      value={value}
      rows={1}
      spellCheck
      onChange={event => onChange(event.target.value)}
    />
  )
}

export function CopyEditor() {
  const workspaceRef = useRef<HTMLElement>(null)
  const [values, setValues] = useState<CopyValues>(initialValues)
  const [hydrated, setHydrated] = useState(false)
  const [copying, setCopying] = useState(false)
  const [status, setStatus] = useState('Drafts save in this browser')
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [activeSectionId, setActiveSectionId] = useState('copy-editor-top')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setValues(current => ({ ...current, ...(parsed as CopyValues) }))
          setStatus('Restored local draft')
        }
      }
    } catch {
      setStatus('Local draft storage is unavailable')
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
        setStatus('Saved locally')
      } catch {
        setStatus('Local draft storage is unavailable')
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [hydrated, values])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('textarea, input, select, [contenteditable]')
      ) {
        return
      }

      if (
        (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return
      }

      const workspace = workspaceRef.current
      if (!workspace) return

      const slides = getSlides(workspace)
      if (slides.length === 0) return

      const currentIndex = getCurrentSlideIndex(workspace, slides)

      const direction = event.key === 'ArrowDown' ? 1 : -1
      const targetIndex = currentIndex + direction
      if (!slides[targetIndex]) return

      event.preventDefault()
      scrollToSlide(workspace, targetIndex)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  const changes = useMemo(
    () =>
      Object.fromEntries(
        copyEditorEntries
          .filter(entry => values[entry.id] !== entry.value)
          .map(entry => [entry.id, values[entry.id] ?? '']),
      ),
    [values],
  )
  const changeCount = Object.keys(changes).length

  const groups = useMemo(() => {
    const grouped = new Map<string, CopyEditorBlock[]>()
    copyEditorEntries.forEach(entry => {
      const blocks = grouped.get(entry.group) ?? []
      const blockId = entry.blockId ?? entry.id
      const existingBlock = blocks.find(block => block.id === blockId)

      if (existingBlock) {
        existingBlock.entries.push(entry)
        existingBlock.media ??= entry.media
      } else {
        blocks.push({ id: blockId, entries: [entry], media: entry.media })
      }

      grouped.set(entry.group, blocks)
    })
    return Array.from(grouped.entries())
  }, [])

  const sectionMarkers = useMemo<CopyEditorSectionMarker[]>(() => {
    let slideIndex = 1
    return [
      { id: 'copy-editor-top', label: 'Top', slideIndex: 0 },
      ...groups.map(([group, blocks]) => {
        const marker = {
          id: sectionId(group),
          label: group,
          slideIndex,
        }
        slideIndex += blocks.length
        return marker
      }),
    ]
  }, [groups])
  const slideCount =
    1 + groups.reduce((total, [, blocks]) => total + blocks.length, 0)
  const slideStarts = Array.from(
    { length: slideCount },
    (_, index) => index / slideCount,
  )

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return

    let activeFrame = 0
    const updateActiveSlide = () => {
      activeFrame = 0
      const nextIndex = getCurrentSlideIndex(workspace)
      if (nextIndex < 0) return
      setActiveSlideIndex(currentIndex =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      )
      const nextSectionId = getLastPassedSectionId(workspace)
      if (nextSectionId) {
        setActiveSectionId(currentSectionId =>
          currentSectionId === nextSectionId ? currentSectionId : nextSectionId,
        )
      }
    }
    const scheduleActiveUpdate = () => {
      if (activeFrame) return
      activeFrame = requestAnimationFrame(updateActiveSlide)
    }

    workspace.addEventListener('scroll', scheduleActiveUpdate, {
      passive: true,
    })
    window.addEventListener('resize', scheduleActiveUpdate)
    scheduleActiveUpdate()

    return () => {
      cancelAnimationFrame(activeFrame)
      workspace.removeEventListener('scroll', scheduleActiveUpdate)
      window.removeEventListener('resize', scheduleActiveUpdate)
    }
  }, [slideCount])

  function updateEntry(id: string, value: string) {
    setValues(current => ({ ...current, [id]: value }))
    setStatus('Saving…')
  }

  async function copyJson() {
    if (copying || changeCount === 0) return

    setCopying(true)
    setStatus('Copying JSON…')
    try {
      await nextPaint()
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            format: 'aaronwright-copy-edits/v1',
            changes,
          },
          null,
          2,
        ),
      )
      setStatus(
        `Copied ${changeCount} ${changeCount === 1 ? 'change' : 'changes'} for Codex`,
      )
    } catch {
      setStatus('Clipboard access is unavailable')
    } finally {
      setCopying(false)
    }
  }

  function resetChanges() {
    if (
      !window.confirm(
        'Reset every field to the copy currently in the app? Your local edits will be removed.',
      )
    ) {
      return
    }

    const initial = initialValues()
    setValues(initial)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    setStatus('Reset to current app copy')
  }

  return (
    <main
      ref={workspaceRef}
      className={styles.workspace}
    >
      <CopyEditorScrollRail
        activeSectionId={activeSectionId}
        activeSlideIndex={activeSlideIndex}
        onSelectSlide={slideIndex => {
          const workspace = workspaceRef.current
          if (workspace) scrollToSlide(workspace, slideIndex)
        }}
        sections={sectionMarkers}
        slideStarts={slideStarts}
      />

      <header
        className={styles.header}
        data-copy-editor-section-start="copy-editor-top"
        data-copy-editor-slide
        id="copy-editor-top"
      >
        <div>
          <p className={styles.eyebrow}>Copy proof · all public text</p>
          <h1 className={styles.title}>Rewrite it in context.</h1>
          <p className={styles.introduction}>
            Edit any field below. Images stay beside the words they describe,
            drafts save locally, and the export contains only what changed.
          </p>
        </div>
        <div
          className={styles.tally}
          aria-label={`${changeCount} changed fields`}
        >
          <strong>{String(changeCount).padStart(2, '0')}</strong>
          <span>Fields changed</span>
        </div>
      </header>

      <div className={styles.groups}>
        {groups.map(([group, blocks]) => {
          return (
            <section key={group}>
              {blocks.map((block, blockIndex) => {
                const mediaAltEntry = block.entries.find(entry =>
                  entry.id.endsWith('.alt'),
                )
                const mediaAlt = mediaAltEntry
                  ? (values[mediaAltEntry.id] ?? mediaAltEntry.value)
                  : (block.media?.alt ?? '')

                return (
                  <article
                    className={`${styles.entry} ${!block.media ? styles.entryNoMedia : ''}`}
                    data-copy-editor-section-start={
                      blockIndex === 0 ? sectionId(group) : undefined
                    }
                    data-copy-editor-slide
                    id={blockIndex === 0 ? sectionId(group) : undefined}
                    key={block.id}
                  >
                    <header className={styles.entryHeader}>
                      <h2 className={styles.entryGroup}>{group}</h2>
                      <span className={styles.entryProgress}>
                        {String(blockIndex + 1).padStart(2, '0')} /{' '}
                        {String(blocks.length).padStart(2, '0')} ·{' '}
                        {block.entries.length}{' '}
                        {block.entries.length === 1 ? 'field' : 'fields'}
                      </span>
                    </header>
                    <div className={styles.fieldStack}>
                      {block.entries.map(entry => {
                        const value = values[entry.id] ?? ''
                        const changed = value !== entry.value
                        const controlId = `copy-editor-field-${entry.id.replace(/[^a-z0-9]+/gi, '-')}`

                        return (
                          <div
                            className={styles.field}
                            key={entry.id}
                          >
                            <span className={styles.fieldHeader}>
                              <span>
                                <span className={styles.label}>
                                  {entry.label}
                                </span>
                                <span className={styles.path}>{entry.id}</span>
                              </span>
                              <span className={styles.count}>
                                {wordCount(value)} words
                              </span>
                            </span>
                            <div className={styles.versions}>
                              <div className={styles.version}>
                                <span className={styles.versionLabel}>
                                  Original
                                </span>
                                <div
                                  className={`${styles.original} ${entry.control === 'input' ? styles.originalInput : styles.originalTextarea}`}
                                >
                                  {entry.value}
                                </div>
                              </div>
                              <label
                                className={styles.version}
                                htmlFor={controlId}
                              >
                                <span className={styles.versionLabel}>
                                  Editable
                                </span>
                                {entry.control === 'input' ? (
                                  <input
                                    className={`${styles.input} ${changed ? styles.controlChanged : ''}`}
                                    id={controlId}
                                    type="text"
                                    value={value}
                                    spellCheck
                                    onChange={event =>
                                      updateEntry(entry.id, event.target.value)
                                    }
                                  />
                                ) : (
                                  <ContentSizedTextarea
                                    className={`${styles.textarea} ${changed ? styles.controlChanged : ''}`}
                                    id={controlId}
                                    value={value}
                                    onChange={nextValue =>
                                      updateEntry(entry.id, nextValue)
                                    }
                                  />
                                )}
                                {changed ? (
                                  <span className={styles.changeNote}>
                                    Changed from app copy
                                  </span>
                                ) : null}
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {block.media ? (
                      <figure className={styles.mediaFrame}>
                        {block.media.type === 'video' ? (
                          <video
                            src={block.media.src}
                            aria-label={mediaAlt}
                            controls
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          // These are known local portfolio assets; a plain image
                          // keeps the editor compatible with every source format.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={block.media.src}
                            alt={mediaAlt}
                          />
                        )}
                      </figure>
                    ) : null}
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>

      <footer
        className={styles.footer}
        data-copy-editor-footer
      >
        <div className={styles.footerInner}>
          <span
            className={styles.status}
            aria-live="polite"
          >
            {status}
          </span>
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="button"
              disabled={changeCount === 0 || copying}
              onClick={resetChanges}
            >
              Reset changes
            </button>
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              type="button"
              disabled={changeCount === 0 || copying}
              aria-busy={copying || undefined}
              onClick={() => void copyJson()}
            >
              <span
                className={styles.buttonIcon}
                aria-hidden="true"
              >
                {copying ? <span className={styles.spinner} /> : '{}'}
              </span>
              <span>Copy JSON for Codex</span>
            </button>
          </div>
        </div>
      </footer>
    </main>
  )
}
