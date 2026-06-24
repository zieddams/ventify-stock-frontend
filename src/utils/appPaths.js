const DEFAULT_BASE_PATH = '/web-platform/'

export function normalizeBasePath(value) {
  const cleaned = String(value ?? '/').trim()
  const stripped = cleaned.replace(/^\/+|\/+$/g, '')

  return stripped ? `/${stripped}` : '/'
}

export function resolveAppBasePath(value = import.meta.env.BASE_URL || import.meta.env.VITE_APP_BASE_PATH || DEFAULT_BASE_PATH) {
  return normalizeBasePath(value)
}

export function appPathFromBase(basePath, path = '/') {
  const normalizedBasePath = normalizeBasePath(basePath)
  const cleaned = String(path ?? '').trim()

  if (!cleaned || cleaned === '/') {
    return normalizedBasePath
  }

  return `${normalizedBasePath}/${cleaned.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')
}

export const APP_BASE_PATH = resolveAppBasePath()

export function appPath(path = '/') {
  return appPathFromBase(APP_BASE_PATH, path)
}
