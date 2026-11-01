import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useDirtyNavigation } from './useDirtyNavigation'

function Guard({ dirty }: { dirty: boolean }) {
  useDirtyNavigation(dirty)
  return <a href="/admin/other">Other admin screen</a>
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})
it('keeps the current editor and suppresses router popstate when a history change is declined', () => {
  window.history.replaceState({ idx: 2 }, '', '/admin/events?edit=7')
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  const routerListener = vi.fn()
  window.addEventListener('popstate', routerListener)
  render(<Guard dirty />)
  window.history.replaceState({ idx: 1 }, '', '/admin/events')
  window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 1 } }))
  expect(window.location.pathname + window.location.search).toBe('/admin/events?edit=7')
  expect(routerListener).not.toHaveBeenCalled()
  window.removeEventListener('popstate', routerListener)
})
it('removes unload protection after dirty state is cleared', () => {
  const { rerender } = render(<Guard dirty />)
  rerender(<Guard dirty={false} />)
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
})
