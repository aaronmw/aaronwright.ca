import type { CSSProperties } from 'react'

export const FIVE_BY_FIVE_CELL_COUNT = 25

const GRID_CELLS = Array.from(
  { length: FIVE_BY_FIVE_CELL_COUNT },
  (_, index) => [index % 5, Math.floor(index / 5)] as const,
)

export function createFiveByFiveRevealOrder(random = Math.random) {
  const order = GRID_CELLS.map((_, index) => index)
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[order[index], order[other]] = [order[other], order[index]]
  }
  return order
}

const VARIANT_CELLS = {
  fill: GRID_CELLS,
  outline: [
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
  ],
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
  revealOrder,
  unrevealedClassName = 'bg-current opacity-0',
  className,
  style,
}: {
  variant: FiveByFiveVariant
  cellSize?: string
  visibleCellCount?: number
  revealOrder?: readonly number[]
  unrevealedClassName?: string
  className?: string
  style?: CSSProperties
}) {
  const enabledCells = ENABLED_CELLS[variant]
  const outlineCells = VARIANT_CELLS.outline

  return (
    <span
      data-five-by-five={variant}
      className={`inline-grid shrink-0 ${className ?? ''}`}
      style={{
        gridTemplateColumns: `repeat(5, ${cellSize})`,
        gridTemplateRows: `repeat(5, ${cellSize})`,
        ...style,
      }}
      aria-hidden="true"
    >
      {GRID_CELLS.map(([column, row], index) => {
        const cellKey = `${column}-${row}`
        const drawIndex =
          revealOrder?.indexOf(index) ??
          (variant === 'outline'
            ? outlineCells.findIndex(
                ([outlineColumn, outlineRow]) =>
                  outlineColumn === column && outlineRow === row,
              )
            : variant === 'fill'
              ? index
              : -1)
        const progressivelyRevealed =
          drawIndex >= 0 && visibleCellCount !== undefined
        const visible = !progressivelyRevealed || drawIndex < visibleCellCount

        return (
          <span
            key={cellKey}
            className={
              enabledCells.has(cellKey)
                ? visible
                  ? 'bg-current'
                  : unrevealedClassName
                : 'bg-transparent'
            }
          />
        )
      })}
    </span>
  )
}
