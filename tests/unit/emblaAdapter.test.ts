import { describe, expect, it } from 'vitest'
import type { EmblaCarouselType } from 'embla-carousel'
import { createEmblaAdapter } from '../../components/portfolio/runtime/emblaAdapter'
import { getNavigationMarkerOffset } from '../../components/portfolio/navigation/navigationTokens'

function createFakeEmbla() {
  let selected = 0
  const listeners = new Map<string, Set<(api: EmblaCarouselType) => void>>()
  const api = {
    selectedScrollSnap: () => selected,
    scrollPrev: () => {
      selected -= 1
    },
    scrollNext: () => {
      selected += 1
    },
    scrollTo: (index: number) => {
      selected = index
    },
    on: (event: string, listener: (embla: EmblaCarouselType) => void) => {
      const eventListeners = listeners.get(event) ?? new Set()
      eventListeners.add(listener)
      listeners.set(event, eventListeners)
      return api
    },
    off: (event: string, listener: (embla: EmblaCarouselType) => void) => {
      listeners.get(event)?.delete(listener)
      return api
    },
  } as unknown as EmblaCarouselType

  return {
    api,
    emit(event: 'select' | 'settle') {
      listeners.get(event)?.forEach(listener => listener(api))
    },
  }
}

describe('Embla portfolio adapter', () => {
  it('delegates indexed and directional navigation', () => {
    const fake = createFakeEmbla()
    const adapter = createEmblaAdapter(fake.api)
    adapter.select(3)
    expect(adapter.selectedIndex()).toBe(3)
    adapter.previous()
    expect(adapter.selectedIndex()).toBe(2)
    adapter.next()
    expect(adapter.selectedIndex()).toBe(3)
  })

  it('maps canonical selection events to the marker index', () => {
    const fake = createFakeEmbla()
    const adapter = createEmblaAdapter(fake.api)
    const selected: number[] = []
    const unsubscribe = adapter.onSelect(index => selected.push(index))
    adapter.select(2)
    fake.emit('select')
    unsubscribe()
    adapter.select(1)
    fake.emit('select')
    expect(selected).toEqual([2])
    expect(getNavigationMarkerOffset(selected[0])).toBe(104)
  })
})
