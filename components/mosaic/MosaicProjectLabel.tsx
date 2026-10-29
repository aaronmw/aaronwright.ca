import type { MosaicProject } from './types'
import styles from './Mosaic.module.css'

export function MosaicProjectLabel({
  project,
  summaryId,
}: {
  project: Pick<MosaicProject, 'title' | 'summary'>
  summaryId: string
}) {
  return (
    <span
      className={`${styles.label} bg-linear-to-t from-black to-transparent`}
    >
      <span className={styles.labelTitle}>
        {project.title.replace(/\u00ad/g, '')}
      </span>
      <span
        id={summaryId}
        className={styles.labelSummary}
      >
        {project.summary}
      </span>
    </span>
  )
}
