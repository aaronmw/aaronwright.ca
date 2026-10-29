import { gsap } from './motion'

/** A direction change never rebuilds tweens or resets their current playhead. */
export function createViewerMotion(
  opensAtEnd: boolean,
  build: (timeline: gsap.core.Timeline) => void,
  reached: (expanded: boolean) => void,
) {
  let timeline!: gsap.core.Timeline
  const context = gsap.context(() => {
    timeline = gsap.timeline({
      paused: true,
      onComplete: () => reached(opensAtEnd),
      onReverseComplete: () => reached(!opensAtEnd),
    })
    build(timeline)
  })
  return {
    timeline,
    context,
    opensAtEnd,
    handoffAt: null as number | null,
    handoffBuilt: false,
    setExpanded(expanded: boolean) {
      const forward = expanded === opensAtEnd
      if (forward) timeline.play()
      else timeline.reverse()
      if (timeline.progress() === (forward ? 1 : 0)) reached(expanded)
    },
  }
}
