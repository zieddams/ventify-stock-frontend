import { useEffect, useMemo, useRef, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import FrenchDateRangeInput from '../../components/FrenchDateRangeInput'
import PageHeader from '../../components/PageHeader'
import { APP_VERSION } from '../../config/appMeta'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'
import { formatDateTime, formatTime } from '../../utils/format'
import {
  appendDataTransferHistory,
  clearDataTransferHistory,
  readDataTransferHistory,
} from '../../utils/dataTransferHistory'
import { buildCompanyScopedFilename } from '../../utils/documents'
import { downloadCsvExport } from '../../utils/exporting'

const IMPORT_TYPES = [
  {
    value: 'customers',
    entityKey: 'customers',
    icon: 'fa-solid fa-users',
    color: '#3b82f6',
    requiresDepot: false,
    fields: ['name', 'phone', 'address', 'zone_name', 'credit_balance'],
    example: 'name,phone,address,zone_name,credit_balance\nAhmed Ben Ali,+21698000001,Bizerte,Bizerte-centre,150.000',
  },
  {
    value: 'products',
    entityKey: 'products',
    icon: 'fa-solid fa-box-open',
    color: '#0d9488',
    requiresDepot: false,
    fields: ['name', 'category', 'unit', 'buy_price', 'depot_price', 'min_stock', 'max_stock'],
    example: 'name,category,unit,buy_price,depot_price,min_stock,max_stock\nEau 1.5L Agrea,Boite,bouteille,0.450,0.600,1,500',
  },
  {
    value: 'expenses',
    entityKey: 'expenses',
    icon: 'fa-solid fa-receipt',
    color: '#f59e0b',
    requiresDepot: true,
    fields: ['expense_date', 'category', 'label', 'amount'],
    example: 'expense_date,category,label,amount\n2026-01-15,sfbt,Achat SFBT janvier,12500.000',
  },
  {
    value: 'invoices',
    entityKey: 'invoices',
    icon: 'fa-solid fa-file-invoice',
    color: '#8b5cf6',
    requiresDepot: true,
    fields: ['invoice_date', 'customer_name', 'product_name', 'qty', 'unit_price', 'status'],
    example: 'invoice_date,customer_name,product_name,qty,unit_price,status\n2026-01-10,Ahmed Ben Ali,Eau 1.5L,24,0.600,paid',
  },
  {
    value: 'credit',
    entityKey: 'credit',
    icon: 'fa-solid fa-credit-card',
    color: '#ec4899',
    requiresDepot: false,
    fields: ['transaction_date', 'customer_name', 'type', 'amount', 'note'],
    example: 'transaction_date,customer_name,type,amount,note\n2026-01-20,Ahmed Ben Ali,payment,50.000,Remboursement partiel',
  },
]

const EXPORT_TYPES = [
  { value: 'customers', labelKey: 'exportPage.entities.customers', icon: 'fa-solid fa-users', color: '#3b82f6', hasDateRange: false, supportsDepot: false },
  { value: 'products', labelKey: 'exportPage.entities.products', icon: 'fa-solid fa-box-open', color: '#0d9488', hasDateRange: false, supportsDepot: true },
  { value: 'invoices', labelKey: 'exportPage.entities.invoices', icon: 'fa-solid fa-file-invoice', color: '#8b5cf6', hasDateRange: true, supportsDepot: true },
  { value: 'expenses', labelKey: 'exportPage.entities.expenses', icon: 'fa-solid fa-receipt', color: '#f59e0b', hasDateRange: true, supportsDepot: true },
  { value: 'stock_movements', labelKey: 'exportPage.entities.stockMovements', icon: 'fa-solid fa-arrows-rotate', color: '#06b6d4', hasDateRange: true, supportsDepot: true },
  { value: 'credit', labelKey: 'exportPage.entities.credit', icon: 'fa-solid fa-credit-card', color: '#ec4899', hasDateRange: true, supportsDepot: false },
  { value: 'route_sessions', labelKey: 'exportPage.entities.routeSessions', icon: 'fa-solid fa-truck-fast', color: '#f97316', hasDateRange: true, supportsDepot: true },
]

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

function DownloadExampleBtn({ entity, label }) {
  const handleDownload = () => {
    const blob = new Blob([entity.example], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `exemple_${entity.value}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleDownload} className="btn-secondary text-xs">
      <i className="fa-solid fa-download" /> {label}
    </button>
  )
}

function HistoryTab({
  t,
  entries,
  localCount,
  serverCount,
  loading,
  error,
  onRefresh,
  onClearLocal,
}) {
  const importCount = entries.filter((item) => item.direction === 'import').length
  const exportCount = entries.filter((item) => item.direction === 'export').length

  const formatHistoryDate = (value) => {
    if (!value) {
      return t('dataToolsPage.history.dateUnknown')
    }

    return formatDateTime(value)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="space-y-4">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-base-color">
              <i className="fa-solid fa-clock-rotate-left text-teal-500 mr-2" />
              {t('dataToolsPage.history.localTitle')}
            </h2>
            {localCount > 0 && (
              <button onClick={onClearLocal} className="btn-secondary text-xs">
                <i className="fa-solid fa-trash-can" /> {t('dataToolsPage.history.clearLocal')}
              </button>
            )}
          </div>
          <p className="text-sm text-secondary-color">
            {t('dataToolsPage.history.localDescription')}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl p-3 border" style={{ background: 'rgba(13,148,136,0.05)', borderColor: 'rgba(13,148,136,0.18)' }}>
              <div className="text-xs text-muted-color">{t('dataToolsPage.history.imports')}</div>
              <div className="text-2xl font-bold" style={{ color: '#0d9488' }}>{importCount}</div>
            </div>
            <div className="rounded-2xl p-3 border" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.18)' }}>
              <div className="text-xs text-muted-color">{t('dataToolsPage.history.exports')}</div>
              <div className="text-2xl font-bold" style={{ color: '#2563eb' }}>{exportCount}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-2xl p-3 border" style={{ background: 'rgba(15,23,42,0.04)', borderColor: 'rgba(15,23,42,0.08)' }}>
              <div className="text-xs text-muted-color">{t('dataToolsPage.history.server')}</div>
              <div className="text-xl font-bold text-base-color">{serverCount}</div>
            </div>
            <div className="rounded-2xl p-3 border" style={{ background: 'rgba(15,23,42,0.04)', borderColor: 'rgba(15,23,42,0.08)' }}>
              <div className="text-xs text-muted-color">{t('dataToolsPage.history.browser')}</div>
              <div className="text-xl font-bold text-base-color">{localCount}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-2">
            <i className="fa-solid fa-code-branch text-indigo-500 mr-2" />
            {t('dataToolsPage.history.webVersion')}
          </h2>
          <div className="app-version-label">
            v{APP_VERSION}
          </div>
          <p className="text-xs text-muted-color mt-3">
            {t('dataToolsPage.history.webVersionDescription')}
          </p>
          <button onClick={onRefresh} className="btn-secondary text-xs mt-4">
            <i className="fa-solid fa-rotate" /> {t('dataToolsPage.history.refreshServer')}
          </button>
        </div>
      </div>

      <div className="xl:col-span-3 card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-base-color">
            <i className="fa-solid fa-list-check text-teal-500 mr-2" />
            {t('dataToolsPage.history.latestTransfers')}
          </h2>
          <span className="text-xs text-muted-color">{t('dataToolsPage.history.itemCount', { count: entries.length })}</span>
        </div>

        {error && (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.18)', color: '#dc2626' }}
          >
            <i className="fa-solid fa-triangle-exclamation mr-2" />
            {error}
          </div>
        )}

        {loading && (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm text-secondary-color"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
          >
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            {t('dataToolsPage.history.loadingServer')}
          </div>
        )}

        {entries.length === 0 ? (
          <div
            className="rounded-2xl py-14 px-6 text-center border"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
          >
            <i className="fa-solid fa-folder-open text-3xl text-muted-color opacity-40" />
            <div className="text-sm font-semibold text-base-color mt-4">{t('dataToolsPage.history.emptyTitle')}</div>
            <div className="text-xs text-muted-color mt-1">
              {t('dataToolsPage.history.emptyDescription')}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const createdAt = entry.createdAt ?? entry.created_at ?? null
              const isImport = entry.direction === 'import'
              const accent = isImport ? '#0d9488' : '#2563eb'
              const scopeSuffix = entry.filters?.depotLabel
                ? t('dataToolsPage.history.summary.depotSuffix', { depot: entry.filters.depotLabel })
                : ''
              const summary = isImport
                ? t('dataToolsPage.history.summary.import', {
                    imported: entry.summary?.imported ?? 0,
                    skipped: entry.summary?.skipped ?? 0,
                    errors: entry.summary?.errorCount ?? 0,
                  })
                : entry.filters?.dateFrom || entry.filters?.dateTo
                  ? t('dataToolsPage.history.summary.exportPeriod', {
                      from: entry.filters?.dateFrom || '...',
                      to: entry.filters?.dateTo || '...',
                    })
                  : t('dataToolsPage.history.summary.exportFull')

              return (
                <div
                  key={entry.id}
                  className="rounded-2xl border px-4 py-4"
                  style={{ background: `${accent}08`, borderColor: `${accent}22` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                          style={{ color: accent, background: `${accent}14` }}
                        >
                          <i className={`fa-solid ${isImport ? 'fa-file-import' : 'fa-file-export'}`} />
                          {t(`dataToolsPage.history.direction.${entry.direction}`)}
                        </span>
                        <span className="text-sm font-semibold text-base-color">{entry.entityLabel}</span>
                      </div>
                      <div className="text-xs text-muted-color mt-2">{summary}{scopeSuffix}</div>
                      {entry.companyLabel && (
                        <div className="text-xs text-secondary-color mt-2">{t('dataToolsPage.history.companyLabel', { name: entry.companyLabel })}</div>
                      )}
                      {Array.isArray(entry.summary?.details) && entry.summary.details.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.summary.details.slice(0, 4).map((detail) => (
                            <span
                              key={`${entry.id}-${detail}`}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ background: `${accent}12`, color: accent }}
                            >
                              {detail}
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.fileName && (
                        <div className="text-xs font-mono text-secondary-color mt-2">{entry.fileName}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-base-color">{formatHistoryDate(createdAt)}</div>
                      <div className="text-[11px] text-muted-color mt-1">{entry.originLabel || t('dataToolsPage.history.browserOrigin')}</div>
                      {entry.createdBy && (
                        <div className="text-[11px] text-muted-color mt-1">{entry.createdBy}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataToolsIndex() {
  const { user, isDeveloper } = useAuth()
  const { t } = useI18n()
  const [tab, setTab] = useState('import')

  const [importType, setImportType] = useState('customers')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')
  const fileRef = useRef()

  const [exportType, setExportType] = useState('invoices')
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [lastExport, setLastExport] = useState(null)
  const [transferHistory, setTransferHistory] = useState(() => readDataTransferHistory())
  const [serverHistory, setServerHistory] = useState([])
  const [serverHistoryLoading, setServerHistoryLoading] = useState(false)
  const [serverHistoryError, setServerHistoryError] = useState('')

  const importTypes = useMemo(
    () => IMPORT_TYPES.map((item) => ({
      ...item,
      label: t(`importPage.entities.${item.entityKey}`),
    })),
    [t],
  )

  const exportTypes = useMemo(
    () => EXPORT_TYPES.map((item) => ({
      ...item,
      label: t(item.labelKey),
    })),
    [t],
  )

  const {
    depots: importDepots,
    loading: importDepotsLoading,
    selectedValue: selectedImportDepotValue,
    setSelectedValue: setSelectedImportDepotValue,
    selectedDepotId: selectedImportDepotId,
    selectedDepot: selectedImportDepot,
  } = useDepots({
    allowAll: false,
    storageKey: 'data-tools-import-depot',
  })

  const {
    depots: exportDepots,
    loading: exportDepotsLoading,
    selectedValue: selectedExportDepotValue,
    setSelectedValue: setSelectedExportDepotValue,
    selectedDepotId: selectedExportDepotId,
    selectedDepot: selectedExportDepot,
    canSelectAll,
  } = useDepots({
    allowAll: true,
    defaultToAll: true,
    storageKey: 'data-tools-export-depot',
  })
  const { selectedDepot: selectedHistoryDepot } = useDepots({
    allowAll: false,
    storageKey: 'app-depot-scope',
  })

  const selectedImport = importTypes.find((item) => item.value === importType) ?? importTypes[0]
  const selectedExport = exportTypes.find((item) => item.value === exportType) ?? exportTypes[0]
  const importRequiresDepot = selectedImport?.requiresDepot
  const exportSupportsDepot = selectedExport?.supportsDepot
  const selectedHistoryCompanyId = isDeveloper()
    ? (selectedHistoryDepot?.company_id ?? selectedHistoryDepot?.company?.id ?? user?.company_id ?? null)
    : (user?.company_id ?? null)

  const loadServerHistory = async () => {
    setServerHistoryLoading(true)
    setServerHistoryError('')

    try {
      const response = await api.get('/import/history', {
        params: {
          limit: 40,
          ...(selectedHistoryCompanyId ? { company_id: selectedHistoryCompanyId } : {}),
        },
      })
      setServerHistory(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      setServerHistoryError(error.response?.data?.message || t('dataToolsPage.history.loadError'))
    } finally {
      setServerHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadServerHistory()
  }, [selectedHistoryCompanyId])

  const historyEntries = useMemo(
    () => [...serverHistory, ...transferHistory]
      .slice()
      .sort((left, right) => new Date(right.createdAt ?? right.created_at ?? 0).getTime() - new Date(left.createdAt ?? left.created_at ?? 0).getTime()),
    [serverHistory, transferHistory],
  )

  const resetImport = () => {
    setFile(null)
    setPreview(null)
    setImportResult(null)
    setImportError('')
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  const handleImportFile = (nextFile) => {
    if (!nextFile) {
      return
    }

    setFile(nextFile)
    setImportResult(null)
    setImportError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter((line) => line.trim())

      if (lines.length < 2) {
        setPreview(null)
        return
      }

      const headers = lines[0].split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
      const rows = lines.slice(1, 6).map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))

      setPreview({ headers, rows, total: lines.length - 1 })
    }
    reader.readAsText(nextFile)
  }

  const handleImport = async () => {
    if (!file) {
      return
    }

    if (importRequiresDepot && !selectedImportDepotId) {
      setImportError(t('dataToolsPage.importDepot.requiredError'))
      return
    }

    setImporting(true)
    setImportError('')
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', importType)
    if (importRequiresDepot && selectedImportDepotId) {
      formData.append('depot_id', String(selectedImportDepotId))
    }

    try {
      const response = await api.post('/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const result = response.data
      setImportResult(result)
      setTransferHistory(appendDataTransferHistory({
        direction: 'import',
        entityType: importType,
        entityLabel: selectedImport.label,
        fileName: file.name,
        summary: {
          imported: result.imported ?? 0,
          skipped: result.skipped ?? 0,
          errorCount: result.errors?.length ?? 0,
        },
        filters: importRequiresDepot ? {
          depotId: selectedImportDepotId,
          depotLabel: selectedImportDepot?.name || null,
        } : null,
      }))
      loadServerHistory()
    } catch (error) {
      setImportError(error.response?.data?.message || t('importPage.importError'))
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError('')

    try {
      const params = selectedExport.hasDateRange ? { date_from: dateFrom, date_to: dateTo } : {}
      if (exportSupportsDepot && selectedExportDepotId) {
        params.depot_id = selectedExportDepotId
      }
      const filename = await downloadCsvExport(
        exportType,
        params,
        buildCompanyScopedFilename(exportType, user, null),
      )
      const depotLabel = exportSupportsDepot
        ? (selectedExportDepot?.name ?? (canSelectAll ? t('layout.depotAll') : t('depot.label')))
        : null

      setLastExport({
        entity: selectedExport.label,
        filename,
        time: new Date().toISOString(),
        depotLabel,
      })
      setTransferHistory(appendDataTransferHistory({
        direction: 'export',
        entityType: exportType,
        entityLabel: selectedExport.label,
        fileName: filename,
        summary: {
          exported: true,
        },
        filters: selectedExport.hasDateRange ? {
          dateFrom,
          dateTo,
          ...(exportSupportsDepot ? {
            depotId: selectedExportDepotId,
            depotLabel,
          } : {}),
        } : exportSupportsDepot ? {
          depotId: selectedExportDepotId,
          depotLabel,
        } : null,
      }))
      loadServerHistory()
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text()
        try {
          setExportError(JSON.parse(text).message)
        } catch {
          setExportError(t('exportPage.exportError'))
        }
      } else {
        setExportError(error.response?.data?.message || t('exportPage.exportError'))
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('dataToolsPage.title')}
        subtitle={t('dataToolsPage.subtitle')}
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'import', label: t('dataToolsPage.tabs.import'), icon: 'fa-solid fa-file-import' },
          { key: 'export', label: t('dataToolsPage.tabs.export'), icon: 'fa-solid fa-file-export' },
          { key: 'history', label: t('dataToolsPage.tabs.history'), icon: 'fa-solid fa-clock-rotate-left' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              tab === item.key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-theme text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${item.icon} mr-2`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-3">
                <i className="fa-solid fa-table text-teal-500 mr-2" />
                {t('dataToolsPage.transferTypeTitle')}
              </h2>
              <div className="space-y-1.5">
                {importTypes.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setImportType(item.value)
                      resetImport()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left"
                    style={importType === item.value
                      ? { background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}30` }
                      : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' }}
                  >
                    <i className={`${item.icon} w-4 text-center`} style={{ color: item.color }} />
                    <span className="font-medium">{item.label}</span>
                    {importType === item.value && <i className="fa-solid fa-check ml-auto text-xs" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-base-color">{t('importPage.expectedFormat')}</h2>
                <DownloadExampleBtn entity={selectedImport} label={t('importPage.exampleCsv')} />
              </div>
              <div className="text-xs text-muted-color mb-2">{t('importPage.requiredColumns')}</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedImport.fields.map((field) => (
                  <span
                    key={field}
                    className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>

            {importRequiresDepot && (
              <div className="card">
                <h2 className="text-sm font-semibold text-base-color mb-3">
                  <i className="fa-solid fa-warehouse text-teal-500 mr-2" />
                  {t('dataToolsPage.importDepot.title')}
                </h2>
                <DepotScopeControls
                  depots={importDepots}
                  loading={importDepotsLoading}
                  selectedValue={selectedImportDepotValue}
                  onChange={setSelectedImportDepotValue}
                  label={t('dataToolsPage.importDepot.label')}
                />
                <p className="text-xs text-muted-color mt-3">
                  {t('dataToolsPage.importDepot.description')}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-4">
                <i className="fa-solid fa-file-csv text-teal-500 mr-2" />
                {t('dataToolsPage.csvFileTitle')}
              </h2>

              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
                style={{
                  borderColor: file ? '#0d9488' : 'var(--border)',
                  background: file ? 'rgba(13,148,136,0.03)' : 'var(--surface-2)',
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  handleImportFile(event.dataTransfer.files[0])
                }}
              >
                <i className="fa-solid fa-cloud-arrow-up text-4xl mb-3" style={{ color: file ? '#0d9488' : 'var(--text-muted)' }} />
                {file ? (
                  <>
                    <span className="font-semibold text-sm text-base-color">{file.name}</span>
                    <span className="text-xs text-muted-color mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-sm text-secondary-color">{t('dataToolsPage.csvDropTitle')}</span>
                    <span className="text-xs text-muted-color mt-1">{t('dataToolsPage.csvDropSubtitle')}</span>
                  </>
                )}
                <input
                  id="csv-upload"
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => handleImportFile(event.target.files[0])}
                />
              </label>

              {file && (
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={handleImport} disabled={importing} className="btn-primary flex-1 justify-center">
                    {importing
                      ? <><i className="fa-solid fa-spinner fa-spin" /> {t('dataToolsPage.importLaunch.loading')}</>
                      : <><i className="fa-solid fa-file-import" /> {t('dataToolsPage.importLaunch.submit')}</>
                    }
                  </button>
                  <button onClick={resetImport} className="btn-secondary">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              )}
            </div>

            {importError && (
              <div
                className="rounded-xl p-3 border text-sm"
                style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
              >
                <i className="fa-solid fa-triangle-exclamation mr-2" />
                {importError}
              </div>
            )}

            {importResult && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <i className="fa-solid fa-circle-check text-xl" style={{ color: '#059669' }} />
                  <h2 className="text-sm font-semibold text-base-color">{t('importPage.done')}</h2>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: t('importPage.stats.imported'), value: importResult.imported ?? 0, color: '#059669' },
                    { label: t('importPage.stats.skipped'), value: importResult.skipped ?? 0, color: '#d97706' },
                    { label: t('importPage.stats.errors'), value: importResult.errors?.length ?? 0, color: '#dc2626' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-3 text-center border"
                      style={{ background: `${stat.color}08`, borderColor: `${stat.color}25` }}
                    >
                      <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-xs text-muted-color mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-color mb-2 uppercase tracking-wide">{t('importPage.errorLines')}</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.map((item, index) => (
                        <div
                          key={`${item.line}-${index}`}
                          className="text-xs py-1.5 px-3 rounded-lg"
                          style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626' }}
                        >
                          {t('importPage.rowLabel', { line: item.line })}: {item.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {preview && !importResult && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-base-color">{t('importPage.previewTitle', { total: preview.total })}</h2>
                  <span className="text-xs text-muted-color">{t('importPage.previewSubtitle')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {preview.headers.map((header) => (
                          <th key={header} className="text-left pb-2 pr-3 font-semibold text-muted-color uppercase tracking-wide" style={{ fontSize: '0.65rem' }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="table-row">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="py-2 pr-3 text-base-color font-mono">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">
              <i className="fa-solid fa-table text-teal-500 mr-2" />
              {t('exportPage.dataToExport')}
            </h2>
            <div className="space-y-1.5">
              {exportTypes.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setExportType(item.value)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left"
                  style={exportType === item.value
                    ? { background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}30` }
                    : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' }}
                >
                  <i className={`${item.icon} w-4 text-center`} style={{ color: item.color }} />
                  <span className="font-medium">{item.label}</span>
                  {exportType === item.value && <i className="fa-solid fa-check ml-auto text-xs" />}
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

              {selectedExport.hasDateRange ? (
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
                  {t('exportPage.noDateRange', { entity: selectedExport.label.toLowerCase() })}
                </div>
              )}

              {exportSupportsDepot && (
                <div className="mb-5">
                  <DepotScopeControls
                    depots={exportDepots}
                    loading={exportDepotsLoading}
                    selectedValue={selectedExportDepotValue}
                    onChange={setSelectedExportDepotValue}
                    allowAll
                    canSelectAll={canSelectAll}
                    label={t('dataToolsPage.exportScopeLabel')}
                  />
                </div>
              )}

              {exportError && (
                <div
                  className="mb-4 p-3 rounded-xl border text-sm"
                  style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
                >
                  <i className="fa-solid fa-triangle-exclamation mr-2" />
                  {exportError}
                </div>
              )}

              <button onClick={handleExport} disabled={exporting} className="btn-primary w-full justify-center">
                {exporting
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('exportPage.exporting')}</>
                  : <><i className="fa-solid fa-download" /> {t('exportPage.downloadCsv', { entity: selectedExport.label })}</>
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
                  <div className="text-sm font-semibold text-base-color">{t('exportPage.successAt', { time: formatTime(lastExport.time) })}</div>
                  <div className="text-xs text-muted-color">{lastExport.filename}</div>
                  {lastExport.depotLabel && (
                    <div className="text-xs text-muted-color mt-1">{t('dataToolsPage.history.summary.depotSuffix', { depot: lastExport.depotLabel }).replace(' | ', '')}</div>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-3">
                <i className="fa-solid fa-circle-info text-blue-500 mr-2" />
                {t('exportPage.infoTitle')}
              </h2>
              <ul className="space-y-2 text-sm text-secondary-color">
                {['utf8', 'currency', 'reusable'].map((key) => (
                  <li key={key} className="flex items-start gap-2">
                    <i className="fa-solid fa-check text-teal-500 mt-0.5 text-xs" />
                    {t(`exportPage.info.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <HistoryTab
          t={t}
          entries={historyEntries}
          localCount={transferHistory.length}
          serverCount={serverHistory.length}
          loading={serverHistoryLoading}
          error={serverHistoryError}
          onRefresh={loadServerHistory}
          onClearLocal={() => setTransferHistory(clearDataTransferHistory())}
        />
      )}
    </div>
  )
}
