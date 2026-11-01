/** Reload only after persisting a guard. If storage is blocked, let React show recovery UI. */
export function reloadOnceForBuild(buildId: string, storage: Pick<Storage, 'getItem' | 'setItem'>, reload: () => void): boolean {
  const key = `marianas-open:preload-reload:${buildId}`
  try {
    if (storage.getItem(key)) return false
    storage.setItem(key, '1')
  } catch {
    return false
  }
  reload()
  return true
}

export function installPreloadRecovery() {
  const handler = (event: Event) => {
    // Accessing sessionStorage itself can throw (privacy settings / sandbox).
    try {
      reloadOnceForBuild(__BUILD_ID__, window.sessionStorage, () => {
        event.preventDefault()
        window.location.reload()
      })
    } catch {
      // Keep the original import rejection so the ErrorBoundary can handle it.
    }
  }
  window.addEventListener('vite:preloadError', handler)
  return () => window.removeEventListener('vite:preloadError', handler)
}
