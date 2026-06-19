import axios from 'axios'
import { APP_BASE_PATH, appPath } from '../utils/appPaths'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
})

function resolveFrontPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  const pathname = String(window.location.pathname || '/')
  const normalizedBase = APP_BASE_PATH === '/' ? '' : APP_BASE_PATH

  if (normalizedBase && pathname.startsWith(normalizedBase)) {
    const trimmed = pathname.slice(normalizedBase.length) || '/'
    return `/${trimmed.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')
  }

  return pathname || '/'
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ventify_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Front-Path'] = resolveFrontPath()
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ventify_token')
      localStorage.removeItem('ventify_user')
      window.location.href = appPath('/login')
    }
    return Promise.reject(err)
  }
)

export default api
