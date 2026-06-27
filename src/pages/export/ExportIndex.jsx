import { useMemo, useState } from 'react'
import FrenchDateRangeInput from '../../components/FrenchDateRangeInput'
import PageHeader from '../../components/PageHeader'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatTime } from '../../utils/format'

const ENTITY_TYPES = [
  { value: 'customers', labelKey: 'exportPage.entities.customers', icon: 'fa-solid fa-users', color: '#3b82f6', hasDateRange: false },
  { value: 'products', labelKey: 'exportPage.entities.products', icon: 'fa-solid fa-box-open', color: '#0d9488', hasDateRange: false },
  { value: 'invoices', labelKey: 'exportPage.entities.invoices', icon: 'fa-solid fa-file-invoice', color: '#8b5cf6', hasDateRange: true },
  { value: 'expenses', labelKey: 'exportPage.entities.expenses', icon: 'fa-solid fa-receipt', color: '#f59e0b', hasDateRange: true },
  { value: 'expenses_history', labelKey: 'exportPage.entities.expensesHistory', icon: 'fa-solid fa-clock-rotate-left', color: '#14b8a6', hasDateRange: true },
  { value: 'stock_movements', labelKey: 'exportPage.entities.stockMovements', icon: 'fa-solid fa-arrows-rotate', color: '#06b6d4', hasDateRange: true },
  { value: 'credit', labelKey: 'exportPage.entities.credit', icon: 'fa-solid fa-credit-card', color: '#ec4899', hasDateRange: true },
  { value: 'route_sessions', labelKey: 'exportPage.entities.routeSessions', icon: 'fa-solid fa-truck-fast', color: '#f97316', hasDateRange: true },
]

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function ExportIndex() {
  const { t } = useI18n()
  const [entityType, setEntityType] = useState('invoices')
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [lastExport, setLastExport] = useState(null)

  const entityTypes = useMemo(
    () => ENTITY_TYPES.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  )

  const selected = entityTypes.find((entity) => entity.value === entityType)

  const handleExport = async () => {
    setExporting(true)
    setError('')

    try {
      const params = { entity_type: entityType }
      if (selected?.hasDateRange) {
        params.date_from = dateFrom
        params.date_to = dateTo
      }

      const response = await api.get('/export/csv', {
        params,
        responseType: 'blob',
      })

      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }))
      const filename = `${entityType}_${today}.csv`
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      setLastExport({ filename, date: formatTime(new Date()) })
    } catch (requestError) {
      if (requestError.response?.data instanceof Blob) {
        const text = await requestError.response.data.text()
        try {
          setError(JSON.parse(text).message)
        } catch {
          setError(t('exportPage.exportError'))
        }
      } else {
        setError(requestError.response?.data?.message ?? t('exportPage.exportError'))
      }
    } finally {
      setExporting(false)
    }
  }

  if (!selected) {
    return null
  }

  return (
    <div>
      <PageHeader
        title={t('exportPage.title')}
        subtitle={t('exportPage.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">
            <i className="fa-solid fa-table text-teal-500 mr-2" />
            {t('exportPage.dataToExport')}
          </h2>
          <div className="space-y-1.5">
            {entityTypes.map((entity) => (
              <button
                key={entity.value}
                onClick={() => setEntityType(entity.value)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left"
                style={entityType === entity.value
                  ? { background: `${entity.color}12`, color: entity.color, border: `1px solid ${entity.color}30` }
                  : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' }}
              >
                <i className={`${entity.icon} w-4 text-center`} style={{ color: entity.color }} />
                <span className="font-medium">{entity.label}</span>
                {entityType === entity.value && <i className="fa-solid fa-check ml-auto text-xs" />}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4">
              <i className="fa-solid fa-sliders text-teal-500 mr-2" />
              {t('exportPage.options')}
            </h2>

            {selected.hasDateRange ? (
              <div className="mb-5">
                <label className="block text-xs font-medium text-muted-color mb-1">{t('common.dateRange')}</label>
                <FrenchDateRangeInput
                  valueFrom={dateFrom}
                  valueTo={dateTo}
                  onChange={({ from, to }) => {
                    setDateFrom(from)
                    setDateTo(to)
                  }}
                />
              </div>
            ) : (
              <div
                className="mb-5 text-sm text-muted-color py-3 px-4 rounded-xl"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <i className="fa-solid fa-info-circle mr-2" />
                {t('exportPage.noDateRange', { entity: selected.label.toLowerCase() })}
              </div>
            )}

            {error && (
              <div
                className="mb-4 p-3 rounded-xl border text-sm"
                style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
              >
                <i className="fa-solid fa-triangle-exclamation mr-2" />
                {error}
              </div>
            )}

            <button onClick={handleExport} disabled={exporting} className="btn-primary w-full justify-center">
              {exporting
                ? <><i className="fa-solid fa-spinner fa-spin" /> {t('exportPage.exporting')}</>
                : <><i className="fa-solid fa-download" /> {t('exportPage.downloadCsv', { entity: selected.label })}</>
              }
            </button>
          </div>

          {lastExport && (
            <div
              className="rounded-2xl p-4 border flex items-center gap-3"
              style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.18)' }}
            >
              <i className="fa-solid fa-circle-check text-xl" style={{ color: '#059669' }} />
              <div>
                <div className="text-sm font-semibold text-base-color">{t('exportPage.successAt', { time: lastExport.date })}</div>
                <div className="text-xs text-muted-color">{lastExport.filename}</div>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">
              <i className="fa-solid fa-circle-info text-blue-500 mr-2" />
              {t('exportPage.infoTitle')}
            </h2>
            <ul className="space-y-2 text-sm text-secondary-color">
              {[t('exportPage.info.utf8'), t('exportPage.info.currency'), t('exportPage.info.reusable')].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-teal-500 mt-0.5 text-xs" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
