import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export const ALL_DEPOTS_VALUE = 'all'
const DEPOT_SCOPE_EVENT = 'irtiwaa:depot-scope-change'

function normalizeDepotId(value) {
  if (value == null || value === '' || value === ALL_DEPOTS_VALUE) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function isDepotOptionValid(value, depots, canSelectAll) {
  if (value === ALL_DEPOTS_VALUE) {
    return canSelectAll
  }

  const depotId = normalizeDepotId(value)
  return depotId != null && depots.some((depot) => Number(depot.id) === depotId)
}

export function useDepots(options = {}) {
  const {
    allowAll = false,
    includeInactive = false,
    storageKey = 'irtiwaa-depot-scope',
    defaultToAll = false,
    enabled = true,
  } = options

  const { user, canManageMultiDepot } = useAuth()
  const canBrowseAll = canManageMultiDepot ? canManageMultiDepot() : user?.role === 'developer'
  const canSelectAll = allowAll && canBrowseAll
  const scopedStorageKey = `${storageKey}:${user?.role ?? 'guest'}`

  const readStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    try {
      return localStorage.getItem(scopedStorageKey) || ''
    } catch {
      return ''
    }
  }, [scopedStorageKey])

  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [storedValue, setStoredValue] = useState(() => {
    const stored = readStoredValue()

    if (stored) {
      return stored
    }

    return canSelectAll && defaultToAll ? ALL_DEPOTS_VALUE : ''
  })
  const storedValueRef = useRef(storedValue)

  useEffect(() => {
    storedValueRef.current = storedValue
  }, [storedValue])

  const syncSelection = useCallback((value) => {
    if (typeof window === 'undefined') {
      return
    }

    const nextValue = value ?? ''

    try {
      localStorage.setItem(scopedStorageKey, nextValue)
    } catch {
      // ignore storage issues
    }

    window.dispatchEvent(new CustomEvent(DEPOT_SCOPE_EVENT, {
      detail: {
        key: scopedStorageKey,
        value: nextValue,
      },
    }))
  }, [scopedStorageKey])

  const reload = useCallback(async () => {
    if (!enabled) {
      setDepots([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await api.get('/depots', {
        params: canBrowseAll && includeInactive ? { include_inactive: 1 } : {},
      })

      setDepots(Array.isArray(response.data) ? response.data : [])
    } catch {
      setDepots([])
    } finally {
      setLoading(false)
    }
  }, [canBrowseAll, enabled, includeInactive])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined
    }

    const handleScopeChange = (event) => {
      const detail = event?.detail ?? {}

      if (detail.key !== scopedStorageKey) {
        return
      }

      const nextValue = detail.value || ''

      if (storedValueRef.current !== nextValue) {
        setStoredValue(nextValue)
      }
    }

    const handleStorage = (event) => {
      if (event.key !== scopedStorageKey) {
        return
      }

      const nextValue = event.newValue || ''

      if (storedValueRef.current !== nextValue) {
        setStoredValue(nextValue)
      }
    }

    window.addEventListener(DEPOT_SCOPE_EVENT, handleScopeChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(DEPOT_SCOPE_EVENT, handleScopeChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [enabled, scopedStorageKey])

  const fallbackValue = useMemo(() => {
    const defaultDepot = depots.find((depot) => depot.is_default) ?? depots[0]
    const userDepot = depots.find((depot) => Number(depot.id) === Number(user?.depot_id))

    if (!canBrowseAll) {
      if (userDepot) {
        return String(userDepot.id)
      }

      if (defaultDepot) {
        return String(defaultDepot.id)
      }

      return ''
    }

    if (canSelectAll && defaultToAll) {
      return ALL_DEPOTS_VALUE
    }

    return defaultDepot ? String(defaultDepot.id) : (canSelectAll ? ALL_DEPOTS_VALUE : '')
  }, [canBrowseAll, canSelectAll, defaultToAll, depots, user?.depot_id])

  const selectedValue = useMemo(() => {
    if (!enabled) {
      return ''
    }

    if (isDepotOptionValid(storedValue, depots, canSelectAll)) {
      return storedValue
    }

    if (storedValue === ALL_DEPOTS_VALUE && !canSelectAll) {
      return fallbackValue === ALL_DEPOTS_VALUE ? '' : fallbackValue
    }

    return fallbackValue
  }, [canSelectAll, depots, enabled, fallbackValue, storedValue])

  useEffect(() => {
    if (!enabled || depots.length === 0) {
      return
    }

    const hasStoredValue = storedValue !== ''
    const storedMatchesCurrentRules = isDepotOptionValid(storedValue, depots, canSelectAll)
    const storedIsCrossPageAllSelection = storedValue === ALL_DEPOTS_VALUE && !canSelectAll

    if (storedMatchesCurrentRules || storedIsCrossPageAllSelection) {
      return
    }

    if (selectedValue === storedValue || !isDepotOptionValid(selectedValue, depots, canSelectAll)) {
      return
    }

    if (hasStoredValue && fallbackValue !== selectedValue) {
      return
    }

    setStoredValue(selectedValue)
    syncSelection(selectedValue)
  }, [canSelectAll, depots, enabled, fallbackValue, selectedValue, storedValue, syncSelection])

  const selectionReady = useMemo(() => {
    if (!enabled) {
      return false
    }

    if (loading) {
      return false
    }

    if (depots.length === 0) {
      return true
    }

    return isDepotOptionValid(selectedValue, depots, canSelectAll)
  }, [canSelectAll, depots, enabled, loading, selectedValue])

  const setSelectedValue = useCallback((value) => {
    const nextValue = value ?? ''
    setStoredValue(nextValue)
    syncSelection(nextValue)
  }, [syncSelection])

  const selectedDepotId = useMemo(() => normalizeDepotId(selectedValue), [selectedValue])
  const selectedDepot = useMemo(
    () => depots.find((depot) => Number(depot.id) === selectedDepotId) ?? (depots.length === 1 ? depots[0] : null),
    [depots, selectedDepotId],
  )
  const scopeParams = useMemo(
    () => (selectedDepotId ? { depot_id: selectedDepotId } : {}),
    [selectedDepotId],
  )

  return {
    depots,
    loading,
    reload,
    selectedValue,
    setSelectedValue,
    selectedDepotId,
    selectedDepot,
    canBrowseAll,
    canSelectAll,
    scopeParams,
    ready: selectionReady,
  }
}


