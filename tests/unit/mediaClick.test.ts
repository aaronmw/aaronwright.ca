import { describe, expect, it } from 'vitest'
import { createMediaClickGuard } from '../../components/portfolio/domain/mediaClick'

const pointer = {
  pointerId: 1,
  clientX: 100,
  clientY: 100,
  button: 0,
  isPrimary: true,
}

describe('media single-click activation', () => {
  it('accepts one tap with minor finger movement, without waiting for another tap', () => {
    const guard = createMediaClickGuard()
    guard.down(pointer)
    guard.up({ ...pointer, clientX: 105 })
    guard.leave()
    expect(guard.consume(1)).toBe(true)
    expect(guard.consume(1)).toBe(false)
  })

  it('rejects a pan even if the pointer returns to its starting position', () => {
    const guard = createMediaClickGuard()
    guard.down(pointer)
    guard.move({ ...pointer, clientX: 150 })
    guard.up(pointer)
    expect(guard.consume(1)).toBe(false)
  })

  it('rejects a drag whose final movement arrives with pointerup', () => {
    const guard = createMediaClickGuard()
    guard.down(pointer)
    guard.up({ ...pointer, clientY: 200 })
    expect(guard.consume(1)).toBe(false)
  })

  it('does not turn a pinch into a tap when its fingers lift', () => {
    const guard = createMediaClickGuard()
    const secondPointer = { ...pointer, pointerId: 2, isPrimary: false }
    guard.down(pointer)
    guard.down(secondPointer)
    guard.up(secondPointer)
    guard.up(pointer)
    expect(guard.consume(1)).toBe(false)
  })

  it('rejects cancelled gestures and accepts the next deliberate tap', () => {
    const guard = createMediaClickGuard()
    guard.down(pointer)
    guard.cancel()
    guard.up(pointer)
    expect(guard.consume(1)).toBe(false)
    guard.down(pointer)
    guard.up(pointer)
    expect(guard.consume(1)).toBe(true)
  })

  it('rejects a held press that leaves the media', () => {
    const guard = createMediaClickGuard()
    guard.down(pointer)
    guard.leave()
    guard.up(pointer)
    expect(guard.consume(1)).toBe(false)
  })

  it('ignores secondary mouse buttons', () => {
    const guard = createMediaClickGuard()
    guard.down({ ...pointer, button: 2 })
    guard.up(pointer)
    expect(guard.consume(1)).toBe(false)
  })

  it('allows keyboard and assistive activation without a pointer gesture', () => {
    const guard = createMediaClickGuard()
    expect(guard.consume(0)).toBe(true)
  })
})
