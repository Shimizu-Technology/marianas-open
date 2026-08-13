import { useEffect, useState, useRef } from 'react'
import { useAuth, SignIn, SignOutButton } from '@clerk/clerk-react'
import { api, ApiError, setAuthTokenGetter } from '../../services/api'
import type { UserProfile } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { RefreshCw, ShieldX, TriangleAlert } from 'lucide-react'

interface ClerkProtectedContentProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'staff'
}

type AuthStatus = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'access_denied' | 'verification_error'

export default function ClerkProtectedContent({ children, requiredRole }: ClerkProtectedContentProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [, setCurrentUser] = useState<UserProfile | null>(null)
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const authSetupRef = useRef(false)

  useEffect(() => {
    if (authSetupRef.current) return
    setAuthTokenGetter(async () => {
      try {
        return await getToken()
      } catch {
        return null
      }
    })
    authSetupRef.current = true
  }, [getToken])

  useEffect(() => {
    const verifyUser = async () => {
      if (!isLoaded) return

      if (!isSignedIn) {
        setAuthStatus('unauthorized')
        return
      }

      setAuthStatus('checking')

      try {
        const response = await api.getCurrentUser()

        if (response.user) {
          const user = response.user
          setCurrentUser(user)

          if (requiredRole) {
            const hasAccess =
              requiredRole === 'staff' ? user.is_staff :
              requiredRole === 'admin' ? user.is_admin :
              false

            if (!hasAccess) {
              setAuthStatus('access_denied')
              return
            }
          }

          setAuthStatus('authorized')
        } else {
          setAuthStatus('access_denied')
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setAuthStatus('access_denied')
          return
        }

        setAuthStatus('verification_error')
      }
    }

    verifyUser()
  }, [isLoaded, isSignedIn, requiredRole, verificationAttempt])

  if (!isLoaded || authStatus === 'loading' || authStatus === 'checking') {
    return <LoadingSpinner />
  }

  if (authStatus === 'unauthorized' || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-2xl',
            },
          }}
        />
      </div>
    )
  }

  if (authStatus === 'access_denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center max-w-md px-6">
          <ShieldX className="w-16 h-16 text-red-live mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold text-text-primary mb-3">
            Access Denied
          </h1>
          <p className="text-text-secondary">
            You don&apos;t have the required permissions to view this page.
            Contact an administrator for access.
          </p>
          <SignOutButton>
            <button className="mt-6 min-h-11 border border-white/15 px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-gold-500/50 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    )
  }

  if (authStatus === 'verification_error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center max-w-md px-6">
          <TriangleAlert className="w-16 h-16 text-gold-500 mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold text-text-primary mb-3">
            Unable to Verify Access
          </h1>
          <p className="text-text-secondary">
            We couldn&apos;t reach the Marianas Open API. Check that the local API is running, then try again.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <button
              onClick={() => setVerificationAttempt(attempt => attempt + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <SignOutButton>
              <button className="min-h-11 border border-white/15 px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-gold-500/50 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
