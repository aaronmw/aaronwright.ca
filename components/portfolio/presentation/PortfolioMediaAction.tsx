'use client'

import { useState, type MouseEventHandler } from 'react'
import { createMediaClickGuard } from '../domain/mediaClick'

export type PortfolioMediaActionProps = {
  label: string
  onClick: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  zoomed?: boolean
}

export function PortfolioMediaAction({
  label,
  onClick,
  disabled,
  zoomed = false,
}: PortfolioMediaActionProps) {
  const [clickGuard] = useState(createMediaClickGuard)

  return (
    <button
      type="button"
      data-portfolio-media-action
      aria-label={label}
      disabled={disabled}
      className={`pointer-events-auto absolute inset-0 z-[var(--portfolio-layer-content)] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
      onPointerDownCapture={clickGuard.down}
      onPointerMoveCapture={clickGuard.move}
      onPointerUpCapture={clickGuard.up}
      onPointerLeave={clickGuard.leave}
      onPointerCancelCapture={clickGuard.cancel}
      onClick={event => {
        if (event.defaultPrevented || !clickGuard.consume(event.detail)) {
          event.preventDefault()
          return
        }
        event.stopPropagation()
        onClick(event)
      }}
    />
  )
}
