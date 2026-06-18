import { useEffect, useState } from 'react'
import api from '../services/api'

export const DOCUMENT_LAYOUT_SETTING_KEY = 'documents.layouts'

export function normalizeDocumentLayouts(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  return {}
}

export function useDocumentLayouts(options = {}) {
  const enabled = options.enabled !== false
  const [layouts, setLayouts] = useState({})
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setLoading(false)
      return () => {}
    }

    const load = async () => {
      setLoading(true)

      try {
        const response = await api.get('/settings', { params: { group: 'documents' } })
        const settings = Array.isArray(response.data) ? response.data : []
        const layoutSetting = settings.find((item) => item.key === DOCUMENT_LAYOUT_SETTING_KEY)

        if (!cancelled) {
          setLayouts(normalizeDocumentLayouts(layoutSetting?.value))
        }
      } catch {
        if (!cancelled) {
          setLayouts({})
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { layouts, loading, setLayouts }
}
