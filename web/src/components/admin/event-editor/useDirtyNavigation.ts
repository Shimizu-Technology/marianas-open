import { useEffect } from 'react'

export const discardMessage = 'Discard unsaved event changes?'
export function useDirtyNavigation(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        anchor.href === window.location.href
      )
        return
      if (!window.confirm(discardMessage)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    // BrowserRouter has no data-router blocker. Capture browser history before
    // its popstate listener can unmount the editor when the operator cancels.
    const savedUrl = window.location.href
    const savedState: unknown = window.history.state
    const pop = (event: PopStateEvent) => {
      if (window.location.href !== savedUrl && !window.confirm(discardMessage)) {
        window.history.pushState(savedState, '', savedUrl)
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', click, true)
    window.addEventListener('popstate', pop, true)
    return () => {
      window.removeEventListener('beforeunload', unload)
      document.removeEventListener('click', click, true)
      window.removeEventListener('popstate', pop, true)
    }
  }, [dirty])
}
