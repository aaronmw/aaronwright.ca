'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { PortfolioLogoMark } from './PortfolioLogoMark'

const NAME_FADE_VIEWPORT_RATIO = 0.2
const NAME_FADE_MINIMUM_DISTANCE = 160

export function PortfolioDesktopIdentity({
  sourceRef,
}: {
  sourceRef: RefObject<HTMLDivElement | null>
}) {
  const nameRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const source = sourceRef.current
    const name = nameRef.current
    if (!source || !name) {
      return
    }

    let frame = 0

    const updateNameOpacity = () => {
      frame = 0
      const fadeDistance = Math.max(
        NAME_FADE_MINIMUM_DISTANCE,
        source.clientHeight * NAME_FADE_VIEWPORT_RATIO,
      )
      const opacity = Math.max(0, 1 - source.scrollTop / fadeDistance)
      name.style.opacity = opacity.toFixed(3)
    }

    const scheduleUpdate = () => {
      if (frame) {
        return
      }

      frame = window.requestAnimationFrame(updateNameOpacity)
    }

    updateNameOpacity()
    source.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      source.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.cancelAnimationFrame(frame)
    }
  }, [sourceRef])

  return (
    <div
      className="portfolio-desktop-identity pointer-events-none fixed z-[45] flex h-11 items-center"
      data-portfolio-desktop-identity
    >
      <span className="grid size-11 shrink-0 place-items-center">
        <PortfolioLogoMark
          className="text-resume-signal"
          style={{ transform: 'translate(-2px, -2px)' }}
        />
      </span>
      <h1
        ref={nameRef}
        className="ml-12 whitespace-nowrap text-base font-bold italic text-[var(--portfolio-ink)] will-change-[opacity]"
        data-portfolio-desktop-name
      >
        Aaron M. Wright
      </h1>
    </div>
  )
}
