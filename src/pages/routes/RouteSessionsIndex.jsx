import { useEffect, useState } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'

function fmt(n) { return n != null ? Number(n).toFixed(3) : '—' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }) {
  return status === 'open' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>
      <i className="fa-solid fa-circle-dot text-[8px]" /> En cours
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      Clôturée
    </span>
  )
}

export default function RouteSessionsIndex() {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [meta,     setMeta]     = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/route-sessions', { params: { page } })
      .then(r => { setSessions(r.data.data ?? r.data); setMeta(r.data.meta ?? null) })
      .finally(() => setLoading(false))
  }, [page])

  const totalVendu = sessions.reduce((s, x) => s + parseFloat(x.total_sold ?? 0), 0)
  const totalProfit = sessions.reduce((s, x) => s + parseFloat(x.profit_total ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Sorties journée"
        subtitle="BON DE SORTIE — sessions journalières par commercial"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Sessions',      value: sessions.length,            icon: 'fa-solid fa-calendar-days', color: '#0d9488' },
          { label: 'En cours',      value: sessions.filter(s => s.status === 'open').length, icon: 'fa-solid fa-circle-dot', color: '#10b981' },
          { label: 'Total vendu',   value: fmt(totalVendu) + ' TND',   icon: 'fa-solid fa-sack-dollar',   color: '#3b82f6' },
          { label: 'Bénéfice',      value: fmt(totalProfit) + ' TND',  icon: 'fa-solid fa-coins',         color: '#8b5cf6' },
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

      <div className="card">
        {loading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Date', 'Commercial', 'Zone', 'Total vendu', 'Bénéfice', 'Crédit accordé', 'Statut'].map(h => (
                    <th key={h} className={`pb-3 pr-4 ${['Total vendu','Bénéfice','Crédit accordé'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center">
                    <i className="fa-solid fa-truck-fast text-3xl text-muted-color opacity-30 mb-2 block" />
                    <p className="text-muted-color text-sm">Aucune session trouvée</p>
                  </td></tr>
                )}
                {sessions.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="py-3 pr-4 font-semibold text-base-color">{fmtDate(s.session_date)}</td>
                    <td className="py-3 pr-4 text-secondary-color">{s.rep?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{s.zone?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-base-color">{fmt(s.total_sold)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{fmt(s.profit_total)}</td>
                    <td className="py-3 pr-4 text-right font-mono" style={{ color: '#d97706' }}>{fmt(s.credit_given)}</td>
                    <td className="py-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2"
            style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-xs text-muted-color">Page {meta.current_page} / {meta.last_page}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs disabled:opacity-40">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs disabled:opacity-40">
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
