import { lazy, Suspense } from 'react'
import { Lock } from 'lucide-react'
import { useAuthContext } from '../../contexts/AuthContext'
import LoadingSpinner from '../LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'staff'
}

const ClerkProtectedContent = lazy(() => import('./ClerkProtectedContent'))

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isClerkEnabled } = useAuthContext()

  if (!isClerkEnabled) {
    if (import.meta.env.DEV) {
      return <>{children}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 px-6">
        <div className="max-w-md text-center">
          <Lock className="mx-auto mb-6 h-12 w-12 text-gold-500" />
          <h1 className="font-heading text-2xl font-bold text-text-primary mb-3">
            Authentication is not configured
          </h1>
          <p className="text-text-secondary">
            Admin access is unavailable until Clerk is configured for this deployment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClerkProtectedContent requiredRole={requiredRole}>
        {children}
      </ClerkProtectedContent>
    </Suspense>
  )
}
