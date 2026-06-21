import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'

const fmt = (n) => parseFloat(n ?? 0).toFixed(3)

const BUCKET_COLORS = {
  '0-30': { text: '#059669', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  '31-60': { text: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  '61-90': { text: '#ea580c', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.2)' },
  '+90': { text: '#dc2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  total: { text: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
}

function BucketCard({ label, value, colorKey }) {
  const c = BUCKET_COLORS[colorKey]

  return (
    <div className="card flex items-center gap-3 py-3 px-4">
      <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
      <div>
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-base font-bold font-mono" style={{ color: c.text }}>{fmt(value)} TND</div>
      </div>
    </div>
  )
}

function formatDateTimeCell(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '-'
}

export default function CreditIndex() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    selectedDepot,
    canSelectAll,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    api.get('/reports/aging', {
      params: {
        ...scopeParams,
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      },
    })
      .then((response) => setData(response.data))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, depotsReady, selectedDepotId, scopeParams])

  if ((loading && !data) || !data) {
    return <PageLoader />
  }

  const totals = data.totals ?? {}
  const entries = data.entries ?? []
  const customers = data.customers ?? []

  return (
    <div>
      <PageHeader
        title="Credit clients - Balance agee"
        subtitle={`Factures impayees par anciennete (suivi comptable)${canSelectAll ? ` | ${selectedDepot ? `Depot ${selectedDepot.name}` : 'Tous les depots'}` : ''}`}
        action={canSelectAll ? (
          <DepotScopeControls
            depots={depots}
            selectedValue={selectedDepotValue}
            onChange={setSelectedDepotValue}
            allowAll
            canSelectAll={canSelectAll}
            allLabel="Tous les depots"
          />
        ) : null}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <BucketCard label="0-30 jours" value={totals.b0_30} colorKey="0-30" />
        <BucketCard label="31-60 jours" value={totals.b31_60} colorKey="31-60" />
        <BucketCard label="61-90 jours" value={totals.b61_90} colorKey="61-90" />
        <BucketCard label="+90 jours" value={totals.b90_plus} colorKey="+90" />
        <BucketCard label="Total du" value={totals.total_due} colorKey="total" />
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">Au</label>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
              className="btn-secondary w-full justify-center"
            >
              <i className="fa-solid fa-rotate-left" /> Reinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-base-color">Creances detaillees</h2>
            <p className="text-xs text-muted-color mt-1">
              Date, heure et lien facture visibles directement dans le tableau principal.
            </p>
          </div>
          {loading && <i className="fa-solid fa-spinner fa-spin text-muted-color" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Date / heure', 'Facture', 'Client', 'Commercial', 'Depot', 'Total', 'Paye', 'Reste du'].map((heading, index) => (
                  <th key={heading} className={`pb-3 pr-4 ${index >= 5 ? 'text-right' : 'text-left'}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.invoice_id} className="table-row">
                  <td className="py-3 pr-4 whitespace-nowrap text-secondary-color">{formatDateTimeCell(entry.created_at)}</td>
                  <td className="py-3 pr-4">
                    {entry.invoice_id ? (
                      <Link to={`/invoices/${entry.invoice_id}`} className="font-mono text-xs text-primary hover:underline">
                        {entry.number}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-base-color">{entry.number || '-'}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-base-color">{entry.customer_name}</td>
                  <td className="py-3 pr-4 text-secondary-color">{entry.rep_name || '-'}</td>
                  <td className="py-3 pr-4 text-secondary-color">{entry.depot?.name ?? 'Tous'}</td>
                  <td className="py-3 pr-4 text-right font-mono text-secondary-color">{fmt(entry.total)} TND</td>
                  <td className="py-3 pr-4 text-right font-mono text-secondary-color">{fmt(entry.paid_amount)} TND</td>
                  <td className="py-3 text-right font-mono font-semibold" style={{ color: '#7c3aed' }}>
                    {fmt(entry.due_amount)} TND
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2 block opacity-60" />
                    <p className="text-muted-color text-sm">Aucune facture credit a afficher sur cette periode</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-base-color">Synthese par client</h2>
            <p className="text-xs text-muted-color mt-1">Lecture aged balance par client pour les relances comptables.</p>
          </div>
          {loading && <i className="fa-solid fa-spinner fa-spin text-muted-color" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Client', '0-30 j', '31-60 j', '61-90 j', '+90 j', 'Total du'].map((heading, index) => (
                  <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id} className="table-row">
                  <td className="py-3 pr-4 font-semibold text-base-color">{customer.customer_name}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm text-secondary-color">{fmt(customer.b0_30)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm" style={{ color: parseFloat(customer.b31_60) > 0 ? '#d97706' : 'var(--text-muted)' }}>{fmt(customer.b31_60)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm" style={{ color: parseFloat(customer.b61_90) > 0 ? '#ea580c' : 'var(--text-muted)' }}>{fmt(customer.b61_90)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm font-bold" style={{ color: parseFloat(customer.b90_plus) > 0 ? '#dc2626' : 'var(--text-muted)' }}>{fmt(customer.b90_plus)}</td>
                  <td className="py-3 font-bold font-mono text-sm text-right" style={{ color: '#7c3aed' }}>{fmt(customer.total_due)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-muted-color">
                    Aucune synthese client disponible sur cette periode.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
