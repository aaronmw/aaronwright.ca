import { useRef, type ReactNode } from 'react'
import { faCopy, faSliders, faShuffle } from '@fortawesome/free-solid-svg-icons'
import { AdjustmentButton } from './MosaicAdjustmentButton'
import { AdjustmentInput } from './MosaicAdjustmentField'
import { MIN_IDLE_PLAYBACK_SPEED } from './mosaicPlaybackTempo'
import { MosaicAdjustmentPanel } from './MosaicAdjustmentPanel'
import { MosaicLoopEditor, type VideoLoopControls } from './MosaicLoopEditor'
import type { PackingApproach } from './packing'
import type { PackingStatus } from './usePackedLayout'
import { MosaicLayoutSelector } from './MosaicLayoutSelector'
import { useExperimentGallery } from './ExperimentGallery'
import styles from './MosaicAdjustmentToolbar.module.css'

export function MosaicAdjustmentToolbar({
  approach,
  changeApproach,
  tolerance,
  changeTolerance,
  packingStatus,
  shuffle,
  retryShuffle,
  shufflePending,
  shuffleJson,
  editing,
  pending,
  failed,
  json,
  message,
  enter,
  copy,
  finish,
  entryRef,
  videoLoop,
  projectEditor,
  layerControls,
  idlePlaybackSpeed,
  changeIdlePlaybackSpeed,
}: {
  approach: PackingApproach
  changeApproach: (approach: PackingApproach) => void
  tolerance: number
  changeTolerance: (tolerance: number) => void
  packingStatus: PackingStatus
  shuffle: () => void
  retryShuffle: () => void
  shufflePending: boolean
  shuffleJson: string
  editing: boolean
  pending: boolean
  failed: boolean
  json: string
  message: string
  enter: () => void
  copy: () => void
  finish: () => void
  entryRef: (node: HTMLButtonElement | null) => void
  videoLoop?: VideoLoopControls
  projectEditor?: ReactNode
  layerControls?: ReactNode
  idlePlaybackSpeed: number
  changeIdlePlaybackSpeed: (speed: number) => void
}) {
  const { clearViewHistory } = useExperimentGallery()
  const clearHistoryButton = (
    <AdjustmentButton
      disabled={pending || shufflePending}
      onClick={clearViewHistory}
    >
      Clear view history
    </AdjustmentButton>
  )
  const approachControl = (
    <MosaicLayoutSelector
      approach={approach}
      changeApproach={changeApproach}
      tolerance={tolerance}
      changeTolerance={changeTolerance}
      pending={pending || shufflePending}
      packingStatus={packingStatus}
    />
  )
  const shuffleJsonRef = useRef<HTMLTextAreaElement>(null)
  const shuffleButton = (
    <AdjustmentButton
      icon={faShuffle}
      pending={shufflePending}
      disabled={pending || packingStatus.pending}
      onClick={shuffle}
    >
      Shuffle layout
    </AdjustmentButton>
  )
  const jsonRef = useRef<HTMLTextAreaElement>(null)
  return (
    <MosaicAdjustmentPanel
      editing={editing}
      projectEditor={Boolean(projectEditor)}
      entryRef={entryRef}
    >
      {editing ? (
        <>
          <div className={styles.row}>
            {approachControl}
            {shuffleButton}
            {clearHistoryButton}
            <AdjustmentButton
              icon={faCopy}
              pending={pending}
              disabled={shufflePending}
              onClick={copy}
            >
              Done &amp; copy
            </AdjustmentButton>
          </div>
          <p
            id="mosaic-adjustment-help"
            className={styles.srOnly}
          >
            {videoLoop ? 'Drag video to pan this segment' : 'Drag to pan'} · ⌘ +
            scroll to zoom
            <br />
            Arrow keys pan · + / − zoom
          </p>
          {projectEditor}
          {videoLoop ? (
            <MosaicLoopEditor
              key={videoLoop.media.id}
              video={videoLoop}
              pending={pending || shufflePending}
            />
          ) : null}
          {failed ? (
            <div className={styles.fallback}>
              <p role="alert">
                Copy failed. Retry or select the JSON and copy it manually.
              </p>
              <textarea
                ref={jsonRef}
                aria-label="Adjustment JSON"
                readOnly
                value={json}
                spellCheck={false}
              />
              <div className={styles.row}>
                <AdjustmentButton
                  icon={faCopy}
                  pending={pending}
                  disabled={shufflePending}
                  onClick={copy}
                >
                  Retry copy
                </AdjustmentButton>
                <AdjustmentButton
                  disabled={pending}
                  onClick={() => {
                    jsonRef.current?.focus()
                    jsonRef.current?.select()
                  }}
                >
                  Select JSON
                </AdjustmentButton>
                <AdjustmentButton
                  disabled={pending}
                  onClick={finish}
                >
                  Finish without copying
                </AdjustmentButton>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.row}>
          <AdjustmentButton
            icon={faSliders}
            disabled={shufflePending}
            onClick={enter}
          >
            Adjust project cells
          </AdjustmentButton>
          {approachControl}
          {shuffleButton}
          {clearHistoryButton}
        </div>
      )}
      {layerControls}
      <div className={styles.layerControls}>
        <AdjustmentInput
          label="Idle Playback Speed"
          type="number"
          min={MIN_IDLE_PLAYBACK_SPEED}
          max={1}
          step="any"
          className={styles.toleranceInput}
          defaultValue={idlePlaybackSpeed}
          disabled={pending || shufflePending}
          onChange={event => {
            const input = event.currentTarget
            if (input.validity.valid && Number.isFinite(input.valueAsNumber))
              changeIdlePlaybackSpeed(input.valueAsNumber)
          }}
          onBlur={event => {
            event.currentTarget.value = String(idlePlaybackSpeed)
          }}
        />
      </div>
      {shuffleJson ? (
        <div className={styles.fallback}>
          <textarea
            ref={shuffleJsonRef}
            aria-label="Layout JSON"
            readOnly
            value={shuffleJson}
            spellCheck={false}
          />
          <div className={styles.row}>
            <AdjustmentButton
              icon={faCopy}
              pending={shufflePending}
              disabled={pending}
              onClick={retryShuffle}
            >
              Retry layout copy
            </AdjustmentButton>
            <AdjustmentButton
              disabled={pending || shufflePending}
              onClick={() => {
                shuffleJsonRef.current?.focus()
                shuffleJsonRef.current?.select()
              }}
            >
              Select layout JSON
            </AdjustmentButton>
          </div>
        </div>
      ) : null}
      <p
        className={message ? styles.message : styles.srOnly}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </MosaicAdjustmentPanel>
  )
}
