import { useEffect, useId, useRef, type ReactNode } from 'react'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { AdjustmentButton } from './MosaicAdjustmentButton'
import styles from './MosaicAdjustmentToolbar.module.css'

/** The development panel becomes the existing editor dock once editing starts. */
export function MosaicAdjustmentPanel({
  children,
  editing,
  projectEditor,
  entryRef,
}: {
  children: ReactNode
  editing: boolean
  projectEditor: boolean
  entryRef: (node: HTMLButtonElement | null) => void
}) {
  const panelId = useId()
  const tooltipId = useId()
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (editing) {
      panelRef.current
        ?.querySelector<HTMLElement>('button, select, input')
        ?.focus({ preventScroll: true })
    }
  }, [editing])

  return (
    <>
      {!editing ? (
        <AdjustmentButton
          ref={entryRef}
          icon={faGear}
          iconOnly
          className={styles.devToolsTrigger}
          data-mosaic-dev-trigger
          aria-label="Project development tools"
          aria-describedby={tooltipId}
          popoverTarget={panelId}
        >
          <span
            id={tooltipId}
            role="tooltip"
            className={styles.devToolsTooltip}
          >
            Adjust project layout and media
          </span>
        </AdjustmentButton>
      ) : null}
      <aside
        ref={panelRef}
        id={panelId}
        popover={editing ? undefined : 'auto'}
        className={styles.toolbar}
        data-project-editor={editing && projectEditor ? true : undefined}
        aria-label="Project cell adjustments"
      >
        {children}
      </aside>
    </>
  )
}
