import { useEffect, useMemo, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatDateTime, formatNumber } from '../../utils/format'
import { extractPaginationMeta, paginateItems } from '../../utils/pagination'

function fmt(value, fallback = '-') {
  return value != null ? formatNumber(value) : fallback
}

export default function InventaireIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const { layouts: documentLayouts } = useDocumentLayouts()
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    selectedDepot,
    canBrowseAll,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: false,
    storageKey: 'app-depot-scope',
  })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortBy, setSortBy] = useState('low_stock_first')
  const [productPage, setProductPage] = useState(1)
  const [productPerPage, setProductPerPage] = useState(15)

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyMeta, setHistoryMeta] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')

  const inventoryFilterOptions = useMemo(() => ([
    { value: 'all', label: t('inventory.filters.all') },
    { value: 'low_stock', label: t('inventory.filters.lowStock') },
    { value: 'normal_stock', label: t('inventory.filters.normalStock') },
    { value: 'counted', label: t('inventory.filters.counted') },
  ]), [t])

  const inventorySortOptions = useMemo(() => ([
    { value: 'low_stock_first', label: t('inventory.sorts.lowStockFirst') },
    { value: 'updated_desc', label: t('inventory.sorts.updatedDesc') },
    { value: 'created_desc', label: t('inventory.sorts.createdDesc') },
    { value: 'name_asc', label: t('inventory.sorts.nameAsc') },
  ]), [t])

  const loadProducts = async () => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    try {
      const response = await api.get('/products', { params: scopeParams })
      const list = Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
      setProducts(list.filter((product) => product.active))
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (page = historyPage) => {
    if (!depotsReady) {
      return
    }

    setHistoryLoading(true)

    try {
      const response = await api.get('/inventory/history', {
        params: {
          page,
          per_page: 15,
          ...scopeParams,
          ...(historySearch.trim() ? { q: historySearch.trim() } : {}),
          ...(historyDateFrom ? { date_from: historyDateFrom } : {}),
          ...(historyDateTo ? { date_to: historyDateTo } : {}),
        },
      })

      const payload = response.data
      const items = Array.isArray(payload) ? payload : (payload.data ?? [])
      const meta = extractPaginationMeta(payload, { current_page: page, per_page: 15 })

      setHistory(items)
      setHistoryMeta(meta)
      setHistoryPage(page)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    loadProducts()
  }, [depotsReady, selectedDepotId])

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    loadHistory(historyPage)
  }, [depotsReady, historyPage, historySearch, historyDateFrom, historyDateTo, selectedDepotId])

  const handleCount = (id, value) => {
    setCounts((current) => ({ ...current, [id]: value }))
  }

  const countedProducts = useMemo(
    () => products.filter((product) => counts[product.id] !== undefined && counts[product.id] !== ''),
    [counts, products],
  )

  const handleSubmit = async () => {
    const lines = countedProducts.map((product) => ({
      product_id: product.id,
      counted_qty: Number(counts[product.id]),
    }))

    if (lines.length === 0) {
      return
    }

    setSaving(true)

    try {
      const response = await api.post('/inventory/count', {
        lines,
        note: note || null,
        depot_id: selectedDepotId,
      })
      setResult(response.data)
      setShowModal(true)
      setCounts({})
      setNote('')
      await Promise.all([loadProducts(), loadHistory(1)])
    } catch (error) {
      alert(error.response?.data?.message ?? t('inventory.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return products
      .filter((product) => (
        !normalizedSearch
        || product.name.toLowerCase().includes(normalizedSearch)
        || product.reference?.toLowerCase().includes(normalizedSearch)
      ))
      .filter((product) => {
        const systemQty = Number(product.depot_qty ?? product.qty ?? 0)
        const minStock = Math.max(Number(product.min_stock ?? 1), 1)
        const hasCounted = counts[product.id] !== undefined && counts[product.id] !== ''

        if (stockFilter === 'low_stock') {
          return systemQty <= minStock
        }

        if (stockFilter === 'normal_stock') {
          return systemQty > minStock
        }

        if (stockFilter === 'counted') {
          return hasCounted
        }

        return true
      })
      .sort((left, right) => {
        const leftQty = Number(left.depot_qty ?? left.qty ?? 0)
        const rightQty = Number(right.depot_qty ?? right.qty ?? 0)
        const leftMin = Math.max(Number(left.min_stock ?? 1), 1)
        const rightMin = Math.max(Number(right.min_stock ?? 1), 1)
        const leftLow = leftQty <= leftMin ? 1 : 0
        const rightLow = rightQty <= rightMin ? 1 : 0

        if (sortBy === 'updated_desc') {
          return new Date(right.updated_at ?? 0).getTime() - new Date(left.updated_at ?? 0).getTime()
        }

        if (sortBy === 'created_desc') {
          return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
        }

        if (sortBy === 'name_asc') {
          return String(left.name || '').localeCompare(String(right.name || ''))
        }

        if (leftLow !== rightLow) {
          return rightLow - leftLow
        }

        const leftGap = leftMin - leftQty
        const rightGap = rightMin - rightQty

        if (rightGap !== leftGap) {
          return rightGap - leftGap
        }

        return String(left.name || '').localeCompare(String(right.name || ''))
      })
  }, [counts, products, search, sortBy, stockFilter])

  const { items: paginatedProducts, meta: productsMeta } = useMemo(
    () => paginateItems(filteredProducts, productPage, productPerPage),
    [filteredProducts, productPage, productPerPage],
  )

  useEffect(() => {
    setProductPage(1)
  }, [search, selectedDepotId, stockFilter, sortBy])

  useEffect(() => {
    if (productPage !== productsMeta.current_page) {
      setProductPage(productsMeta.current_page)
    }
  }, [productPage, productsMeta.current_page])

  if (loading) {
    return <PageLoader />
  }

  const depotSuffix = selectedDepot ? ` | ${t('inventory.selectedDepot', { name: selectedDepot.name })}` : ''

  return (
    <div>
      <PageHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle', { depotSuffix })}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canBrowseAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                label={t('inventory.scopeLabel')}
              />
            )}
            <PageExportActions
              title={t('inventory.title')}
              csvEntity="stock_movements"
              csvParams={{
                ...scopeParams,
                ...(historyDateFrom ? { date_from: historyDateFrom } : {}),
                ...(historyDateTo ? { date_to: historyDateTo } : {}),
                type: 'adjustment',
              }}
              csvFilename="inventaire_audit"
              documentKey="inventory_history_list"
              records={history}
              documentLayouts={documentLayouts}
            />
            {countedProducts.length > 0 && (
              <button onClick={handleSubmit} disabled={saving} className="btn-primary">
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                  : <><i className="fa-solid fa-check" /> {t('inventory.validateCounted', { count: countedProducts.length })}</>
                }
              </button>
            )}
          </div>
        )}
      />

      <div className="mb-5 rounded-2xl p-4 border flex items-start gap-3" style={{ background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.18)' }}>
        <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
        <div className="text-sm" style={{ color: '#2563eb' }}>
          {t('inventory.infoBanner')}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card">
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color" style={{ fontSize: 13 }} />
              <input type="text" placeholder={t('inventory.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: '2.25rem' }} />
            </div>
            <div className="w-full lg:w-52">
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                {inventoryFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="w-full lg:w-60">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {inventorySortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('inventory.batchNotePlaceholder')} />
            </div>
            {countedProducts.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full h-fit" style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488' }}>
                {t('inventory.countedBadge', { count: countedProducts.length })}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-3 pr-4">{t('inventory.columns.product')}</th>
                  <th className="text-right pb-3 pr-4">{t('inventory.columns.systemStock')}</th>
                  <th className="text-right pb-3 pr-4">{t('inventory.columns.minStock')}</th>
                  <th className="pb-3 pr-4" style={{ width: 180 }}>{t('inventory.columns.countedQty')}</th>
                  <th className="text-right pb-3">{t('inventory.columns.delta')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <i className="fa-solid fa-clipboard-list text-3xl text-muted-color opacity-30 mb-2 block" />
                      <p className="text-muted-color text-sm">{t('inventory.emptyProducts')}</p>
                    </td>
                  </tr>
                )}
                {paginatedProducts.map((product) => {
                  const counted = counts[product.id]
                  const hasCounted = counted !== undefined && counted !== ''
                  const systemQty = Number(product.depot_qty ?? product.qty ?? 0)
                  const countedQty = hasCounted ? Number(counted) : null
                  const delta = hasCounted ? countedQty - systemQty : null
                  const minStock = Math.max(Number(product.min_stock ?? 1), 1)

                  return (
                    <tr key={product.id} className="table-row">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-base-color text-sm">{product.name}</div>
                        <div className="text-xs text-muted-color">
                          {product.reference || notAvailable}{product.unit ? ` | ${product.unit}` : ''}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-base-color">{fmt(systemQty, notAvailable)}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{fmt(minStock, notAvailable)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="0.000"
                          value={counted ?? ''}
                          onChange={(event) => handleCount(product.id, event.target.value)}
                          style={{ textAlign: 'right', width: '100%', padding: '0.35rem 0.6rem' }}
                        />
                      </td>
                      <td className="py-3 text-right">
                        {delta !== null ? (
                          <span className="text-sm font-bold font-mono" style={{ color: delta === 0 ? '#059669' : delta > 0 ? '#3b82f6' : '#dc2626' }}>
                            {delta > 0 ? '+' : ''}{fmt(delta, notAvailable)}
                          </span>
                        ) : (
                          <span className="text-muted-color">{notAvailable}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <PaginationControls
            meta={productsMeta}
            perPage={productPerPage}
            onPageChange={setProductPage}
            onPerPageChange={(value) => {
              setProductPerPage(value)
              setProductPage(1)
            }}
            itemLabel={t('inventory.itemLabel')}
          />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-base-color">{t('inventory.history.title')}</h2>
              <p className="text-xs text-muted-color mt-0.5">{t('inventory.history.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <input value={historySearch} onChange={(event) => { setHistoryPage(1); setHistorySearch(event.target.value) }} placeholder={t('inventory.history.searchPlaceholder')} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={historyDateFrom} onChange={(event) => { setHistoryPage(1); setHistoryDateFrom(event.target.value) }} />
              <input type="date" value={historyDateTo} onChange={(event) => { setHistoryPage(1); setHistoryDateTo(event.target.value) }} />
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-color gap-2">
              <i className="fa-solid fa-spinner fa-spin" /> {t('inventory.history.loading')}
            </div>
          ) : (
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="rounded-xl border border-theme px-3 py-6 text-center text-sm text-muted-color">
                  {t('inventory.history.empty')}
                </div>
              )}
              {history.map((movement) => (
                <div key={movement.id} className="rounded-xl border border-theme px-3 py-3" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-base-color">{movement.product?.name ?? t('inventory.history.deletedProduct')}</div>
                      <div className="text-xs text-muted-color mt-0.5">
                        {movement.product?.reference || notAvailable} | {movement.user?.name || notAvailable}
                      </div>
                      <div className="text-[11px] text-muted-color mt-1">
                        {t('inventory.history.depotLabel', { name: movement.depot?.name ?? t('depot.notDefined') })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono" style={{ color: Number(movement.qty) >= 0 ? '#3b82f6' : '#dc2626' }}>
                        {Number(movement.qty) >= 0 ? '+' : ''}{fmt(movement.qty, notAvailable)}
                      </div>
                      <div className="text-xs text-muted-color">
                        {movement.created_at ? formatDateTime(movement.created_at) : notAvailable}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-secondary-color mt-2">{movement.note || t('inventory.history.withoutNote')}</div>
                </div>
              ))}
            </div>
          )}

          {historyMeta && (
            <PaginationControls
              meta={historyMeta}
              onPageChange={setHistoryPage}
              itemLabel={t('inventory.history.itemLabel')}
            />
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setResult(null)
        }}
        title={t('inventory.modal.title')}
        size="md"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: '#059669' }}>
          <i className="fa-solid fa-circle-check text-lg" />
          {t('inventory.modal.success')}
        </div>

        {result?.adjustments && result.adjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-3">{t('inventory.columns.product')}</th>
                  <th className="text-right pb-2 pr-3">{t('inventory.columns.before')}</th>
                  <th className="text-right pb-2 pr-3">{t('inventory.columns.after')}</th>
                  <th className="text-right pb-2">{t('inventory.columns.delta')}</th>
                </tr>
              </thead>
              <tbody>
                {result.adjustments.map((adjustment, index) => (
                  <tr key={index} className="table-row">
                    <td className="py-2 pr-3 font-medium text-base-color">{adjustment.product_name}</td>
                    <td className="py-2 pr-3 text-right font-mono text-muted-color">{fmt(adjustment.before, notAvailable)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-base-color">{fmt(adjustment.after, notAvailable)}</td>
                    <td className="py-2 text-right font-mono font-bold" style={{ color: adjustment.delta >= 0 ? '#3b82f6' : '#dc2626' }}>
                      {adjustment.delta >= 0 ? '+' : ''}{fmt(adjustment.delta, notAvailable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-color text-sm">{t('inventory.modal.empty')}</p>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={() => { setShowModal(false); setResult(null) }} className="btn-primary">
            <i className="fa-solid fa-check" /> {t('common.close')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
