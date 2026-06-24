import { useMemo, useRef, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'

const ENTITY_TYPES = [
  {
    value: 'customers',
    labelKey: 'importPage.entities.customers',
    icon: 'fa-solid fa-users',
    color: '#3b82f6',
    fields: ['name', 'phone', 'address', 'zone_name', 'credit_balance'],
    example: 'name,phone,address,zone_name,credit_balance\nAhmed Ben Ali,+21698000001,Bizerte,Bizerte-centre,150.000',
  },
  {
    value: 'products',
    labelKey: 'importPage.entities.products',
    icon: 'fa-solid fa-box-open',
    color: '#0d9488',
    fields: ['name', 'unit', 'buy_price', 'depot_price', 'min_stock', 'max_stock'],
    example: 'name,unit,buy_price,depot_price,min_stock,max_stock\nEau 1.5L Agrea,bouteille,0.450,0.600,50,500',
  },
  {
    value: 'expenses',
    labelKey: 'importPage.entities.expenses',
    icon: 'fa-solid fa-receipt',
    color: '#f59e0b',
    fields: ['expense_date', 'category', 'label', 'amount'],
    example: 'expense_date,category,label,amount\n2026-01-15,sfbt,Achat SFBT janvier,12500.000',
  },
  {
    value: 'invoices',
    labelKey: 'importPage.entities.invoices',
    icon: 'fa-solid fa-file-invoice',
    color: '#8b5cf6',
    fields: ['invoice_date', 'customer_name', 'product_name', 'qty', 'unit_price', 'status'],
    example: 'invoice_date,customer_name,product_name,qty,unit_price,status\n2026-01-10,Ahmed Ben Ali,Eau 1.5L,24,0.600,paid',
  },
  {
    value: 'credit',
    labelKey: 'importPage.entities.credit',
    icon: 'fa-solid fa-credit-card',
    color: '#ec4899',
    fields: ['transaction_date', 'customer_name', 'type', 'amount', 'note'],
    example: 'transaction_date,customer_name,type,amount,note\n2026-01-20,Ahmed Ben Ali,payment,50.000,Remboursement partiel',
  },
]

function DownloadExampleButton({ entity, label }) {
  const handleDownload = () => {
    const blob = new Blob([entity.example], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `exemple_${entity.value}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleDownload} className="btn-secondary text-xs">
      <i className="fa-solid fa-download" /> {label}
    </button>
  )
}

export default function ImportIndex() {
  const { t } = useI18n()
  const [entityType, setEntityType] = useState('customers')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const entityTypes = useMemo(
    () => ENTITY_TYPES.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  )

  const selectedEntity = entityTypes.find((entity) => entity.value === entityType)

  const handleFile = (nextFile) => {
    if (!nextFile) return

    setFile(nextFile)
    setResult(null)
    setError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter((line) => line.trim())

      if (lines.length < 2) {
        setPreview(null)
        return
      }

      const headers = lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, ''))
      const rows = lines.slice(1, 6).map((line) => (
        line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''))
      ))

      setPreview({ headers, rows, total: lines.length - 1 })
    }

    reader.readAsText(nextFile)
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', entityType)

    try {
      const response = await api.post('/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? t('importPage.importError'))
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  if (!selectedEntity) {
    return null
  }

  return (
    <div>
      <PageHeader
        title={t('importPage.title')}
        subtitle={t('importPage.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">
              <i className="fa-solid fa-table text-teal-500 mr-2" />
              {t('importPage.entityType')}
            </h2>
            <div className="space-y-1.5">
              {entityTypes.map((entity) => (
                <button
                  key={entity.value}
                  onClick={() => {
                    setEntityType(entity.value)
                    reset()
                  }}
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

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-base-color">{t('importPage.expectedFormat')}</h2>
              <DownloadExampleButton entity={selectedEntity} label={t('importPage.exampleCsv')} />
            </div>
            <div className="text-xs text-muted-color mb-2">{t('importPage.requiredColumns')}</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedEntity.fields.map((field) => (
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
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4">
              <i className="fa-solid fa-file-csv text-teal-500 mr-2" />
              {t('importPage.csvFile')}
            </h2>

            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
              style={{ borderColor: file ? '#0d9488' : 'var(--border)', background: file ? 'rgba(13,148,136,0.03)' : 'var(--surface-2)' }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                handleFile(event.dataTransfer.files[0])
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
                  <span className="font-medium text-sm text-secondary-color">{t('importPage.dropzone.drag')}</span>
                  <span className="text-xs text-muted-color mt-1">{t('importPage.dropzone.click')}</span>
                </>
              )}
              <input
                id="csv-upload"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => handleFile(event.target.files[0])}
              />
            </label>

            {file && (
              <div className="flex items-center gap-2 mt-3">
                <button onClick={handleImport} disabled={importing} className="btn-primary flex-1 justify-center">
                  {importing
                    ? <><i className="fa-solid fa-spinner fa-spin" /> {t('importPage.importing')}</>
                    : <><i className="fa-solid fa-file-import" /> {t('importPage.launchImport')}</>
                  }
                </button>
                <button onClick={reset} className="btn-secondary">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div
              className="rounded-xl p-3 border text-sm"
              style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
            >
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              {error}
            </div>
          )}

          {result && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <i className="fa-solid fa-circle-check text-xl" style={{ color: '#059669' }} />
                <h2 className="text-sm font-semibold text-base-color">{t('importPage.done')}</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: t('importPage.stats.imported'), value: result.imported ?? 0, color: '#059669' },
                  { label: t('importPage.stats.skipped'), value: result.skipped ?? 0, color: '#d97706' },
                  { label: t('importPage.stats.errors'), value: result.errors?.length ?? 0, color: '#dc2626' },
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
              {result.errors && result.errors.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-color mb-2 uppercase tracking-wide">{t('importPage.errorLines')}</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((entry, index) => (
                      <div
                        key={`${entry.line}-${index}`}
                        className="text-xs py-1.5 px-3 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626' }}
                      >
                        {t('importPage.rowLabel', { line: entry.line })}: {entry.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {preview && !result && (
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
                        <th key={header} className="text-left pb-2 pr-3 font-semibold text-muted-color uppercase tracking-wide" style={{ fontSize: '0.65rem' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="table-row">
                        {row.map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`} className="py-2 pr-3 text-base-color font-mono">{cell}</td>
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
    </div>
  )
}
