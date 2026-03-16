import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setAuthTokenGetter } from '../services/api'

interface AuthContextType {
  isClerkEnabled: boolean
  isSignedIn: boolean
  isLoading: boolean
  userId: string | null
}

const AuthContext = createContext<AuthContextType>({
  isClerkEnabled: false,
  isSignedIn: false,
  isLoading: true,
  userId: null,
})

export function useAuthContext() {
  return useContext(AuthContext)
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken()
      } catch {
        return null
      }
    })
  }, [getToken])

  return (
    <AuthContext.Provider
      value={{
        isClerkEnabled: true,
        isSignedIn: isSignedIn ?? false,
        isLoading: !isLoaded,
        userId: userId ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function NoAuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    setAuthTokenGetter(async () => null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isClerkEnabled: false,
        isSignedIn: false,
        isLoading: false,
        userId: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

interface AuthProviderProps {
  children: ReactNode
  isClerkEnabled: boolean
}

export function AuthProvider({ children, isClerkEnabled }: AuthProviderProps) {
  if (isClerkEnabled) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>
  }
  return <NoAuthProvider>{children}</NoAuthProvider>
}
