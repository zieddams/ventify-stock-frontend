import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { StatusBadge, PaymentStatusBadge } from '../../components/Badge'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'

const STATUSES = ['draft', 'sent', 'paid', 'cancelled']
const STATUS_LABELS = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', cancelled: 'Annulée' }

function fmt(n) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n ?? 0)
}

export default function InvoiceShow() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const [invoice, setInvoice]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [paying, setPaying]     = useState(false)
  const { isAdmin } = useAuth()

  const reload = async () => {
    const r = await api.get(`/invoices/${id}`)
    setInvoice(r.data)
  }

  const recordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return
    setPaying(true)
    try {
      await api.post(`/invoices/${id}/payments`, { amount: Number(payAmount), method: payMethod })
      setPayAmount('')
      await reload()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur')
    } finally { setPaying(false) }
  }

  useEffect(() => {
    api.get(`/invoices/${id}`).then(r => { setInvoice(r.data); setLoading(false) })
  }, [id])

  const updateStatus = async (status) => {
    setUpdating(true)
    await api.patch(`/invoices/${id}/status`, { status })
    const r = await api.get(`/invoices/${id}`)
    setInvoice(r.data)
    setUpdating(false)
  }

  const del = async () => {
    if (!confirm('Supprimer définitivement cette facture ?')) return
    await api.delete(`/invoices/${id}`)
    navigate('/stock/invoices')
  }

  if (loading) return <PageLoader />
  if (!invoice) return (
    <div className="text-center py-20 text-muted-color">
      <i className="fa-solid fa-file-circle-xmark text-4xl opacity-30 mb-3 block" />
      Facture introuvable
    </div>
  )

  const due = invoice.total - (invoice.paid_amount ?? 0)

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/stock/invoices" className="text-muted-color hover:text-base-color transition-colors">
          <i className="fa-solid fa-arrow-left mr-1.5" />Factures
        </Link>
        <span className="text-muted-color">/</span>
        <span className="font-mono text-secondary-color">{invoice.number}</span>
      </div>

      {/* Invoice header card */}
      <div className="card mb-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-base-color">{invoice.number}</h1>
            <div className="text-sm text-muted-color mt-1">
              {new Date(invoice.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-1.5">Client</div>
            <div className="font-semibold text-base-color">{invoice.customer_name}</div>
            {invoice.customer_phone   && <div className="text-secondary-color mt-0.5">{invoice.customer_phone}</div>}
            {invoice.customer_address && <div className="text-secondary-color">{invoice.customer_address}</div>}
            {invoice.customer_tax_id  && <div className="text-muted-color font-mono text-xs mt-0.5">MF: {invoice.customer_tax_id}</div>}
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-1.5">Commercial</div>
            <div className="text-secondary-color">{invoice.rep_name}</div>
            {invoice.zone && <div className="text-muted-color text-xs mt-0.5">{invoice.zone.name}</div>}
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-base-color mb-4">Lignes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Produit</th>
                <th className="text-right pb-3 pr-3">Qté</th>
                <th className="text-right pb-3 pr-3">P.U.</th>
                <th className="text-right pb-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines?.map((l, i) => (
                <tr key={i} className="table-row">
                  <td className="py-2.5 pr-3 font-medium text-base-color">{l.product_name}</td>
                  <td className="py-2.5 pr-3 text-right text-secondary-color">{fmt(l.qty)} {l.unit}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-secondary-color">{fmt(l.unit_price ?? l.price)}</td>
                  <td className="py-2.5 text-right font-mono font-semibold text-base-color">{fmt(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 space-y-1.5 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex justify-between text-secondary-color">
            <span>Sous-total</span><span className="font-mono">{fmt(invoice.subtotal)} TND</span>
          </div>
          {parseFloat(invoice.tax_rate ?? 0) > 0 && (
            <div className="flex justify-between text-secondary-color">
              <span>TVA ({invoice.tax_rate}%)</span>
              <span className="font-mono">{fmt(invoice.tax_amount)} TND</span>
            </div>
          )}
          {invoice.notes && (
            <div className="py-2 text-muted-color text-xs italic">{invoice.notes}</div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 text-base-color">
            <span>Total</span><span className="font-mono">{fmt(invoice.total)} TND</span>
          </div>
          {invoice.payment_status && (
            <>
              <div className="flex justify-between text-secondary-color">
                <span>Payé</span>
                <span className="font-mono" style={{ color: '#059669' }}>{fmt(invoice.paid_amount)} TND</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-secondary-color">Reste dû</span>
                <span className="font-mono" style={{ color: due > 0 ? '#dc2626' : '#059669' }}>
                  {fmt(due)} TND
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment recording */}
      {invoice.customer_id && invoice.payment_status !== 'paid' && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-base-color">Encaisser un paiement</h2>
            <PaymentStatusBadge status={invoice.payment_status} />
          </div>
          <div className="flex gap-2">
            <input type="number" step="0.001" min="0" placeholder="Montant (TND)"
              value={payAmount} onChange={e => setPayAmount(e.target.value)} className="flex-1" />
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-28">
              <option value="cash">Espèces</option>
              <option value="cheque">Chèque</option>
              <option value="transfer">Virement</option>
            </select>
            <button onClick={recordPayment} disabled={paying || !payAmount} className="btn-primary">
              {paying ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-check" /> Encaisser</>}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {STATUSES.filter(s => s !== (invoice.status?.value ?? invoice.status)).map(s => (
          <button key={s} onClick={() => updateStatus(s)} disabled={updating}
            className="btn-secondary text-xs">
            <i className="fa-solid fa-circle-dot mr-1 text-xs" />
            Marquer: {STATUS_LABELS[s]}
          </button>
        ))}
        {isAdmin() && (
          <button onClick={del} className="btn-danger text-xs ml-auto">
            <i className="fa-solid fa-trash-can" /> Supprimer
          </button>
        )}
      </div>
    </div>
  )
}
