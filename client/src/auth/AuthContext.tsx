import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { setAuthToken } from '../lib/api'
import type { User } from '../lib/types'

const storageKey = 'job-tracker-auth'

interface AuthContextValue {
  token: string | null
  user: User | null
  signIn: (nextToken: string, nextUser: User) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return
    }

    const parsed = JSON.parse(raw) as { token: string; user: User }
    setToken(parsed.token)
    setUser(parsed.user)
    setAuthToken(parsed.token)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      signIn: (nextToken, nextUser) => {
        setToken(nextToken)
        setUser(nextUser)
        setAuthToken(nextToken)
        localStorage.setItem(storageKey, JSON.stringify({ token: nextToken, user: nextUser }))
      },
      signOut: () => {
        setToken(null)
        setUser(null)
        setAuthToken(null)
        localStorage.removeItem(storageKey)
      },
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
