import { useEffect, useState, useRef } from 'react'
import { useAuth, useUser, RedirectToSignIn } from '@clerk/clerk-react'
import { api, setAuthTokenGetter } from '../../services/api'
import type { UserProfile } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { ShieldX } from 'lucide-react'

interface ClerkProtectedContentProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'staff'
}

type AuthStatus = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'access_denied'

export default function ClerkProtectedContent({ children, requiredRole }: ClerkProtectedContentProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [, setCurrentUser] = useState<UserProfile | null>(null)
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
        const email = clerkUser?.primaryEmailAddress?.emailAddress
        const response = await api.getCurrentUser(email)

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
          setAuthStatus('unauthorized')
        }
      } catch {
        setAuthStatus('unauthorized')
      }
    }

    verifyUser()
  }, [isLoaded, isSignedIn, requiredRole, clerkUser])

  if (!isLoaded || authStatus === 'loading' || authStatus === 'checking') {
    return <LoadingSpinner />
  }

  if (authStatus === 'unauthorized' || !isSignedIn) {
    return <RedirectToSignIn />
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
        </div>
      </div>
    )
  }

  return <>{children}</>
}
