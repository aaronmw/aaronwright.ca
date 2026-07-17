export const NAVIGATION_TRAVEL_BASE_SECONDS = 0.48
export const NAVIGATION_TRAVEL_SECONDS_PER_SCREEN = 0.08
export const NAVIGATION_TRAVEL_MAX_SECONDS = 0.85
export const NAVIGATION_TRAVEL_EASE = 'power2.inOut'

export type LoopingCarouselEntry<T> = {
  item: T
  key: string
  realIndex: number
  kind: 'canonical' | 'clone-before' | 'clone-after'
}

export function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length
}

export function getNavigationTravelDuration(distanceInScreens: number) {
  return Math.min(
    NAVIGATION_TRAVEL_MAX_SECONDS,
    NAVIGATION_TRAVEL_BASE_SECONDS +
      Math.abs(distanceInScreens) * NAVIGATION_TRAVEL_SECONDS_PER_SCREEN,
  )
}

export function getCanonicalCarouselEntries<T extends { id: string }>(
  items: T[],
) {
  return items.map((item, realIndex) => ({
    item,
    key: `real:${item.id}`,
    realIndex,
    kind: 'canonical' as const,
  }))
}

export function getLoopingCarouselEntries<T extends { id: string }>(
  items: T[],
  cloneSingleton = false,
): LoopingCarouselEntry<T>[] {
  if (items.length === 0) {
    return []
  }

  const entries = getCanonicalCarouselEntries(items)

  if (items.length === 1 && !cloneSingleton) {
    return entries
  }

  const lastIndex = items.length - 1

  return [
    {
      item: items[lastIndex],
      key: `clone-before:${items[lastIndex].id}`,
      realIndex: lastIndex,
      kind: 'clone-before',
    },
    ...entries,
    {
      item: items[0],
      key: `clone-after:${items[0].id}`,
      realIndex: 0,
      kind: 'clone-after',
    },
  ]
}

export function getFractionalCarouselPosition(
  scrollLeft: number,
  firstCanonicalOffset: number,
  viewportWidth: number,
) {
  return (scrollLeft - firstCanonicalOffset) / Math.max(viewportWidth, 1)
}

export function getCarouselPosition(carousel: HTMLDivElement) {
  const firstCanonicalPanel = carousel.querySelector<HTMLElement>(
    '[data-portfolio-carousel-panel="canonical"][data-portfolio-carousel-index="0"]',
  )

  return getFractionalCarouselPosition(
    carousel.scrollLeft,
    firstCanonicalPanel?.offsetLeft ?? 0,
    carousel.clientWidth,
  )
}

export function getCarouselTargetScrollLeft(
  carousel: HTMLDivElement,
  carouselIndex: number,
) {
  const targetPanel = carousel.querySelector<HTMLElement>(
    `[data-portfolio-carousel-panel="canonical"][data-portfolio-carousel-index="${carouselIndex}"]`,
  )

  return targetPanel?.offsetLeft ?? carousel.clientWidth * carouselIndex
}

export function getCanonicalRenderedCarouselIndex(
  realIndex: number,
  itemCount: number,
) {
  return itemCount > 1 ? realIndex + 1 : realIndex
}

export function isCarouselBoundaryJump(
  previousIndex: number,
  nextIndex: number,
  itemCount: number,
) {
  return (
    itemCount > 1 &&
    ((previousIndex === itemCount - 1 && nextIndex === 0) ||
      (previousIndex === 0 && nextIndex === itemCount - 1))
  )
}
