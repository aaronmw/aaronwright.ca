import { useCallback, useState } from 'react'

export type PortfolioRuntimeSelection = {
  projectIndex: number
  slideIndexes: number[]
}

export function usePortfolioSelection(initial: PortfolioRuntimeSelection) {
  const [selection, setSelection] = useState(initial)

  const setProjectIndex = useCallback((projectIndex: number) => {
    setSelection(current =>
      current.projectIndex === projectIndex
        ? current
        : { ...current, projectIndex },
    )
  }, [])

  const setSlideIndexes = useCallback(
    (update: number[] | ((current: number[]) => number[])) => {
      setSelection(current => {
        const slideIndexes =
          typeof update === 'function' ? update(current.slideIndexes) : update

        return slideIndexes === current.slideIndexes
          ? current
          : { ...current, slideIndexes }
      })
    },
    [],
  )

  const replaceSelection = useCallback((next: PortfolioRuntimeSelection) => {
    setSelection(next)
  }, [])

  return { replaceSelection, selection, setProjectIndex, setSlideIndexes }
}
