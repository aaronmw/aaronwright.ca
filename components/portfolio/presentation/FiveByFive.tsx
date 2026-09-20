import type { CSSProperties } from 'react'

const OUTLINE_CELLS = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 4],
  [0, 3],
  [0, 2],
  [0, 1],
] as const

const VARIANT_CELLS = {
  outline: OUTLINE_CELLS,
  snake: OUTLINE_CELLS,
  logo: [
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
  ],
  center: [
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
  dot: [[2, 2]],
} as const

const GRID_CELLS = Array.from(
  { length: 25 },
  (_, index) => [index % 5, Math.floor(index / 5)] as const,
)

const ENABLED_CELLS = Object.fromEntries(
  Object.entries(VARIANT_CELLS).map(([variant, cells]) => [
    variant,
    new Set(cells.map(([column, row]) => `${column}-${row}`)),
  ]),
) as Record<keyof typeof VARIANT_CELLS, Set<string>>

export type FiveByFiveVariant = keyof typeof VARIANT_CELLS

export function FiveByFive({
  variant,
  cellSize = 'var(--logo-stroke-width)',
  visibleCellCount,
  className,
  style,
}: {
  variant: FiveByFiveVariant
  cellSize?: string
  visibleCellCount?: number
  className?: string
  style?: CSSProperties
}) {
  const enabledCells = ENABLED_CELLS[variant]
  const outlineCells = VARIANT_CELLS.outline

  return (
    <span
      data-five-by-five={variant}
      className={`inline-grid shrink-0 ${variant === 'snake' ? '[--portfolio-snake-duration:1200ms]' : ''} ${className ?? ''}`}
      style={{
        gridTemplateColumns: `repeat(5, ${cellSize})`,
        gridTemplateRows: `repeat(5, ${cellSize})`,
        ...style,
      }}
      aria-hidden="true"
    >
      {GRID_CELLS.map(([column, row]) => {
        const cellKey = `${column}-${row}`
        const drawIndex =
          variant === 'outline' || variant === 'snake'
            ? outlineCells.findIndex(
                ([outlineColumn, outlineRow]) =>
                  outlineColumn === column && outlineRow === row,
              )
            : -1
        const progressivelyRevealed =
          variant === 'outline' &&
          drawIndex >= 0 &&
          visibleCellCount !== undefined
        const visible = !progressivelyRevealed || drawIndex < visibleCellCount
        const snakeCell = variant === 'snake' && drawIndex >= 0
        // Six contiguous perimeter cells remain lit without animation as well.
        const snakeInitiallyLit =
          drawIndex === 0 || drawIndex >= outlineCells.length - 5

        return (
          <span
            key={cellKey}
            className={
              snakeCell
                ? `bg-current motion-safe:animate-portfolio-snake ${snakeInitiallyLit ? 'opacity-100' : 'opacity-0'}`
                : enabledCells.has(cellKey)
                  ? visible
                    ? 'bg-current'
                    : 'bg-current opacity-0'
                  : 'bg-transparent'
            }
            style={
              snakeCell
                ? {
                    animationDelay: `calc(var(--portfolio-snake-duration) * ${drawIndex / outlineCells.length - 1})`,
                  }
                : undefined
            }
          />
        )
      })}
    </span>
  )
}
