import { useCallback, useEffect, useMemo, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { findConfigItem, getConfigItemLabel, useConfigItems } from '../../hooks/useConfigItems'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCount, formatNumber } from '../../utils/format'
import { paginateItems } from '../../utils/pagination'

const EMPTY = {
  name: '',
  reference: '',
  category: '',
  buy_price: '',
  depot_price: '',
  unit: '',
  active: true,
  min_stock: '1',
  max_stock: '',
  zonePrices: {},
}

function clampMinStock(value) {
  if (value === '' || value == null) {
    return 1
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(parsed, 1) : 1
}

export default function ProductsIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const { layouts: documentLayouts } = useDocumentLayouts()
  const [products, setProducts] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [restockProduct, setRestockProduct] = useState(null)
  const [restockQty, setRestockQty] = useState('1')
  const [restockNote, setRestockNote] = useState('')
  const [restockSaving, setRestockSaving] = useState(false)
  const [restockError, setRestockError] = useState('')
  const [productPage, setProductPage] = useState(1)
  const [productPerPage, setProductPerPage] = useState(20)
  const { isAdmin } = useAuth()
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
  const { items: configItems } = useConfigItems(['category', 'unit'])

  const categories = configItems.category ?? []
  const units = configItems.unit ?? []

  const loadProducts = useCallback(async () => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    try {
      const productsResponse = await api.get('/products', {
        params: selectedDepotId ? { depot_id: selectedDepotId } : {},
      })

      const productList = Array.isArray(productsResponse.data)
        ? productsResponse.data
        : (productsResponse.data?.data ?? [])

      setProducts(productList)
    } finally {
      setLoading(false)
    }
  }, [depotsReady, selectedDepotId])

  const loadZones = useCallback(async () => {
    try {
      const zonesResponse = await api.get('/zones')
      setZones(zonesResponse.data ?? [])
    } catch {
      setZones([])
    }
  }, [])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    loadProducts()
  }, [depotsReady, loadProducts])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setErrors({})
    setModal(true)
  }

  const openEdit = (product) => {
    const zonePrices = {}
    ;(product.prices ?? []).forEach((item) => {
      zonePrices[item.zone_id] = item.price
    })

    setEditing(product)
    setForm({
      name: product.name ?? '',
      reference: product.reference ?? '',
      category: product.category ?? '',
      buy_price: product.buy_price ?? '',
      depot_price: product.depot_price ?? product.price ?? '',
      unit: product.unit ?? '',
      active: product.active ?? true,
      min_stock: String(clampMinStock(product.min_stock ?? 1)),
      max_stock: product.max_stock ?? '',
      zonePrices,
    })
    setErrors({})
    setModal(true)
  }

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      const prices = Object.entries(form.zonePrices)
        .filter(([, value]) => value !== '' && value != null)
        .map(([zoneId, price]) => ({
          zone_id: Number(zoneId),
          price: Number(price),
        }))

      const payload = {
        name: form.name,
        reference: form.reference,
        category: form.category || null,
        buy_price: form.buy_price === '' ? null : Number(form.buy_price),
        depot_price: Number(form.depot_price),
        unit: form.unit || null,
        active: form.active,
        min_stock: clampMinStock(form.min_stock),
        max_stock: form.max_stock === '' ? null : Number(form.max_stock),
        prices,
      }

      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
      } else {
        await api.post('/products', payload)
      }

      setModal(false)
      await loadProducts()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async (product) => {
    if (!confirm(t('products.deleteConfirm', { name: product.name }))) {
      return
    }

    await api.delete(`/products/${product.id}`)
    await loadProducts()
  }

  const openRestock = (product) => {
    setRestockProduct(product)
    setRestockQty('1')
    setRestockNote('')
    setRestockError('')
  }

  const submitRestock = async () => {
    if (!restockProduct) {
      return
    }

    setRestockSaving(true)
    setRestockError('')

    try {
      await api.post('/depot/receive', {
        product_id: restockProduct.id,
        qty: Number(restockQty),
        depot_id: selectedDepotId,
        note: restockNote || t('products.restock.defaultNote', { name: restockProduct.name }),
      })

      setRestockProduct(null)
      await loadProducts()
    } catch (error) {
      setRestockError(error.response?.data?.message || t('products.restock.errorFallback'))
    } finally {
      setRestockSaving(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return products.filter((product) => {
      if (!normalizedQuery) {
        return true
      }

      return (
        product.name?.toLowerCase().includes(normalizedQuery) ||
        product.reference?.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [products, search])

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const min = clampMinStock(product.min_stock ?? 1)
      const depotQty = Number(product.depot_qty ?? 0)
      return depotQty <= min
    })
  }, [products])

  const { items: paginatedProducts, meta: productMeta } = useMemo(
    () => paginateItems(filteredProducts, productPage, productPerPage),
    [filteredProducts, productPage, productPerPage]
  )

  useEffect(() => {
    setProductPage(1)
  }, [search, selectedDepotId])

  useEffect(() => {
    if (productPage !== productMeta.current_page) {
      setProductPage(productMeta.current_page)
    }
  }, [productMeta.current_page, productPage])

  if (loading || !depotsReady) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle', {
          count: products.length,
          depotSuffix: selectedDepot ? ` | ${t('products.depotScope', { depot: selectedDepot.name })}` : '',
        })}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canBrowseAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                label={t('products.viewedDepotLabel')}
              />
            )}
            <PageExportActions
              title={t('products.title')}
              csvEntity="products"
              csvParams={scopeParams}
              csvFilename="produits"
              documentKey="products_list"
              records={filteredProducts}
              documentLayouts={documentLayouts}
            />
            {isAdmin() && (
              <button onClick={openCreate} className="btn-primary">
                <i className="fa-solid fa-plus" /> {t('products.newProduct')}
              </button>
            )}
          </div>
        )}
      />

      {lowStockProducts.length > 0 && (
        <div
          className="mb-5 rounded-2xl p-4 border"
          style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.18)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              <i className="fa-solid fa-triangle-exclamation text-xs" style={{ color: '#dc2626' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: '#dc2626' }}>
              {t('products.lowStockBanner', { count: lowStockProducts.length })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {lowStockProducts.slice(0, 9).map((product) => {
              const min = clampMinStock(product.min_stock ?? 1)
              const depotQty = Number(product.depot_qty ?? 0)
              const camionQty = Number(product.camion_qty ?? 0)

              return (
                <div
                  key={product.id}
                  className="rounded-xl px-3 py-2.5 border"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}
                >
                  <div className="text-sm font-semibold text-base-color">{product.name}</div>
                  <div className="text-xs text-muted-color mt-1">
                    {t('products.depotQty')}: <span className="font-mono">{formatNumber(depotQty)}</span>
                    <span className="mx-2">|</span>
                    {t('products.camionQty')}: <span className="font-mono">{formatNumber(camionQty)}</span>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {t('products.minRequired')}: <span className="font-mono">{formatNumber(min)}</span>
                    {product.unit ? ` ${product.unit}` : ''}
                  </div>
                  {isAdmin() && (
                    <button onClick={() => openRestock(product)} className="btn-secondary text-xs mt-3">
                      <i className="fa-solid fa-plus" /> {t('products.restock.action')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
            <input
              placeholder={t('products.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  t('products.columns.name'),
                  t('products.columns.reference'),
                  t('products.columns.category'),
                  t('products.columns.buyPrice'),
                  t('products.columns.depotPrice'),
                  t('products.columns.depotStock'),
                  t('products.columns.camionStock'),
                  t('products.columns.minStock'),
                  t('products.columns.unit'),
                  ...(isAdmin() ? [t('common.actions')] : []),
                ].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const min = clampMinStock(product.min_stock ?? 1)
                const depotQty = Number(product.depot_qty ?? 0)
                const camionQty = Number(product.camion_qty ?? 0)
                const isLow = depotQty <= min
                const categoryLabel = getConfigItemLabel(findConfigItem(categories, product.category), product.category || notAvailable)
                const unitLabel = getConfigItemLabel(findConfigItem(units, product.unit), product.unit || notAvailable)

                return (
                  <tr key={product.id} className="table-row">
                    <td className="py-3 pr-4 font-semibold text-base-color">
                      {product.name}
                      {isLow && (
                        <i className="fa-solid fa-circle-exclamation ml-1.5 text-xs" style={{ color: '#dc2626' }} />
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-color">{product.reference || notAvailable}</td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{categoryLabel}</td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-secondary-color">
                      {product.buy_price != null ? formatNumber(product.buy_price) : notAvailable}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs font-semibold text-base-color">
                      {formatNumber(product.depot_price ?? product.price)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs" style={{ color: isLow ? '#dc2626' : 'var(--text-base)' }}>
                      {formatNumber(depotQty)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-secondary-color">{formatNumber(camionQty)}</td>
                    <td className="py-3 pr-4 font-mono text-xs" style={{ color: isLow ? '#dc2626' : '#059669' }}>
                      {formatNumber(min)}
                    </td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{unitLabel}</td>
                    {isAdmin() && (
                      <td className="py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={() => openRestock(product)} className="text-xs font-medium hover:underline" style={{ color: '#2563eb' }}>
                            <i className="fa-solid fa-boxes-stacked mr-1" /> {t('products.restock.action')}
                          </button>
                          <button onClick={() => openEdit(product)} className="text-xs font-medium hover:underline" style={{ color: '#0d9488' }}>
                            <i className="fa-solid fa-pen mr-1" /> {t('common.edit')}
                          </button>
                          <button onClick={() => removeProduct(product)} className="text-xs font-medium text-red-500 hover:text-red-700">
                            <i className="fa-solid fa-trash-can mr-1" /> {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={isAdmin() ? 10 : 9} className="py-12 text-center">
                    <i className="fa-solid fa-box text-3xl text-muted-color opacity-30 mb-2 block" />
                    <p className="text-muted-color text-sm">{t('products.noResults')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={productMeta}
          perPage={productPerPage}
          onPageChange={setProductPage}
          onPerPageChange={(value) => {
            setProductPerPage(value)
            setProductPage(1)
          }}
          itemLabel={t('products.itemLabel')}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('products.modal.editTitle') : t('products.modal.createTitle')}>
        <div className="space-y-4">
          <FormField label={t('products.fields.name')} error={errors.name?.[0]} required>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('products.placeholders.name')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('products.fields.reference')} error={errors.reference?.[0]}>
              <input
                value={form.reference}
                onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                placeholder={t('products.placeholders.reference')}
              />
            </FormField>
            <FormField label={t('products.fields.unit')} error={errors.unit?.[0]}>
              <select value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}>
                <option value="">{t('products.selectPlaceholder')}</option>
                {units.map((item) => (
                  <option key={item.id} value={item.value}>
                    {getConfigItemLabel(item)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('products.fields.buyPrice')} error={errors.buy_price?.[0]}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.buy_price}
                onChange={(event) => setForm((current) => ({ ...current, buy_price: event.target.value }))}
                placeholder={t('products.placeholders.price')}
              />
            </FormField>
            <FormField label={t('products.fields.depotPrice')} error={errors.depot_price?.[0]} required>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.depot_price}
                onChange={(event) => setForm((current) => ({ ...current, depot_price: event.target.value }))}
                placeholder={t('products.placeholders.price')}
              />
            </FormField>
          </div>

          <FormField label={t('products.fields.category')} error={errors.category?.[0]}>
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              <option value="">{t('products.selectPlaceholder')}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.value}>
                  {getConfigItemLabel(item)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('products.fields.minStock')} error={errors.min_stock?.[0]}>
              <input
                type="number"
                step="0.001"
                min="1"
                value={form.min_stock}
                onChange={(event) => setForm((current) => ({ ...current, min_stock: event.target.value }))}
                placeholder={t('products.placeholders.minStock')}
              />
            </FormField>
            <FormField label={t('products.fields.maxStock')} error={errors.max_stock?.[0]}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.max_stock}
                onChange={(event) => setForm((current) => ({ ...current, max_stock: event.target.value }))}
                placeholder={t('products.placeholders.price')}
              />
            </FormField>
          </div>

          {zones.length > 0 && (
            <div className="rounded-xl p-3 border border-theme" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-1">
                {t('products.zonePricing.title')}
              </div>
              <div className="text-xs text-muted-color mb-3">
                {t('products.zonePricing.hint')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {zones.map((zone) => (
                  <FormField key={zone.id} label={zone.name}>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.zonePrices[zone.id] ?? ''}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          zonePrices: { ...current.zonePrices, [zone.id]: event.target.value },
                        }))
                      }
                      placeholder={form.depot_price || t('products.placeholders.price')}
                    />
                  </FormField>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(restockProduct)}
        onClose={() => setRestockProduct(null)}
        title={restockProduct ? t('products.restock.titleWithName', { name: restockProduct.name }) : t('products.restock.title')}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-theme px-4 py-3 text-sm text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            {t('products.restock.infoPrefix')} <strong className="text-base-color">depot_in</strong>.
          </div>

          {restockError && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-600" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {restockError}
            </div>
          )}

          <FormField label={t('products.restock.qtyLabel')} required>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={restockQty}
              onChange={(event) => setRestockQty(event.target.value)}
              placeholder={t('products.placeholders.minStock')}
            />
          </FormField>

          <FormField label={t('products.restock.noteLabel')}>
            <textarea
              rows="3"
              value={restockNote}
              onChange={(event) => setRestockNote(event.target.value)}
              placeholder={t('products.restock.notePlaceholder')}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setRestockProduct(null)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={submitRestock} disabled={restockSaving} className="btn-primary">
              {restockSaving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : <><i className="fa-solid fa-check" /> {t('products.restock.confirm')}</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

