import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { closeEcho } from '../services/realtime'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ventify_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    closeEcho()
    const res = await api.post('/auth/login', { email, password })
    const { token, user } = res.data
    localStorage.setItem('ventify_token', token)
    localStorage.setItem('ventify_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    closeEcho()
    localStorage.removeItem('ventify_token')
    localStorage.removeItem('ventify_user')
    setUser(null)
  }

  const isDeveloper = () => user?.role === 'developer'
  const isAdmin = () => user?.role === 'admin' || user?.role === 'developer'
  const isFinance = () => ['admin', 'developer', 'comptable'].includes(user?.role)
  const canManageAllCustomers = () => ['admin', 'developer', 'comptable'].includes(user?.role)
  const canManageMultiDepot = () => user?.role === 'developer'

  return (
    <AuthContext.Provider value={{ user, login, logout, isDeveloper, isAdmin, isFinance, canManageAllCustomers, canManageMultiDepot, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
