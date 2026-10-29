'use client'

import { useId } from 'react'
import { stopNavigationEventsPropagation } from 'yet-another-react-lightbox'
import { PortfolioIcon } from '@/components/portfolio/presentation/PortfolioIcon'
import { PortfolioMarkdown } from '@/components/portfolio/presentation/PortfolioText'
import { DEFAULT_MOSAIC_BLURB_POSITION } from './blurbPosition'
import type { MosaicProject } from './types'
import styles from './MosaicViewer.module.css'
import { MosaicViewerButton } from './MosaicViewerButton'
import { MosaicProjectLink } from './MosaicProjectLink'
import { MosaicBlurbInk } from './MosaicBlurbInk'
import { useMosaicBlurbMotion } from './useMosaicBlurbMotion'

export function MosaicProjectBlurb({
  project,
  video,
  visible,
}: {
  project: Pick<MosaicProject, 'title' | 'longSummary' | 'blurbPosition' | 'url'>
  video: boolean
  visible: boolean
}) {
  const contentId = useId()
  const present = Boolean(project.longSummary?.trim())
  const {
    bindings,
    layer,
    panel,
    control,
    anchor,
    collapsed,
    settledCollapsed,
    animating,
    toggle,
  } = useMosaicBlurbMotion(visible, present)
  if (!present) return null
  const position = project.blurbPosition ?? DEFAULT_MOSAIC_BLURB_POSITION

  return (
    <div
      ref={layer}
      className={styles.blurbLayer}
      data-vertical={position.vertical}
      data-horizontal={position.horizontal}
      data-video={video || undefined}
      data-visible={visible || undefined}
      data-collapsed={settledCollapsed || undefined}
      data-animating={animating || undefined}
      inert={!visible}
    >
      <aside
        ref={panel}
        className={styles.blurb}
        aria-label={`${project.title.replace(/\u00ad/g, '')} overview`}
        aria-hidden={collapsed || animating}
        inert={collapsed || animating}
        {...stopNavigationEventsPropagation()}
      >
        <MosaicViewerButton
          className={styles.blurbMinimize}
          label="Minimize project details"
          aria-controls={contentId}
          onClick={toggle}
        >
          <PortfolioIcon name="collapse" />
        </MosaicViewerButton>
        <div
          id={contentId}
          className={`portfolio-markdown ${styles.blurbContent}`}
          role="region"
          aria-label={`${project.title.replace(/\u00ad/g, '')} description`}
          tabIndex={0}
        >
          <PortfolioMarkdown>{project.longSummary!}</PortfolioMarkdown>
        </div>
        {project.url ? (
          <MosaicProjectLink href={project.url} title={project.title} />
        ) : null}
      </aside>
      <span
        ref={anchor}
        className={styles.blurbAnchor}
        aria-hidden="true"
      />
      <MosaicViewerButton
        buttonRef={control}
        className={styles.blurbToggle}
        label={collapsed ? 'Show project details' : 'Hide project details'}
        aria-controls={contentId}
        aria-expanded={!collapsed}
        onClick={toggle}
        {...stopNavigationEventsPropagation()}
      >
        <PortfolioIcon name="notes" />
      </MosaicViewerButton>
      <MosaicBlurbInk bindings={bindings} />
    </div>
  )
}
