import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../../services/api'
import { PageLoader } from '../../components/Spinner'
import { useTheme } from '../../contexts/ThemeContext'

function fmt(n) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n ?? 0)
}

function useChartTheme() {
  const { isDark } = useTheme()
  return {
    grid:    isDark ? '#334155' : '#e2e8f0',
    axis:    isDark ? '#64748b' : '#94a3b8',
    tooltip: isDark
      ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#f8fafc' }
      : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a' },
  }
}

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div className="card py-3 px-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color + '1a' }}>
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-sm font-bold text-base-color">{value}</div>
        {sub && <div className="text-xs text-muted-color mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Overview ───────────────────────────────────────────────────────────── */
function OverviewTab({ stats }) {
  const ct = useChartTheme()
  const chartData = (stats?.revenue_by_day ?? []).map(d => ({
    date: d.date?.slice(5),
    revenue: parseFloat(d.revenue ?? 0),
    profit:  parseFloat(d.profit ?? 0),
  }))
  const top5 = stats?.top_products ?? []

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="CA aujourd'hui"  value={fmt(stats?.today_revenue) + ' TND'} icon="fa-solid fa-arrow-trend-up" color="#0d9488" />
        <KpiCard label="Bénéfice (mois)" value={fmt(stats?.month_profit)  + ' TND'} icon="fa-solid fa-coins"          color="#10b981" />
        <KpiCard label="Impayés total"   value={fmt(stats?.unpaid_total)  + ' TND'} icon="fa-solid fa-triangle-exclamation" color="#dc2626" />
        <KpiCard label="Dépenses (mois)" value={fmt(stats?.month_expenses)+ ' TND'} icon="fa-solid fa-receipt"        color="#f59e0b" />
      </div>

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-base-color mb-4">CA & Bénéfice — 30 derniers jours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="date" stroke={ct.axis} tick={{ fontSize: 10, fill: ct.axis }} />
              <YAxis stroke={ct.axis} tick={{ fontSize: 10, fill: ct.axis }} />
              <Tooltip contentStyle={ct.tooltip}
                formatter={(v, n) => [fmt(v) + ' TND', n === 'revenue' ? 'CA' : 'Bénéfice']} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[4,4,0,0]} name="CA" />
              <Bar dataKey="profit"  fill="#10b981" radius={[4,4,0,0]} name="Bénéfice" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {top5.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">Top 5 produits (ce mois)</h2>
          <div className="space-y-2">
            {top5.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-base-color truncate">{p.product_name}</div>
                </div>
                <div className="text-sm font-semibold font-mono" style={{ color: '#0d9488' }}>
                  {fmt(p.total_revenue)} TND
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Profit ─────────────────────────────────────────────────────────────── */
function ProfitTab() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState('month')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const ct = useChartTheme()

  useEffect(() => {
    setLoading(true)
    const params = { period }

    if (period === 'custom') {
      params.date_from = dateFrom
      params.date_to = dateTo
    }

    api.get('/reports/profit', { params })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [period, dateFrom, dateTo])

  if (loading) return (
    <div className="py-12 text-center text-muted-color">
      <i className="fa-solid fa-spinner fa-spin mr-2" />Chargement…
    </div>
  )

  const chartData = (data?.by_day ?? []).map(d => ({
    date:    d.day?.slice(5),
    revenue: parseFloat(d.revenue ?? 0),
    profit:  parseFloat(d.profit  ?? 0),
  }))

  return (
    <>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[['today', "Auj."], ['week', 'Semaine'], ['month', 'Mois'], ['custom', 'Personnalise']].map(([p, l]) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs rounded-xl font-semibold border transition-colors ${
              period === p
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-theme text-muted-color hover:text-base-color'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="card mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Au</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="CA total"         value={fmt(data?.totals?.revenue) + ' TND'} icon="fa-solid fa-sack-dollar"        color="#0d9488" />
        <KpiCard label="Coût des ventes"  value={fmt(data?.totals?.cost)    + ' TND'} icon="fa-solid fa-boxes-stacked"      color="#64748b" />
        <KpiCard label="Bénéfice brut"    value={fmt(data?.totals?.profit)  + ' TND'} icon="fa-solid fa-coins"              color="#10b981" sub={`Marge: ${data?.totals?.margin_pct ?? 0}%`} />
        <KpiCard label="Ventes sous coût" value={data?.totals?.below_cost_lines ?? 0}  icon="fa-solid fa-triangle-exclamation" color="#dc2626" sub="lignes sous prix achat" />
      </div>

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-base-color mb-4">Évolution CA / Bénéfice</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="date" stroke={ct.axis} tick={{ fontSize: 10, fill: ct.axis }} />
              <YAxis stroke={ct.axis} tick={{ fontSize: 10, fill: ct.axis }} />
              <Tooltip contentStyle={ct.tooltip}
                formatter={(v, n) => [fmt(v) + ' TND', n === 'revenue' ? 'CA' : 'Bénéfice']} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[4,4,0,0]} />
              <Bar dataKey="profit"  fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold text-base-color mb-3">Par représentant</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Représentant', 'CA', 'Coût', 'Bénéfice', 'Factures'].map((h, i) => (
                <th key={h} className={`pb-3 pr-4 ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.by_rep ?? []).map((r, i) => (
              <tr key={i} className="table-row">
                <td className="py-3 pr-4 font-semibold text-base-color">{r.rep_name}</td>
                <td className="py-3 pr-4 text-right font-mono text-secondary-color">{fmt(r.revenue)}</td>
                <td className="py-3 pr-4 text-right font-mono text-muted-color">{fmt(r.cost)}</td>
                <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{fmt(r.profit)}</td>
                <td className="py-3 text-right text-muted-color">{r.invoice_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ─── SITATION ───────────────────────────────────────────────────────────── */
function SitationTab() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    setLoading(true)
    api.get('/reports/sitation', { params: { month } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [month])

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ width: 'auto' }} />
        <span className="text-xs text-muted-color">SITATION mensuelle El Irtiwaa</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-color">
          <i className="fa-solid fa-spinner fa-spin mr-2" />Chargement…
        </div>
      ) : data && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
              <i className="fa-solid fa-arrow-trend-up text-teal-500" /> Recettes
            </h2>
            <table className="w-full text-sm mb-3">
              <thead><tr>
                {['Représentant', 'CA', 'Bénéfice'].map((h, i) => (
                  <th key={h} className={`pb-3 pr-4 ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data.recettes?.by_rep ?? []).map((r, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-2.5 pr-4 text-base-color">{r.rep_name}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-secondary-color">{fmt(r.revenue)} TND</td>
                    <td className="py-2.5 text-right font-mono font-bold" style={{ color: '#059669' }}>{fmt(r.profit)} TND</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-secondary-color">Total CA</span>
              <span className="text-base-color font-mono">{fmt(data.recettes?.total_revenue)} TND</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-1">
              <span className="text-secondary-color">Bénéfice brut</span>
              <span className="font-mono" style={{ color: '#059669' }}>{fmt(data.recettes?.total_profit)} TND</span>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
              <i className="fa-solid fa-receipt" style={{ color: '#ea580c' }} /> Dépenses
            </h2>
            <table className="w-full text-sm mb-3">
              <thead><tr>
                {['Catégorie', 'Montant'].map((h, i) => (
                  <th key={h} className={`pb-3 pr-4 ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data.depenses?.by_category ?? []).map((d, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-2.5 pr-4 text-secondary-color">{d.label}</td>
                    <td className="py-2.5 text-right font-mono" style={{ color: '#ea580c' }}>{fmt(d.total)} TND</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-secondary-color">Total dépenses</span>
              <span className="font-mono" style={{ color: '#ea580c' }}>{fmt(data.depenses?.total)} TND</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
                <i className="fa-solid fa-credit-card" style={{ color: '#d97706' }} /> Crédit extérieur
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-color">Crédit accordé (impayé)</span>
                  <span className="font-mono font-bold" style={{ color: '#dc2626' }}>{fmt(data.credit?.credit_du)} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-color">Crédit collecté</span>
                  <span className="font-mono font-bold" style={{ color: '#059669' }}>{fmt(data.credit?.credit_collecte)} TND</span>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-secondary-color font-medium">Valeur stock dépôt</span>
                  <span className="text-base-color font-mono">{fmt(data.stock_valeur)} TND</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16,185,129,0.04) !important', border: '1px solid rgba(16,185,129,0.2) !important' }}>
              <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
                <i className="fa-solid fa-coins" style={{ color: '#059669' }} /> Bénéfice net
              </h2>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: '#059669' }}>
                {fmt(data.benefice_net)} <span className="text-sm font-normal text-muted-color">TND</span>
              </div>
              <div className="text-xs text-muted-color">
                Marge d'erreur (0.2%): {fmt(data.marge_erreur)} TND
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Movements ──────────────────────────────────────────────────────────── */
function MovementsTab() {
  const [movements, setMovements] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    api.get('/depot/movements').then(r => setMovements(r.data)).finally(() => setLoading(false))
  }, [])

  const TYPE_CONFIG = {
    depot_in:           { label: 'Réception',  color: '#10b981' },
    depot_to_camion:    { label: '→ Camion',   color: '#3b82f6' },
    camion_to_customer: { label: '→ Client',   color: '#ef4444' },
    return:             { label: 'Retour',      color: '#f59e0b' },
    adjustment:         { label: 'Ajustement', color: '#94a3b8' },
  }

  if (loading) return (
    <div className="py-12 text-center text-muted-color">
      <i className="fa-solid fa-spinner fa-spin mr-2" />Chargement…
    </div>
  )

  return (
    <div className="card">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['Type', 'Produit', 'Commercial', 'Quantité', 'Date'].map(h => (
              <th key={h} className={`pb-3 pr-4 ${h === 'Quantité' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movements.map(m => {
            const cfg = TYPE_CONFIG[m.type] ?? { label: m.type, color: '#94a3b8' }
            const qty = parseFloat(m.qty)
            return (
              <tr key={m.id} className="table-row">
                <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</td>
                <td className="py-2.5 pr-4 text-base-color">{m.product?.name}</td>
                <td className="py-2.5 pr-4 text-secondary-color text-xs">{m.user?.name ?? '—'}</td>
                <td className="py-2.5 pr-4 text-right font-mono font-bold"
                  style={{ color: qty >= 0 ? '#059669' : '#dc2626' }}>
                  {qty >= 0 ? '+' : ''}{qty.toFixed(3)}
                </td>
                <td className="py-2.5 text-muted-color text-xs">
                  {new Date(m.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            )
          })}
          {movements.length === 0 && (
            <tr><td colSpan={5} className="py-12 text-center text-muted-color">Aucun mouvement</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function ReportsIndex() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('overview')

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const TABS = [
    { key: 'overview',  label: "Vue d'ensemble", icon: 'fa-solid fa-chart-pie'     },
    { key: 'profit',    label: 'Bénéfices',       icon: 'fa-solid fa-coins'         },
    { key: 'sitation',  label: 'SITATION',         icon: 'fa-solid fa-file-lines'   },
    { key: 'movements', label: 'Mouvements',       icon: 'fa-solid fa-arrows-up-down'},
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-color tracking-tight">Rapports</h1>
        <p className="text-sm text-muted-color mt-0.5">Statistiques, bénéfices & SITATION</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-theme">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-muted-color hover:text-base-color'
            }`}>
            <i className={`${t.icon} text-xs`} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab stats={stats} />}
      {tab === 'profit'    && <ProfitTab />}
      {tab === 'sitation'  && <SitationTab />}
      {tab === 'movements' && <MovementsTab />}
    </div>
  )
}
