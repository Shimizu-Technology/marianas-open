import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { useEffect, type ReactNode } from 'react'
import { AuthProvider } from '../../contexts/AuthContext'
import { setAuthTokenGetter } from '../../services/api'
import { PostHogIdentitySync } from '../../providers/PostHogProvider'

function AdminAuth({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()

  useEffect(() => {
    setAuthTokenGetter(async (options) => {
      try {
        return await getToken({ skipCache: options?.skipCache })
      } catch {
        return null
      }
    })
    return () => setAuthTokenGetter(async () => null)
  }, [getToken])

  return (
    <AuthProvider value={{ isClerkEnabled: true, isSignedIn: isSignedIn ?? false, isLoading: !isLoaded, userId: userId ?? null }}>
      <PostHogIdentitySync />
      {children}
    </AuthProvider>
  )
}

// This module is imported only by the /admin route, including client-side navigation.
export default function AdminAuthBoundary({ children }: { children: ReactNode }) {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  if (!key || key === 'YOUR_PUBLISHABLE_KEY') return <AuthProvider>{children}</AuthProvider>

  return (
    <ClerkProvider publishableKey={key} afterSignOutUrl="/" signInFallbackRedirectUrl="/admin" signUpFallbackRedirectUrl="/admin">
      <AdminAuth>{children}</AdminAuth>
    </ClerkProvider>
  )
}
