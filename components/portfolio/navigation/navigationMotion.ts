import { gsap } from 'gsap'
import {
  clamp,
  getColorForPosition,
  getCoordinateForPosition,
  getNavigationScale,
  getPositionForCoordinate,
} from './navigationGeometry'
import {
  NavigationRingElasticityModel,
  type NavigationRingDeformation,
  type NavigationRingPhysics,
} from './navigationElasticity'
import {
  NAVIGATION_BREAKAWAY_DISTANCE,
  NAVIGATION_RETURN_DELAY,
  NAVIGATION_RING_STROKE,
  NAVIGATION_SNAP_DISTANCE,
} from './navigationTokens'

export {
  getColorForPosition,
  getCoordinateForPosition,
  getNavigationRingRadius,
  getNavigationScale,
  getPositionForCoordinate,
} from './navigationGeometry'
export {
  DEFAULT_NAVIGATION_RING_PHYSICS,
  type NavigationRingPhysics,
} from './navigationElasticity'
export {
  NAVIGATION_ACTIVE_SCALE,
  NAVIGATION_BREAKAWAY_DISTANCE,
  NAVIGATION_DOT_DIAMETER,
  NAVIGATION_DOT_RADIUS,
  NAVIGATION_RETURN_DELAY,
  NAVIGATION_RING_DIAMETER,
  NAVIGATION_RING_RADIUS,
  NAVIGATION_RING_STROKE,
  NAVIGATION_SLIDE_STEP,
  NAVIGATION_SNAP_DISTANCE,
} from './navigationTokens'

export type NavigationMode =
  | 'source-linked'
  | 'pointer-follow'
  | 'snap'
  | 'pinned'

export type NavigationRenderState = {
  activeIndex: number
  color: string
  coordinate: number
  mode: NavigationMode
  position: number
  pressedIndex: number | null
  pressScale: number
  ringAxisOffset: number
  ringAxisScale: number
  ringCrossAxisScale: number
  ringScale: number
  snappedIndex: number | null
  strokeWidth: number
}

export type NavigationGeometry = {
  centers: number[]
  colors: string[]
}

function navigationGeometryMatches(
  current: NavigationGeometry,
  next: NavigationGeometry,
) {
  return (
    current.centers.length === next.centers.length &&
    current.colors.length === next.colors.length &&
    current.centers.every((center, index) => center === next.centers[index]) &&
    current.colors.every((color, index) => color === next.colors[index])
  )
}

export type TrackedNavigationOptions = {
  geometry: NavigationGeometry
  activeIndex: number
  sourcePosition?: number
  reducedMotion?: boolean
  snapDistance?: number
  breakawayDistance?: number
  returnDelay?: number
  ringPhysics?: Partial<NavigationRingPhysics>
  onRender: (state: NavigationRenderState) => void
}

type MoveOptions = {
  duration?: number
  ease?: string
  immediate?: boolean
  onComplete?: () => void
}

export class TrackedNavigationController {
  private geometry: NavigationGeometry
  private readonly onRender: (state: NavigationRenderState) => void
  private readonly snapDistance: number
  private readonly breakawayDistance: number
  private readonly returnDelay: number
  private readonly ringElasticity: NavigationRingElasticityModel
  private reducedMotion: boolean
  private sourcePosition: number
  private activeIndex: number
  private pointerCoordinate: number | null = null
  private pointerArmed = false
  private pointerAcquiring = false
  private snappingEnabled = true
  private focusedIndex: number | null = null
  private previewIndex: number | null = null
  private pinnedIndex: number | null = null
  private snappedIndex: number | null = null
  private mode: NavigationMode = 'source-linked'
  private pressedIndex: number | null = null
  private pressScale = 1
  private returnTimeout: ReturnType<typeof setTimeout> | null = null
  private moveTween: gsap.core.Tween | null = null
  private pressTimeline: gsap.core.Timeline | null = null
  private pressReleaseQueued = false
  private ringDeformation: NavigationRingDeformation = {
    axisOffset: 0,
    axisScale: 1,
    crossAxisScale: 1,
    strain: 0,
  }
  private elasticityTickerActive = false
  private readonly motion: { coordinate: number }
  private readonly elasticityTick = (_time: number, deltaTime: number) => {
    this.ringDeformation = this.ringElasticity.step(deltaTime / 1000)
    this.render(false)

    if (this.ringElasticity.isSettled()) {
      this.stopElasticityTicker()
    }
  }

