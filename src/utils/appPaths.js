const rawBasePath = import.meta.env.BASE_URL || import.meta.env.VITE_APP_BASE_PATH || '/web-platform/'

function normalizeBasePath(value) {
  const cleaned = String(value ?? '/').trim()
  const stripped = cleaned.replace(/^\/+|\/+$/g, '')

  return stripped ? `/${stripped}` : '/'
}

export const APP_BASE_PATH = normalizeBasePath(rawBasePath)

export function appPath(path = '/') {
  const cleaned = String(path ?? '').trim()

  if (!cleaned || cleaned === '/') {
    return APP_BASE_PATH
  }

  return `${APP_BASE_PATH}/${cleaned.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')
}
