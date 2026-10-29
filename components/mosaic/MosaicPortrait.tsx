'use client'

import { useState } from 'react'
import Image from 'next/image'
import { aboutPortrait } from '@/lib/aboutPortrait'
import styles from './MosaicPortrait.module.css'

/** Next Image also reports readiness when a cached portrait loads before hydration. */
export function MosaicPortrait({
  expanded = false,
  onReady,
}: {
  expanded?: boolean
  onReady?: () => void
}) {
  const [hoverReady, setHoverReady] = useState(false)

  return (
    <div
      className={styles.portrait}
      data-mosaic-portrait
    >
      <Image
        data-mosaic-about-portrait={expanded || undefined}
        src={aboutPortrait.src}
        width={aboutPortrait.width}
        height={aboutPortrait.height}
        alt={expanded ? aboutPortrait.alt : ''}
        unoptimized
        loading="eager"
        draggable={false}
        onLoad={onReady}
        onError={onReady}
      />
      <Image
        className={styles.hoverPortrait}
        data-mosaic-portrait-hover
        data-ready={hoverReady || undefined}
        src={aboutPortrait.hoverSrc}
        width={aboutPortrait.width}
        height={aboutPortrait.height}
        alt=""
        aria-hidden="true"
        unoptimized
        loading="eager"
        draggable={false}
        onLoad={() => setHoverReady(true)}
      />
    </div>
  )
}
