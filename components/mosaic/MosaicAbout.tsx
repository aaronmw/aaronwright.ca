import { stopNavigationEventsPropagation } from 'yet-another-react-lightbox'
import { ProjectNarrative } from '@/components/portfolio/presentation/PortfolioText'
import { PortfolioLogoMark } from '@/components/portfolio/presentation/PortfolioLogoMark'
import { MosaicPortrait } from './MosaicPortrait'
import type { MosaicProject } from './types'
import styles from './MosaicViewer.module.css'

/** About shares the modal lifecycle, but gives the biography its own editorial layout. */
export function MosaicAbout({ project }: { project: MosaicProject }) {
  if (!project.about) return null
  return (
    <div
      className={styles.aboutViewport}
      role="region"
      aria-label="About Aaron Wright"
      {...stopNavigationEventsPropagation()}
    >
      <section className={styles.aboutPage}>
        <div className={styles.aboutColumns}>
          <MosaicPortrait expanded />
          <article
            className={`${styles.aboutCopy} ${styles.aboutBiography}`}
            aria-label="Biography"
          >
            <header className={styles.aboutMasthead}>
              <div className={styles.aboutIdentity}>
                <PortfolioLogoMark className={styles.aboutLogo} />
                <span>Aaron M. Wright</span>
              </div>
              <span className={styles.aboutRole}>
                Principal Product Designer &amp; <span>Frontend Developer</span>
              </span>
            </header>
            <h1 className={styles.aboutHeadline}>
              <span>I design and build interfaces</span>{' '}
              <span className={styles.aboutHeadlineAccent}>
                to empower and delight humans.
              </span>
            </h1>
            <ProjectNarrative
              narrative={{
                sourceId: `project:${project.id}`,
                bodyMarkdown: project.about.overviewMarkdown,
              }}
            />
          </article>
        </div>
      </section>
    </div>
  )
}
