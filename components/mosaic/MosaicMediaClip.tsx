import type { CSSProperties, ReactNode } from 'react'
import type { MosaicMedia } from './types'
import { mediaMask } from './mediaClip'
import treatment from './mediaTreatment.module.css'

/** Clip pixels only; preserve the viewer's layout, controls and hit targets. */
export function MosaicMediaClip({
  clip,
  children,
}: {
  clip: MosaicMedia['clip']
  children: ReactNode
}) {
  return (
    <div
      className={treatment.clip}
      style={{ '--mosaic-media-mask': mediaMask(clip) } as CSSProperties}
    >
      {children}
    </div>
  )
}
