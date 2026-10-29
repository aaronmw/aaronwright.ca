import { packProjects, type PackingSettings } from './packing'
import type { MosaicRect } from './types'

self.onmessage = (
  event: MessageEvent<{
    key: string
    ratios: number[]
    width: number
    height: number
    gap: number
    settings: PackingSettings
    reserved?: MosaicRect
  }>,
) => {
  const { key, ratios, width, height, gap, settings, reserved } = event.data
  self.postMessage({
    key,
    ...packProjects(ratios, width, height, gap, settings, reserved),
  })
}
