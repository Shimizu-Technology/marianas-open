import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import './i18n'
import './index.css'
import App from './App'
import { PostHogProvider } from './providers/PostHogProvider'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const isClerkEnabled = Boolean(PUBLISHABLE_KEY && PUBLISHABLE_KEY !== 'YOUR_PUBLISHABLE_KEY')

if (!isClerkEnabled) {
  console.warn('Clerk not configured — running without authentication.')
}

function Root() {
  if (isClerkEnabled) {
    return (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        signInFallbackRedirectUrl="/admin"
      >
        <HelmetProvider>
          <AuthProvider isClerkEnabled={true}>
            <PostHogProvider>
              <App />
            </PostHogProvider>
          </AuthProvider>
        </HelmetProvider>
      </ClerkProvider>
    )
  }

  return (
    <HelmetProvider>
      <AuthProvider isClerkEnabled={false}>
        <PostHogProvider>
          <App />
        </PostHogProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
