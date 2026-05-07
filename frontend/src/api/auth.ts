import api from './client'
import type { AuthToken, User } from '../types'

export const authApi = {
  register: async (email: string, username: string, password: string): Promise<User> => {
    const { data } = await api.post<User>('/auth/register', { email, username, password })
    return data
  },
  login: async (email: string, password: string): Promise<AuthToken> => {
    const { data } = await api.post<AuthToken>('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },
  getCurrentUser: (): User | null => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  },
}
