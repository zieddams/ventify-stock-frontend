import { useEffect, useMemo, useState } from 'react'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { extractPaginationMeta, paginateItems } from '../../utils/pagination'

function fmt(value) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(value ?? 0)
}

function fmtDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return '-'
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildDepotForm(depot = null, depots = []) {
  return {
    id: depot?.id ?? null,
    name: depot?.name ?? '',
    code: depot?.code ?? '',
    address: depot?.address ?? '',
    note: depot?.note ?? '',
    active: depot?.active ?? true,
    is_default: depot?.is_default ?? false,
    sort_order: depot?.sort_order ?? (depots.reduce((max, item) => Math.max(max, Number(item.sort_order ?? 0)), 0) + 1),
  }
}

const MOVEMENT_CONFIG = {
  depot_in: { label: 'Réception', icon: 'fa-solid fa-arrow-down', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  depot_to_camion: { label: 'Vers camion', icon: 'fa-solid fa-truck', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  camion_to_customer: { label: 'Vers client', icon: 'fa-solid fa-user', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  return: { label: 'Retour', icon: 'fa-solid fa-rotate-left', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  adjustment: { label: 'Ajustement', icon: 'fa-solid fa-sliders', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
}

export default function DepotIndex() {
  const { layouts: documentLayouts } = useDocumentLayouts()
  const { isAdmin } = useAuth()
  const {
    depots,
    loading: depotsLoading,
    reload: reloadDepots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    selectedDepot,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: false,
    includeInactive: isAdmin(),
    storageKey: 'app-depot-scope',
  })

  const [stock, setStock] = useState([])
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [tab, setTab] = useState('stock')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product_id: '', qty: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')
  const [stockPage, setStockPage] = useState(1)
  const [stockPerPage, setStockPerPage] = useState(20)
  const [movementSearch, setMovementSearch] = useState('')
  const [movementType, setMovementType] = useState('')
  const [movementDateFrom, setMovementDateFrom] = useState('')
  const [movementDateTo, setMovementDateTo] = useState('')
  const [movementPage, setMovementPage] = useState(1)
  const [movementMeta, setMovementMeta] = useState(null)
  const [depotModal, setDepotModal] = useState(false)
  const [depotForm, setDepotForm] = useState(buildDepotForm())
  const [depotErrors, setDepotErrors] = useState({})
  const [savingDepot, setSavingDepot] = useState(false)

  const loadBaseData = async () => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    try {
      const [stockResponse, productsResponse] = await Promise.all([
        api.get('/depot', { params: scopeParams }),
        api.get('/products', { params: scopeParams }),
      ])

      setStock(Array.isArray(stockResponse.data) ? stockResponse.data : [])
      setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : [])
    } finally {
      setLoading(false)
    }
  }

  const loadMovements = async (page = movementPage) => {
    if (!depotsReady) {
      return
    }

    setMovementsLoading(true)

    try {
      const response = await api.get('/depot/movements', {
        params: {
          page,
          per_page: 20,
          ...scopeParams,
          ...(movementType ? { type: movementType } : {}),
          ...(movementDateFrom ? { date_from: movementDateFrom } : {}),
          ...(movementDateTo ? { date_to: movementDateTo } : {}),
          ...(movementSearch.trim() ? { q: movementSearch.trim() } : {}),
        },
      })

      const payload = response.data
      const items = Array.isArray(payload) ? payload : (payload.data ?? [])
      const meta = extractPaginationMeta(payload, { current_page: page, per_page: 20 })

      setMovements(items)
      setMovementMeta(meta)
      setMovementPage(page)
    } finally {
      setMovementsLoading(false)
    }
  }

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    loadBaseData()
  }, [depotsReady, selectedDepotId])

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    loadMovements(movementPage)
  }, [depotsReady, movementPage, movementType, movementDateFrom, movementDateTo, movementSearch, selectedDepotId])

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      await api.post('/depot/receive', {
        ...form,
        qty: Number(form.qty),
        depot_id: selectedDepotId,
      })
      setModal(false)
      await Promise.all([loadBaseData(), loadMovements(1), reloadDepots()])
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const openCreateDepot = () => {
    setDepotForm(buildDepotForm(null, depots))
    setDepotErrors({})
    setDepotModal(true)
  }

  const openEditDepot = (depot) => {
    setDepotForm(buildDepotForm(depot, depots))
    setDepotErrors({})
    setDepotModal(true)
  }

  const deleteDepot = async (depot) => {
    if (!depot) {
      return
    }

    if (!confirm(`Supprimer le dépôt ${depot.name} ? Cette action reste bloquée si le dépôt contient encore du stock ou un historique lié.`)) {
      return
    }

    try {
      const response = await api.delete(`/depots/${depot.id}`)
      const fallbackDepotId = response.data?.fallback_depot_id

      if (fallbackDepotId) {
        setSelectedDepotValue(String(fallbackDepotId))
      }

      await Promise.all([reloadDepots(), loadBaseData(), loadMovements(1)])
    } catch (error) {
      alert(error.response?.data?.message || 'Impossible de supprimer ce dépôt pour le moment.')
    }
  }

  const saveDepot = async () => {
    setSavingDepot(true)
    setDepotErrors({})

    try {
      const payload = {
        name: depotForm.name,
        code: depotForm.code || null,
        address: depotForm.address || null,
        note: depotForm.note || null,
        active: depotForm.active,
        is_default: depotForm.is_default,
        sort_order: Number(depotForm.sort_order || 0),
      }

      let response

      if (depotForm.id) {
        response = await api.put(`/depots/${depotForm.id}`, payload)
      } else {
        response = await api.post('/depots', payload)
      }

      setDepotModal(false)
      await reloadDepots()
      if (response?.data?.id) {
        setSelectedDepotValue(String(response.data.id))
      }
      await Promise.all([loadBaseData(), loadMovements(1)])
    } catch (error) {
      setDepotErrors(error.response?.data?.errors ?? {})
    } finally {
      setSavingDepot(false)
    }
  }

  const filteredStock = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return stock.filter((item) => {
      if (!normalizedQuery) {
        return true
      }

      return (
        item.product?.name?.toLowerCase().includes(normalizedQuery)
        || item.product?.reference?.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [search, stock])

  const { items: paginatedStock, meta: stockMeta } = useMemo(
    () => paginateItems(filteredStock, stockPage, stockPerPage),
    [filteredStock, stockPage, stockPerPage],
  )

  const totalItems = stock.reduce((sum, item) => sum + Number(item.qty ?? 0), 0)
  const lowItems = stock.filter((item) => Number(item.qty ?? 0) <= Math.max(Number(item.product?.min_stock ?? 1), 1))
  const totalValue = stock.reduce((sum, item) => sum + Number(item.qty ?? 0) * Number(item.product?.buy_price ?? item.product?.price ?? 0), 0)
  const exportParams = {
    ...scopeParams,
    ...(movementDateFrom ? { date_from: movementDateFrom } : {}),
    ...(movementDateTo ? { date_to: movementDateTo } : {}),
    ...(movementType ? { type: movementType } : {}),
  }

  useEffect(() => {
    setStockPage(1)
  }, [search, selectedDepotId])

  useEffect(() => {
    if (stockPage !== stockMeta.current_page) {
      setStockPage(stockMeta.current_page)
    }
  }, [stockMeta.current_page, stockPage])

  const currentExportAction = tab === 'stock'
    ? {
        title: 'Stock dépôt',
        csvEntity: 'products',
        csvParams: scopeParams,
        csvFilename: 'stock_depot',
        documentKey: 'depot_stock_list',
        records: filteredStock,
        documentLayouts,
      }
    : {
        title: 'Mouvements stock',
        csvEntity: 'stock_movements',
        csvParams: exportParams,
        csvFilename: 'mouvements_depot',
        documentKey: 'stock_movements_list',
        records: movements,
        documentLayouts,
      }

  if (loading || depotsLoading || !depotsReady) {
    return <PageLoader />
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Dépôt</h1>
          <p className="text-sm text-muted-color mt-0.5">
            Stock central, réceptions et mouvements{selectedDepot ? ` | ${selectedDepot.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <PageExportActions {...currentExportAction} />
          <button onClick={() => { setForm({ product_id: '', qty: '', note: '' }); setErrors({}); setModal(true) }} className="btn-primary">
            <i className="fa-solid fa-plus" /> Réceptionner
          </button>
        </div>
      </div>

      {isAdmin() && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider">Dépôts configurés</h2>
            <button onClick={openCreateDepot} className="btn-secondary text-xs">
              <i className="fa-solid fa-plus" /> Nouveau dépôt
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {depots.map((depot) => {
              const isSelected = String(selectedDepotValue) === String(depot.id)

              return (
                <div
                  key={depot.id}
                  className="card"
                  style={{
                    borderColor: isSelected ? 'rgba(13,148,136,0.28)' : 'var(--border)',
                    boxShadow: isSelected ? '0 0 0 1px rgba(13,148,136,0.18)' : undefined,
                    opacity: depot.active ? 1 : 0.72,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-base-color">{depot.name}</div>
                        {depot.is_default && <span className="badge badge-blue">Défaut</span>}
                        {!depot.active && <span className="badge badge-red">Inactif</span>}
                      </div>
                      <div className="text-xs text-muted-color mt-1">{depot.code || 'Sans code'}</div>
                      {depot.address && <div className="text-xs text-secondary-color mt-2">{depot.address}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isSelected ? (
                        <span className="badge badge-green">Consulté</span>
                      ) : (
                        <button onClick={() => setSelectedDepotValue(String(depot.id))} className="btn-secondary text-xs" title="Consulter ce dépôt">
                          <i className="fa-solid fa-eye" /> Consulter
                        </button>
                      )}
                      <button onClick={() => openEditDepot(depot)} className="btn-secondary text-xs" title="Modifier ce dépôt">
                        <i className="fa-solid fa-pen" />
                      </button>
                      {!depot.is_default && (
                        <button onClick={() => deleteDepot(depot)} className="btn-secondary text-xs text-red-500" title="Supprimer ce dépôt">
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    {[
                      { label: 'Refs', value: depot.stocked_products_count ?? 0 },
                      { label: 'Sessions', value: depot.open_sessions_count ?? 0 },
                      { label: 'Équipe', value: depot.users_count ?? 0 },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl px-3 py-2 border border-theme" style={{ background: 'var(--surface-2)' }}>
                        <div className="text-[11px] text-muted-color">{item.label}</div>
                        <div className="text-sm font-bold text-base-color mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-secondary-color">
                    Stock total: <span className="font-mono font-semibold text-base-color">{fmt(depot.total_stock_qty)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Références', value: stock.length, icon: 'fa-solid fa-box-open', color: '#0d9488' },
          { label: 'Total unites', value: fmt(totalItems), icon: 'fa-solid fa-cubes', color: '#3b82f6' },
          { label: 'Valeur stock', value: `${fmt(totalValue)} TND`, icon: 'fa-solid fa-sack-dollar', color: '#8b5cf6' },
          { label: 'Stock bas', value: lowItems.length, icon: 'fa-solid fa-triangle-exclamation', color: '#ef4444' },
        ].map((kpi) => (
          <div key={kpi.label} className="card py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${kpi.color}1a` }}>
              <i className={`${kpi.icon} text-sm`} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xs text-muted-color">{kpi.label}</div>
              <div className={`text-sm font-bold ${kpi.label === 'Stock bas' && lowItems.length > 0 ? 'text-red-500' : 'text-base-color'}`}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-5 border-b border-theme">
        {[
          ['stock', 'fa-solid fa-warehouse', 'Stock dépôt'],
          ['movements', 'fa-solid fa-arrows-up-down', 'Mouvements'],
        ].map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${icon} text-xs`} /> {label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="card">
          <div className="mb-4">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
              <input placeholder="Rechercher un produit..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>

          {lowItems.length > 0 && (
            <div className="mb-4 rounded-xl p-3 border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation" /> {lowItems.length} produit(s) sous seuil minimum
              </div>
              <div className="flex flex-wrap gap-2">
                {lowItems.map((item) => (
                  <span
                    key={item.product_id}
                    className="text-xs px-2 py-1 rounded-lg border font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
                  >
                    {item.product?.name} - {fmt(item.qty)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Produit', 'Reference', 'Categorie', 'Unite', 'Qté dépôt', 'Min stock', 'Derniere maj', 'Statut'].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedStock.map((item) => {
                  const qty = Number(item.qty ?? 0)
                  const min = Math.max(Number(item.product?.min_stock ?? 1), 1)
                  const low = qty <= min

                  return (
                    <tr key={item.product_id} className="table-row">
                      <td className="py-3 pr-4 font-semibold text-base-color">{item.product?.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-color">{item.product?.reference ?? '-'}</td>
                      <td className="py-3 pr-4 text-secondary-color text-xs">{item.product?.category ?? '-'}</td>
                      <td className="py-3 pr-4 text-muted-color text-xs">{item.product?.unit ?? '-'}</td>
                      <td className="py-3 pr-4 font-bold font-mono" style={{ color: low ? '#dc2626' : '#0d9488' }}>{fmt(qty)}</td>
                      <td className="py-3 pr-4 text-muted-color font-mono text-xs">{fmt(min)}</td>
                      <td className="py-3 pr-4 text-muted-color text-xs">{fmtDateTime(item.updated_at)}</td>
                      <td className="py-3">
                        {low ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 10 }} /> Rupture
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-color">Aucun produit</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            meta={stockMeta}
            perPage={stockPerPage}
            onPageChange={setStockPage}
            onPerPageChange={(value) => {
              setStockPerPage(value)
              setStockPage(1)
            }}
            itemLabel="references"
          />
        </div>
      )}

      {tab === 'movements' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Recherche</label>
              <input value={movementSearch} onChange={(event) => { setMovementPage(1); setMovementSearch(event.target.value) }} placeholder="Produit, note ou utilisateur..." />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Type</label>
              <select value={movementType} onChange={(event) => { setMovementPage(1); setMovementType(event.target.value) }}>
                <option value="">Tous</option>
                {Object.entries(MOVEMENT_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
              <input type="date" value={movementDateFrom} onChange={(event) => { setMovementPage(1); setMovementDateFrom(event.target.value) }} />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Au</label>
              <input type="date" value={movementDateTo} onChange={(event) => { setMovementPage(1); setMovementDateTo(event.target.value) }} />
            </div>
          </div>

          {movementsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-color gap-2">
              <i className="fa-solid fa-spinner fa-spin" /> Chargement...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Type', 'Produit', 'Dépôt', 'Utilisateur', 'Quantité', 'Note', 'Date / heure', ''].map((heading) => (
                      <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const config = MOVEMENT_CONFIG[movement.type] ?? { label: movement.type, icon: 'fa-solid fa-circle', color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
                    const quantity = Number(movement.qty ?? 0)

                    return (
                      <tr key={movement.id} className="table-row">
                        <td className="py-3 pr-4">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: config.bg, color: config.color }}>
                            <i className={`${config.icon} text-[10px]`} />
                            {config.label}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-base-color">{movement.product?.name ?? '-'}</div>
                          <div className="text-xs text-muted-color">{movement.product?.reference ?? '-'}</div>
                        </td>
                        <td className="py-3 pr-4 text-muted-color text-xs">{movement.depot?.name ?? '-'}</td>
                        <td className="py-3 pr-4 text-secondary-color text-xs">{movement.user?.name ?? '-'}</td>
                        <td className="py-3 pr-4 font-bold font-mono text-sm" style={{ color: quantity >= 0 ? '#10b981' : '#ef4444' }}>
                          {quantity >= 0 ? '+' : ''}{fmt(quantity)}
                        </td>
                        <td className="py-3 pr-4 text-muted-color text-xs">{movement.note ?? '-'}</td>
                        <td className="py-3 text-muted-color text-xs">{fmtDateTime(movement.created_at)}</td>
                        <td className="py-3">
                          <RowDocumentActions
                            documentKey="stock_movement_item"
                            record={movement}
                            documentLayouts={documentLayouts}
                            title={`Mouvement ${movement.id}`}
                            filename={`mouvement_${movement.id}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-color">Aucun mouvement</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {movementMeta && (
            <PaginationControls
              meta={movementMeta}
              onPageChange={setMovementPage}
              itemLabel="mouvements"
            />
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Réceptionner un stock" size="sm">
        <div className="space-y-4">
          <FormField label="Produit" error={errors.product_id?.[0]} required>
            <select value={form.product_id} onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}>
              <option value="">Sélectionner un produit...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.reference}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Quantité" error={errors.qty?.[0]} required>
            <input type="number" step="0.001" min="0.001" value={form.qty} onChange={(event) => setForm((current) => ({ ...current, qty: event.target.value }))} placeholder="0.000" />
          </FormField>
          <FormField label="Note (facultatif)" error={errors.note?.[0]}>
            <input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Fournisseur, BL..." />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : <><i className="fa-solid fa-arrow-down-to-bracket" /> Réceptionner</>}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={depotModal} onClose={() => setDepotModal(false)} title={depotForm.id ? 'Modifier un dépôt' : 'Nouveau dépôt'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Nom" error={depotErrors.name?.[0]} required>
              <input value={depotForm.name} onChange={(event) => setDepotForm((current) => ({ ...current, name: event.target.value }))} placeholder="Dépôt Bizerte" />
            </FormField>
            <FormField label="Code" error={depotErrors.code?.[0]}>
              <input value={depotForm.code} onChange={(event) => setDepotForm((current) => ({ ...current, code: event.target.value }))} placeholder="bizerte" />
            </FormField>
          </div>

          <FormField label="Adresse" error={depotErrors.address?.[0]}>
            <input value={depotForm.address} onChange={(event) => setDepotForm((current) => ({ ...current, address: event.target.value }))} placeholder="Adresse du dépôt" />
          </FormField>

          <FormField label="Note" error={depotErrors.note?.[0]}>
            <textarea rows="3" value={depotForm.note} onChange={(event) => setDepotForm((current) => ({ ...current, note: event.target.value }))} placeholder="Informations internes" />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Ordre d'affichage" error={depotErrors.sort_order?.[0]}>
              <input type="number" min="0" value={depotForm.sort_order} onChange={(event) => setDepotForm((current) => ({ ...current, sort_order: event.target.value }))} />
            </FormField>
            <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
              <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
                <input type="checkbox" checked={depotForm.is_default} onChange={(event) => setDepotForm((current) => ({ ...current, is_default: event.target.checked }))} />
                Dépôt par défaut
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
            <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
              <input type="checkbox" checked={depotForm.active} onChange={(event) => setDepotForm((current) => ({ ...current, active: event.target.checked }))} />
              Dépôt actif
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setDepotModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveDepot} disabled={savingDepot} className="btn-primary">
              {savingDepot ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

