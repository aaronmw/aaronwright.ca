import type { CSSProperties } from 'react'

const VARIANT_CELLS = {
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
  left: [
    [3, 1],
    [2, 2],
    [3, 2],
    [3, 3],
  ],
  right: [
    [1, 1],
    [1, 2],
    [2, 2],
    [1, 3],
  ],
  up: [
    [2, 2],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
  down: [
    [1, 1],
    [2, 1],
    [3, 1],
    [2, 2],
  ],
  close: [
    [1, 2],
    [2, 2],
    [3, 2],
  ],
  system: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [0, 1],
    [4, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [1, 3],
    [2, 3],
    [3, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  light: [
    [0, 0],
    [2, 0],
    [4, 0],
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 2],
    [1, 2],
    [3, 2],
    [4, 2],
    [1, 3],
    [2, 3],
    [3, 3],
    [0, 4],
    [2, 4],
    [4, 4],
  ],
  dark: [
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
    [2, 2],
    [3, 2],
    [2, 3],
    [3, 3],
    [1, 4],
    [2, 4],
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
  revealed,
  drawDurationMs = 1000,
  className,
  style,
}: {
  variant: FiveByFiveVariant
  cellSize?: string
  revealed?: boolean
  drawDurationMs?: number
  className?: string
  style?: CSSProperties
}) {
  const enabledCells = ENABLED_CELLS[variant]
  const outlineCells = VARIANT_CELLS.outline
  const drawStepDurationMs = Math.max(0, drawDurationMs) / outlineCells.length

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
      {GRID_CELLS.map(([column, row]) => {
        const cellKey = `${column}-${row}`
        const drawIndex =
          variant === 'outline'
            ? outlineCells.findIndex(
                ([outlineColumn, outlineRow]) =>
                  outlineColumn === column && outlineRow === row,
              )
            : -1
        const animated = drawIndex >= 0 && revealed !== undefined

        return (
          <span
            key={cellKey}
            className={
              enabledCells.has(cellKey)
                ? animated
                  ? 'bg-current transition-opacity motion-reduce:transition-none'
                  : 'bg-current'
                : 'bg-transparent'
            }
            style={
              animated
                ? {
                    opacity: revealed ? 1 : 0,
                    transitionDelay: `${
                      drawStepDurationMs *
                      (revealed
                        ? drawIndex
                        : outlineCells.length - drawIndex - 1)
                    }ms`,
                    transitionDuration: `${drawStepDurationMs}ms`,
                    transitionTimingFunction: 'linear',
                  }
                : undefined
            }
          />
        )
      })}
    </span>
  )
}
