import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NAVIGATION_RING_PHYSICS,
  NavigationRingElasticityModel,
} from '../../components/portfolio/navigation/navigationElasticity'

const responsivePhysics = {
  elasticity: 0.2,
  accelerationSensitivity: 1,
  velocitySensitivity: 1,
  velocitySmoothing: 1000,
  stiffness: 600,
  damping: 20,
}

describe('NavigationRingElasticityModel', () => {
  it('stretches under acceleration and squashes under braking', () => {
    const model = new NavigationRingElasticityModel(responsivePhysics)

    model.reset(0, 0)
    expect(model.sample(1, 0.1)).toBeCloseTo(0.2)
    expect(model.step(1 / 60).axisScale).toBeGreaterThan(1)

    expect(model.sample(1.5, 0.2)).toBeCloseTo(-0.2)

    let deformation = model.getDeformation()
    for (let index = 0; index < 12; index += 1) {
      deformation = model.step(1 / 120)
    }

    expect(deformation.axisScale).toBeLessThan(1)
    expect(deformation.crossAxisScale).toBeGreaterThan(1)
  })

  it('clamps acceleration to the configured elasticity', () => {
    const model = new NavigationRingElasticityModel({
      ...responsivePhysics,
      elasticity: 0.05,
    })

    model.reset(0, 0)

    expect(model.sample(100, 0.01)).toBe(0.05)
  })

  it('scales deformation with travel velocity', () => {
    const config = {
      ...responsivePhysics,
      velocitySensitivity: 0.1,
    }
    const shortTravel = new NavigationRingElasticityModel(config)
    const longTravel = new NavigationRingElasticityModel(config)

    shortTravel.reset(0, 0)
    longTravel.reset(0, 0)

    const shortStrain = shortTravel.sample(0.1, 0.1)
    const longStrain = longTravel.sample(1, 0.1)

    expect(shortStrain).toBeGreaterThan(0)
    expect(longStrain).toBeGreaterThan(shortStrain)
    expect(longStrain).toBeCloseTo(config.elasticity)
  })

  it('approximately preserves area while deforming', () => {
    const model = new NavigationRingElasticityModel(responsivePhysics)

    model.reset(0, 0)
    model.sample(1, 0.1)
    const deformation = model.step(1 / 60)

    expect(deformation.axisScale * deformation.crossAxisScale).toBeCloseTo(1, 8)
  })

  it('trails acceleration and carries forward while braking', () => {
    const model = new NavigationRingElasticityModel(responsivePhysics)

    model.reset(0, 0)
    model.sample(1, 0.1)
    expect(model.step(1 / 60).axisOffset).toBeLessThan(0)

    model.sample(1.5, 0.2)

    let deformation = model.getDeformation()
    for (let index = 0; index < 12; index += 1) {
      deformation = model.step(1 / 120)
    }

    expect(deformation.axisOffset).toBeGreaterThan(0)
  })

  it('mirrors the inertial offset with travel direction', () => {
    const forward = new NavigationRingElasticityModel(responsivePhysics)
    const backward = new NavigationRingElasticityModel(responsivePhysics)

    forward.reset(0, 0)
    backward.reset(0, 0)
    forward.sample(1, 0.1)
    backward.sample(-1, 0.1)

    const forwardOffset = forward.step(1 / 60).axisOffset
    const backwardOffset = backward.step(1 / 60).axisOffset

    expect(forwardOffset).toBeLessThan(0)
    expect(backwardOffset).toBeGreaterThan(0)
    expect(backwardOffset).toBeCloseTo(-forwardOffset, 8)
  })

  it('settles back to a circle', () => {
    const model = new NavigationRingElasticityModel(responsivePhysics)

    model.reset(0, 0)
    model.sample(1, 0.1)

    for (let index = 0; index < 600; index += 1) {
      model.step(1 / 120)
    }

    expect(model.isSettled()).toBe(true)
    expect(model.getDeformation()).toEqual({
      axisOffset: 0,
      axisScale: 1,
      crossAxisScale: 1,
      strain: 0,
    })
  })

  it('bounces through neutral while coming to rest', () => {
    const model = new NavigationRingElasticityModel({
      ...responsivePhysics,
      damping: DEFAULT_NAVIGATION_RING_PHYSICS.damping,
    })

    model.reset(0, 0)
    model.sample(1, 0.1)

    let sawStretch = false
    let crossedNeutral = false

    for (let index = 0; index < 240; index += 1) {
      const { strain } = model.step(1 / 120)

      if (strain > 0.001) {
        sawStretch = true
      } else if (sawStretch && strain < -0.0001) {
        crossedNeutral = true
        break
      }
    }

    expect(crossedNeutral).toBe(true)
  })

  it('squashes before stretching when direction reverses', () => {
    const model = new NavigationRingElasticityModel(responsivePhysics)

    model.reset(0, 0)
    model.sample(1, 0.1)

    expect(model.sample(0, 0.2)).toBe(-0.2)
    expect(model.sample(-1.5, 0.3)).toBe(0.2)
  })

  it('resets after a long frame gap', () => {
    const model = new NavigationRingElasticityModel(responsivePhysics)

    model.reset(0, 0)
    model.sample(1, 0.1)
    model.step(1 / 60)

    expect(model.sample(2, 1)).toBe(0)
    expect(model.getDeformation()).toEqual({
      axisOffset: 0,
      axisScale: 1,
      crossAxisScale: 1,
      strain: 0,
    })
  })

  it('merges configuration overrides with the shared defaults', () => {
    const model = new NavigationRingElasticityModel({ elasticity: 0.12 })

    expect(model.config).toEqual({
      ...DEFAULT_NAVIGATION_RING_PHYSICS,
      elasticity: 0.12,
    })
  })
})
