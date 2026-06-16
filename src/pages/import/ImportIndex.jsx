import { useState, useRef } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'

const ENTITY_TYPES = [
  { value: 'customers',  label: 'Clients',             icon: 'fa-solid fa-users',         color: '#3b82f6',
    fields: ['name','phone','address','zone_name','credit_balance'],
    example: 'name,phone,address,zone_name,credit_balance\nAhmed Ben Ali,+21698000001,Bizerte,Bizerte-centre,150.000' },
  { value: 'products',   label: 'Produits',            icon: 'fa-solid fa-box-open',       color: '#0d9488',
    fields: ['name','unit','buy_price','depot_price','min_stock','max_stock'],
    example: 'name,unit,buy_price,depot_price,min_stock,max_stock\nEau 1.5L Agréa,bouteille,0.450,0.600,50,500' },
  { value: 'expenses',   label: 'Dépenses historiques',icon: 'fa-solid fa-receipt',        color: '#f59e0b',
    fields: ['expense_date','category','label','amount'],
    example: 'expense_date,category,label,amount\n2026-01-15,sfbt,Achat SFBT janvier,12500.000' },
  { value: 'invoices',   label: 'Factures / Sorties',  icon: 'fa-solid fa-file-invoice',   color: '#8b5cf6',
    fields: ['invoice_date','customer_name','product_name','qty','unit_price','status'],
    example: 'invoice_date,customer_name,product_name,qty,unit_price,status\n2026-01-10,Ahmed Ben Ali,Eau 1.5L,24,0.600,paid' },
  { value: 'credit',     label: 'Historique crédit',   icon: 'fa-solid fa-credit-card',    color: '#ec4899',
    fields: ['transaction_date','customer_name','type','amount','note'],
    example: 'transaction_date,customer_name,type,amount,note\n2026-01-20,Ahmed Ben Ali,payment,50.000,Remboursement partiel' },
]

function DownloadExampleBtn({ entity }) {
  const handleDownload = () => {
    const blob = new Blob([entity.example], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `exemple_${entity.value}.csv`
    a.click(); URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleDownload} className="btn-secondary text-xs">
      <i className="fa-solid fa-download" /> Exemple CSV
    </button>
  )
}

export default function ImportIndex() {
  const [entityType,  setEntityType]  = useState('customers')
  const [file,        setFile]        = useState(null)
  const [preview,     setPreview]     = useState(null)  // { headers, rows }
  const [importing,   setImporting]   = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState('')
  const fileRef = useRef()

  const selectedEntity = ENTITY_TYPES.find(e => e.value === entityType)

  const handleFile = (f) => {
    if (!f) return
    setFile(f); setResult(null); setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { setPreview(null); return }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
      const rows = lines.slice(1, 6).map(l =>
        l.split(',').map(v => v.trim().replace(/^"|"$/g,''))
      )
      setPreview({ headers, rows, total: lines.length - 1 })
    }
    reader.readAsText(f)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('entity_type', entityType)
    try {
      const r = await api.post('/import/csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erreur lors de l\'import')
    } finally { setImporting(false) }
  }

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <PageHeader
        title="Import données"
        subtitle="Importez vos données historiques depuis un fichier CSV"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: entity selector + upload */}
        <div className="space-y-4">
          {/* Entity type */}
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">
              <i className="fa-solid fa-table text-teal-500 mr-2" />Type de données
            </h2>
            <div className="space-y-1.5">
              {ENTITY_TYPES.map(e => (
                <button key={e.value}
                  onClick={() => { setEntityType(e.value); reset() }}
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

          {/* Format help */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-base-color">Format attendu</h2>
              <DownloadExampleBtn entity={selectedEntity} />
            </div>
            <div className="text-xs text-muted-color mb-2">Colonnes CSV requises :</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedEntity.fields.map(f => (
                <span key={f} className="text-xs px-2 py-0.5 rounded font-mono"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: upload + preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Drop zone */}
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4">
              <i className="fa-solid fa-file-csv text-teal-500 mr-2" />Fichier CSV
            </h2>

            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
              style={{ borderColor: file ? '#0d9488' : 'var(--border)', background: file ? 'rgba(13,148,136,0.03)' : 'var(--surface-2)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}>
              <i className="fa-solid fa-cloud-arrow-up text-4xl mb-3" style={{ color: file ? '#0d9488' : 'var(--text-muted)' }} />
              {file ? (
                <>
                  <span className="font-semibold text-sm text-base-color">{file.name}</span>
                  <span className="text-xs text-muted-color mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-sm text-secondary-color">Glissez un fichier CSV ici</span>
                  <span className="text-xs text-muted-color mt-1">ou cliquez pour sélectionner</span>
                </>
              )}
              <input id="csv-upload" ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />
            </label>

            {file && (
              <div className="flex items-center gap-2 mt-3">
                <button onClick={handleImport} disabled={importing} className="btn-primary flex-1 justify-center">
                  {importing
                    ? <><i className="fa-solid fa-spinner fa-spin" /> Import en cours…</>
                    : <><i className="fa-solid fa-file-import" /> Lancer l'import</>
                  }
                </button>
                <button onClick={reset} className="btn-secondary">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl p-3 border text-sm"
              style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}>
              <i className="fa-solid fa-triangle-exclamation mr-2" />{error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <i className="fa-solid fa-circle-check text-xl" style={{ color: '#059669' }} />
                <h2 className="text-sm font-semibold text-base-color">Import terminé</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Importés',  value: result.imported ?? 0,  color: '#059669' },
                  { label: 'Ignorés',   value: result.skipped  ?? 0,  color: '#d97706' },
                  { label: 'Erreurs',   value: result.errors?.length ?? 0, color: '#dc2626' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center border"
                    style={{ background: s.color + '08', borderColor: s.color + '25' }}>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-muted-color mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-color mb-2 uppercase tracking-wide">Lignes avec erreur</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs py-1.5 px-3 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626' }}>
                        Ligne {e.line}: {e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-base-color">Aperçu — {preview.total} lignes détectées</h2>
                <span className="text-xs text-muted-color">5 premières lignes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {preview.headers.map(h => (
                        <th key={h} className="text-left pb-2 pr-3 font-semibold text-muted-color uppercase tracking-wide" style={{ fontSize: '0.65rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => (
                      <tr key={ri} className="table-row">
                        {row.map((cell, ci) => (
                          <td key={ci} className="py-2 pr-3 text-base-color font-mono">{cell}</td>
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
