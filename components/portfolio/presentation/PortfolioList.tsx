import type { ComponentProps } from 'react'
import { FiveByFive } from './FiveByFive'

export type PortfolioListVariant = 'bulleted' | 'divided'

// Divided rows distinguish independent statements without a marker gutter.
export function PortfolioList({ className, variant = 'bulleted', ...props }: ComponentProps<'ul'> & { variant?: PortfolioListVariant }) {
  return (
    <ul {...props} data-variant={variant} role="list" className={`portfolio-list ${className ?? ''}`} />
  )
}

export function PortfolioListItem({ children, ...props }: ComponentProps<'li'>) {
  return (
    <li {...props}>
      <span className="portfolio-list-bullet" aria-hidden="true">
        <FiveByFive variant="dot" />
      </span>
      <div className="min-w-0">{children}</div>
    </li>
  )
}
