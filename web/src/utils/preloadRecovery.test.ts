import { afterEach, describe, expect, it, vi } from 'vitest'
import { installPreloadRecovery, reloadOnceForBuild } from './preloadRecovery'

afterEach(() => { sessionStorage.clear() })

describe('deploy recovery', () => {
  it('reloads only once per build, including after a page reload', () => {
    const reload = vi.fn()
    expect(reloadOnceForBuild('old', sessionStorage, reload)).toBe(true)
    expect(reloadOnceForBuild('old', sessionStorage, reload)).toBe(false)
    expect(reloadOnceForBuild('new', sessionStorage, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('leaves recovery to the boundary when storage is unavailable', () => {
    const reload = vi.fn()
    const storage = { getItem: () => null, setItem: () => { throw new Error('blocked') } }
    expect(reloadOnceForBuild('old', storage, reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not suppress a repeated preload failure', () => {
    sessionStorage.setItem('marianas-open:preload-reload:test-build', '1')
    const uninstall = installPreloadRecovery()
    const event = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    uninstall()
  })
})
