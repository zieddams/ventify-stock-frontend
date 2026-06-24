import axios from 'axios'

const TOKEN_KEY = 'irtiwaa_ops_token'
const USER_KEY = 'irtiwaa_ops_user'

export function loadStoredSession() {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY)
    const rawUser = window.localStorage.getItem(USER_KEY)
    const user = rawUser ? JSON.parse(rawUser) : null

    if (!token || !user) {
      return null
    }

    return { token, user }
  } catch {
    return null
  }
}

export function persistSession(session) {
  window.localStorage.setItem(TOKEN_KEY, session.token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user))
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export function createApiClient(token = null) {
  const client = axios.create({
    baseURL: '/api',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  return client
}
