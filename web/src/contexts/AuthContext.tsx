import { createContext, useContext, type ReactNode } from 'react'

interface AuthContextType {
  isClerkEnabled: boolean
  isSignedIn: boolean
  isLoading: boolean
  userId: string | null
}

const anonymousAuth: AuthContextType = {
  isClerkEnabled: false,
  isSignedIn: false,
  isLoading: false,
  userId: null,
}

const AuthContext = createContext<AuthContextType>(anonymousAuth)

export function useAuthContext() {
  return useContext(AuthContext)
}

export function AuthProvider({ children, value = anonymousAuth }: {
  children: ReactNode
  value?: AuthContextType
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
