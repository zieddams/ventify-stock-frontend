import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import { PageLoader } from '../../components/Spinner'

const EMPTY = {
  name: '', reference: '', category: '', buy_price: '', depot_price: '',
  unit: '', active: true, min_stock: '', max_stock: '', zonePrices: {},
}

function fmt(n, d = 3) { return n != null ? parseFloat(n).toFixed(d) : '—' }

export default function ProductsIndex() {
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [units,      setUnits]      = useState([])
  const [zones,      setZones]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [tab,        setTab]        = useState('all')
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [errors,     setErrors]     = useState({})
  const { isAdmin } = useAuth()

  const load = async () => {
    const [pRes, catRes, unitRes, zoneRes] = await Promise.all([
      api.get('/products'),
      api.get('/config/category'),
      api.get('/config/unit'),
      api.get('/zones'),
    ])
    setProducts(pRes.data)
    setCategories(catRes.data)
    setUnits(unitRes.data)
    setZones(zoneRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true) }
  const openEdit   = (p) => {
    const zonePrices = {}
    ;(p.prices ?? []).forEach(pp => { zonePrices[pp.zone_id] = pp.price })
    setEditing(p)
    setForm({
      name: p.name, reference: p.reference ?? '',
      category: p.category ?? '',
      buy_price: p.buy_price ?? '', depot_price: p.depot_price ?? p.price ?? '',
      unit: p.unit ?? '', active: p.active,
      min_stock: p.min_stock ?? '', max_stock: p.max_stock ?? '',
      zonePrices,
    })
    setErrors({}); setModal(true)
  }

  const save = async () => {
    setSaving(true); setErrors({})
    try {
      const prices = Object.entries(form.zonePrices)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([zone_id, price]) => ({ zone_id: Number(zone_id), price: Number(price) }))
      const payload = {
        name: form.name, reference: form.reference, category: form.category,
        buy_price:   form.buy_price   === '' ? null : Number(form.buy_price),
        depot_price: Number(form.depot_price),
        unit: form.unit, active: form.active,
        min_stock: form.min_stock === '' ? 0    : Number(form.min_stock),
        max_stock: form.max_stock === '' ? null : Number(form.max_stock),
        prices,
      }
      if (editing) await api.put(`/products/${editing.id}`, payload)
      else         await api.post('/products', payload)
      setModal(false); load()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? {})
    } finally { setSaving(false) }
  }

  const del = async (p) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return
    await api.delete(`/products/${p.id}`)
    load()
  }

  const margin = (p) => {
    const buy = parseFloat(p.buy_price), sell = parseFloat(p.depot_price ?? p.price)
    if (!buy || !sell) return null
    return (sell - buy) / sell * 100
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = p.name?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q)
    if (tab === 'low') {
      const min = parseFloat(p.min_stock ?? 0)
      return matchSearch && min > 0 && (parseFloat(p.depot_qty ?? 0) <= min || parseFloat(p.camion_qty ?? 0) <= min)
    }
    return matchSearch
  })

  // Products with min_stock set and potentially low qty
  const lowStockProducts = products.filter(p => {
    const min = parseFloat(p.min_stock ?? 0)
    return min > 0
  })

  if (loading) return <PageLoader />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Produits</h1>
          <p className="text-sm text-muted-color mt-0.5">{products.length} produit(s)</p>
        </div>
        {isAdmin() && (
          <button onClick={openCreate} className="btn-primary">
            <i className="fa-solid fa-plus" /> Nouveau produit
          </button>
        )}
      </div>

      {/* ── Min stock alert section ─────────────────────────────────── */}
      {lowStockProducts.length > 0 && (
        <div className="mb-5 rounded-2xl p-4 border"
          style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.18)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)' }}>
                <i className="fa-solid fa-triangle-exclamation text-xs" style={{ color: '#dc2626' }} />
              </div>
              <span className="text-sm font-bold" style={{ color: '#dc2626' }}>
                Alertes stock minimum — {lowStockProducts.length} produit(s) surveillé(s)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {lowStockProducts.map(p => {
              const min = parseFloat(p.min_stock ?? 0)
              const depotQty = parseFloat(p.depot_qty ?? 0)
              const isLow = depotQty <= min
              return (
                <div key={p.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
                  style={{
                    background:   isLow ? 'rgba(239,68,68,0.08)'  : 'rgba(16,185,129,0.05)',
                    borderColor:  isLow ? 'rgba(239,68,68,0.2)'   : 'rgba(16,185,129,0.15)',
                  }}>
                  <div>
                    <div className="text-sm font-semibold text-base-color">{p.name}</div>
                    <div className="text-xs text-muted-color mt-0.5">
                      Min: <span className="font-mono">{fmt(min)}</span>
                      {p.unit ? ` ${p.unit}` : ''}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {isLow ? (
                      <span className="text-sm font-bold" style={{ color: '#dc2626' }}>
                        <i className="fa-solid fa-arrow-trend-down text-xs mr-1" />
                        Rupture
                      </span>
                    ) : (
                      <span className="text-sm font-bold" style={{ color: '#059669' }}>
                        <i className="fa-solid fa-circle-check text-xs mr-1" />
                        OK
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="card mb-0">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
            <input placeholder="Rechercher un produit…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  'Nom', 'Référence', 'Catégorie',
                  'Achat', 'Dépôt', 'Marge',
                  'Min. stock', 'Unité',
                  ...(isAdmin() ? ['Actions'] : []),
                ].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const m = margin(p)
                const min = parseFloat(p.min_stock ?? 0)
                const depotQty = parseFloat(p.depot_qty ?? 0)
                const isLow = min > 0 && depotQty <= min
                return (
                  <tr key={p.id} className="table-row">
                    <td className="py-3 pr-4 font-semibold text-base-color">
                      {p.name}
                      {isLow && (
                        <i className="fa-solid fa-circle-exclamation ml-1.5 text-xs" style={{ color: '#dc2626' }} />
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-color">{p.reference}</td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{p.category ?? '—'}</td>
                    <td className="py-3 pr-4 text-secondary-color text-right font-mono text-xs">
                      {p.buy_price != null ? fmt(p.buy_price) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-base-color text-right font-mono font-semibold text-xs">
                      {fmt(p.depot_price ?? p.price)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {m != null
                        ? <span style={{ color: m < 0 ? '#dc2626' : m < 10 ? '#d97706' : '#059669' }} className="font-semibold text-xs">
                            {m.toFixed(1)}%
                          </span>
                        : <span className="text-muted-color">—</span>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs"
                      style={{ color: isLow ? '#dc2626' : min > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {min > 0 ? fmt(min) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{p.unit ?? '—'}</td>
                    {isAdmin() && (
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(p)}
                            className="text-xs font-medium hover:underline"
                            style={{ color: '#0d9488' }}>
                            <i className="fa-solid fa-pen mr-1" />Modifier
                          </button>
                          <button onClick={() => del(p)}
                            className="text-xs font-medium text-red-500 hover:text-red-700">
                            <i className="fa-solid fa-trash-can mr-1" />Suppr.
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin() ? 9 : 8} className="py-12 text-center">
                    <i className="fa-solid fa-box text-3xl text-muted-color opacity-30 mb-2 block" />
                    <p className="text-muted-color text-sm">Aucun produit trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Modifier le produit' : 'Nouveau produit'}>
        <div className="space-y-4">
          <FormField label="Nom" error={errors.name?.[0]} required>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nom du produit" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Référence" error={errors.reference?.[0]}>
              <input value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="REF-001" />
            </FormField>
            <FormField label="Unité" error={errors.unit?.[0]}>
              <select value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="">Sélectionner…</option>
                {units.map(u => <option key={u.id} value={u.value}>{u.value}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prix d'achat / usine (TND)" error={errors.buy_price?.[0]}>
              <input type="number" step="0.001" min="0" value={form.buy_price}
                onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))}
                placeholder="0.000" />
            </FormField>
            <FormField label="Prix vente dépôt (TND)" error={errors.depot_price?.[0]} required>
              <input type="number" step="0.001" min="0" value={form.depot_price}
                onChange={e => setForm(f => ({ ...f, depot_price: e.target.value }))}
                placeholder="0.000" />
            </FormField>
          </div>

          <FormField label="Catégorie" error={errors.category?.[0]}>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Sélectionner…</option>
              {categories.map(c => <option key={c.id} value={c.value}>{c.value}</option>)}
            </select>
          </FormField>

          {/* Min/Max stock */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Stock minimum (alerte)" error={errors.min_stock?.[0]}>
              <input type="number" step="0.001" min="0" value={form.min_stock}
                onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))}
                placeholder="0.000" />
            </FormField>
            <FormField label="Stock maximum (optionnel)" error={errors.max_stock?.[0]}>
              <input type="number" step="0.001" min="0" value={form.max_stock}
                onChange={e => setForm(f => ({ ...f, max_stock: e.target.value }))}
                placeholder="0.000" />
            </FormField>
          </div>

          {/* Zone prices */}
          {zones.length > 0 && (
            <div className="rounded-xl p-3 border border-theme" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-1">
                Tarifs par zone (optionnel)
              </div>
              <div className="text-xs text-muted-color mb-3">Laisser vide = utilise le prix vente dépôt.</div>
              <div className="grid grid-cols-2 gap-3">
                {zones.map(z => (
                  <FormField key={z.id} label={z.name}>
                    <input type="number" step="0.001" min="0"
                      value={form.zonePrices[z.id] ?? ''}
                      onChange={e => setForm(f => ({ ...f, zonePrices: { ...f.zonePrices, [z.id]: e.target.value } }))}
                      placeholder={form.depot_price || '0.000'} />
                  </FormField>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
