import {
  AdjustmentInput,
  AdjustmentSelect,
  AdjustmentTextarea,
} from './MosaicAdjustmentField'
import type { MosaicBlurbPosition, MosaicProjectCopy } from './types'
import { DEFAULT_MOSAIC_BLURB_POSITION } from './blurbPosition'
import styles from './MosaicAdjustmentToolbar.module.css'

export function MosaicProjectEditor({
  project,
  change,
  pending,
}: {
  project: MosaicProjectCopy
  change: (patch: Partial<MosaicProjectCopy>) => void
  pending: boolean
}) {
  const position = project.blurbPosition ?? DEFAULT_MOSAIC_BLURB_POSITION
  return (
    <fieldset
      className={styles.loopFields}
      disabled={pending}
    >
      <legend>Project details</legend>
      <div className={styles.projectFields}>
        <AdjustmentInput
          label="Title"
          stacked
          value={project.title}
          onChange={event => change({ title: event.currentTarget.value })}
        />
        <AdjustmentTextarea
          label="Blurb"
          rows={3}
          value={project.summary}
          onChange={event => change({ summary: event.currentTarget.value })}
        />
        <AdjustmentTextarea
          label="Longer blurb"
          rows={3}
          value={project.longSummary ?? ''}
          onChange={event => change({ longSummary: event.currentTarget.value })}
        />
      </div>
      <div className={styles.row}>
        <AdjustmentSelect
          label="Blurb vertical position"
          value={position.vertical}
          onChange={event =>
            change({
              blurbPosition: {
                ...position,
                vertical: event.currentTarget
                  .value as MosaicBlurbPosition['vertical'],
              },
            })
          }
        >
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </AdjustmentSelect>
        <AdjustmentSelect
          label="Blurb horizontal position"
          value={position.horizontal}
          onChange={event =>
            change({
              blurbPosition: {
                ...position,
                horizontal: event.currentTarget
                  .value as MosaicBlurbPosition['horizontal'],
              },
            })
          }
        >
          <option value="left">Left</option>
          <option value="center">Centre</option>
          <option value="right">Right</option>
        </AdjustmentSelect>
      </div>
    </fieldset>
  )
}
