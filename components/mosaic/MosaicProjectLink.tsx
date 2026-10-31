import { PortfolioActionLink } from '@/components/portfolio/presentation/PortfolioActionLink'
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
    <PortfolioActionLink
      className={styles.projectLink}
      href={href}
      external
      trailingIcon="external"
    >
      Visit {title.replace(/\u00ad/g, '')}
    </PortfolioActionLink>
  )
}
