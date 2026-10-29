import { portfolioMotion } from '@/lib/portfolioTokens'
import { gsap, mosaicEase, seconds } from './motion'

/** A late asset receives a full reveal, regardless of when the intro finished. */
export function createMediaRevealMotion(
  surface: HTMLElement,
  covered: () => void,
) {
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  let started = false
  let disposed = false
  let timeline!: gsap.core.Timeline
  const context = gsap.context(() => {
    timeline = gsap
      .timeline({
        paused: true,
        onComplete: () => {
          if (!disposed) covered()
        },
      })
      .addLabel('reveal')
      .fromTo(
        surface,
        { opacity: 0 },
        {
          opacity: 1,
          duration: seconds(portfolioMotion.mosaicMediaReveal),
          ease: mosaicEase.fade,
        },
      )
      .addLabel('covered')
  })
  const changed = () => {
    if (started && media.matches) timeline.progress(1).pause()
  }
  media.addEventListener('change', changed)
  return {
    timeline,
    complete() {
      if (disposed) return
      started = true
      timeline.progress(1).pause()
    },
    ready(arrived: boolean, loaded: boolean) {
      if (disposed || started || !arrived || !loaded) return
      started = true
      if (media.matches) timeline.progress(1)
      else timeline.play()
    },
    dispose() {
      disposed = true
      media.removeEventListener('change', changed)
      context.revert()
    },
  }
}
