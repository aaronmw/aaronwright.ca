import {
  MosaicRectangleInk,
  type MosaicRectangleRefs,
} from './MosaicRectangleInk'
import styles from './MosaicViewer.module.css'

export function MosaicBlurbInk({
  bindings,
}: {
  bindings: MosaicRectangleRefs
}) {
  return (
    <MosaicRectangleInk
      {...bindings}
      className={styles.blurbInk}
    />
  )
}
