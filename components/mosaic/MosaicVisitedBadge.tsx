import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye } from '@fortawesome/free-solid-svg-icons'
import styles from './Mosaic.module.css'

export function MosaicVisitedBadge({ id }: { id: string }) {
  return (
    <span
      id={id}
      className={styles.visitedBadge}
    >
      <span
        className={styles.visitedIcon}
        aria-hidden="true"
      >
        <FontAwesomeIcon icon={faEye} />
      </span>
      <span className={styles.visitedLabel}>Viewed</span>
    </span>
  )
}
