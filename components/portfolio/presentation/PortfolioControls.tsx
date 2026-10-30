import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function CircularIconButton({
  visual,
  buttonRef,
  className,
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  visual?: ReactNode
  buttonRef?: (node: HTMLButtonElement | null) => void
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`group/icon-button flex items-center justify-center rounded-none outline-none ${className ?? ''}`}
      {...buttonProps}
    >
      <span className="relative z-[var(--portfolio-layer-content)] flex h-full w-full items-center justify-center">
        {visual}
      </span>
    </button>
  )
}
