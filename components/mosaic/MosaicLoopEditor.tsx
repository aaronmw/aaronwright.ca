import { useId, useState } from 'react'
import type { MosaicComposition, MosaicMedia, MosaicSegment } from './types'
import { addSegment } from './segmentEditing'
import { useMosaicSegmentDrag } from './useMosaicSegmentDrag'
import {
  validateMosaicLoop,
  validateSegmentSpeed,
  MIN_SEGMENT_SPEED,
} from './composition'
import { AdjustmentButton } from './MosaicAdjustmentButton'
import { AdjustmentInput } from './MosaicAdjustmentField'
import styles from './MosaicAdjustmentToolbar.module.css'

export type VideoLoopControls = {
  title: string
  media: MosaicMedia
  duration?: number
  change: (segments: MosaicSegment[] | undefined, index: number) => void
  selected: number
  select: (index: number) => void
  preview: () => void
  previewing: boolean
  framing: MosaicComposition
}

function SegmentNumberInput({
  label,
  value,
  min = 0,
  max,
  step = 0.01,
  errorId,
  change,
}: {
  label: string
  value: string
  min?: number
  max?: number
  step?: number
  errorId?: string
  change: (value: string) => void
}) {
  return (
    <AdjustmentInput
      label={label}
      stacked
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-invalid={Boolean(errorId)}
      aria-describedby={errorId}
      onChange={event => change(event.currentTarget.value)}
    />
  )
}

function SegmentFadeOptions({
  edge,
  segment,
  change,
}: {
  edge: 'fadeIn' | 'fadeOut'
  segment: MosaicSegment
  change: (segment: MosaicSegment) => void
}) {
  const colorKey = `${edge}Color` as const
  const label = edge === 'fadeIn' ? 'Fade in from' : 'Fade out to'
  return (
    <div className={styles.fadeOptions}>
      {(['black', 'white'] as const).map(color => (
        <label
          key={color}
          className={styles.fadeToggle}
        >
          <input
            type="checkbox"
            checked={segment[edge] && (segment[colorKey] ?? 'black') === color}
            onChange={event =>
              change({
                ...segment,
                [edge]: event.currentTarget.checked,
                [colorKey]: color,
              })
            }
          />
          {label} {color}
        </label>
      ))}
    </div>
  )
}

