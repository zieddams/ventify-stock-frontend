import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import { PageLoader } from '../components/Spinner'
import { useAuth } from '../contexts/AuthContext'
import QuantityInput from '../components/QuantityInput'

function fmt(n) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n ?? 0)
}

/* ─── KPI Card ─────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, accent = '#0d9488', iconBg = '#f0fdfa', delta }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-color uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}>
          <i className={`${icon} text-sm`} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-base-color tracking-tight">{value}</div>
        {sub && <div className="text-xs text-muted-color mt-0.5">{sub}</div>}
      </div>
      {delta != null && (
        <div className={`text-xs font-medium flex items-center gap-1 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <i className={`fa-solid fa-arrow-${delta >= 0 ? 'up' : 'down'}`} style={{ fontSize: 9 }} />
          {Math.abs(delta).toFixed(1)}% vs. hier
        </div>
      )}
    </div>
  )
}

/* ─── Restock modal (inline in low-stock widget) ───────────────────────────── */
function RestockRow({ item, onDone }) {
  const [qty, setQty]     = useState(1)
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)

  const handleRestock = async () => {
    if (qty <= 0) return
    setSaving(true)
    try {
      await api.post('/depot/receive', { product_id: item.product?.id ?? item.product_id, qty })
      setOpen(false)
      onDone()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-base-color truncate">{item.product?.name ?? '—'}</div>
        <div className="text-xs text-muted-color">{item.product?.unit ?? ''}</div>
      </div>

      <span className="badge badge-red text-xs font-mono px-2">
        {item.qty} {item.product?.unit ?? ''}
      </span>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-1 px-2.5 flex-shrink-0">
          <i className="fa-solid fa-plus text-xs" /> Réappro.
        </button>
      ) : (
        <div className="flex items-center gap-1.5 animate-fade-in">
          <QuantityInput value={qty} onChange={setQty} min={1} step={1} size="sm" />
          <button onClick={handleRestock} disabled={saving}
            className="btn-primary text-xs py-1 px-2.5 flex-shrink-0">
            {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
          </button>
          <button onClick={() => setOpen(false)} className="btn-ghost text-xs p-1">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Demo banner ──────────────────────────────────────────────────────────── */
function DemoBanner({ hasDemoData, demoCount, onSeed, onClear, seeding, clearing }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3 mb-6 ${
      hasDemoData
        ? 'border-amber-200 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-900/10'
        : 'border-theme bg-surface-2'
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <i className={`fa-solid ${hasDemoData ? 'fa-flask text-amber-500' : 'fa-database text-muted-color'}`} />
        <div>
          <div className="text-sm font-semibold text-base-color">
            {hasDemoData ? `Données de démo actives (${demoCount} factures)` : 'Mode démo désactivé'}
          </div>
          <div className="text-xs text-muted-color">
            {hasDemoData
              ? 'Données fictives visibles — ne touchent pas à vos vrais produits ni stocks'
              : 'Activez pour remplir le dashboard avec des données réalistes'}
          </div>
        </div>
      </div>
      {hasDemoData ? (
        <button onClick={onClear} disabled={clearing}
          className="btn-danger text-xs py-1.5 flex-shrink-0">
          {clearing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash-can" />}
          Vider la démo
        </button>
      ) : (
        <button onClick={onSeed} disabled={seeding}
          className="btn-secondary text-xs py-1.5 flex-shrink-0">
          {seeding ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-play" />}
          Activer démo
        </button>
      )}
    </div>
  )
}

/* ─── AR Aging widget ───────────────────────────────────────────────────────── */
function AgingWidget() {
  const [aging, setAging] = useState(null)
  useEffect(() => {
    api.get('/reports/aging').then(r => setAging(r.data)).catch(() => {})
  }, [])
  if (!aging) return null

  const buckets = [
    { key: 'b0_30',  label: '0–30 j',  color: '#0d9488' },
    { key: 'b31_60', label: '31–60 j', color: '#f59e0b' },
    { key: 'b61_90', label: '61–90 j', color: '#f97316' },
    { key: 'b90_plus', label: '+90 j', color: '#ef4444' },
  ]
  const total = (aging.totals?.total_due ?? 0)
  if (total === 0) return null

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-amber-500" />
          Balance âgée — Crédit clients
        </h2>
        <Link to="/credit" className="text-xs font-medium" style={{ color: '#0d9488' }}>
          Voir tout <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />
        </Link>
      </div>

      {/* Bucket KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {buckets.map(b => (
          <div key={b.key} className="rounded-xl px-3 py-2.5 text-center border border-theme bg-surface-2">
            <div className="text-xs text-muted-color mb-1">{b.label}</div>
            <div className="text-sm font-bold" style={{ color: b.color }}>
              {fmt(aging.totals?.[b.key] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Top customers */}
      {(aging.customers ?? []).slice(0, 5).length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="pb-2 pr-3 text-left font-semibold text-muted-color">Client</th>
                {buckets.map(b => (
                  <th key={b.key} className="pb-2 pr-3 text-right font-semibold" style={{ color: b.color }}>{b.label}</th>
                ))}
                <th className="pb-2 text-right font-semibold text-base-color">Total dû</th>
              </tr>
            </thead>
            <tbody>
              {aging.customers.slice(0, 5).map((r, i) => (
                <tr key={i} className="table-row">
                  <td className="py-2 pr-3 font-medium text-base-color">{r.customer_name}</td>
                  {buckets.map(b => (
                    <td key={b.key} className="py-2 pr-3 text-right font-mono" style={{ color: parseFloat(r[b.key] ?? 0) > 0 ? b.color : 'var(--text-muted)' }}>
                      {fmt(r[b.key] ?? 0)}
                    </td>
                  ))}
                  <td className="py-2 text-right font-bold text-base-color">{fmt(r.total_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs text-muted-color">Total impayé</span>
        <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{fmt(total)} TND</span>
      </div>
    </div>
  )
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats, setStats]       = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [demoState, setDemoState] = useState({ hasDemoData: false, count: 0 })
  const [seeding, setSeeding]   = useState(false)
  const [clearing, setClearing] = useState(false)
  const { isAdmin }             = useAuth()

  const load = useCallback(async () => {
    try {
      if (isAdmin()) {
        const [sRes, sessRes] = await Promise.all([
          api.get('/stats'),
          api.get('/sessions'),
        ])
        setStats(sRes.data)
        setSessions(sessRes.data)

        try {
          const dr = await api.get('/demo/status')
          setDemoState({ hasDemoData: dr.data.has_demo, count: dr.data.count })
        } catch {}
      }
    } catch {}
    finally { setLoading(false) }
  }, [isAdmin])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.post('/demo/seed')
      // Run the seeder via artisan — in practice this queues; reload after 2s
      setTimeout(load, 2000)
    } catch {}
    setSeeding(false)
  }

  const handleClear = async () => {
    if (!confirm('Supprimer toutes les données de démo ?')) return
    setClearing(true)
    try {
      await api.post('/demo/clear')
      setTimeout(load, 1000)
    } catch {}
    setClearing(false)
  }

  if (loading) return <PageLoader />

  const chartData = (stats?.revenue_by_day ?? []).map(d => ({
    date:    d.date?.slice(5),
    revenue: parseFloat(d.revenue ?? 0),
    profit:  parseFloat(d.profit  ?? 0),
  }))

  const marginPct = stats?.month_revenue > 0
    ? ((stats.month_profit / stats.month_revenue) * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-color tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-color mt-0.5">El Irtiwaa — vue en temps réel <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1 mb-0.5" /></p>
      </div>

      {/* ── Admin view ──────────────────────────────────────────────────── */}
      {isAdmin() && stats ? (
        <>
          {/* Demo banner */}
          <DemoBanner
            hasDemoData={demoState.hasDemoData}
            demoCount={demoState.count}
            onSeed={handleSeed}
            onClear={handleClear}
            seeding={seeding}
            clearing={clearing}
          />

          {/* KPI row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KpiCard label="CA aujourd'hui"   value={fmt(stats.today_revenue)  + ' TND'} icon="fa-solid fa-arrow-trend-up"      accent="#0d9488" iconBg="#f0fdfa" />
            <KpiCard label="CA ce mois"       value={fmt(stats.month_revenue)  + ' TND'} icon="fa-solid fa-sack-dollar"          accent="#3b82f6" iconBg="#eff6ff" />
            <KpiCard label="Bénéfice du mois" value={fmt(stats.month_profit)   + ' TND'} icon="fa-solid fa-coins"                accent="#10b981" iconBg="#ecfdf5"
              sub={`Marge ${marginPct}%`} />
            <KpiCard label="Impayés total"    value={fmt(stats.unpaid_total)   + ' TND'} icon="fa-solid fa-triangle-exclamation" accent="#ef4444" iconBg="#fef2f2" />
          </div>

          {/* KPI row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Dépenses ce mois" value={fmt(stats.month_expenses) + ' TND'} icon="fa-solid fa-receipt"           accent="#f97316" iconBg="#fff7ed" />
            <KpiCard label="Factures ce mois" value={stats.month_invoices ?? 0}          icon="fa-solid fa-file-invoice"      accent="#8b5cf6" iconBg="#f5f3ff" />
            <KpiCard label="Routes ouvertes"  value={stats.open_routes ?? 0}             icon="fa-solid fa-truck-fast"        accent="#f59e0b" iconBg="#fffbeb" />
            <KpiCard label="Sessions actives" value={stats.active_sessions ?? 0}         icon="fa-solid fa-mobile-screen"     accent="#6366f1" iconBg="#eef2ff" />
          </div>

          {/* Revenue + Profit chart */}
          {chartData.length > 0 && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-base-color">CA & Bénéfice — 30 derniers jours</h2>
                <div className="flex items-center gap-3 text-xs text-muted-color">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-teal-500 inline-block" /> CA</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-emerald-400 inline-block" /> Bénéfice</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Inter' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Inter' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontFamily: 'Inter', fontSize: 12 }}
                    formatter={(v, n) => [fmt(v) + ' TND', n === 'revenue' ? 'CA' : 'Bénéfice']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Low stock widget */}
            {(stats.low_depot_stock ?? []).length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Stock bas au dépôt
                  </h2>
                  <span className="badge badge-amber">{stats.low_depot_stock.length} produit{stats.low_depot_stock.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3 divide-y" style={{ '--tw-divide-opacity': 1 }}>
                  {stats.low_depot_stock.map(item => (
                    <div key={item.product_id} className="pt-3 first:pt-0">
                      <RestockRow item={item} onDone={load} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top products */}
            {(stats.top_products ?? []).length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-base-color mb-4">Top produits ce mois</h2>
                <div className="space-y-2.5">
                  {stats.top_products.map((p, i) => {
                    const maxRev = stats.top_products[0]?.total_revenue ?? 1
                    const pct    = Math.round((p.total_revenue / maxRev) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-base-color truncate">{p.product_name}</span>
                            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 ml-2 flex-shrink-0">{fmt(p.total_revenue)} TND</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AR Aging — admin also sees it */}
          <AgingWidget />

          {/* Sessions table */}
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
              <i className="fa-solid fa-mobile-screen text-muted-color text-sm" />
              Sessions commerciaux
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Commercial', 'Appareil', 'Version', 'Statut', 'Dernière activité'].map(h => (
                      <th key={h} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="table-row">
                      <td className="py-3 pr-4 font-semibold text-base-color">{s.user?.name ?? '—'}</td>
                      <td className="py-3 pr-4 text-secondary-color">{s.brand} {s.model}</td>
                      <td className="py-3 pr-4 text-muted-color">{s.app_version}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.alive ? 'text-emerald-600' : 'text-muted-color'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.alive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          {s.alive ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </td>
                      <td className="py-3 text-muted-color text-xs">
                        {s.last_seen ? new Date(s.last_seen).toLocaleString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-color text-sm">Aucune session active</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ── Rep / non-admin view ────────────────────────────────────────── */
        <div>
          {/* AR Aging — important for reps to see their credit exposure */}
          <AgingWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/invoices"
              className="card card-hover cursor-pointer group transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-file-invoice text-teal-600 dark:text-teal-400 text-xl" />
              </div>
              <div className="font-semibold text-base-color">Mes factures</div>
              <div className="text-sm text-muted-color mt-0.5">Voir et créer des factures</div>
            </Link>
            <Link to="/customers"
              className="card card-hover cursor-pointer group transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-users text-blue-500 text-xl" />
              </div>
              <div className="font-semibold text-base-color">Mes clients</div>
              <div className="text-sm text-muted-color mt-0.5">Gérer votre portefeuille client</div>
            </Link>
            <Link to="/invoices/create"
              className="card card-hover cursor-pointer group transition-all sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                  style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <i className="fa-solid fa-plus text-teal-600 text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-base-color">Nouvelle facture</div>
                  <div className="text-sm text-muted-color mt-0.5">Créer une facture client rapidement</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

