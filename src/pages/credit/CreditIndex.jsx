import { useState, useEffect } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'

const fmt = (n) => parseFloat(n ?? 0).toFixed(3)

const BUCKET_COLORS = {
  '0-30':  { text: '#059669', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
  '31-60': { text: '#d97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  '61-90': { text: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.2)'   },
  '+90':   { text: '#dc2626', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
  'total': { text: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.2)'  },
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

export default function CreditIndex() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reports/aging').then(res => { setData(res.data); setLoading(false) })
  }, [])

  if (loading) return <PageLoader />

  const t = data.totals

  return (
    <div>
      <PageHeader
        title="Crédit clients — Balance âgée"
        subtitle="Factures impayées par ancienneté (suivi comptable)"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <BucketCard label="0–30 jours"  value={t.b0_30}     colorKey="0-30"  />
        <BucketCard label="31–60 jours" value={t.b31_60}    colorKey="31-60" />
        <BucketCard label="61–90 jours" value={t.b61_90}    colorKey="61-90" />
        <BucketCard label="+90 jours"   value={t.b90_plus}  colorKey="+90"   />
        <BucketCard label="Total dû"    value={t.total_due} colorKey="total" />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Client', '0–30 j', '31–60 j', '61–90 j', '+90 j', 'Total dû'].map((h, i) => (
                  <th key={h} className={`pb-3 pr-4 ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.customers.map(c => (
                <tr key={c.customer_id} className="table-row">
                  <td className="py-3 pr-4 font-semibold text-base-color">{c.customer_name}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm text-secondary-color">{fmt(c.b0_30)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm" style={{ color: parseFloat(c.b31_60) > 0 ? '#d97706' : 'var(--text-muted)' }}>{fmt(c.b31_60)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm" style={{ color: parseFloat(c.b61_90) > 0 ? '#ea580c' : 'var(--text-muted)' }}>{fmt(c.b61_90)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm font-bold" style={{ color: parseFloat(c.b90_plus) > 0 ? '#dc2626' : 'var(--text-muted)' }}>{fmt(c.b90_plus)}</td>
                  <td className="py-3 font-bold font-mono text-sm text-right" style={{ color: '#7c3aed' }}>{fmt(c.total_due)}</td>
                </tr>
              ))}
              {data.customers.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2 block opacity-60" />
                  <p className="text-muted-color text-sm">Aucune créance en cours</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
