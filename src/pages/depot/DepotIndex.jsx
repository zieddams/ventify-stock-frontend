import { useEffect, useMemo, useState } from 'react'
import FormField from '../../components/FormField'
import FrenchDateTimeInput from '../../components/FrenchDateTimeInput'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/format'
import { extractPaginationMeta, paginateItems } from '../../utils/pagination'

function formatDepotDateTime(value, fallback = '-') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return fallback
  }

  return formatDateTime(value)
}

function buildDepotForm(depot = null, depots = [], companyId = null) {
  return {
    id: depot?.id ?? null,
    company_id: depot?.company_id ? String(depot.company_id) : (companyId ? String(companyId) : ''),
    name: depot?.name ?? '',
    code: depot?.code ?? '',
    address: depot?.address ?? '',
    note: depot?.note ?? '',
    active: depot?.active ?? true,
    is_default: depot?.is_default ?? false,
    sort_order: depot?.sort_order ?? (depots.reduce((max, item) => Math.max(max, Number(item.sort_order ?? 0)), 0) + 1),
  }
}

function buildMovementConfig(t) {
  return {
    depot_in: { label: t('reportsPage.movements.types.depot_in'), icon: 'fa-solid fa-arrow-down', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
    depot_to_camion: { label: t('reportsPage.movements.types.depot_to_camion'), icon: 'fa-solid fa-truck', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
    camion_to_customer: { label: t('reportsPage.movements.types.camion_to_customer'), icon: 'fa-solid fa-user', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    return: { label: t('reportsPage.movements.types.return'), icon: 'fa-solid fa-rotate-left', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    adjustment: { label: t('reportsPage.movements.types.adjustment'), icon: 'fa-solid fa-sliders', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  }
}

export default function DepotIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const { layouts: documentLayouts } = useDocumentLayouts()
  const { isDeveloper } = useAuth()
  const canManageDepots = isDeveloper()
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
    includeInactive: canManageDepots,
    storageKey: 'app-depot-scope',
  })

  const movementConfig = buildMovementConfig(t)
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
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    if (!canManageDepots) {
      setCompanies([])
      return
    }

    let cancelled = false

    api.get('/companies')
      .then((response) => {
        if (!cancelled) {
          setCompanies(Array.isArray(response.data) ? response.data : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanies([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [canManageDepots])

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

  const defaultCompanyId = selectedDepot?.company_id ?? selectedDepot?.company?.id ?? companies.find((company) => company.is_default)?.id ?? companies[0]?.id ?? ''

  const openCreateDepot = () => {
    setDepotForm(buildDepotForm(null, depots, defaultCompanyId))
    setDepotErrors({})
    setDepotModal(true)
  }

  const openEditDepot = (depot) => {
    setDepotForm(buildDepotForm(depot, depots, depot?.company_id ?? defaultCompanyId))
    setDepotErrors({})
    setDepotModal(true)
  }

  const deleteDepot = async (depot) => {
    if (!depot) {
      return
    }

    if (!confirm(t('depotPage.alerts.deleteConfirm', { name: depot.name }))) {
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
      alert(error.response?.data?.message || t('depotPage.alerts.deleteError'))
    }
  }

  const saveDepot = async () => {
    setSavingDepot(true)
    setDepotErrors({})

    try {
      const payload = {
        ...(canManageDepots && depotForm.company_id ? { company_id: Number(depotForm.company_id) } : {}),
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
        title: t('depotPage.tabs.stock'),
        csvEntity: 'products',
        csvParams: scopeParams,
        csvFilename: 'stock_depot',
        documentKey: 'depot_stock_list',
        records: filteredStock,
        documentLayouts,
      }
    : {
        title: t('depotPage.tabs.movements'),
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

  const stockHeaders = [
    t('depotPage.stockTable.product'),
    t('depotPage.stockTable.reference'),
    t('depotPage.stockTable.category'),
    t('depotPage.stockTable.unit'),
    t('depotPage.stockTable.depotQty'),
    t('depotPage.stockTable.minStock'),
    t('depotPage.stockTable.updatedAt'),
    t('depotPage.stockTable.status'),
  ]

  const movementHeaders = [
    t('depotPage.movementsTable.type'),
    t('depotPage.movementsTable.product'),
    t('depotPage.movementsTable.depot'),
    t('depotPage.movementsTable.user'),
    t('depotPage.movementsTable.qty'),
    t('depotPage.movementsTable.note'),
    t('depotPage.movementsTable.dateTime'),
    '',
  ]

  const subtitle = t('depotPage.subtitle', { depot: selectedDepot?.name || '' })

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">{t('depotPage.title')}</h1>
          <p className="text-sm text-muted-color mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <PageExportActions {...currentExportAction} />
          <button onClick={() => { setForm({ product_id: '', qty: '', note: '' }); setErrors({}); setModal(true) }} className="btn-primary">
            <i className="fa-solid fa-plus" /> {t('depotPage.receiveAction')}
          </button>
        </div>
      </div>

      {canManageDepots && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider">{t('depotPage.managedDepotsTitle')}</h2>
            <button onClick={openCreateDepot} className="btn-secondary text-xs">
              <i className="fa-solid fa-plus" /> {t('depotPage.newDepot')}
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
                        {depot.is_default && <span className="badge badge-blue">{t('depotPage.badges.default')}</span>}
                        {!depot.active && <span className="badge badge-red">{t('depotPage.badges.inactive')}</span>}
                      </div>
                      <div className="text-xs text-muted-color mt-1">{depot.code || t('depotPage.labels.noCode')}</div>
                      {depot.company?.name && (
                        <div className="text-xs text-secondary-color mt-2">
                          {t('depotPage.labels.company')}: <span className="font-medium text-base-color">{depot.company.name}</span>
                        </div>
                      )}
                      {depot.address && <div className="text-xs text-secondary-color mt-2">{depot.address}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isSelected ? (
                        <span className="badge badge-green">{t('depotPage.badges.viewing')}</span>
                      ) : (
                        <button onClick={() => setSelectedDepotValue(String(depot.id))} className="btn-secondary text-xs" title={t('depotPage.titles.view')}>
                          <i className="fa-solid fa-eye" /> {t('depotPage.actions.view')}
                        </button>
                      )}
                      <button onClick={() => openEditDepot(depot)} className="btn-secondary text-xs" title={t('depotPage.titles.edit')}>
                        <i className="fa-solid fa-pen" />
                      </button>
                      {!depot.is_default && (
                        <button onClick={() => deleteDepot(depot)} className="btn-secondary text-xs text-red-500" title={t('depotPage.titles.delete')}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    {[
                      { label: t('depotPage.metrics.refs'), value: depot.stocked_products_count ?? 0 },
                      { label: t('depotPage.metrics.sessions'), value: depot.open_sessions_count ?? 0 },
                      { label: t('depotPage.metrics.team'), value: depot.users_count ?? 0 },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl px-3 py-2 border border-theme" style={{ background: 'var(--surface-2)' }}>
                        <div className="text-[11px] text-muted-color">{item.label}</div>
                        <div className="text-sm font-bold text-base-color mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-secondary-color">
                    {t('depotPage.labels.stockTotal')}: <span className="font-mono font-semibold text-base-color">{formatNumber(depot.total_stock_qty)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: t('depotPage.kpis.references'), value: stock.length, icon: 'fa-solid fa-box-open', color: '#0d9488' },
          { label: t('depotPage.kpis.totalUnits'), value: formatNumber(totalItems), icon: 'fa-solid fa-cubes', color: '#3b82f6' },
          { label: t('depotPage.kpis.stockValue'), value: formatCurrency(totalValue), icon: 'fa-solid fa-sack-dollar', color: '#8b5cf6' },
          { label: t('depotPage.kpis.lowStock'), value: lowItems.length, icon: 'fa-solid fa-triangle-exclamation', color: '#ef4444' },
        ].map((kpi) => (
          <div key={kpi.label} className="card py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${kpi.color}1a` }}>
              <i className={`${kpi.icon} text-sm`} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xs text-muted-color">{kpi.label}</div>
              <div className={`text-sm font-bold ${kpi.label === t('depotPage.kpis.lowStock') && lowItems.length > 0 ? 'text-red-500' : 'text-base-color'}`}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-5 border-b border-theme">
        {[
          ['stock', 'fa-solid fa-warehouse', t('depotPage.tabs.stock')],
          ['movements', 'fa-solid fa-arrows-up-down', t('depotPage.tabs.movements')],
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
              <input placeholder={t('depotPage.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>

          {lowItems.length > 0 && (
            <div className="mb-4 rounded-xl p-3 border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation" /> {t('depotPage.lowStockSummary', { count: lowItems.length })}
              </div>
              <div className="flex flex-wrap gap-2">
                {lowItems.map((item) => (
                  <span
                    key={item.product_id}
                    className="text-xs px-2 py-1 rounded-lg border font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
                  >
                    {item.product?.name ?? notAvailable} - {formatNumber(item.qty)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {stockHeaders.map((heading) => (
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
                      <td className="py-3 pr-4 font-semibold text-base-color">{item.product?.name ?? notAvailable}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-color">{item.product?.reference ?? notAvailable}</td>
                      <td className="py-3 pr-4 text-secondary-color text-xs">{item.product?.category ?? notAvailable}</td>
                      <td className="py-3 pr-4 text-muted-color text-xs">{item.product?.unit ?? notAvailable}</td>
                      <td className="py-3 pr-4 font-bold font-mono" style={{ color: low ? '#dc2626' : '#0d9488' }}>{formatNumber(qty)}</td>
                      <td className="py-3 pr-4 text-muted-color font-mono text-xs">{formatNumber(min)}</td>
                      <td className="py-3 pr-4 text-muted-color text-xs">{formatDepotDateTime(item.updated_at, notAvailable)}</td>
                      <td className="py-3">
                        {low ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 10 }} /> {t('depotPage.status.low')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} /> {t('depotPage.status.normal')}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-color">{t('depotPage.emptyProducts')}</td>
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
            itemLabel={t('depotPage.paginationItem')}
          />
        </div>
      )}

      {tab === 'movements' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">{t('depotPage.movementFilters.search')}</label>
              <input value={movementSearch} onChange={(event) => { setMovementPage(1); setMovementSearch(event.target.value) }} placeholder={t('depotPage.movementFilters.searchPlaceholder')} />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">{t('depotPage.movementFilters.type')}</label>
              <select value={movementType} onChange={(event) => { setMovementPage(1); setMovementType(event.target.value) }}>
                <option value="">{t('depotPage.movementFilters.all')}</option>
                {Object.entries(movementConfig).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateFrom')}</label>
              <FrenchDateTimeInput type="date" value={movementDateFrom} onChange={(event) => { setMovementPage(1); setMovementDateFrom(event.target.value) }} />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateTo')}</label>
              <FrenchDateTimeInput type="date" value={movementDateTo} onChange={(event) => { setMovementPage(1); setMovementDateTo(event.target.value) }} />
            </div>
          </div>

          {movementsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-color gap-2">
              <i className="fa-solid fa-spinner fa-spin" /> {t('depotPage.loading')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                    {movementHeaders.map((heading) => (
                      <th key={heading || 'actions'} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const config = movementConfig[movement.type] ?? { label: movement.type, icon: 'fa-solid fa-circle', color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
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
                          <div className="font-medium text-base-color">{movement.product?.name ?? notAvailable}</div>
                          <div className="text-xs text-muted-color">{movement.product?.reference ?? notAvailable}</div>
                        </td>
                        <td className="py-3 pr-4 text-muted-color text-xs">{movement.depot?.name ?? notAvailable}</td>
                        <td className="py-3 pr-4 text-secondary-color text-xs">{movement.user?.name ?? notAvailable}</td>
                        <td className="py-3 pr-4 font-bold font-mono text-sm" style={{ color: quantity >= 0 ? '#10b981' : '#ef4444' }}>
                          {quantity >= 0 ? '+' : '-'}{formatNumber(Math.abs(quantity))}
                        </td>
                        <td className="py-3 pr-4 text-muted-color text-xs">{movement.note ?? notAvailable}</td>
                        <td className="py-3 text-muted-color text-xs">{formatDepotDateTime(movement.created_at, notAvailable)}</td>
                        <td className="py-3">
                          <RowDocumentActions
                            documentKey="stock_movement_item"
                            record={movement}
                            documentLayouts={documentLayouts}
                            title={t('depotPage.rowDocumentTitle', { id: movement.id })}
                            filename={`mouvement_${movement.id}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-color">{t('depotPage.emptyMovements')}</td>
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
              itemLabel={t('depotPage.tabs.movements').toLowerCase()}
            />
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={t('depotPage.receiveModal.title')} size="sm">
        <div className="space-y-4">
          <FormField label={t('depotPage.receiveModal.product')} error={errors.product_id?.[0]} required>
            <select value={form.product_id} onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}>
              <option value="">{t('depotPage.receiveModal.selectProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.reference || notAvailable}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('depotPage.receiveModal.qty')} error={errors.qty?.[0]} required>
            <input type="number" step="0.001" min="0.001" value={form.qty} onChange={(event) => setForm((current) => ({ ...current, qty: event.target.value }))} placeholder={t('depotPage.receiveModal.qtyPlaceholder')} />
          </FormField>
          <FormField label={t('depotPage.receiveModal.note')} error={errors.note?.[0]}>
            <input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder={t('depotPage.receiveModal.notePlaceholder')} />
          </FormField>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('depotPage.receiveModal.saving')}</> : <><i className="fa-solid fa-arrow-down-to-bracket" /> {t('depotPage.receiveModal.save')}</>}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={depotModal} onClose={() => setDepotModal(false)} title={depotForm.id ? t('depotPage.depotModal.editTitle') : t('depotPage.depotModal.createTitle')} size="md">
        <div className="space-y-4">
          {canManageDepots && (
            <FormField label={t('depotPage.depotModal.company')} error={depotErrors.company_id?.[0]} required>
              <select value={depotForm.company_id} onChange={(event) => setDepotForm((current) => ({ ...current, company_id: event.target.value }))}>
                <option value="">{t('depotPage.depotModal.selectCompany')}</option>
                {companies.filter((company) => company.active !== false).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label={t('depotPage.depotModal.name')} error={depotErrors.name?.[0]} required>
              <input value={depotForm.name} onChange={(event) => setDepotForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('depotPage.depotModal.placeholders.name')} />
            </FormField>
            <FormField label={t('depotPage.depotModal.code')} error={depotErrors.code?.[0]}>
              <input value={depotForm.code} onChange={(event) => setDepotForm((current) => ({ ...current, code: event.target.value }))} placeholder={t('depotPage.depotModal.placeholders.code')} />
            </FormField>
          </div>

          <FormField label={t('depotPage.depotModal.address')} error={depotErrors.address?.[0]}>
            <input value={depotForm.address} onChange={(event) => setDepotForm((current) => ({ ...current, address: event.target.value }))} placeholder={t('depotPage.depotModal.placeholders.address')} />
          </FormField>

          <FormField label={t('depotPage.depotModal.note')} error={depotErrors.note?.[0]}>
            <textarea rows="3" value={depotForm.note} onChange={(event) => setDepotForm((current) => ({ ...current, note: event.target.value }))} placeholder={t('depotPage.depotModal.placeholders.note')} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label={t('depotPage.depotModal.sortOrder')} error={depotErrors.sort_order?.[0]}>
              <input type="number" min="0" value={depotForm.sort_order} onChange={(event) => setDepotForm((current) => ({ ...current, sort_order: event.target.value }))} />
            </FormField>
            <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
              <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
                <input type="checkbox" checked={depotForm.is_default} onChange={(event) => setDepotForm((current) => ({ ...current, is_default: event.target.checked }))} />
                {t('depotPage.depotModal.defaultToggle')}
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
            <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
              <input type="checkbox" checked={depotForm.active} onChange={(event) => setDepotForm((current) => ({ ...current, active: event.target.checked }))} />
              {t('depotPage.depotModal.activeToggle')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setDepotModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={saveDepot} disabled={savingDepot} className="btn-primary">
              {savingDepot ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
