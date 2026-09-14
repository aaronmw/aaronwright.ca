import type { ComponentProps } from 'react'
import { FiveByFive } from './FiveByFive'

export function PortfolioList({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul {...props} role="list" className={`portfolio-list ${className ?? ''}`} />
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
