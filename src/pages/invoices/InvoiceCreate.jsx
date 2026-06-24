import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DepotScopeControls from '../../components/DepotScopeControls'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../../hooks/useConfigItems'
import api from '../../services/api'
import { formatCurrency, formatNumber } from '../../utils/format'
import { filterPaymentMethodsByScope } from '../../utils/paymentMethodScopes'

const EMPTY_LINE = { product_id: '', product_name: '', unit: '', qty: 1, price: 0, total: 0, buy_price: null }

function serializeDecimal(value) {
  return Number(value ?? 0).toFixed(3)
}

export default function InvoiceCreate() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const { items: configItems } = useConfigItems('payment_method')
  const paymentMethods = filterPaymentMethodsByScope(configItems.payment_method ?? [], 'customer')
  const availablePaymentMethods = paymentMethods.length > 0
    ? paymentMethods
    : [{ value: 'cash', display_label: t('invoiceCreate.cashFallback') }]
  const defaultPaymentMethod = getDefaultConfigValue(availablePaymentMethods, 'cash')
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

  const [customer, setCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod)

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    Promise.all([
      api.get('/products', { params: scopeParams }),
      api.get('/customers'),
    ])
      .then(([productsResponse, customersResponse]) => {
        setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : [])
        setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : [])
      })
      .catch(() => null)
      .finally(() => {
        setLoading(false)
      })
  }, [depotsReady, scopeParams, selectedDepotId])

  useEffect(() => {
    setPaymentMethod((current) => current || defaultPaymentMethod)
  }, [defaultPaymentMethod])

  const updateLine = (index, field, value) => {
    setLines((currentLines) => currentLines.map((line, currentIndex) => {
      if (currentIndex !== index) {
        return line
      }

      const nextLine = { ...line, [field]: value }

      if (field === 'product_id') {
        const product = products.find((item) => String(item.id) === String(value))
        if (product) {
          nextLine.product_name = product.name
          nextLine.price = Number(product.sale_price ?? product.depot_price ?? product.price)
          nextLine.unit = product.unit ?? ''
          nextLine.buy_price = product.buy_price != null ? Number(product.buy_price) : null
        }
      }

      if (['qty', 'price', 'product_id'].includes(field)) {
        nextLine.total = Number(nextLine.qty ?? 0) * Number(nextLine.price ?? 0)
      }

      return nextLine
    }))
  }

  const addLine = () => setLines((current) => [...current, { ...EMPTY_LINE }])
  const removeLine = (index) => setLines((current) => current.filter((_, currentIndex) => currentIndex !== index))

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + Number(line.total ?? 0), 0), [lines])
  const taxAmount = subtotal * (Number(taxRate) / 100)
  const total = subtotal + taxAmount
  const remaining = total - (Number(paidAmount) || 0)

  const submit = async () => {
    if (!customer) {
      setErrors({ customer: [t('invoiceCreate.errors.selectCustomer')] })
      return
    }

    if (!selectedDepotId) {
      setErrors({ depot_id: [t('invoiceCreate.errors.selectDepot')] })
      return
    }

    if (lines.some((line) => !line.product_id || Number(line.qty) <= 0)) {
      setErrors({ lines: [t('invoiceCreate.errors.completeLines')] })
      return
    }

    setSaving(true)
    setErrors({})

    try {
      const response = await api.post('/invoices', {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        customer_tax_id: customer.tax_id,
        subtotal: serializeDecimal(subtotal),
        tax_rate: taxRate,
        tax_amount: serializeDecimal(taxAmount),
        total: serializeDecimal(total),
        paid_amount: paidAmount === '' ? 0 : Number(paidAmount),
        payment_method: paymentMethod,
        notes,
        depot_id: selectedDepotId,
        lines: lines.map((line) => ({
          product_id: line.product_id || null,
          product_name: line.product_name,
          unit: line.unit,
          qty: line.qty,
          price: serializeDecimal(line.price),
          total: serializeDecimal(line.total),
        })),
      })

      navigate(`/invoices/${response.data.id}`)
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const filteredCustomers = customers.filter((item) => (
    String(item.name ?? '').toLowerCase().includes(customerSearch.toLowerCase())
    || String(item.phone ?? '').includes(customerSearch)
  ))

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => navigate(-1)} className="text-muted-color hover:text-base-color transition-colors">
          <i className="fa-solid fa-arrow-left mr-1.5" /> {t('common.back')}
        </button>
        <span className="text-muted-color">/</span>
        <span className="text-secondary-color">{t('invoiceCreate.breadcrumbCurrent')}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color">{t('invoiceCreate.title')}</h1>
          <p className="text-sm text-muted-color mt-1">
            {selectedDepot
              ? t('invoiceCreate.currentDepot', { name: selectedDepot.name })
              : t('invoiceCreate.depotRequired')}
          </p>
        </div>
        {canBrowseAll && (
          <DepotScopeControls
            depots={depots}
            selectedValue={selectedDepotValue}
            onChange={setSelectedDepotValue}
            label={t('invoiceCreate.depotScopeLabel')}
          />
        )}
      </div>

      {errors.depot_id?.[0] && (
        <div className="mb-4 rounded-xl px-3 py-3 text-sm" style={{ color: '#dc2626', background: 'rgba(239,68,68,0.08)' }}>
          {errors.depot_id[0]}
        </div>
      )}

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-base-color mb-3">
          <i className="fa-solid fa-user text-teal-500 mr-2" /> {t('invoiceCreate.customer.title')}
        </h2>
        {errors.customer && (
          <p className="text-xs mb-2 px-2 py-1.5 rounded-lg" style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)' }}>
            {errors.customer[0]}
          </p>
        )}
        {customer ? (
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'rgba(13,148,136,0.05)', borderColor: 'rgba(13,148,136,0.2)' }}>
            <div>
              <div className="font-semibold text-base-color">{customer.name}</div>
              <div className="text-secondary-color text-sm mt-0.5">
                {customer.phone}{customer.wilaya ? ` - ${customer.wilaya}` : ''}
              </div>
            </div>
            <button onClick={() => setCustomer(null)} className="text-xs text-muted-color hover:text-base-color transition-colors">
              <i className="fa-solid fa-pen text-xs mr-1" /> {t('invoiceCreate.customer.change')}
            </button>
          </div>
        ) : (
          <div>
            <input
              placeholder={t('invoiceCreate.customer.searchPlaceholder')}
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              className="mb-2"
            />
            <div className="max-h-48 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {filteredCustomers.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCustomer(item)
                    setCustomerSearch('')
                  }}
                  className="w-full px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = 'var(--surface-hover)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div className="text-sm font-medium text-base-color">{item.name}</div>
                  <div className="text-xs text-muted-color">{item.phone}{item.wilaya ? ` - ${item.wilaya}` : ''}</div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="px-3 py-6 text-center text-muted-color text-sm">{t('invoiceCreate.customer.empty')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-base-color">
            <i className="fa-solid fa-list text-teal-500 mr-2" /> {t('invoiceCreate.lines.title')}
          </h2>
          <button onClick={addLine} className="btn-secondary text-xs">
            <i className="fa-solid fa-plus" /> {t('invoiceCreate.lines.add')}
          </button>
        </div>
        {errors.lines && (
          <p className="text-xs mb-3 px-2 py-1.5 rounded-lg" style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)' }}>
            {errors.lines[0]}
          </p>
        )}

        <div className="space-y-2">
          {lines.map((line, index) => {
            const belowCost = line.buy_price != null && line.price !== '' && Number(line.price) < line.buy_price

            return (
              <div key={index}>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {index === 0 && <div className="text-xs text-muted-color mb-1 font-medium">{t('invoiceCreate.lines.product')}</div>}
                    <select value={line.product_id} onChange={(event) => updateLine(index, 'product_id', event.target.value)}>
                      <option value="">{t('invoiceCreate.lines.selectProduct')}</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.depot_qty != null ? `- ${t('invoiceCreate.lines.depotQty', { qty: formatNumber(product.depot_qty) })}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <div className="text-xs text-muted-color mb-1 font-medium">{t('invoiceCreate.lines.qty')}</div>}
                    <input type="number" step="0.001" min="0.001" value={line.qty} onChange={(event) => updateLine(index, 'qty', event.target.value)} placeholder="0.000" />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <div className="text-xs text-muted-color mb-1 font-medium">{t('invoiceCreate.lines.unitPrice')}</div>}
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.price}
                      onChange={(event) => updateLine(index, 'price', event.target.value)}
                      placeholder="0.000"
                      style={belowCost ? { borderColor: '#dc2626' } : {}}
                    />
                  </div>
                  <div className="col-span-3 text-right">
                    {index === 0 && <div className="text-xs text-muted-color mb-1 font-medium">{t('invoiceCreate.lines.total')}</div>}
                    <div className="h-9 flex items-center justify-end">
                      <span className="font-mono font-semibold text-base-color">{formatCurrency(line.total)}</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-0.5">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(index)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <i className="fa-solid fa-xmark text-sm" />
                      </button>
                    )}
                  </div>
                </div>
                {belowCost && (
                  <div className="flex items-center gap-1.5 mt-1 ml-1 text-xs" style={{ color: '#dc2626' }}>
                    <i className="fa-solid fa-triangle-exclamation text-xs" />
                    {t('invoiceCreate.lines.belowCost', {
                      price: formatNumber(line.price),
                      buyPrice: formatNumber(line.buy_price),
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 pt-4 space-y-2 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex justify-between text-secondary-color">
            <span>{t('invoiceCreate.summary.subtotal')}</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-secondary-color">
            <span className="flex items-center gap-2">
              {t('invoiceCreate.summary.tax')}
              <select value={taxRate} onChange={(event) => setTaxRate(event.target.value)} style={{ width: 72, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                <option value={0}>0%</option>
                <option value={7}>7%</option>
                <option value={13}>13%</option>
                <option value={19}>19%</option>
              </select>
            </span>
            <span className="font-mono">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-base-color pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <span>{t('invoiceCreate.summary.total')}</span>
            <span className="font-mono">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between text-secondary-color pt-1">
            <span className="flex items-center gap-2">
              {t('invoiceCreate.summary.payNow')}
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} style={{ width: 160, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                {availablePaymentMethods.map((method) => (
                  <option key={method.id ?? method.value} value={method.value}>
                    {getConfigItemLabel(method)}
                  </option>
                ))}
              </select>
            </span>
            <input type="number" step="0.001" min="0" placeholder="0.000" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} style={{ width: 120, textAlign: 'right' }} />
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span className="text-secondary-color">{t('invoiceCreate.summary.remainingCredit')}</span>
            <span className="font-mono" style={{ color: remaining > 0 ? '#dc2626' : '#059669' }}>
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-base-color mb-2">
          <i className="fa-solid fa-note-sticky text-teal-500 mr-2" /> {t('invoiceCreate.notesTitle')}
        </h2>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder={t('invoiceCreate.notesPlaceholder')} />
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => navigate(-1)} className="btn-secondary">{t('common.cancel')}</button>
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving
            ? <><i className="fa-solid fa-spinner fa-spin" /> {t('invoiceCreate.actions.creating')}</>
            : <><i className="fa-solid fa-file-invoice" /> {t('invoiceCreate.actions.create')}</>}
        </button>
      </div>
    </div>
  )
}
