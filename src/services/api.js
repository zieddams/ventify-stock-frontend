import axios from 'axios'
import {
  getWebActivitySessionId,
  resolveWebActivityPath,
  resolveWebActivityTitle,
} from './activityClient'
import { getStoredLocale } from '../i18n/locales'
import { appPath } from '../utils/appPaths'
import {
  clearStoredAuthState,
  getStoredToken,
  getStoredUser,
  getStoredWorkspaceMode,
  hasStoredPrimarySession,
  restorePrimarySession,
} from '../utils/authStorage'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-App-Client': 'web' },
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  const workspaceMode = getStoredWorkspaceMode()
  const hasAuthorization = Boolean(config.headers?.Authorization || config.headers?.authorization)

  if (token && !hasAuthorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  config.headers['X-Front-Path'] = resolveWebActivityPath()
  config.headers['X-Front-Page-Title'] = resolveWebActivityTitle()
  config.headers['X-Activity-Session'] = getWebActivitySessionId()
  if (workspaceMode && !config.headers['X-Workspace-Mode']) {
    config.headers['X-Workspace-Mode'] = workspaceMode
  }
  config.headers['X-App-Locale'] = getStoredLocale()
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const activeUser = getStoredUser()
      const isScopedCompanySession = activeUser?.auth_context?.is_scoped_company_session === true

      if (isScopedCompanySession && hasStoredPrimarySession()) {
        restorePrimarySession()
        window.location.href = appPath('/developer')
        return Promise.reject(err)
      }

      clearStoredAuthState()
      window.location.href = appPath('/login')
    }
    return Promise.reject(err)
  }
)

export default api