export function MosaicLoopEditor({
  video,
  pending,
}: {
  video: VideoLoopControls
  pending: boolean
}) {
  const errorId = useId()
  const [draft, setDraft] = useState<{
    start: string
    end: string
    speed: string
  } | null>(null)
  const duration = video.duration ?? 0
  const segments: MosaicSegment[] = video.media.segments?.length
    ? video.media.segments
    : [
        {
          id: 'full-video',
          start: 0,
          end: duration,
          fadeIn: false,
          fadeOut: false,
        },
      ]
  const index = Math.min(video.selected, segments.length - 1)
  const segment = segments[index]
  const values = draft ?? {
    start: String(segment.start),
    end: String(segment.end),
    speed: String(segment.speed ?? 1),
  }
  const error = draft
    ? (validateMosaicLoop(
        {
          start: values.start.trim() ? Number(values.start) : NaN,
          end: values.end.trim() ? Number(values.end) : NaN,
        },
        duration,
      ) ??
      validateSegmentSpeed(values.speed.trim() ? Number(values.speed) : NaN))
    : null
  const percent = (time: number) => (duration ? (time / duration) * 100 : 0)

  function select(index: number) {
    video.select(index)
    setDraft(null)
  }
  function replace(segment: MosaicSegment) {
    video.change(
      segments.map((previous, i) => (i === index ? segment : previous)),
      index,
    )
  }
  function editNumber(field: 'start' | 'end' | 'speed', value: string) {
    const next = { ...values, [field]: value }
    setDraft(next)
    const range = {
      start: next.start.trim() ? Number(next.start) : NaN,
      end: next.end.trim() ? Number(next.end) : NaN,
    }
    const speed = next.speed.trim() ? Number(next.speed) : NaN
    if (!validateMosaicLoop(range, duration) && !validateSegmentSpeed(speed))
      replace({ ...segment, ...range, speed })
  }
  function move(delta: number) {
    const next = [...segments]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    video.change(next, index + delta)
    setDraft(null)
  }
  function add() {
    video.change(
      addSegment(segments, index, duration, crypto.randomUUID()),
      index + 1,
    )
    setDraft(null)
  }
  const drag = useMosaicSegmentDrag({
    segments,
    duration,
    disabled: pending || !duration,
    select,
    change: (segments, index) => {
      setDraft(null)
      video.change(segments, index)
    },
  })

  return (
    <fieldset
      className={styles.loopFields}
      disabled={pending || !duration}
    >
      <legend>{video.title}</legend>
      <div
        className={styles.row}
        aria-label="Video segments"
      >
        {segments.map((item, i) => (
          <AdjustmentButton
            key={item.id ?? `${item.start}:${item.end}`}
            aria-pressed={index === i}
            onClick={() => select(i)}
          >
            Segment {i + 1} · {item.start.toFixed(2)}–{item.end.toFixed(2)}s
          </AdjustmentButton>
        ))}
        <AdjustmentButton onClick={add}>Add segment</AdjustmentButton>
        <AdjustmentButton
          onClick={() => {
            if (video.previewing) select(index)
            else video.preview()
          }}
        >
          {video.previewing ? 'Stop' : 'Play All'}
        </AdjustmentButton>
        <span
          role="status"
          className={styles.srOnly}
        >
          {video.previewing ? 'Playing all segments once…' : ''}
        </span>
      </div>
      <p
        id="segment-drag-help"
        className={styles.srOnly}
      >
        Drag a segment to move it within its surrounding gaps. Arrow keys move
        it by 0.1s; Shift + arrow moves it by 1s.
      </p>
      <div className={styles.loopTimeline}>
        <div className={styles.loopTrack}>
          {segments.map((item, i) => (
            <button
              key={item.id ?? `${item.start}:${item.end}`}
              type="button"
              className={styles.timelineSegment}
              aria-label={`Select segment ${i + 1}`}
              aria-pressed={index === i}
              style={{
                left: `${percent(item.start)}%`,
                width: `${percent(item.end - item.start)}%`,
              }}
              onPointerDown={event => drag.start(event, i)}
              onPointerMove={drag.move}
              onPointerUp={drag.end}
              onPointerCancel={drag.end}
              onLostPointerCapture={drag.end}
              onKeyDown={event => drag.key(event, i)}
              onClick={event => {
                if (event.detail === 0) select(i)
              }}
              aria-describedby="segment-drag-help"
            />
          ))}
        </div>
        <input
          className={styles.loopHandle}
          type="range"
          aria-label="Drag loop start"
          aria-valuetext={`Segment ${index + 1}, ${segment.start.toFixed(2)} seconds`}
          min={0}
          max={duration || 1}
          step="0.01"
          value={segment.start}
          onChange={event => {
            setDraft(null)
            replace({
              ...segment,
              start: Math.min(
                Number(event.currentTarget.value),
                segment.end - 0.01,
              ),
            })
          }}
        />
        <input
          className={styles.loopHandle}
          type="range"
          aria-label="Drag loop end"
          aria-valuetext={`Segment ${index + 1}, ${segment.end.toFixed(2)} seconds`}
          min={0}
          max={duration || 1}
          step="0.01"
          value={segment.end}
          onChange={event => {
            setDraft(null)
            replace({
              ...segment,
              end: Math.max(
                Number(event.currentTarget.value),
                segment.start + 0.01,
              ),
            })
          }}
        />
      </div>
      <div
        className={styles.loopScale}
        aria-hidden="true"
      >
        <span>0s</span>
        <span>{(duration / 2).toFixed(1)}s</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
      <div className={`${styles.row} ${styles.segmentSettings}`}>
        <SegmentNumberInput
          label="Loop start"
          value={values.start}
          max={duration}
          errorId={error ? errorId : undefined}
          change={value => editNumber('start', value)}
        />
        <SegmentNumberInput
          label="Loop end"
          value={values.end}
          max={duration}
          errorId={error ? errorId : undefined}
          change={value => editNumber('end', value)}
        />
        <SegmentNumberInput
          label="Speed (×)"
          value={values.speed}
          min={MIN_SEGMENT_SPEED}
          step={0.1}
          errorId={error ? errorId : undefined}
          change={value => editNumber('speed', value)}
        />
        <SegmentFadeOptions
          edge="fadeIn"
          segment={segment}
          change={replace}
        />
        <SegmentFadeOptions
          edge="fadeOut"
          segment={segment}
          change={replace}
        />
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className={styles.loopStatus}
        >
          {error} Preview keeps the last valid settings.
        </p>
      ) : null}
      <div className={styles.row}>
        <AdjustmentButton
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          Move earlier
        </AdjustmentButton>
        <AdjustmentButton
          disabled={index === segments.length - 1}
          onClick={() => move(1)}
        >
          Move later
        </AdjustmentButton>
        <AdjustmentButton
          onClick={() => {
            const next = segments.filter((_, i) => i !== index)
            video.change(next.length ? next : undefined, Math.max(0, index - 1))
            setDraft(null)
          }}
        >
          Remove segment
        </AdjustmentButton>
        <AdjustmentButton
          onClick={() => {
            video.change(undefined, 0)
            setDraft(null)
          }}
        >
          Use full video
        </AdjustmentButton>
      </div>
    </fieldset>
  )
}
