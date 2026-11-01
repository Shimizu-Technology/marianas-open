import { ErrorBoundary } from './components/ErrorBoundary'
import { initMonitoring } from './monitoring'
import { installPreloadRecovery } from './utils/preloadRecovery'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import './i18n'
import './index.css'
import App from './App'
import { PostHogProvider } from './providers/PostHogProvider'

initMonitoring()
installPreloadRecovery()

function Root() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <PostHogProvider>
          <App />
        </PostHogProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => { console.warn('[SW] Registration failed:', err) })
  })
}