  constructor(options: TrackedNavigationOptions) {
    this.geometry = options.geometry
    this.onRender = options.onRender
    this.snapDistance = options.snapDistance ?? NAVIGATION_SNAP_DISTANCE
    this.breakawayDistance =
      options.breakawayDistance ?? NAVIGATION_BREAKAWAY_DISTANCE
    this.returnDelay = options.returnDelay ?? NAVIGATION_RETURN_DELAY
    this.ringElasticity = new NavigationRingElasticityModel(options.ringPhysics)
    this.reducedMotion = options.reducedMotion ?? false
    this.activeIndex = options.activeIndex
    this.sourcePosition = options.sourcePosition ?? options.activeIndex
    this.motion = {
      coordinate: getCoordinateForPosition(
        this.geometry.centers,
        this.sourcePosition,
      ),
    }
    this.ringElasticity.reset(this.sourcePosition, this.getTimeSeconds())
    this.render(false)
  }

  updateGeometry(
    geometry: NavigationGeometry,
    immediate = true,
    duration = 0.5,
  ) {
    if (navigationGeometryMatches(this.geometry, geometry)) {
      return
    }

    this.geometry = geometry
    const position = this.getLogicalPosition()
    this.moveToPosition(position, {
      immediate,
      duration: immediate ? 0 : duration,
      ease: 'expo.out',
    })
  }

  setReducedMotion(reducedMotion: boolean) {
    if (this.reducedMotion === reducedMotion) {
      return
    }

    this.reducedMotion = reducedMotion
    this.stopElasticityTicker()
    this.ringElasticity.reset(this.getRenderedPosition(), this.getTimeSeconds())
    this.ringDeformation = this.ringElasticity.getDeformation()
    this.render(false)
  }

  setActiveIndex(activeIndex: number) {
    this.activeIndex = activeIndex
    this.render()
  }

  setSourcePosition(position: number, immediate = true) {
    this.sourcePosition = clamp(
      position,
      0,
      Math.max(0, this.geometry.centers.length - 1),
    )

    if (this.mode === 'source-linked') {
      this.moveToPosition(this.sourcePosition, { immediate })
      return true
    }

    return false
  }

  setSnappingEnabled(enabled: boolean) {
    this.snappingEnabled = enabled

    if (!enabled) {
      this.snappedIndex = null
    }
  }

  engagePointer(coordinate: number) {
    this.clearReturnTimeout()
    this.pointerArmed = true
    this.pointerAcquiring = true
    this.pointerCoordinate = coordinate
    this.trackPointer(coordinate, true)
  }

  trackPointer(coordinate: number, acquire = false) {
    this.pointerCoordinate = coordinate

    if (!this.pointerArmed || this.pinnedIndex !== null) {
      return
    }

    const centers = this.geometry.centers

    if (centers.length === 0) {
      return
    }

    const nearestIndex = centers.reduce(
      (closestIndex, center, index) =>
        Math.abs(center - coordinate) <
        Math.abs(centers[closestIndex] - coordinate)
          ? index
          : closestIndex,
      0,
    )
    const nextSnapIndex =
      this.snappingEnabled &&
      Math.abs(centers[nearestIndex] - coordinate) <= this.snapDistance
        ? nearestIndex
        : null
    const snapChanged = nextSnapIndex !== this.snappedIndex
    const targetCoordinate =
      nextSnapIndex === null ? coordinate : centers[nextSnapIndex]
    const minimum = centers[0] - this.breakawayDistance
    const maximum = centers[centers.length - 1] + this.breakawayDistance

    if (
      (coordinate < minimum && targetCoordinate < minimum) ||
      (coordinate > maximum && targetCoordinate > maximum)
    ) {
      this.snappedIndex = null

      if (this.mode !== 'source-linked') {
        this.mode = 'source-linked'
        this.moveToPosition(this.sourcePosition, {
          duration: 0.3,
          ease: 'power3.out',
        })
      }

      return
    }

    this.snappedIndex = nextSnapIndex
    this.mode = nextSnapIndex === null ? 'pointer-follow' : 'snap'
    const acquiring = acquire || this.pointerAcquiring
    this.moveToCoordinate(targetCoordinate, {
      duration: acquire ? 0.3 : acquiring || snapChanged ? 0.2 : 0,
      ease: 'power3.out',
      immediate: !acquiring && !snapChanged,
      onComplete: acquiring
        ? () => {
            this.pointerAcquiring = false
          }
        : undefined,
    })
  }

