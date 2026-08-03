import type { CSSProperties } from 'react'

export function PortfolioLogoMark({
  className,
  style,
  size = 48,
}: {
  className?: string
  style?: CSSProperties
  size?: number
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 7 7"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M1 1h1v1H1zm4 0h1v1H5zM1 2h1v1H1zm2 0h1v1H3zm2 0h1v1H5zM1 3h1v1H1zm4 0h1v1H5zM1 4h1v1H1zm2 0h1v1H3zm2 0h1v1H5zM1 5h5v1H1z"
      />
    </svg>
  )
}
