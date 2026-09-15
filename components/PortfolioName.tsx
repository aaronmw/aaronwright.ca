import type { ComponentPropsWithoutRef } from 'react'

export function PortfolioName({
  className = '',
  ...props
}: Omit<ComponentPropsWithoutRef<'h1'>, 'children'>) {
  return (
    <h1 {...props} className={`font-bold normal-case ${className}`}>
      Aaron M. Wright
    </h1>
  )
}