  releasePointer(delayed = true) {
    this.clearReturnTimeout()
    this.pointerArmed = false
    this.pointerAcquiring = false
    this.pointerCoordinate = null
    this.snappedIndex = null

    if (this.pinnedIndex !== null || this.focusedIndex !== null) {
      return
    }

    const release = () => {
      this.returnTimeout = null
      this.previewIndex = null
      this.mode = 'source-linked'
      this.moveToPosition(this.sourcePosition, {
        duration: 0.3,
        ease: 'power3.out',
      })
    }

    if (!delayed) {
      release()
      return
    }

    this.returnTimeout = setTimeout(release, this.returnDelay)
  }

  preview(index: number) {
    if (this.pinnedIndex !== null || this.pointerArmed) {
      return
    }

    this.clearReturnTimeout()
    this.previewIndex = index
    this.mode = 'snap'
    this.snappedIndex = index
    this.moveToPosition(index, { duration: 0.3, ease: 'power3.out' })
  }

  clearPreview(index: number, delayed = true) {
    if (this.previewIndex !== index) {
      return
    }

    if (this.pointerArmed || this.pinnedIndex !== null) {
      this.previewIndex = null
      this.snappedIndex = null
      return
    }

    this.releasePointer(delayed)
  }

  focus(index: number) {
    this.focusedIndex = index

    if (!this.pointerArmed && this.pinnedIndex === null) {
      this.preview(index)
    }
  }

  blur(index: number) {
    if (this.focusedIndex !== index) {
      return
    }

    this.focusedIndex = null

    if (!this.pointerArmed) {
      this.clearPreview(index, true)
    }
  }

  pin(index: number, sourceLinked = false) {
    this.clearReturnTimeout()
    this.moveTween?.kill()
    this.moveTween = null
    this.pointerAcquiring = false
    this.pinnedIndex = index
    this.previewIndex = null
    this.snappedIndex = sourceLinked ? null : index
    this.activeIndex = index
    this.mode = sourceLinked ? 'source-linked' : 'pinned'

    if (sourceLinked) {
      this.moveToPosition(this.sourcePosition, { immediate: true })
    } else {
      this.moveToPosition(index, { duration: 0.2, ease: 'power3.out' })
    }
  }

  completePin(index: number) {
    if (this.pinnedIndex !== index) {
      return
    }

    this.pinnedIndex = null
    this.sourcePosition = index

    if (this.pointerArmed && this.pointerCoordinate !== null) {
      this.trackPointer(this.pointerCoordinate, true)
      return
    }

    if (this.focusedIndex !== null) {
      this.preview(this.focusedIndex)
      return
    }

    this.mode = 'source-linked'
    this.snappedIndex = null
    this.moveToPosition(this.sourcePosition, { immediate: true })
  }

  cancelPin() {
    this.pinnedIndex = null
    this.snappedIndex = null
    this.mode = 'source-linked'
    this.moveToPosition(this.sourcePosition, { duration: 0.3 })
  }

  press(index: number) {
    this.pressTimeline?.kill()
    this.pressedIndex = index
    this.pressReleaseQueued = false
    this.pressTimeline = gsap.timeline({
      onUpdate: () => this.render(),
      onComplete: () => {
        if (this.pressReleaseQueued) {
          this.release(index)
        }
      },
    })
    this.pressTimeline.to(this, {
      pressScale: 0.95,
      duration: this.reducedMotion ? 0 : 0.09,
      ease: 'power1.in',
    })
  }

  release(index: number) {
    if (this.pressedIndex !== index) {
      return
    }

    if (this.pressTimeline?.isActive()) {
      this.pressReleaseQueued = true
      return
    }

    this.pressTimeline?.kill()
    this.pressTimeline = gsap.timeline({
      onUpdate: () => this.render(),
      onComplete: () => {
        this.pressedIndex = null
        this.pressScale = 1
        this.pressReleaseQueued = false
        this.render()
      },
    })
    this.pressTimeline
      .to(this, {
        pressScale: 1.1,
        duration: this.reducedMotion ? 0 : 0.15,
        ease: 'power3.out',
      })
      .to(this, {
        pressScale: 0.98,
        duration: this.reducedMotion ? 0 : 0.09,
        ease: 'power2.inOut',
      })
      .to(this, {
        pressScale: 1,
        duration: this.reducedMotion ? 0 : 0.12,
        ease: 'power2.out',
      })
  }

