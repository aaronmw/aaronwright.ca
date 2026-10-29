'use client'

import Lightbox, { type Slide } from 'yet-another-react-lightbox'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import { MosaicViewerButton as ViewerButton } from './MosaicViewerButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import {
  useMosaicViewerTransition,
  type MosaicViewerProps,
} from './useMosaicViewerTransition'
import { useMosaicOriginPoster } from './useMosaicOriginPoster'
import styles from './MosaicViewer.module.css'
import theme from './MosaicTheme.module.css'
import { MosaicVideoControls } from './MosaicVideoControls'
import treatment from './mediaTreatment.module.css'
import { MosaicMediaClip } from './MosaicMediaClip'
import { MosaicAbout } from './MosaicAbout'
import { MosaicProjectBlurb } from './MosaicProjectBlurb'

export function MosaicViewer(props: MosaicViewerProps) {
  const { project, index, open } = props
  const about = Boolean(project.about)
  // Image/portrait transitions use the canvas directly. Only a video needs an
  // encoded poster URL; encoding a hovered portrait adds synchronous readback.
  const originPoster = useMosaicOriginPoster(
    project.media[0]?.video ? props.origin : null,
  )
  const {
    controller,
    phase,
    reducedMotion,
    beginOpen,
    handleView,
    requestClose,
  } = useMosaicViewerTransition(props)

  const slides: Slide[] = project.media.map((media, mediaIndex) =>
    media.video
      ? {
          type: 'video',
          width: media.width,
          height: media.height,
          poster:
            mediaIndex === 0 ? (originPoster ?? media.poster) : media.poster,
          sources:
            mediaIndex === index
              ? [
                  {
                    src: media.src,
                    type: /\.webm(?:$|[?#])/i.test(media.src)
                      ? 'video/webm'
                      : 'video/mp4',
                  },
                ]
              : [],
          autoPlay: open && phase === 'open' && !reducedMotion,
          muted: true,
          playsInline: true,
          controls: false,
          loop: true,
          preload: 'none',
        }
      : {
          src: media.src,
          alt: media.alt,
          width: media.width,
          height: media.height,
        },
  )

  const unavailable = !open || phase !== 'open'
  return (
    <Lightbox
      open
      close={requestClose}
      index={index}
      slides={slides}
      plugins={about ? [] : [Video]}
      className={`${styles.root} ${theme.scope} ${treatment.surface} ${about ? styles.aboutViewer : ''} ${phase === 'opening' ? styles.opening : ''} ${phase === 'closing' ? styles.closing : ''}`}
      controller={{
        ref: controller,
        closeOnEscape: false,
        closeOnBackdropClick: false,
        closeOnPullDown: false,
        closeOnPullUp: false,
        disableSwipeNavigation: true,
      }}
      carousel={{ finite: true, preload: 0, padding: 0, spacing: 0 }}
      animation={{ fade: 0 }}
      toolbar={{ buttons: ['close'] }}
      render={{
        controls: () => (
          <MosaicProjectBlurb
            project={project}
            video={project.media[index].video}
            visible={!unavailable}
          />
        ),
        slide: about ? () => <MosaicAbout project={project} /> : undefined,
        slideContainer: ({ slide, children }) => (
          <MosaicMediaClip clip={project.media[slides.indexOf(slide)]?.clip}>
            {children}
          </MosaicMediaClip>
        ),
        slideFooter: ({ slide }) =>
          slide.type === 'video' &&
          slide.sources.some(
            source => source.src === project.media[index].src,
          ) ? (
            <MosaicVideoControls
              key={project.media[index].id}
              label={project.media[index].alt}
              disabled={unavailable}
            />
          ) : null,
        buttonClose: () => (
          <ViewerButton
            key="close"
            label="Close viewer"
            onClick={requestClose}
          >
            <FontAwesomeIcon
              icon={faXmark}
              aria-hidden="true"
            />
          </ViewerButton>
        ),
        buttonPrev: () => null,
        buttonNext: () => null,
      }}
      labels={{
        Lightbox: about ? project.title : `${project.title} image viewer`,
      }}
      on={{
        entering: beginOpen,
        view: handleView,
      }}
    />
  )
}
