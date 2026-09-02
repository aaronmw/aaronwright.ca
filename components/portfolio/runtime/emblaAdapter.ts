import type { EmblaCarouselType } from 'embla-carousel'

export type PortfolioCarouselAdapter = {
  selectedIndex: () => number
  previous: (jump?: boolean) => void
  next: (jump?: boolean) => void
  select: (index: number, jump?: boolean) => void
  onSelect: (listener: (index: number) => void) => () => void
  onSettle: (listener: (index: number) => void) => () => void
}

function subscribe(
  api: EmblaCarouselType,
  event: 'select' | 'settle',
  listener: (index: number) => void,
) {
  const notify = (embla: EmblaCarouselType) => {
    listener(embla.selectedScrollSnap())
  }

  api.on(event, notify)
  return () => api.off(event, notify)
}

export function createEmblaAdapter(
  api: EmblaCarouselType,
): PortfolioCarouselAdapter {
  return {
    selectedIndex: () => api.selectedScrollSnap(),
    previous: jump => api.scrollPrev(jump),
    next: jump => api.scrollNext(jump),
    select: (index, jump) => api.scrollTo(index, jump),
    onSelect: listener => subscribe(api, 'select', listener),
    onSettle: listener => subscribe(api, 'settle', listener),
  }
}
