import { APP_BASE_PATH } from '../utils/appPaths'

const WEB_ACTIVITY_SESSION_KEY = 'irtiwaa_web_activity_session'

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getWebActivitySessionId() {
  if (typeof window === 'undefined') {
    return 'web-server'
  }

  try {
    const stored = window.sessionStorage.getItem(WEB_ACTIVITY_SESSION_KEY)

    if (stored) {
      return stored
    }

    const nextValue = randomId('web')
    window.sessionStorage.setItem(WEB_ACTIVITY_SESSION_KEY, nextValue)
    return nextValue
  } catch {
    return randomId('web')
  }
}

export function resolveWebActivityPath() {
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

export function resolveWebActivityTitle() {
  if (typeof document === 'undefined') {
    return 'Developer Console'
  }

  return String(document.title || 'Developer Console')
}
