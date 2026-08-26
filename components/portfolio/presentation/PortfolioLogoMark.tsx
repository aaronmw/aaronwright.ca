import type { CSSProperties } from 'react'

const LOGO_CELLS = [
  [0, 0],
  [4, 0],
  [0, 1],
  [2, 1],
  [4, 1],
  [0, 2],
  [4, 2],
  [0, 3],
  [2, 3],
  [4, 3],
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
] as const

export function PortfolioLogoMark({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={`inline-grid shrink-0 ${className ?? ''}`}
      style={{
        gridTemplateColumns: 'repeat(5, var(--logo-stroke-width))',
        gridTemplateRows: 'repeat(5, var(--logo-stroke-width))',
        ...style,
      }}
      aria-hidden="true"
    >
      {LOGO_CELLS.map(([column, row]) => (
        <span
          key={`${column}-${row}`}
          className="bg-current"
          style={{
            gridColumnStart: column + 1,
            gridRowStart: row + 1,
          }}
        />
      ))}
    </span>
  )
}
