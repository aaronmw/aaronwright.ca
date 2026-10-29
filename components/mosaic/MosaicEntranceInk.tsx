import type { useMosaicEntrance } from './useMosaicEntrance'
import { MosaicRectangleInk } from './MosaicRectangleInk'
import styles from './Mosaic.module.css'

export function MosaicEntranceInk({
  entry,
  covered,
}: {
  entry: ReturnType<typeof useMosaicEntrance>
  covered: boolean
}) {
  const { sequence } = entry
  if (!sequence || covered) return null
  return (
    <MosaicRectangleInk
      {...entry.bindings}
      className={styles.entranceInk}
      viewBox={`0 0 ${sequence.width} ${sequence.height}`}
    />
  )
}
