import { lazy, Suspense } from 'react'
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
    return <>{children}</>
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClerkProtectedContent requiredRole={requiredRole}>
        {children}
      </ClerkProtectedContent>
    </Suspense>
  )
}
