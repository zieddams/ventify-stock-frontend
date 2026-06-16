import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { PageLoader } from '../../components/Spinner'

const EMPTY_LINE = { product_id: '', product_name: '', unit: '', qty: 1, price: 0, total: 0, buy_price: null }

function fmt(n) { return parseFloat(n ?? 0).toFixed(3) }

export default function InvoiceCreate() {
  const navigate = useNavigate()
  const [products,  setProducts]  = useState([])
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})

  const [customer,        setCustomer]        = useState(null)
  const [customerSearch,  setCustomerSearch]  = useState('')
  const [taxRate,         setTaxRate]         = useState(0)
  const [notes,           setNotes]           = useState('')
  const [lines,           setLines]           = useState([{ ...EMPTY_LINE }])
  const [paidAmount,      setPaidAmount]      = useState('')
  const [paymentMethod,   setPaymentMethod]   = useState('cash')

  useEffect(() => {
    Promise.all([api.get('/products'), api.get('/customers')]).then(([pRes, cRes]) => {
      setProducts(pRes.data)
      setCustomers(cRes.data)
      setLoading(false)
    })
  }, [])

  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      if (field === 'product_id') {
        const p = products.find(p => String(p.id) === String(value))
        if (p) {
          updated.product_name = p.name
          updated.price        = parseFloat(p.sale_price ?? p.depot_price ?? p.price)
          updated.unit         = p.unit ?? ''
          updated.buy_price    = p.buy_price != null ? parseFloat(p.buy_price) : null
        }
      }
      if (['qty', 'price', 'product_id'].includes(field)) {
        updated.total = parseFloat(updated.qty ?? 0) * parseFloat(updated.price ?? 0)
      }
      return updated
    }))
  }

  const addLine    = () => setLines(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx))

  const subtotal  = lines.reduce((s, l) => s + parseFloat(l.total ?? 0), 0)
  const taxAmount = subtotal * (parseFloat(taxRate) / 100)
  const total     = subtotal + taxAmount
  const remaining = total - (parseFloat(paidAmount) || 0)

  const submit = async () => {
    if (!customer) { setErrors({ customer: ['Sélectionner un client'] }); return }
    if (lines.some(l => !l.product_id || l.qty <= 0)) {
      setErrors({ lines: ['Toutes les lignes doivent avoir un produit et une quantité'] })
      return
    }
    setSaving(true); setErrors({})
    try {
      const res = await api.post('/invoices', {
        customer_id:     customer.id,
        customer_name:   customer.name,
        customer_address:customer.address,
        customer_phone:  customer.phone,
        customer_tax_id: customer.tax_id,
        subtotal:    fmt(subtotal),
        tax_rate:    taxRate,
        tax_amount:  fmt(taxAmount),
        total:       fmt(total),
        paid_amount: paidAmount === '' ? 0 : Number(paidAmount),
        payment_method: paymentMethod,
        notes,
        lines: lines.map(l => ({
          product_id:   l.product_id || null,
          product_name: l.product_name,
          unit:         l.unit,
          qty:          l.qty,
          price:        fmt(l.price),
          total:        fmt(l.total),
        })),
      })
      navigate(`/stock/invoices/${res.data.id}`)
    } catch (e) {
      setErrors(e.response?.data?.errors ?? {})
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  )

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => navigate(-1)} className="text-muted-color hover:text-base-color transition-colors">
          <i className="fa-solid fa-arrow-left mr-1.5" />Retour
        </button>
        <span className="text-muted-color">/</span>
        <span className="text-secondary-color">Nouvelle facture</span>
      </div>

      <h1 className="text-xl font-bold text-base-color mb-6">Nouvelle facture</h1>

      {/* Client */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-base-color mb-3">
          <i className="fa-solid fa-user text-teal-500 mr-2" />Client
        </h2>
        {errors.customer && (
          <p className="text-xs mb-2 px-2 py-1.5 rounded-lg"
            style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)' }}>{errors.customer[0]}</p>
        )}
        {customer ? (
          <div className="flex items-center justify-between p-3 rounded-xl border"
            style={{ background: 'rgba(13,148,136,0.05)', borderColor: 'rgba(13,148,136,0.2)' }}>
            <div>
              <div className="font-semibold text-base-color">{customer.name}</div>
              <div className="text-secondary-color text-sm mt-0.5">
                {customer.phone}{customer.wilaya ? ` — ${customer.wilaya}` : ''}
              </div>
            </div>
            <button onClick={() => setCustomer(null)}
              className="text-xs text-muted-color hover:text-base-color transition-colors">
              <i className="fa-solid fa-pen text-xs mr-1" />Changer
            </button>
          </div>
        ) : (
          <div>
            <input placeholder="Rechercher un client…" value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)} className="mb-2" />
            <div className="max-h-48 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {filteredCustomers.slice(0, 20).map(c => (
                <button key={c.id} onClick={() => { setCustomer(c); setCustomerSearch('') }}
                  className="w-full px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="text-sm font-medium text-base-color">{c.name}</div>
                  <div className="text-xs text-muted-color">{c.phone}{c.wilaya ? ` — ${c.wilaya}` : ''}</div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="px-3 py-6 text-center text-muted-color text-sm">Aucun client trouvé</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-base-color">
            <i className="fa-solid fa-list text-teal-500 mr-2" />Lignes de facture
          </h2>
          <button onClick={addLine} className="btn-secondary text-xs">
            <i className="fa-solid fa-plus" /> Ajouter une ligne
          </button>
        </div>
        {errors.lines && (
          <p className="text-xs mb-3 px-2 py-1.5 rounded-lg"
            style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)' }}>{errors.lines[0]}</p>
        )}

        <div className="space-y-2">
          {lines.map((l, idx) => {
            const belowCost = l.buy_price != null && l.price !== '' && parseFloat(l.price) < l.buy_price
            return (
              <div key={idx}>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {idx === 0 && <div className="text-xs text-muted-color mb-1 font-medium">Produit</div>}
                    <select value={l.product_id} onChange={e => updateLine(idx, 'product_id', e.target.value)}>
                      <option value="">Sélectionner…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <div className="text-xs text-muted-color mb-1 font-medium">Quantité</div>}
                    <input type="number" step="0.001" min="0.001" value={l.qty}
                      onChange={e => updateLine(idx, 'qty', e.target.value)} placeholder="Qté" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <div className="text-xs text-muted-color mb-1 font-medium">P.U.</div>}
                    <input type="number" step="0.001" min="0" value={l.price}
                      onChange={e => updateLine(idx, 'price', e.target.value)} placeholder="0.000"
                      style={belowCost ? { borderColor: '#dc2626' } : {}} />
                  </div>
                  <div className="col-span-3 text-right">
                    {idx === 0 && <div className="text-xs text-muted-color mb-1 font-medium">Total</div>}
                    <div className="h-9 flex items-center justify-end">
                      <span className="font-mono font-semibold text-base-color">
                        {parseFloat(l.total).toFixed(3)} TND
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-0.5">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(idx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <i className="fa-solid fa-xmark text-sm" />
                      </button>
                    )}
                  </div>
                </div>
                {belowCost && (
                  <div className="flex items-center gap-1.5 mt-1 ml-1 text-xs" style={{ color: '#dc2626' }}>
                    <i className="fa-solid fa-triangle-exclamation text-xs" />
                    Prix ({fmt(l.price)}) inférieur au prix d'achat ({fmt(l.buy_price)})
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="mt-5 pt-4 space-y-2 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex justify-between text-secondary-color">
            <span>Sous-total</span>
            <span className="font-mono">{subtotal.toFixed(3)} TND</span>
          </div>
          <div className="flex items-center justify-between text-secondary-color">
            <span className="flex items-center gap-2">
              TVA
              <select value={taxRate} onChange={e => setTaxRate(e.target.value)} style={{ width: 72, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                <option value={0}>0%</option>
                <option value={7}>7%</option>
                <option value={13}>13%</option>
                <option value={19}>19%</option>
              </select>
            </span>
            <span className="font-mono">{taxAmount.toFixed(3)} TND</span>
          </div>
          <div className="flex justify-between font-bold text-base text-base-color pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <span>Total</span><span className="font-mono">{total.toFixed(3)} TND</span>
          </div>
          <div className="flex items-center justify-between text-secondary-color pt-1">
            <span className="flex items-center gap-2">
              Payé maintenant
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: 90, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                <option value="cash">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="transfer">Virement</option>
              </select>
            </span>
            <input type="number" step="0.001" min="0" placeholder="0.000" value={paidAmount}
              onChange={e => setPaidAmount(e.target.value)} style={{ width: 120, textAlign: 'right' }} />
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span className="text-secondary-color">Reste à crédit</span>
            <span className="font-mono" style={{ color: remaining > 0 ? '#dc2626' : '#059669' }}>
              {remaining.toFixed(3)} TND
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-base-color mb-2">
          <i className="fa-solid fa-note-sticky text-teal-500 mr-2" />Notes
        </h2>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder="Notes optionnelles…" />
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => navigate(-1)} className="btn-secondary">Annuler</button>
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving
            ? <><i className="fa-solid fa-spinner fa-spin" /> Création…</>
            : <><i className="fa-solid fa-file-invoice" /> Créer la facture</>
          }
        </button>
      </div>
    </div>
  )
}
