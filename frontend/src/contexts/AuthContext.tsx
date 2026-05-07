import React, { createContext, useContext, useState, ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { User } from '../types'

interface AuthCtx {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(authApi.getCurrentUser())

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    setUser(data.user)
  }
  const register = async (email: string, username: string, password: string) => {
    await authApi.register(email, username, password)
    await login(email, password)
  }
  const logout = () => { authApi.logout(); setUser(null) }

  return <Ctx.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
