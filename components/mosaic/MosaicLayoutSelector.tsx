import { MAX_PACKING_TOLERANCE, type PackingApproach } from './packingSettings'
import type { PackingStatus } from './usePackedLayout'
import styles from './MosaicAdjustmentToolbar.module.css'
import { AdjustmentInput, AdjustmentSelect } from './MosaicAdjustmentField'

export function MosaicLayoutSelector({
  approach,
  changeApproach,
  tolerance,
  changeTolerance,
  pending,
  packingStatus,
}: {
  approach: PackingApproach
  changeApproach: (approach: PackingApproach) => void
  tolerance: number
  changeTolerance: (tolerance: number) => void
  pending: boolean
  packingStatus: PackingStatus
}) {
  return (
    <div className={styles.approachField}>
      <AdjustmentSelect
        label="Layout"
        value={approach}
        disabled={pending || packingStatus.pending}
        aria-busy={packingStatus.pending}
        onChange={event =>
          changeApproach(event.currentTarget.value as PackingApproach)
        }
      >
        <option value="justified">Justified</option>
        <option value="rectangles">Rectangle packing</option>
      </AdjustmentSelect>
      <AdjustmentInput
        label="Ratio tolerance (%)"
        className={styles.toleranceInput}
        type="number"
        min={0}
        max={MAX_PACKING_TOLERANCE * 100}
        step={1}
        value={Math.round(tolerance * 100)}
        disabled={pending}
        aria-busy={packingStatus.pending}
        onChange={event => {
          const value = event.currentTarget.valueAsNumber
          if (Number.isFinite(value))
            changeTolerance(
              Math.max(0, Math.min(MAX_PACKING_TOLERANCE, value / 100)),
            )
        }}
      />
      <span
        role="status"
        className={styles.packingStatus}
      >
        {packingStatus.pending
          ? 'Arranging…'
          : packingStatus.error
            ? 'Could not arrange layout'
            : packingStatus.coverage !== undefined
              ? `${Math.round(packingStatus.coverage * 100)}% filled`
              : ''}
      </span>
    </div>
  )
}
