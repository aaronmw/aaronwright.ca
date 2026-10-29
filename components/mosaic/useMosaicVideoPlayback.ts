import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MosaicVideoProps } from './MosaicVideo'
import { registerMosaicReturnFrame } from './sourceVisual'
import {
  createMosaicVideoPlayback,
  type VideoState,
} from './createMosaicVideoPlayback'

export function useMosaicVideoPlayback(props: MosaicVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLCanvasElement>(null)
  const posterRef = useRef<HTMLImageElement>(null)
  const playback = useRef<ReturnType<typeof createMosaicVideoPlayback> | null>(
    null,
  )
  const latest = useRef(props)
  const [state, setState] = useState<VideoState>('loading')
  const { id, src } = props.media

  useLayoutEffect(() => {
    latest.current = props
  }, [props])

  // Only a different media resource replaces the controller. Range, inspector,
  // and pause changes update it without restarting or reloading the video.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let revealed = false
    const controller = createMosaicVideoPlayback(
      video,
      latest.current,
      next => {
        setState(next)
        // Reveal a decoded video frame, or a loaded fallback poster when
        // reduced motion/autoplay/error handling intentionally uses the poster.
        const poster = posterRef.current
        if (
          !revealed &&
          (next === 'playing' ||
            next === 'paused' ||
            (next !== 'loading' && poster?.complete && poster.naturalWidth > 0))
        ) {
          revealed = true
          latest.current.onReady?.()
        }
      },
      frameRef.current,
    )
    playback.current = controller
    const unregisterReturn = registerMosaicReturnFrame(
      video,
      controller.restoreFrame,
    )
    return () => {
      unregisterReturn()
      playback.current = null
      controller.destroy()
    }
  }, [id, src])

  useEffect(() => {
    playback.current?.update(props)
  }, [props])
  useEffect(() => {
    const controller = playback.current
    if (!controller) return
    if (!props.tempo) {
      controller.setTimeScale(1)
      return
    }
    return props.tempo.subscribe(controller.setTimeScale)
  }, [props.tempo, id, src])
  return { videoRef, frameRef, posterRef, state }
}
