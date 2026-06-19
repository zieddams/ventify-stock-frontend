import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export const ALL_DEPOTS_VALUE = 'all'

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

  const { user } = useAuth()
  const canBrowseAll = ['admin', 'developer', 'comptable'].includes(user?.role)
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
  const [selectedValue, setSelectedValue] = useState(() => {
    const stored = readStoredValue()

    if (stored) {
      return stored
    }

    return canSelectAll && defaultToAll ? ALL_DEPOTS_VALUE : ''
  })

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

  useEffect(() => {
    if (!enabled) {
      return
    }

    const stored = readStoredValue()
    const currentIsValid = isDepotOptionValid(selectedValue, depots, canSelectAll)
    const storedIsValid = isDepotOptionValid(stored, depots, canSelectAll)
    const nextValue = currentIsValid
      ? selectedValue
      : storedIsValid
        ? stored
        : fallbackValue

    if (nextValue !== selectedValue) {
      setSelectedValue(nextValue)
    }
  }, [canSelectAll, depots, enabled, fallbackValue, readStoredValue, selectedValue])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(scopedStorageKey, selectedValue)
    } catch {
      // ignore storage issues
    }
  }, [enabled, scopedStorageKey, selectedValue])

  const selectedDepotId = useMemo(() => normalizeDepotId(selectedValue), [selectedValue])
  const selectedDepot = useMemo(
    () => depots.find((depot) => Number(depot.id) === selectedDepotId) ?? null,
    [depots, selectedDepotId],
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
    scopeParams: selectedDepotId ? { depot_id: selectedDepotId } : {},
  }
}

