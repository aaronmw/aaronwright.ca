'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { PortfolioLogoMark } from './PortfolioLogoMark'

const NAME_FADE_VIEWPORT_RATIO = 0.2
const NAME_FADE_MINIMUM_DISTANCE = 160

export function PortfolioDesktopIdentity({
  color,
  sourceRef,
}: {
  color: string
  sourceRef: RefObject<HTMLDivElement | null>
}) {
  const nameRef = useRef<HTMLParagraphElement>(null)

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
          className="size-12 transition-colors duration-300 ease-out motion-reduce:transition-none"
          style={{ color, transform: 'translate(-2px, -2px)' }}
        />
      </span>
      <p
        ref={nameRef}
        className="ml-5 whitespace-nowrap text-base font-light text-[var(--portfolio-ink-70)] will-change-[opacity]"
        data-portfolio-desktop-name
      >
        Aaron M. Wright
      </p>
    </div>
  )
}
