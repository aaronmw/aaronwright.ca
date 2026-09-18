import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  waitForPageActivity,
  withPageActivityTimeout,
  type PageActivity,
} from '../../components/portfolio/runtime/pageActivity'

function createPageActivity(initiallyActive: boolean) {
  let active = initiallyActive
  const listeners = new Set<() => void>()
  const activity: PageActivity = {
    isActive: () => active,
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return {
    activity,
    setActive(nextActive: boolean) {
      active = nextActive
      listeners.forEach(listener => listener())
    },
  }
}

describe('portfolio page activity', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('starts loading a visible page without focus or a user gesture', async () => {
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      hasFocus: () => false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('window', new EventTarget())
    let ready = false
    const loading = waitForPageActivity().then(() => {
      ready = true
    })

    await Promise.resolve()
    expect(ready).toBe(true)
    await loading
  })

  it('resumes loading when a hidden page becomes visible without focus', async () => {
    const page = Object.assign(new EventTarget(), {
      visibilityState: 'hidden',
      hasFocus: () => false,
    })
    vi.stubGlobal('document', page)
    vi.stubGlobal('window', new EventTarget())
    let ready = false
    const loading = waitForPageActivity().then(() => {
      ready = true
    })

    await Promise.resolve()
    expect(ready).toBe(false)

    page.visibilityState = 'visible'
    page.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(ready).toBe(true)
    await loading
  })

  it('waits until the page becomes active', async () => {
    const page = createPageActivity(false)
    let resolved = false
    const waiting = waitForPageActivity(page.activity).then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(resolved).toBe(false)

    page.setActive(true)
    await waiting
    expect(resolved).toBe(true)
  })

  it('counts only active-page time toward media timeouts', async () => {
    vi.useFakeTimers()
    const page = createPageActivity(true)
    const neverResolves = new Promise<void>(() => undefined)
    let failure: Error | undefined
    const timed = withPageActivityTimeout(
      neverResolves,
      100,
      () => new Error('timed out'),
      page.activity,
    ).catch((error: Error) => {
      failure = error
    })

    await vi.advanceTimersByTimeAsync(40)
    page.setActive(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(failure).toBeUndefined()

    page.setActive(true)
    await vi.advanceTimersByTimeAsync(59)
    expect(failure).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    await timed
    expect(failure?.message).toBe('timed out')
  })
})