  triggerPress(index: number) {
    this.press(index)
    this.pressReleaseQueued = true
  }

  getPinnedIndex() {
    return this.pinnedIndex
  }

  getPointerCoordinate() {
    return this.pointerCoordinate
  }

  isPointerArmed() {
    return this.pointerArmed
  }

  destroy() {
    this.clearReturnTimeout()
    this.stopElasticityTicker()
    this.moveTween?.kill()
    this.pressTimeline?.kill()
  }

  private getLogicalPosition() {
    if (this.mode === 'source-linked') {
      return this.sourcePosition
    }

    if (this.pinnedIndex !== null && this.mode === 'pinned') {
      return this.pinnedIndex
    }

    if (this.previewIndex !== null) {
      return this.previewIndex
    }

    if (this.pointerArmed && this.pointerCoordinate !== null) {
      return getPositionForCoordinate(
        this.geometry.centers,
        this.pointerCoordinate,
      )
    }

    return this.sourcePosition
  }

  private moveToPosition(position: number, options: MoveOptions = {}) {
    this.moveToCoordinate(
      getCoordinateForPosition(this.geometry.centers, position),
      options,
    )
  }

  private moveToCoordinate(coordinate: number, options: MoveOptions = {}) {
    const immediate =
      options.immediate || this.reducedMotion || !options.duration

    this.moveTween?.kill()

    if (immediate) {
      this.motion.coordinate = coordinate
      this.render()
      options.onComplete?.()
      return
    }

    const tween = gsap.to(this.motion, {
      coordinate,
      duration: options.duration,
      ease: options.ease ?? 'power3.out',
      overwrite: 'auto',
      onUpdate: () => this.render(),
      onComplete: () => {
        if (this.moveTween === tween) {
          this.moveTween = null
        }
        options.onComplete?.()
      },
    })
    this.moveTween = tween
  }

  private render(sampleMotion = true) {
    const position = this.getRenderedPosition()

    if (this.reducedMotion) {
      this.ringDeformation = {
        axisOffset: 0,
        axisScale: 1,
        crossAxisScale: 1,
        strain: 0,
      }
    } else if (sampleMotion) {
      this.ringElasticity.sample(position, this.getTimeSeconds())
      this.ringDeformation = this.ringElasticity.getDeformation()

      if (!this.ringElasticity.isSettled()) {
        this.startElasticityTicker()
      }
    }

    this.onRender({
      activeIndex: this.activeIndex,
      color: getColorForPosition(this.geometry.colors, position),
      coordinate: this.motion.coordinate,
      mode: this.mode,
      position,
      pressedIndex: this.pressedIndex,
      pressScale: this.pressScale,
      ringAxisOffset: this.ringDeformation.axisOffset,
      ringAxisScale: this.ringDeformation.axisScale,
      ringCrossAxisScale: this.ringDeformation.crossAxisScale,
      ringScale: getNavigationScale(position, this.activeIndex),
      snappedIndex: this.snappedIndex,
      strokeWidth: NAVIGATION_RING_STROKE,
    })
  }

  private getRenderedPosition() {
    return getPositionForCoordinate(
      this.geometry.centers,
      this.motion.coordinate,
    )
  }

  private getTimeSeconds() {
    return performance.now() / 1000
  }

  private startElasticityTicker() {
    if (this.elasticityTickerActive || this.reducedMotion) {
      return
    }

    this.elasticityTickerActive = true
    gsap.ticker.add(this.elasticityTick)
  }

  private stopElasticityTicker() {
    if (!this.elasticityTickerActive) {
      return
    }

    gsap.ticker.remove(this.elasticityTick)
    this.elasticityTickerActive = false
  }

  private clearReturnTimeout() {
    if (this.returnTimeout) {
      clearTimeout(this.returnTimeout)
      this.returnTimeout = null
    }
  }
}
