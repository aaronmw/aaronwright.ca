import type { CSSProperties } from 'react'
import styles from './Mosaic.module.css'

export const blendModes = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const satisfies readonly CSSProperties['mixBlendMode'][]

export type MosaicLayerSettings = {
  blendMode: (typeof blendModes)[number]
  colour: string
}

export const DEFAULT_ADJUSTMENT_LAYER: MosaicLayerSettings = {
  blendMode: 'saturation',
  colour: 'rgba(255,255,255,0)',
}

export function MosaicAdjustmentLayer({
  settings = DEFAULT_ADJUSTMENT_LAYER,
}: {
  settings?: MosaicLayerSettings
}) {
  return (
    <span
      className={styles.adjustmentLayer}
      data-mosaic-adjustment-layer
      aria-hidden="true"
      style={{
        mixBlendMode: settings.blendMode,
        backgroundColor: settings.colour,
      }}
    />
  )
}
