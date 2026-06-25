import { useEffect, useState } from 'react'
import api from '../services/api'

export const DOCUMENT_LAYOUT_SETTING_KEY = 'documents.layouts'
export const DOCUMENT_INVOICE_PRINTING_SETTING_KEY = 'documents.invoice_printing'

export function normalizeDocumentLayouts(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  return {}
}

export function normalizeInvoicePrintingSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const headerStyle = source.header_style === 'name_only' ? 'name_only' : 'logo_and_name'
  const showTaxBreakdown = source.show_tax_breakdown !== false
  const showDepotDetails = source.show_depot_details !== false
  const headerNote = typeof source.header_note === 'string' ? source.header_note : ''
  const footerNote = typeof source.footer_note === 'string' ? source.footer_note : ''

  return {
    header_style: headerStyle,
    show_tax_breakdown: showTaxBreakdown,
    show_depot_details: showDepotDetails,
    header_note: headerNote,
    footer_note: footerNote,
  }
}

export function useDocumentLayouts(options = {}) {
  const enabled = options.enabled !== false
  const [layouts, setLayouts] = useState({})
  const [settingsByKey, setSettingsByKey] = useState({})
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setSettingsByKey({})
      setLoading(false)
      return () => {}
    }

    const load = async () => {
      setLoading(true)

      try {
        const response = await api.get('/settings', { params: { group: 'documents' } })
        const settings = Array.isArray(response.data) ? response.data : []
        const nextSettingsByKey = settings.reduce((carry, item) => {
          carry[item.key] = item
          return carry
        }, {})
        const layoutSetting = nextSettingsByKey[DOCUMENT_LAYOUT_SETTING_KEY]

        if (!cancelled) {
          setSettingsByKey(nextSettingsByKey)
          setLayouts(normalizeDocumentLayouts(layoutSetting?.value))
        }
      } catch {
        if (!cancelled) {
          setSettingsByKey({})
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

  return {
    layouts,
    loading,
    setLayouts,
    settingsByKey,
    invoicePrintSettings: normalizeInvoicePrintingSettings(
      settingsByKey[DOCUMENT_INVOICE_PRINTING_SETTING_KEY]?.value,
    ),
  }
}
