import { createContext, useContext, useState, useCallback } from 'react'

export interface AuthUser {
  name: string
  email: string
  photo?: string
  uid: string
}

interface AuthState {
  user: AuthUser | null
  signIn: (user: AuthUser) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthState>({
  user: null,
  signIn: () => {},
  signOut: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

const STORAGE_KEY = 'cortex-auth-user'

export function useAuthState(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const signIn = useCallback((userData: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    setUser(userData)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return { user, signIn, signOut }
}
