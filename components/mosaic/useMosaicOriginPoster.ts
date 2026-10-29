import { useEffect, useState } from 'react'
import type { MosaicOrigin } from './types'

/** The transition uses the canvas directly; native video posters need a URL. */
export function useMosaicOriginPoster(origin: MosaicOrigin | null) {
  const frame = origin?.frame
  const [snapshot, setSnapshot] = useState<{
    frame: HTMLCanvasElement
    url: string
  } | null>(null)

  useEffect(() => {
    if (!frame) return
    let active = true
    let url: string | undefined
    try {
      frame.toBlob(
        blob => {
          if (!active || !blob) return
          url = URL.createObjectURL(blob)
          setSnapshot({ frame, url })
        },
        'image/webp',
        0.95,
      )
    } catch {
      // A tainted canvas still has the original media poster as its fallback.
    }
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [frame])

  return snapshot && snapshot.frame === frame ? snapshot.url : origin?.poster
}
