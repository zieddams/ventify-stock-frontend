import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import { PageLoader } from '../components/Spinner'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useDepots } from '../hooks/useDepots'
import QuantityInput from '../components/QuantityInput'
import { isTerrainTrackingEnabled } from '../utils/companyFeatures'
import { formatCurrency, formatDateTime, formatElapsedSeconds, formatNumber } from '../utils/format'

const HEARTBEAT_REFRESH_MS = 20 * 1000

function getSessionPresenceMeta(session, terrainTrackingEnabled, t) {
  if (!terrainTrackingEnabled) {
    return {
      label: t('dashboard.presence.monitoring'),
      textClassName: 'text-muted-color',
      dotClassName: 'bg-slate-300',
    }
  }

  const state = session?.presence?.state

  if (state === 'online' || session?.is_online) {
    return {
      label: t('dashboard.presence.online'),
      textClassName: 'text-emerald-600',
      dotClassName: 'bg-emerald-500 animate-pulse',
    }
  }

  if (state === 'stale' || (session?.alive && session?.last_seen)) {
    return {
      label: t('dashboard.presence.delayed'),
      textClassName: 'text-amber-600',
      dotClassName: 'bg-amber-500',
    }
  }

  if (state === 'never_seen') {
    return {
      label: t('dashboard.presence.noSignal'),
      textClassName: 'text-muted-color',
      dotClassName: 'bg-slate-300',
    }
  }

  return {
    label: t('dashboard.presence.offline'),
    textClassName: 'text-muted-color',
    dotClassName: 'bg-slate-300',
  }
}

