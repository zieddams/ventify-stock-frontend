import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { StatusBadge, PaymentStatusBadge } from '../../components/Badge'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'

const PERIODS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week',  label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: '',      label: 'Tout' },
]

function fmt(n) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n ?? 0)
}

export default function InvoicesIndex() {
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [period,   setPeriod]   = useState('month')
  const { isAdmin } = useAuth()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/invoices', { params: { period } })
      setInvoices(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [period])

  const del = async (inv) => {
    if (!confirm(`Supprimer la facture ${inv.number} ?`)) return
    await api.delete(`/invoices/${inv.id}`)
    load()
  }

  const total = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + parseFloat(i.total ?? 0), 0)
  const unpaid = invoices.filter(i => i.payment_status === 'unpaid').reduce((s, i) => s + parseFloat(i.total ?? 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Factures</h1>
          <p className="text-sm text-muted-color mt-0.5">{invoices.length} facture(s) · Total: {fmt(total)} TND</p>
        </div>
        <Link to="/stock/invoices/create" className="btn-primary">
          <i className="fa-solid fa-plus" /> Nouvelle facture
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total période', value: fmt(total) + ' TND', icon: 'fa-solid fa-sack-dollar', color: '#0d9488' },
          { label: 'Impayées',      value: fmt(unpaid) + ' TND', icon: 'fa-solid fa-clock', color: '#dc2626' },
          { label: 'Factures',      value: invoices.length, icon: 'fa-solid fa-file-invoice', color: '#3b82f6' },
          { label: 'Payées',        value: invoices.filter(i => i.payment_status === 'paid').length, icon: 'fa-solid fa-circle-check', color: '#10b981' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: k.color + '1a' }}>
              <i className={`${k.icon} text-sm`} style={{ color: k.color }} />
            </div>
            <div>
              <div className="text-xs text-muted-color">{k.label}</div>
              <div className="text-sm font-bold text-base-color">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
              period === p.key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-theme text-muted-color hover:text-base-color'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {['N°', 'Client', ...(isAdmin() ? ['Commercial'] : []), 'Total', 'Paiement', 'Statut', 'Date', ''].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="table-row">
                    <td className="py-3 pr-4">
                      <Link to={`/stock/invoices/${inv.id}`}
                        className="font-mono text-xs font-semibold"
                        style={{ color: '#0d9488' }}>
                        {inv.number}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-medium text-base-color">{inv.customer_name}</td>
                    {isAdmin() && <td className="py-3 pr-4 text-secondary-color">{inv.rep_name}</td>}
                    <td className="py-3 pr-4 font-bold text-base-color">{fmt(inv.total)} TND</td>
                    <td className="py-3 pr-4">
                      {inv.payment_status && <PaymentStatusBadge status={inv.payment_status} />}
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 pr-4 text-muted-color text-xs">
                      {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/stock/invoices/${inv.id}`}
                          className="text-xs font-medium hover:underline"
                          style={{ color: '#0d9488' }}>
                          <i className="fa-solid fa-eye mr-1" />Voir
                        </Link>
                        {isAdmin() && (
                          <button onClick={() => del(inv)}
                            className="text-xs font-medium text-red-500 hover:text-red-700">
                            <i className="fa-solid fa-trash-can mr-1" />Suppr.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin() ? 8 : 7} className="py-12 text-center">
                      <i className="fa-solid fa-file-invoice text-3xl text-muted-color opacity-30 mb-2 block" />
                      <p className="text-muted-color text-sm">Aucune facture sur cette période</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
