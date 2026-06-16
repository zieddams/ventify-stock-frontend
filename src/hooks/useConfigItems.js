import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

export function getConfigItemLabel(item, fallback = '—') {
  return item?.display_label || item?.label || item?.value || fallback
}

export function findConfigItem(items, value) {
  return (items ?? []).find(item => String(item.value) === String(value))
}

export function getDefaultConfigValue(items, fallback = '') {
  const list = Array.isArray(items) ? items : []
  const defaultItem = list.find(item => item?.is_default)

  if (defaultItem?.value != null) {
    return String(defaultItem.value)
  }

  const firstActive = list.find(item => item?.active !== false)

  if (firstActive?.value != null) {
    return String(firstActive.value)
  }

  return fallback
}

export function useConfigItems(types, options = {}) {
  const includeInactive = options.includeInactive === true
  const requestedTypes = useMemo(() => {
    const list = Array.isArray(types) ? types : [types]
    return list.filter(Boolean)
  }, [types])
  const typesKey = requestedTypes.join(',')

  const [items, setItems] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (requestedTypes.length === 0) {
      setItems({})
      setLoading(false)
      return () => {}
    }

    setLoading(true)

    api.get('/config', {
      params: {
        types: requestedTypes.join(','),
        ...(includeInactive ? { all: 1 } : {}),
      },
    })
      .then(res => {
        if (!cancelled) setItems(res.data ?? {})
      })
      .catch(() => {
        if (!cancelled) setItems({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [includeInactive, typesKey])

  return { items, loading }
}