/* ─── KPI Card ─────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, accent = '#0d9488', iconBg = '#f0fdfa', delta }) {
  const { t } = useI18n()

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
          {t('dashboard.vsYesterday', { value: Math.abs(delta).toFixed(1) })}
        </div>
      )}
    </div>
  )
}

/* ─── Restock modal (inline in low-stock widget) ───────────────────────────── */
function RestockRow({ item, onDone }) {
  const { t } = useI18n()
  const [qty, setQty]     = useState(1)
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)

  const handleRestock = async () => {
    if (qty <= 0) return
    setSaving(true)
    try {
      await api.post('/depot/receive', {
        product_id: item.product?.id ?? item.product_id,
        qty,
        depot_id: item.depot_id ?? item.depot?.id ?? null,
      })
      setOpen(false)
      onDone()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-base-color truncate">{item.product?.name ?? t('common.notAvailable')}</div>
        <div className="text-xs text-muted-color">
          {[item.product?.unit, item.depot?.name].filter(Boolean).join(' | ') || t('depot.notDefined')}
        </div>
      </div>

      <span className="badge badge-red text-xs font-mono px-2">
        {item.qty} {item.product?.unit ?? ''}
      </span>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-1 px-2.5 flex-shrink-0">
          <i className="fa-solid fa-plus text-xs" /> {t('dashboard.restockAction')}
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
  const { t } = useI18n()

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
            {hasDemoData
              ? t('dashboard.demo.activeTitle', { count: demoCount })
              : t('dashboard.demo.inactiveTitle')}
          </div>
          <div className="text-xs text-muted-color">
            {hasDemoData
              ? t('dashboard.demo.activeText')
              : t('dashboard.demo.inactiveText')}
          </div>
        </div>
      </div>
      {hasDemoData ? (
        <button onClick={onClear} disabled={clearing}
          className="btn-danger text-xs py-1.5 flex-shrink-0">
          {clearing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash-can" />}
          {t('dashboard.demo.clear')}
        </button>
      ) : (
        <button onClick={onSeed} disabled={seeding}
          className="btn-secondary text-xs py-1.5 flex-shrink-0">
          {seeding ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-play" />}
          {t('dashboard.demo.seed')}
        </button>
      )}
    </div>
  )
}

/* ─── AR Aging widget ───────────────────────────────────────────────────────── */
function AgingWidget({ depotId = null, depotName = '' }) {
  const { t } = useI18n()
  const [aging, setAging] = useState(null)
  useEffect(() => {
    api.get('/reports/aging', {
      params: depotId ? { depot_id: depotId } : {},
    }).then(r => setAging(r.data)).catch(() => setAging(null))
  }, [depotId])
  if (!aging) return null

  const buckets = [
    { key: 'b0_30',  label: t('dashboard.aging.buckets.b0_30'),  color: '#0d9488' },
    { key: 'b31_60', label: t('dashboard.aging.buckets.b31_60'), color: '#f59e0b' },
    { key: 'b61_90', label: t('dashboard.aging.buckets.b61_90'), color: '#f97316' },
    { key: 'b90_plus', label: t('dashboard.aging.buckets.b90_plus'), color: '#ef4444' },
  ]
  const total = (aging.totals?.total_due ?? 0)
  if (total === 0) return null

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-amber-500" />
          {t('dashboard.aging.title')}
        </h2>
        <Link to="/credit" className="text-xs font-medium" style={{ color: '#0d9488' }}>
          {t('dashboard.aging.seeAll')} <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />
        </Link>
      </div>

      {depotName && (
        <div className="text-xs text-muted-color mb-4">
          {t('dashboard.aging.scope', { depotName })}
        </div>
      )}

      {/* Bucket KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {buckets.map(b => (
            <div key={b.key} className="rounded-xl px-3 py-2.5 text-center border border-theme bg-surface-2">
              <div className="text-xs text-muted-color mb-1">{b.label}</div>
              <div className="text-sm font-bold" style={{ color: b.color }}>
                {formatNumber(aging.totals?.[b.key] ?? 0)}
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
                <th className="pb-2 pr-3 text-left font-semibold text-muted-color">{t('dashboard.aging.customer')}</th>
                {buckets.map(b => (
                  <th key={b.key} className="pb-2 pr-3 text-right font-semibold" style={{ color: b.color }}>{b.label}</th>
                ))}
                <th className="pb-2 text-right font-semibold text-base-color">{t('dashboard.aging.totalDue')}</th>
              </tr>
            </thead>
            <tbody>
              {aging.customers.slice(0, 5).map((r, i) => (
                <tr key={i} className="table-row">
                  <td className="py-2 pr-3 font-medium text-base-color">{r.customer_name}</td>
                  {buckets.map(b => (
                    <td key={b.key} className="py-2 pr-3 text-right font-mono" style={{ color: parseFloat(r[b.key] ?? 0) > 0 ? b.color : 'var(--text-muted)' }}>
                      {formatNumber(r[b.key] ?? 0)}
                    </td>
                  ))}
                  <td className="py-2 text-right font-bold text-base-color">{formatNumber(r.total_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs text-muted-color">{t('dashboard.aging.totalOutstanding')}</span>
        <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { t } = useI18n()
  const [stats, setStats]       = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const { user, isAdmin }       = useAuth()
  const terrainTrackingEnabled = isTerrainTrackingEnabled(user)
  const {
    depots,
    loading: depotsLoading,
    selectedDepotId,
    selectedDepot,
    canSelectAll,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  const load = useCallback(async () => {
    try {
      if (isAdmin()) {
        const params = selectedDepotId ? { depot_id: selectedDepotId } : {}
        const [sRes, sessRes] = await Promise.all([
          api.get('/stats', { params }),
          api.get('/sessions', { params }),
        ])
        setStats(sRes.data)
        setSessions(sessRes.data)

      } else {
        setStats(null)
        setSessions([])
      }
    } catch {}
    finally { setLoading(false) }
  }, [isAdmin, selectedDepotId])

  useEffect(() => {
    load()
    const id = setInterval(load, HEARTBEAT_REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  if (loading || depotsLoading) return <PageLoader />

  const chartData = (stats?.revenue_by_day ?? []).map(d => ({
    date:    d.date?.slice(5),
    revenue: parseFloat(d.revenue ?? 0),
    profit:  parseFloat(d.profit  ?? 0),
  }))

  const marginPct = stats?.month_revenue > 0
    ? ((stats.month_profit / stats.month_revenue) * 100).toFixed(1)
    : '0.0'
  const dashboardScopeLabel = selectedDepot
    ? `${selectedDepot.name}${selectedDepot.code ? ` (${selectedDepot.code})` : ''}`
    : t('depot.all')
  const showSessionDepotColumn = canSelectAll && depots.length > 1

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-color mt-0.5">{t('dashboard.subtitle')} <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1 mb-0.5" /></p>
      </div>
      </div>

      {isAdmin() && stats ? (
        <>

          {/* KPI row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KpiCard label={t('dashboard.kpis.todayRevenue')} value={formatCurrency(stats.today_revenue)} icon="fa-solid fa-arrow-trend-up" accent="#0d9488" iconBg="#f0fdfa" />
            <KpiCard label={t('dashboard.kpis.monthRevenue')} value={formatCurrency(stats.month_revenue)} icon="fa-solid fa-sack-dollar" accent="#3b82f6" iconBg="#eff6ff" />
            <KpiCard label={t('dashboard.kpis.monthProfit')} value={formatCurrency(stats.month_profit)} icon="fa-solid fa-coins" accent="#10b981" iconBg="#ecfdf5"
              sub={t('dashboard.kpis.margin', { value: marginPct })} />
            <KpiCard label={t('dashboard.kpis.unpaidTotal')} value={formatCurrency(stats.unpaid_total)} icon="fa-solid fa-triangle-exclamation" accent="#ef4444" iconBg="#fef2f2" />
          </div>

          {/* KPI row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard label={t('dashboard.kpis.monthExpenses')} value={formatCurrency(stats.month_expenses)} icon="fa-solid fa-receipt" accent="#f97316" iconBg="#fff7ed" />
            <KpiCard label={t('dashboard.kpis.monthInvoices')} value={stats.month_invoices ?? 0} icon="fa-solid fa-file-invoice" accent="#8b5cf6" iconBg="#f5f3ff" />
            <KpiCard label={t('dashboard.kpis.openRoutes')} value={stats.open_routes ?? 0} icon="fa-solid fa-truck-fast" accent="#f59e0b" iconBg="#fffbeb" />
            <KpiCard label={t('dashboard.kpis.activeSessions')} value={stats.active_sessions ?? 0} icon="fa-solid fa-mobile-screen" accent="#6366f1" iconBg="#eef2ff" />
          </div>

          {/* Revenue + Profit chart */}
          {chartData.length > 0 && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-base-color">{t('dashboard.chartTitle')}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-color">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-teal-500 inline-block" /> {t('dashboard.chartRevenue')}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-emerald-400 inline-block" /> {t('dashboard.chartProfit')}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Inter' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'Inter' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontFamily: 'Inter', fontSize: 12 }}
                    formatter={(v, n) => [formatCurrency(v), n === 'revenue' ? t('dashboard.chartRevenue') : t('dashboard.chartProfit')]}
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
                    {t('dashboard.lowStockTitle')}
                  </h2>
                  <span className="badge badge-amber">{t('dashboard.productsCount', { count: stats.low_depot_stock.length })}</span>
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
                <h2 className="text-sm font-semibold text-base-color mb-4">{t('dashboard.topProductsTitle')}</h2>
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
                            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 ml-2 flex-shrink-0">{formatCurrency(p.total_revenue)}</span>
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
          <AgingWidget depotId={selectedDepotId} depotName={dashboardScopeLabel} />

          {/* Sessions table */}
          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                <i className="fa-solid fa-mobile-screen text-muted-color text-sm" />
                {t('dashboard.sessionsTitle')}
              </h2>
              <div className="text-xs text-muted-color">
                {showSessionDepotColumn
                  ? t('dashboard.sessionsScopeFiltered', { scope: dashboardScopeLabel })
                  : t('dashboard.sessionsScopeAll')}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                    {[
                      t('dashboard.columns.rep'),
                      t('dashboard.columns.device'),
                      t('dashboard.columns.version'),
                      t('dashboard.columns.status'),
                      t('dashboard.columns.lastActivity'),
                    ].map(h => (
                      <th key={h} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => {
                    const presenceMeta = getSessionPresenceMeta(s, terrainTrackingEnabled, t)
                    const lastSeenAge = formatElapsedSeconds(s.presence?.last_seen_age_seconds)
                    const activityAt = s.updated_at || s.started_at || s.created_at || s.last_seen
                    const deviceLabel = [s.brand, s.model].filter(Boolean).join(' ') || t('common.notAvailable')
                    const versionLabel = s.app_version || s.native_app_version || t('common.notAvailable')
                    const lastActivityLabel = terrainTrackingEnabled
                      ? (s.last_seen
                        ? `${formatDateTime(s.last_seen)}${lastSeenAge ? ` · ${lastSeenAge}` : ''}`
                        : t('common.notAvailable'))
                      : (activityAt ? formatDateTime(activityAt) : t('dashboard.sessionTracked'))

                    return (
                      <tr key={s.id} className="table-row">
                        <td className="py-3 pr-4 font-semibold text-base-color">
                          <span>{s.user?.name ?? t('common.notAvailable')}</span>
                        </td>
                        <td className="py-3 pr-4 text-secondary-color">{deviceLabel}</td>
                        <td className="py-3 pr-4 text-muted-color">{versionLabel}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${presenceMeta.textClassName}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${presenceMeta.dotClassName}`} />
                            {presenceMeta.label}
                          </span>
                        </td>
                        <td className="py-3 text-muted-color text-xs">{lastActivityLabel}</td>
                      </tr>
                    )
                  })}
                  {sessions.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-color text-sm">{t('dashboard.noActiveSessions')}</td></tr>
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
          <AgingWidget depotId={selectedDepotId} depotName={dashboardScopeLabel} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/invoices"
              className="card card-hover cursor-pointer group transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-file-invoice text-teal-600 dark:text-teal-400 text-xl" />
              </div>
              <div className="font-semibold text-base-color">{t('dashboard.myInvoices')}</div>
              <div className="text-sm text-muted-color mt-0.5">{t('dashboard.myInvoicesHint')}</div>
            </Link>
            <Link to="/customers"
              className="card card-hover cursor-pointer group transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-users text-blue-500 text-xl" />
              </div>
              <div className="font-semibold text-base-color">{t('dashboard.myCustomers')}</div>
              <div className="text-sm text-muted-color mt-0.5">{t('dashboard.myCustomersHint')}</div>
            </Link>
            <Link to="/invoices/create"
              className="card card-hover cursor-pointer group transition-all sm:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                  style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <i className="fa-solid fa-plus text-teal-600 text-xl" />
                </div>
                <div>
                  <div className="font-semibold text-base-color">{t('dashboard.newInvoice')}</div>
                  <div className="text-sm text-muted-color mt-0.5">{t('dashboard.newInvoiceHint')}</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

