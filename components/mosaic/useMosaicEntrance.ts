import { useLayoutEffect, useState, useId } from 'react'
import type { MosaicTileEntrance } from './entrance'
import type { MosaicEntranceGroup } from './playMosaicEntrance'
import { useMosaicRectangleRefs } from './MosaicRectangleInk'

export function useMosaicEntrance(
  entrance: MosaicTileEntrance | undefined,
  skipEntrance: boolean,
  group: MosaicEntranceGroup,
) {
  const id = useId()
  const { readInk, bindings } = useMosaicRectangleRefs()
  const [sequence, setSequence] = useState<MosaicTileEntrance | null>(null)
  const [finished, setFinished] = useState(false)
  useLayoutEffect(() => {
    if (entrance && !sequence)
      // Capture once when asynchronous packing finishes; later geometry changes
      // settle this sequence rather than deriving/restarting it on every render.
      // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
      setSequence({ ...entrance })
    else if (
      entrance &&
      sequence &&
      (entrance.width !== sequence.width ||
        entrance.height !== sequence.height ||
        entrance.x !== sequence.x ||
        entrance.y !== sequence.y)
    )
      group.settle()
  }, [entrance, sequence, group])

  useLayoutEffect(() => {
    if (!sequence || skipEntrance) return
    const nodes = readInk()
    if (!nodes) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const stop = group.register(id, {
      ink: nodes,
      sequence,
      complete: () => setFinished(true),
    })
    const settle = () => group.settle()
    const changed = () => {
      if (media.matches) settle()
    }
    if (media.matches) settle()
    media.addEventListener('change', changed)
    window.addEventListener('resize', settle)
    return () => {
      stop()
      media.removeEventListener('change', changed)
      window.removeEventListener('resize', settle)
    }
  }, [sequence, skipEntrance, group, id, readInk])
  const arrived = finished || skipEntrance
  return {
    bindings,
    sequence,
    arrived,
    phase: arrived ? 'arrived' : sequence ? 'flying' : 'waiting',
  }
}
