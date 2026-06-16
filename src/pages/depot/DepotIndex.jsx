import { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import { PageLoader } from '../../components/Spinner'
import QuantityInput from '../../components/QuantityInput'

function fmt(n) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n ?? 0)
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (dt.getFullYear() < 2000) return '—'
  return dt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const MOVEMENT_CONFIG = {
  depot_in:           { label: 'Réception',   icon: 'fa-solid fa-arrow-down',       color: '#10b981', bg: 'rgba(16,185,129,0.10)', sign: '+' },
  depot_to_camion:    { label: '→ Camion',    icon: 'fa-solid fa-truck',             color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', sign: '→' },
  camion_to_customer: { label: '→ Client',    icon: 'fa-solid fa-user',              color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  sign: '−' },
  return:             { label: 'Retour',       icon: 'fa-solid fa-rotate-left',       color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', sign: '↩' },
  adjustment:         { label: 'Ajustement',  icon: 'fa-solid fa-sliders',           color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', sign: '±' },
}

export default function DepotIndex() {
  const [stock,     setStock]     = useState([])
  const [movements, setMovements] = useState([])
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('stock')
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ product_id: '', qty: '', note: '' })
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})
  const [search,    setSearch]    = useState('')

  const load = async () => {
    try {
      const [sRes, mRes, pRes] = await Promise.all([
        api.get('/depot'),
        api.get('/depot/movements'),
        api.get('/products'),
      ])
      setStock(sRes.data)
      setMovements(mRes.data)
      setProducts(pRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true); setErrors({})
    try {
      await api.post('/depot/receive', { ...form, qty: parseFloat(form.qty) })
      setModal(false); load()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? {})
    } finally { setSaving(false) }
  }

  const filteredStock = stock.filter(s =>
    s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.product?.reference?.toLowerCase().includes(search.toLowerCase())
  )

  const totalItems   = stock.reduce((s, i) => s + parseFloat(i.qty ?? 0), 0)
  const lowItems     = stock.filter(i => parseFloat(i.qty) <= (parseFloat(i.product?.min_stock ?? 5)))
  const totalValue   = stock.reduce((s, i) => s + parseFloat(i.qty ?? 0) * parseFloat(i.product?.buy_price ?? i.product?.price ?? 0), 0)

  if (loading) return <PageLoader />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Dépôt</h1>
          <p className="text-sm text-muted-color mt-0.5">Stock central — réceptions & mouvements</p>
        </div>
        <button onClick={() => { setForm({ product_id: '', qty: '', note: '' }); setErrors({}); setModal(true) }} className="btn-primary">
          <i className="fa-solid fa-plus" /> Réceptionner
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Références',  value: stock.length,       icon: 'fa-solid fa-box-open',             color: '#0d9488' },
          { label: 'Total unités', value: fmt(totalItems),   icon: 'fa-solid fa-cubes',                color: '#3b82f6' },
          { label: 'Valeur stock', value: fmt(totalValue) + ' TND', icon: 'fa-solid fa-sack-dollar',   color: '#8b5cf6' },
          { label: 'Stock bas',    value: lowItems.length,   icon: 'fa-solid fa-triangle-exclamation', color: '#ef4444' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: k.color + '1a' }}>
              <i className={`${k.icon} text-sm`} style={{ color: k.color }} />
            </div>
            <div>
              <div className="text-xs text-muted-color">{k.label}</div>
              <div className={`text-sm font-bold ${k.label === 'Stock bas' && lowItems.length > 0 ? 'text-red-500' : 'text-base-color'}`}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-theme">
        {[['stock', 'fa-solid fa-warehouse', 'Stock dépôt'], ['movements', 'fa-solid fa-arrows-up-down', 'Mouvements']].map(([k, ico, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === k
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-muted-color hover:text-base-color'
            }`}>
            <i className={`${ico} text-xs`} />{l}
          </button>
        ))}
      </div>

      {/* Stock tab */}
      {tab === 'stock' && (
        <div className="card">
          <div className="mb-4">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
              <input placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>

          {/* Low stock alert section */}
          {lowItems.length > 0 && (
            <div className="mb-4 rounded-xl p-3 border"
              style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation" /> {lowItems.length} produit(s) sous seuil minimum
              </div>
              <div className="flex flex-wrap gap-2">
                {lowItems.map(i => (
                  <span key={i.product_id} className="text-xs px-2 py-1 rounded-lg border font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}>
                    {i.product?.name} — {fmt(i.qty)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Produit', 'Référence', 'Catégorie', 'Unité', 'Qté dépôt', 'Min. stock', 'Statut'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map(item => {
                  const qty = parseFloat(item.qty ?? 0)
                  const min = parseFloat(item.product?.min_stock ?? 0)
                  const low = min > 0 && qty <= min
                  return (
                    <tr key={item.product_id} className="table-row">
                      <td className="py-3 pr-4 font-semibold text-base-color">{item.product?.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-color">{item.product?.reference ?? '—'}</td>
                      <td className="py-3 pr-4 text-secondary-color text-xs">{item.product?.category ?? '—'}</td>
                      <td className="py-3 pr-4 text-muted-color text-xs">{item.product?.unit ?? '—'}</td>
                      <td className="py-3 pr-4 font-bold font-mono" style={{ color: low ? '#dc2626' : '#0d9488' }}>
                        {fmt(qty)}
                      </td>
                      <td className="py-3 pr-4 text-muted-color font-mono text-xs">
                        {min > 0 ? fmt(min) : '—'}
                      </td>
                      <td className="py-3">
                        {low
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                              <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 10 }} /> Rupture
                            </span>
                          : <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} /> Normal
                            </span>
                        }
                      </td>
                    </tr>
                  )
                })}
                {filteredStock.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-muted-color">Aucun produit</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements tab */}
      {tab === 'movements' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Type', 'Produit', 'Utilisateur', 'Quantité', 'Note', 'Date'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const cfg = MOVEMENT_CONFIG[m.type] ?? { label: m.type, icon: 'fa-solid fa-circle', color: '#64748b', bg: 'rgba(100,116,139,0.1)', sign: '' }
                  const isPositive = ['depot_in', 'return'].includes(m.type)
                  return (
                    <tr key={m.id} className="table-row">
                      <td className="py-3 pr-4">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          <i className={`${cfg.icon} text-[10px]`} />
                          {cfg.label}
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-medium text-base-color">{m.product?.name ?? '—'}</td>
                      <td className="py-3 pr-4 text-secondary-color text-xs">{m.user?.name ?? '—'}</td>
                      <td className="py-3 pr-4 font-bold font-mono text-sm"
                        style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
                        {isPositive ? '+' : '−'}{fmt(Math.abs(m.qty))}
                      </td>
                      <td className="py-3 pr-4 text-muted-color text-xs">{m.note ?? '—'}</td>
                      <td className="py-3 text-muted-color text-xs">{fmtDate(m.created_at)}</td>
                    </tr>
                  )
                })}
                {movements.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-color">Aucun mouvement</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Réceptionner un stock" size="sm">
        <div className="space-y-4">
          <FormField label="Produit" error={errors.product_id?.[0]} required>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
              <option value="">Sélectionner un produit…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.reference}</option>)}
            </select>
          </FormField>
          <FormField label="Quantité" error={errors.qty?.[0]} required>
            <input type="number" step="0.001" min="0.001" value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="0.000" />
          </FormField>
          <FormField label="Note (facultatif)" error={errors.note?.[0]}>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Fournisseur, BL…" />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-arrow-down-to-bracket" />}
              {saving ? 'Enregistrement…' : 'Réceptionner'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
