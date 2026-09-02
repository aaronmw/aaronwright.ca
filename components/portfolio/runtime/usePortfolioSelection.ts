import { useState } from 'react'

export type PortfolioRuntimeSelection = {
  projectIndex: number
  slideIndexes: number[]
}

export function usePortfolioSelection(initial: PortfolioRuntimeSelection) {
  const [selection, setSelection] = useState(initial)

  function setProjectIndex(projectIndex: number) {
    setSelection(current =>
      current.projectIndex === projectIndex
        ? current
        : { ...current, projectIndex },
    )
  }

  function setSlideIndexes(
    update: number[] | ((current: number[]) => number[]),
  ) {
    setSelection(current => {
      const slideIndexes =
        typeof update === 'function' ? update(current.slideIndexes) : update

      return slideIndexes === current.slideIndexes
        ? current
        : { ...current, slideIndexes }
    })
  }

  function replaceSelection(next: PortfolioRuntimeSelection) {
    setSelection(next)
  }

  return { replaceSelection, selection, setProjectIndex, setSlideIndexes }
}
