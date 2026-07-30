import { clamp } from './navigationGeometry'

export type NavigationRingPhysics = {
  elasticity: number
  originShift: number
  accelerationSensitivity: number
  velocitySensitivity: number
  velocitySmoothing: number
  stiffness: number
  damping: number
}

export type NavigationRingDeformation = {
  axisOffset: number
  axisScale: number
  crossAxisScale: number
  strain: number
}

export const DEFAULT_NAVIGATION_RING_PHYSICS: Readonly<NavigationRingPhysics> =
  Object.freeze({
    elasticity: 0.08,
    originShift: 0.6,
    accelerationSensitivity: 0.025,
    velocitySensitivity: 0.12,
    velocitySmoothing: 18,
    stiffness: 220,
    damping: 14,
  })

const MAX_FRAME_GAP_SECONDS = 0.1
const MAX_INTEGRATION_STEP_SECONDS = 1 / 120
const POSITION_EPSILON = 0.00001
const STRAIN_EPSILON = 0.0001
const VELOCITY_EPSILON = 0.001

export class NavigationRingElasticityModel {
  readonly config: NavigationRingPhysics

  private position: number | null = null
  private sampleTime: number | null = null
  private velocity = 0
  private direction = 0
  private strain = 0
  private strainVelocity = 0
  private targetStrain = 0

  constructor(config: Partial<NavigationRingPhysics> = {}) {
    this.config = {
      ...DEFAULT_NAVIGATION_RING_PHYSICS,
      ...config,
    }
  }

  sample(position: number, timeSeconds: number) {
    if (this.position === null || this.sampleTime === null) {
      this.position = position
      this.sampleTime = timeSeconds
      return 0
    }

    if (Math.abs(position - this.position) <= POSITION_EPSILON) {
      return this.targetStrain
    }

    const deltaTime = timeSeconds - this.sampleTime

    if (deltaTime <= 0 || deltaTime > MAX_FRAME_GAP_SECONDS) {
      this.reset(position, timeSeconds)
      return 0
    }

    const rawVelocity = (position - this.position) / deltaTime
    const smoothing = 1 - Math.exp(-this.config.velocitySmoothing * deltaTime)
    const previousVelocity = this.velocity
    const nextVelocity =
      previousVelocity + (rawVelocity - previousVelocity) * smoothing
    const acceleration = (nextVelocity - previousVelocity) / deltaTime
    const directionSource =
      Math.abs(previousVelocity) > VELOCITY_EPSILON
        ? previousVelocity
        : nextVelocity
    const longitudinalAcceleration =
      acceleration * Math.sign(directionSource || 1)
    const velocityInfluence = clamp(
      Math.abs(nextVelocity) * this.config.velocitySensitivity,
      0,
      1,
    )

    this.velocity = nextVelocity
    this.direction = Math.sign(directionSource)
    this.position = position
    this.sampleTime = timeSeconds
    const accelerationStrain = clamp(
      longitudinalAcceleration * this.config.accelerationSensitivity,
      -this.config.elasticity,
      this.config.elasticity,
    )
    this.targetStrain = accelerationStrain * velocityInfluence

    return this.targetStrain
  }

  step(deltaTime: number) {
    if (deltaTime <= 0) {
      return this.getDeformation()
    }

    if (deltaTime > MAX_FRAME_GAP_SECONDS) {
      this.reset(this.position ?? 0)
      return this.getDeformation()
    }

    const stepCount = Math.max(
      1,
      Math.ceil(deltaTime / MAX_INTEGRATION_STEP_SECONDS),
    )
    const stepTime = deltaTime / stepCount

    for (let index = 0; index < stepCount; index += 1) {
      const acceleration =
        this.config.stiffness * (this.targetStrain - this.strain) -
        this.config.damping * this.strainVelocity

      this.strainVelocity += acceleration * stepTime
      this.strain += this.strainVelocity * stepTime
      this.strain = clamp(
        this.strain,
        -this.config.elasticity,
        this.config.elasticity,
      )
      this.targetStrain *= Math.exp(-this.config.velocitySmoothing * stepTime)
    }

    if (this.isSettled()) {
      this.strain = 0
      this.strainVelocity = 0
      this.targetStrain = 0
    }

    return this.getDeformation()
  }

  reset(position = 0, timeSeconds: number | null = null) {
    this.position = position
    this.sampleTime = timeSeconds
    this.velocity = 0
    this.direction = 0
    this.strain = 0
    this.strainVelocity = 0
    this.targetStrain = 0
  }

  isSettled() {
    return (
      Math.abs(this.strain) <= STRAIN_EPSILON &&
      Math.abs(this.strainVelocity) <= VELOCITY_EPSILON &&
      Math.abs(this.targetStrain) <= STRAIN_EPSILON
    )
  }

  getDeformation(): NavigationRingDeformation {
    const axisScale = 1 + this.strain

    return {
      axisOffset:
        this.strain === 0
          ? 0
          : -this.strain * this.direction * this.config.originShift,
      axisScale,
      crossAxisScale: 1 / axisScale,
      strain: this.strain,
    }
  }
}
