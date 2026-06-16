import { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import { PageLoader } from '../../components/Spinner'

function fmt(n) {
  return parseFloat(n ?? 0).toFixed(3)
}

export default function CamionsIndex() {
  const [camions,   setCamions]   = useState([])
  const [physical,  setPhysical]  = useState([])
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ product_id: '', qty: '' })
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})
  const [expanded,  setExpanded]  = useState({})

  const load = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/camion/all'),
        api.get('/products'),
      ])
      setCamions(cRes.data)
      setProducts(pRes.data)
    } catch {}
    // try to load physical camions (may 404 if no endpoint yet)
    try {
      const phRes = await api.get('/camions')
      setPhysical(phRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true); setErrors({})
    try {
      await api.post('/camion/refill', form)
      setModal(false); load()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? {})
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />

  const totalProducts = camions.reduce((s, c) => s + (c.stock?.length ?? 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Camions</h1>
          <p className="text-sm text-muted-color mt-0.5">
            Stock embarqué par commercial — {camions.length} commercial(aux)
          </p>
        </div>
        <button
          onClick={() => { setForm({ product_id: '', qty: '' }); setErrors({}); setModal(true) }}
          className="btn-primary">
          <i className="fa-solid fa-arrow-right-to-bracket" /> Charger camion
        </button>
      </div>

      {/* Physical camions — from DB table if loaded */}
      {physical.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-3">
            <i className="fa-solid fa-truck mr-1.5" /> Véhicules enregistrés
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {physical.map(cam => (
              <div key={cam.id} className="card flex items-center gap-3 py-3 px-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <i className="fa-solid fa-truck text-base" style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-base-color">{cam.name}</div>
                  {cam.plate && (
                    <div className="text-xs font-mono text-muted-color mt-0.5">
                      <i className="fa-solid fa-id-card mr-1 opacity-60" />{cam.plate}
                    </div>
                  )}
                  {cam.active !== undefined && (
                    <div className={`text-xs mt-0.5 ${cam.active ? 'text-emerald-600' : 'text-muted-color'}`}>
                      {cam.active ? 'Actif' : 'Inactif'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock par commercial */}
      <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-3">
        <i className="fa-solid fa-box-open mr-1.5" /> Stock embarqué par commercial
      </h2>

      <div className="space-y-3">
        {camions.map(c => {
          const uid = c.user?.id
          const isOpen = expanded[uid]
          const stockItems = c.stock ?? []
          const totalQty = stockItems.reduce((s, i) => s + parseFloat(i.qty ?? 0), 0)

          return (
            <div key={uid} className="card">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setExpanded(e => ({ ...e, [uid]: !e[uid] }))}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                    {c.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm text-base-color">{c.user?.name}</div>
                    <div className="text-xs text-muted-color capitalize">
                      {c.user?.role} — {stockItems.length} produit(s) · {fmt(totalQty)} unités
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-lg font-semibold"
                    style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}>
                    {stockItems.length} réf.
                  </span>
                  <i className={`fa-solid fa-chevron-down text-muted-color text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {stockItems.length === 0 ? (
                    <p className="text-sm text-muted-color text-center py-4">Camion vide</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Produit', 'Unité', 'Quantité'].map(h => (
                            <th key={h} className="pb-2 text-left text-xs font-semibold text-muted-color uppercase tracking-wider pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stockItems.map((s, i) => {
                          const minStock = parseFloat(s.product?.min_stock ?? 0)
                          const low = minStock > 0
                            ? parseFloat(s.qty ?? 0) <= minStock
                            : parseFloat(s.qty ?? 0) < 5
                          return (
                            <tr key={i} className="table-row">
                              <td className="py-2 pr-4 text-base-color font-medium">{s.product?.name}</td>
                              <td className="py-2 pr-4 text-muted-color text-xs">
                                {s.product?.unit}
                                {minStock > 0 && ` · min ${fmt(minStock)}`}
                              </td>
                              <td className="py-2 font-bold font-mono text-sm" style={{ color: low ? '#f59e0b' : '#0d9488' }}>
                                {fmt(s.qty)}
                                {low && <i className="fa-solid fa-triangle-exclamation ml-1.5 text-xs" style={{ color: '#f59e0b' }} />}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {camions.length === 0 && (
          <div className="card text-center py-12">
            <i className="fa-solid fa-truck-ramp-box text-3xl text-muted-color opacity-30 mb-2 block" />
            <p className="text-muted-color text-sm">Aucun stock camion actif</p>
          </div>
        )}
      </div>

      {/* Refill modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Charger un camion — Dépôt → Camion" size="sm">
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
          <p className="text-xs text-muted-color">
            <i className="fa-solid fa-circle-info mr-1" />
            Le stock dépôt sera décrémenté du même montant.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin" /> Transfert…</>
                : <><i className="fa-solid fa-truck-arrow-right" /> Transférer</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
