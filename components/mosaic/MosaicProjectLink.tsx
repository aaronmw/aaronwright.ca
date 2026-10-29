import { PortfolioIcon } from '@/components/portfolio/presentation/PortfolioIcon'
import styles from './MosaicViewer.module.css'

/** Public project destination shared by every notes box. */
export function MosaicProjectLink({
  href,
  title,
}: {
  href: string
  title: string
}) {
  return (
    <a
      className={styles.projectLink}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span>
        Visit {title.replace(/\u00ad/g, '')}
        {'\u00a0'}
        <PortfolioIcon name="external" inline />
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
