const STORAGE_KEY = 'irtiwaa-data-transfer-history'
const MAX_HISTORY_ITEMS = 24

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeEntry(entry) {
  return {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction: entry.direction || 'export',
    entityType: entry.entityType || 'unknown',
    entityLabel: entry.entityLabel || entry.entityType || 'Element',
    fileName: entry.fileName || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    summary: entry.summary || {},
    filters: entry.filters || null,
  }
}

export function readDataTransferHistory() {
  if (!hasStorage()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(normalizeEntry)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  } catch {
    return []
  }
}

export function appendDataTransferHistory(entry) {
  if (!hasStorage()) return []

  const nextEntries = [
    normalizeEntry(entry),
    ...readDataTransferHistory(),
  ].slice(0, MAX_HISTORY_ITEMS)

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries))
  return nextEntries
}

export function clearDataTransferHistory() {
  if (!hasStorage()) return []

  window.localStorage.removeItem(STORAGE_KEY)
  return []
}
