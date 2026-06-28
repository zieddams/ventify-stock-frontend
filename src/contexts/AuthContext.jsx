import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'
import { closeEcho } from '../services/realtime'
import {
  clearStoredActiveSession,
  clearStoredAuthState,
  clearStoredPrimarySession,
  getStoredPrimarySession,
  getStoredToken,
  getStoredUser,
  hasStoredPrimarySession,
  restorePrimarySession,
  setStoredToken,
  setStoredUser,
  storePrimarySession,
} from '../utils/authStorage'

const AuthContext = createContext(null)

function isDeveloperWorkspaceUser(user) {
  return user?.auth_context?.is_developer_workspace === true
    || (user?.role === 'developer' && user?.auth_context?.is_scoped_company_session !== true)
}

function isScopedCompanySessionUser(user) {
  return user?.auth_context?.is_scoped_company_session === true
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(() => Boolean(getStoredToken() && getStoredUser()))
  const [switchingCompanySession, setSwitchingCompanySession] = useState(false)
  const [exitingCompanySession, setExitingCompanySession] = useState(false)

  const setCurrentUser = (nextUser) => {
    if (nextUser) {
      setStoredUser(nextUser)
    } else {
      clearStoredActiveSession()
    }

    setUser(nextUser)
    return nextUser
  }

  const refreshUser = async (headers = {}) => {
    const res = await api.get('/auth/me', { headers })
    return setCurrentUser(res.data)
  }

  const login = async (email, password) => {
    closeEcho()
    clearStoredAuthState()

    const res = await api.post('/auth/login', { email, password })
    const { token, user: nextUser } = res.data

    setStoredToken(token)
    clearStoredPrimarySession()

    return setCurrentUser(nextUser)
  }

  const logout = async () => {
    const primarySession = getStoredPrimarySession()

    try {
      await api.post('/auth/logout')
    } catch {
      // ignore best-effort logout
    }

    if (primarySession.token) {
      try {
        await api.post(
          '/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${primarySession.token}`,
              'X-Workspace-Mode': 'developer_workspace',
            },
          },
        )
      } catch {
        // ignore best-effort logout
      }
    }

    closeEcho()
    clearStoredAuthState()
    setUser(null)
  }

  const resolveDeveloperLaunchSession = () => {
    const primarySession = getStoredPrimarySession()

    if (primarySession.token && primarySession.user) {
      return primarySession
    }

    const token = getStoredToken()
    const activeUser = getStoredUser()

    if (!token || !activeUser) {
      return null
    }

    storePrimarySession({ token, user: activeUser })

    return { token, user: activeUser }
  }

  const startCompanySession = async (companyId, role) => {
    const developerSession = resolveDeveloperLaunchSession()

    if (!developerSession?.token) {
      throw new Error('developer_session_missing')
    }

    closeEcho()
    setSwitchingCompanySession(true)

    try {
      const response = await api.post(
        `/companies/${companyId}/scoped-session`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${developerSession.token}`,
            'X-Workspace-Mode': 'developer_workspace',
          },
        },
      )

      if (!response.data?.token) {
        throw new Error('developer_scoped_session_missing_token')
      }

      setStoredToken(response.data.token)

      return await refreshUser({
        'X-Workspace-Mode': 'developer_company_session',
      })
    } catch (error) {
      if (hasStoredPrimarySession()) {
        const restored = restorePrimarySession()
        setUser(restored?.user ?? null)
      }

      throw error
    } finally {
      setSwitchingCompanySession(false)
    }
  }

  const endCompanySession = async () => {
    if (!isScopedCompanySessionUser(getStoredUser()) || !hasStoredPrimarySession()) {
      return user
    }

    closeEcho()
    setExitingCompanySession(true)

    try {
      await api.post('/auth/logout')
    } catch {
      // ignore best-effort logout
    }

    const restored = restorePrimarySession()

    if (!restored?.user) {
      clearStoredAuthState()
      setUser(null)
      setExitingCompanySession(false)
      return null
    }

    setUser(restored.user)

    try {
      return await refreshUser({
        'X-Workspace-Mode': 'developer_workspace',
      })
    } catch (error) {
      clearStoredAuthState()
      setUser(null)
      throw error
    } finally {
      setExitingCompanySession(false)
    }
  }

  const isDeveloper = () => user?.role === 'developer'
  const isDeveloperWorkspace = () => isDeveloperWorkspaceUser(user)
  const isScopedCompanySession = () => isScopedCompanySessionUser(user)
  const isAdmin = () => user?.role === 'admin'
  const isFinance = () => ['admin', 'comptable'].includes(user?.role)
  const canManageAllCustomers = () => ['admin', 'comptable'].includes(user?.role)
  const canManageMultiDepot = () => user?.role === 'developer'
  const canLaunchCompanySessions = () => user?.auth_context?.can_launch_company_sessions === true

  useEffect(() => {
    const token = getStoredToken()
    const restoredUser = getStoredUser()

    if (!token || !restoredUser) {
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)

    void refreshUser()
      .catch(() => {
        // Keep the locally restored session visible if the sync fails for a non-auth reason.
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        setCurrentUser,
        startCompanySession,
        endCompanySession,
        isDeveloper,
        isDeveloperWorkspace,
        isScopedCompanySession,
        isAdmin,
        isFinance,
        canManageAllCustomers,
        canManageMultiDepot,
        canLaunchCompanySessions,
        sessionContext: user?.session_context ?? null,
        loading,
        setLoading,
        switchingCompanySession,
        exitingCompanySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
