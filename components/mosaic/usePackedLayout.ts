import { useEffect, useState, type RefObject } from 'react'
import type { PackingResult, PackingSettings } from './packing'
import type { MosaicEntranceOrigin } from './entrance'
import type { MosaicRect } from './types'

export type PackingStatus = {
  pending: boolean
  coverage?: number
  error?: boolean
}

export function usePackedLayout(
  ref: RefObject<HTMLDivElement | null>,
  ratios: number[],
  settings: PackingSettings | undefined,
  onStatus?: (status: PackingStatus) => void,
) {
  const [result, setResult] = useState<
    | (PackingResult & {
        width: number
        height: number
        inset: number
        origin: MosaicEntranceOrigin
      })
    | null
  >(null)
  const [failed, setFailed] = useState(false)
  const ratiosKey = JSON.stringify(ratios)
  const approach = settings?.approach,
    seed = settings?.seed,
    tolerance = settings?.tolerance ?? 0
  useEffect(() => {
    const element = ref.current
    if (!element || !approach || seed === undefined) return
    const worker = new Worker(new URL('./packing.worker.ts', import.meta.url))
    let latest = '',
      lastSize = ''
    let stopped = false
    const measure = () => {
      if (stopped) return
      const css = getComputedStyle(element)
      const inset = parseFloat(css.paddingLeft) || 0
      const width = element.clientWidth - inset * 2,
        height = element.clientHeight - inset * 2
      const gap = parseFloat(css.columnGap) || 0
      const gridBounds = element.getBoundingClientRect()
      const logoBounds = element.parentElement
        ?.querySelector('[data-mosaic-logo]')
        ?.getBoundingClientRect()
      const reserved = logoBounds
        ? {
            left: logoBounds.left - gridBounds.left - inset,
            top: logoBounds.top - gridBounds.top - inset,
            width: logoBounds.width,
            height: logoBounds.height,
          }
        : undefined
      const key = JSON.stringify([width, height, gap, inset, reserved])
      if (key === lastSize || width <= 0 || height <= 0) return
      latest = lastSize = key
      onStatus?.({ pending: true })
      worker.postMessage({
        key,
        ratios: JSON.parse(ratiosKey),
        width,
        height,
        gap,
        reserved,
        settings: { approach, seed, tolerance },
      })
    }
    worker.onmessage = (
      event: MessageEvent<PackingResult & { key: string }>,
    ) => {
      if (stopped || event.data.key !== latest) return
      if (event.data.boxes.length !== JSON.parse(ratiosKey).length) {
        setFailed(true)
        onStatus?.({ pending: false, error: true })
        return
      }
      const [width, height, , inset, reserved] = JSON.parse(latest) as [
        number,
        number,
        number,
        number,
        MosaicRect | null,
      ]
      const origin = reserved
        ? {
            x: reserved.left + reserved.width / 2,
            y: reserved.top + reserved.height / 2,
            size: reserved.width / 3,
          }
        : { x: width / 2, y: height / 2, size: inset }
      setFailed(false)
      setResult({ ...event.data, width, height, inset, origin })
      onStatus?.({ pending: false, coverage: event.data.coverage })
    }
    worker.onerror = () => {
      stopped = true
      setFailed(true)
      onStatus?.({ pending: false, error: true })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // The dock changes the grid height, but the logo remains viewport-centred.
    if (element.parentElement) observer.observe(element.parentElement)
    measure()
    return () => {
      stopped = true
      observer.disconnect()
      worker.terminate()
    }
  }, [approach, seed, tolerance, ratiosKey, onStatus, ref])
  return { layout: settings ? result : null, failed }
}
