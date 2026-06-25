const ACTIVE_TOKEN_KEY = 'ventify_token'
const ACTIVE_USER_KEY = 'ventify_user'
const PRIMARY_TOKEN_KEY = 'ventify_primary_token'
const PRIMARY_USER_KEY = 'ventify_primary_user'

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readJson(key) {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeJson(key, value) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  if (value == null) {
    storage.removeItem(key)
    return
  }

  storage.setItem(key, JSON.stringify(value))
}

function writeValue(key, value) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  if (!value) {
    storage.removeItem(key)
    return
  }

  storage.setItem(key, value)
}

export function getStoredToken() {
  const storage = getStorage()
  return storage?.getItem(ACTIVE_TOKEN_KEY) || ''
}

export function setStoredToken(token) {
  writeValue(ACTIVE_TOKEN_KEY, token)
}

export function getStoredUser() {
  return readJson(ACTIVE_USER_KEY)
}

export function setStoredUser(user) {
  writeJson(ACTIVE_USER_KEY, user)
}

export function getStoredWorkspaceMode() {
  return String(getStoredUser()?.auth_context?.mode || '').trim()
}

export function getStoredPrimarySession() {
  return {
    token: getStorage()?.getItem(PRIMARY_TOKEN_KEY) || '',
    user: readJson(PRIMARY_USER_KEY),
  }
}

export function hasStoredPrimarySession() {
  const session = getStoredPrimarySession()
  return Boolean(session.token && session.user)
}

export function storePrimarySession(session) {
  if (!session?.token || !session?.user) {
    return
  }

  writeValue(PRIMARY_TOKEN_KEY, session.token)
  writeJson(PRIMARY_USER_KEY, session.user)
}

export function promoteCurrentSessionToPrimary() {
  const token = getStoredToken()
  const user = getStoredUser()

  if (!token || !user) {
    return null
  }

  storePrimarySession({ token, user })

  return { token, user }
}

export function clearStoredPrimarySession() {
  writeValue(PRIMARY_TOKEN_KEY, '')
  writeJson(PRIMARY_USER_KEY, null)
}

export function restorePrimarySession() {
  const session = getStoredPrimarySession()

  if (!session.token || !session.user) {
    return null
  }

  setStoredToken(session.token)
  setStoredUser(session.user)
  clearStoredPrimarySession()

  return session
}

export function clearStoredActiveSession() {
  setStoredToken('')
  setStoredUser(null)
}

export function clearStoredAuthState() {
  clearStoredActiveSession()
  clearStoredPrimarySession()
}
