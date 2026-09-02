import type { CSSProperties } from 'react'
import { FiveByFive } from './FiveByFive'

export function PortfolioLogoMark({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <FiveByFive
      variant="logo"
      className={className}
      style={style}
    />
  )
}
