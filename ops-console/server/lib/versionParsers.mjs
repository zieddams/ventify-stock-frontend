export function parsePackageVersion(source) {
  if (!source) {
    return ''
  }

  try {
    return String(JSON.parse(source).version || '').trim()
  } catch {
    return ''
  }
}

export function parseWebAppVersion(source) {
  if (!source) {
    return ''
  }

  const match = source.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)
  return match?.[1] ? String(match[1]).trim() : ''
}

export function parseExpoConfig(source) {
  if (!source) {
    return { version: '', versionCode: '' }
  }

  const versionMatch = source.match(/version\s*:\s*['"]([^'"]+)['"]/)
  const versionCodeMatch = source.match(/versionCode\s*:\s*(\d+)/)

  return {
    version: versionMatch?.[1] ? String(versionMatch[1]).trim() : '',
    versionCode: versionCodeMatch?.[1] ? String(versionCodeMatch[1]).trim() : '',
  }
}

export function formatShortSha(value) {
  const normalized = String(value || '').trim()
  return normalized ? normalized.slice(0, 7) : ''
}
