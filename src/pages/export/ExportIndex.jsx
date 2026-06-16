import { useState } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'

const ENTITY_TYPES = [
  { value: 'customers',       label: 'Clients',              icon: 'fa-solid fa-users',          color: '#3b82f6', hasDateRange: false },
  { value: 'products',        label: 'Produits & stock',     icon: 'fa-solid fa-box-open',        color: '#0d9488', hasDateRange: false },
  { value: 'invoices',        label: 'Factures',             icon: 'fa-solid fa-file-invoice',    color: '#8b5cf6', hasDateRange: true  },
  { value: 'expenses',        label: 'Dépenses',             icon: 'fa-solid fa-receipt',         color: '#f59e0b', hasDateRange: true  },
  { value: 'stock_movements', label: 'Mouvements de stock',  icon: 'fa-solid fa-arrows-rotate',   color: '#06b6d4', hasDateRange: true  },
  { value: 'credit',          label: 'Crédit clients',       icon: 'fa-solid fa-credit-card',     color: '#ec4899', hasDateRange: true  },
  { value: 'route_sessions',  label: 'Sorties journée',      icon: 'fa-solid fa-truck-fast',      color: '#f97316', hasDateRange: true  },
]

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export default function ExportIndex() {
  const [entityType, setEntityType] = useState('invoices')
  const [dateFrom,   setDateFrom]   = useState(firstOfMonth)
  const [dateTo,     setDateTo]     = useState(today)
  const [exporting,  setExporting]  = useState(false)
  const [error,      setError]      = useState('')
  const [lastExport, setLastExport] = useState(null)

  const selected = ENTITY_TYPES.find(e => e.value === entityType)

  const handleExport = async () => {
    setExporting(true); setError('')
    try {
      const params = { entity_type: entityType }
      if (selected.hasDateRange) { params.date_from = dateFrom; params.date_to = dateTo }

      const r = await api.get('/export/csv', {
        params,
        responseType: 'blob',
      })

      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv;charset=utf-8;' }))
      const fname = `${entityType}_${today}.csv`
      const a = document.createElement('a')
      a.href = url; a.download = fname; a.click()
      URL.revokeObjectURL(url)
      setLastExport({ entity: selected.label, filename: fname, date: new Date().toLocaleTimeString('fr-FR') })
    } catch (e) {
      // try to read blob error
      if (e.response?.data instanceof Blob) {
        const text = await e.response.data.text()
        try { setError(JSON.parse(text).message) } catch { setError('Erreur lors de l\'export') }
      } else {
        setError(e.response?.data?.message ?? 'Erreur lors de l\'export')
      }
    } finally { setExporting(false) }
  }

  return (
    <div>
      <PageHeader
        title="Export données"
        subtitle="Téléchargez vos données au format CSV"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity selector */}
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">
            <i className="fa-solid fa-table text-teal-500 mr-2" />Données à exporter
          </h2>
          <div className="space-y-1.5">
            {ENTITY_TYPES.map(e => (
              <button key={e.value}
                onClick={() => setEntityType(e.value)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left"
                style={entityType === e.value
                  ? { background: e.color + '12', color: e.color, border: `1px solid ${e.color}30` }
                  : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' }
                }>
                <i className={`${e.icon} w-4 text-center`} style={{ color: e.color }} />
                <span className="font-medium">{e.label}</span>
                {entityType === e.value && <i className="fa-solid fa-check ml-auto text-xs" />}
              </button>
            ))}
          </div>
        </div>

        {/* Options + action */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4">
              <i className="fa-solid fa-sliders text-teal-500 mr-2" />Options
            </h2>

            {selected.hasDateRange ? (
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-muted-color mb-1">Du</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-color mb-1">Au</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="mb-5 text-sm text-muted-color py-3 px-4 rounded-xl"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <i className="fa-solid fa-info-circle mr-2" />
                Exportation de toutes les données {selected.label.toLowerCase()}.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl border text-sm"
                style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}>
                <i className="fa-solid fa-triangle-exclamation mr-2" />{error}
              </div>
            )}

            <button onClick={handleExport} disabled={exporting} className="btn-primary w-full justify-center">
              {exporting
                ? <><i className="fa-solid fa-spinner fa-spin" /> Export en cours…</>
                : <><i className="fa-solid fa-download" /> Télécharger CSV — {selected.label}</>
              }
            </button>
          </div>

          {/* Last export */}
          {lastExport && (
            <div className="rounded-2xl p-4 border flex items-center gap-3"
              style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.18)' }}>
              <i className="fa-solid fa-circle-check text-xl" style={{ color: '#059669' }} />
              <div>
                <div className="text-sm font-semibold text-base-color">Export réussi à {lastExport.date}</div>
                <div className="text-xs text-muted-color">{lastExport.filename}</div>
              </div>
            </div>
          )}

          {/* Info cards */}
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">
              <i className="fa-solid fa-circle-info text-blue-500 mr-2" />À savoir
            </h2>
            <ul className="space-y-2 text-sm text-secondary-color">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-teal-500 mt-0.5 text-xs" />
                Le fichier CSV est encodé en UTF-8 et compatible Excel.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-teal-500 mt-0.5 text-xs" />
                Les montants sont en dinars tunisiens (3 décimales).
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check text-teal-500 mt-0.5 text-xs" />
                Le même format CSV peut être réutilisé pour l'import.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
