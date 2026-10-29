import { gsap, mosaicEase, seconds } from './motion'
import {
  createRectangleTimeline,
  type RectangleInkElements,
} from './rectangleMotion'
import { MOSAIC_ENTRANCE_TIMING, type MosaicTileEntrance } from './entrance'

type Member = {
  ink: RectangleInkElements
  sequence: MosaicTileEntrance
  complete: () => void
}

/** One clock controls every rectangle; readiness is a separate media gate. */
export function createMosaicEntranceGroup(size: number) {
  const members = new Map<string, Member>()
  let timeline: gsap.core.Timeline | null = null
  let context: gsap.Context | null = null
  let settled = false
  let fillOrder: string[] | null = null

  function stop() {
    context?.revert()
    context = null
    timeline = null
  }
  function finish() {
    if (settled) return
    settled = true
    members.forEach(member => member.complete())
  }
  function start() {
    if (settled || members.size !== size || timeline) return
    if (!fillOrder || !fillOrder.every(id => members.has(id))) {
      fillOrder = Array.from(members.keys())
        .map(id => ({ id, rank: Math.random() }))
        .sort((a, b) => a.rank - b.rank)
        .map(({ id }) => id)
    }
    context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, onComplete: finish })
      const { travel, stagger, corners, hold } = MOSAIC_ENTRANCE_TIMING
      const lastCorner = (size - 1) * stagger + travel + corners
      timeline.addLabel('corners-complete', seconds(lastCorner))
      timeline.addLabel('hold-complete', seconds(lastCorner + hold))
      for (const [id, member] of Array.from(members)) {
        const { ink, sequence } = member
        const launch = sequence.order * stagger
        const filledAt = lastCorner + hold + fillOrder!.indexOf(id) * stagger
        const rectangle = createRectangleTimeline(
          ink,
          {
            width: sequence.width,
            height: sequence.height,
            pixel: sequence.pixel,
            origin: {
              x: sequence.width / 2 + sequence.x,
              y: sequence.height / 2 + sequence.y,
            },
          },
          seconds(filledAt - launch - travel - corners),
        )
        gsap.set(ink.travel, {
          attr: { transform: `translate(${sequence.x} ${sequence.y})` },
        })
        timeline.fromTo(
          ink.travel,
          { attr: { transform: `translate(${sequence.x} ${sequence.y})` } },
          {
            attr: { transform: 'translate(0 0)' },
            duration: seconds(travel),
            ease: mosaicEase.travel,
            immediateRender: false,
          },
          seconds(launch),
        )
        timeline.add(rectangle, seconds(launch + travel))
        rectangle.paused(false)
      }
      timeline.addLabel('media-ready')
      timeline.play()
    })
  }
  return {
    get timeline() {
      return timeline
    },
    register(id: string, member: Member) {
      members.set(id, member)
      if (settled) member.complete()
      else start()
      return () => {
        members.delete(id)
        // Completed ink can retire independently while other media is loading.
        if (!settled || members.size === 0) stop()
      }
    },
    settle() {
      if (settled) return
      timeline?.progress(1, true).pause()
      finish()
    },
  }
}
export type MosaicEntranceGroup = ReturnType<typeof createMosaicEntranceGroup>
