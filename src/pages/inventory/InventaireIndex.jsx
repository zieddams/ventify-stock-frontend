import { useEffect, useState } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'

function fmt(n) { return n != null ? Number(n).toFixed(3) : '—' }

export default function InventaireIndex() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [counts,   setCounts]   = useState({})   // { [product_id]: string }
  const [saving,   setSaving]   = useState(false)
  const [result,   setResult]   = useState(null)  // { adjustments: [] }
  const [showModal,setShowModal]= useState(false)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    api.get('/products')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.data ?? [])
        setProducts(list.filter(p => p.active))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCount = (id, val) => {
    setCounts(c => ({ ...c, [id]: val }))
  }

  const countedProducts = products.filter(p => counts[p.id] !== undefined && counts[p.id] !== '')

  const handleSubmit = async () => {
    const lines = countedProducts.map(p => ({
      product_id: p.id,
      counted_qty: Number(counts[p.id]),
    }))
    if (lines.length === 0) return
    setSaving(true)
    try {
      const r = await api.post('/inventory/count', { lines })
      setResult(r.data)
      setShowModal(true)
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur lors de la soumission')
    } finally { setSaving(false) }
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Inventaire"
        subtitle="Comptage physique du stock — saisir les quantités comptées"
        action={
          countedProducts.length > 0 && (
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</>
                : <><i className="fa-solid fa-check" /> Valider {countedProducts.length} produit{countedProducts.length > 1 ? 's' : ''}</>
              }
            </button>
          )
        }
      />

      {/* Info banner */}
      <div className="mb-5 rounded-2xl p-4 border flex items-start gap-3"
        style={{ background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.18)' }}>
        <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
        <div className="text-sm" style={{ color: '#2563eb' }}>
          Saisissez uniquement les produits comptés. Les produits non renseignés ne seront pas affectés.
          Un mouvement d'ajustement sera créé automatiquement pour chaque écart détecté.
        </div>
      </div>

      <div className="card">
        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color" style={{ fontSize: 13 }} />
            <input
              type="text"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          {countedProducts.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488' }}>
              {countedProducts.length} saisi{countedProducts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-color gap-2">
            <i className="fa-solid fa-spinner fa-spin" /> Chargement…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-3 pr-4">Produit</th>
                  <th className="text-right pb-3 pr-4">Stock système</th>
                  <th className="text-right pb-3 pr-4">Stock min</th>
                  <th className="pb-3 pr-4" style={{ width: 180 }}>Qté comptée</th>
                  <th className="text-right pb-3">Écart</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center">
                    <i className="fa-solid fa-clipboard-list text-3xl text-muted-color opacity-30 mb-2 block" />
                    <p className="text-muted-color text-sm">Aucun produit trouvé</p>
                  </td></tr>
                )}
                {filtered.map(p => {
                  const counted = counts[p.id]
                  const hasCounted = counted !== undefined && counted !== ''
                  const systemQty = Number(p.depot_qty ?? p.qty ?? 0)
                  const countedQty = hasCounted ? Number(counted) : null
                  const delta = hasCounted ? countedQty - systemQty : null

                  return (
                    <tr key={p.id} className="table-row">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-base-color text-sm">{p.name}</div>
                        {p.unit && <div className="text-xs text-muted-color">{p.unit}</div>}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-base-color">
                        {systemQty}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {p.min_stock != null ? (
                          <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{p.min_stock}</span>
                        ) : <span className="text-muted-color">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="—"
                          value={counted ?? ''}
                          onChange={e => handleCount(p.id, e.target.value)}
                          style={{ textAlign: 'right', width: '100%', padding: '0.35rem 0.6rem' }}
                        />
                      </td>
                      <td className="py-3 text-right">
                        {delta !== null ? (
                          <span className="text-sm font-bold font-mono"
                            style={{ color: delta === 0 ? '#059669' : delta > 0 ? '#3b82f6' : '#dc2626' }}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        ) : (
                          <span className="text-muted-color">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setResult(null); setCounts({}) }} title="Inventaire enregistré" size="md">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"
          style={{ color: '#059669' }}>
          <i className="fa-solid fa-circle-check text-lg" />
          Ajustements de stock créés avec succès
        </div>

        {result?.adjustments && result.adjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-3">Produit</th>
                  <th className="text-right pb-2 pr-3">Avant</th>
                  <th className="text-right pb-2 pr-3">Après</th>
                  <th className="text-right pb-2">Écart</th>
                </tr>
              </thead>
              <tbody>
                {result.adjustments.map((a, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-2 pr-3 font-medium text-base-color">{a.product_name}</td>
                    <td className="py-2 pr-3 text-right font-mono text-muted-color">{a.before}</td>
                    <td className="py-2 pr-3 text-right font-mono text-base-color">{a.after}</td>
                    <td className="py-2 text-right font-mono font-bold"
                      style={{ color: a.delta >= 0 ? '#3b82f6' : '#dc2626' }}>
                      {a.delta >= 0 ? '+' : ''}{a.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-color text-sm">Aucun écart détecté — stock conforme.</p>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={() => { setShowModal(false); setResult(null); setCounts({}) }} className="btn-primary">
            <i className="fa-solid fa-check" /> Fermer
          </button>
        </div>
      </Modal>
    </div>
  )
}
