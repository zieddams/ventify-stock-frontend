import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import CustomerLedgerModal from '../../components/CustomerLedgerModal'
import DepotScopeControls from '../../components/DepotScopeControls'
import FrenchDateRangeInput from '../../components/FrenchDateRangeInput'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'
import { formatCurrency, formatNumber } from '../../utils/format'

const SECTIONS_STORAGE_KEY = 'irtiwaa-supervisor-dashboard-sections'
const CHANNEL_COLORS = { depot: '#0d9488', camion: '#3b82f6', pos: '#ec4899' }

function useChartTheme() {
  const { isDark } = useTheme()

  return {
    grid: isDark ? '#334155' : '#e2e8f0',
    axis: isDark ? '#64748b' : '#94a3b8',
    tooltip: isDark
      ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#f8fafc' }
      : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a' },
  }
}

function toYmd(date) {
  return date.toISOString().slice(0, 10)
}

function resolveRange(period, dateFrom, dateTo) {
  const today = new Date()

  if (period === 'custom') {
    return { from: dateFrom || dateTo || toYmd(today), to: dateTo || dateFrom || toYmd(today) }
  }

  if (period === 'today') {
    const value = toYmd(today)
    return { from: value, to: value }
  }

  if (period === 'week') {
    const start = new Date(today)
    const delta = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - delta)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: toYmd(start), to: toYmd(end) }
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { from: toYmd(start), to: toYmd(end) }
}

// Same-length window immediately preceding `from` - e.g. viewing the whole of
// June compares against the whole of May, a custom 10-day range compares
// against the preceding 10 days.
function previousEquivalentRange(from, to) {
  const fromDate = new Date(`${from}T00:00:00`)
  const toDate = new Date(`${to}T00:00:00`)
  const spanMs = Math.max(toDate.getTime() - fromDate.getTime(), 0)
  const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000)
  const prevFrom = new Date(prevTo.getTime() - spanMs)
  return { from: toYmd(prevFrom), to: toYmd(prevTo) }
}

function deltaPct(current, previous) {
  const curr = Number(current || 0)
  const prev = Number(previous || 0)

  if (prev === 0) {
    return curr === 0 ? 0 : null
  }

  return ((curr - prev) / Math.abs(prev)) * 100
}

function DeltaBadge({ value, t }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null
  }

  const positive = value >= 0

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
      style={{ color: positive ? '#059669' : '#dc2626', background: positive ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)' }}
    >
      <i className={`fa-solid fa-arrow-${positive ? 'up' : 'down'}`} style={{ fontSize: 9 }} />
      {t('supervisorDashboard.vsPrevious', { value: Math.abs(value).toFixed(1) })}
    </span>
  )
}

function KpiCard({ label, value, icon, color, delta, t }) {
  return (
    <div className="card py-3.5 px-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-color uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
          <i className={`${icon} text-sm`} style={{ color }} />
        </div>
      </div>
      <div className="text-xl font-bold text-base-color font-mono tracking-tight">{value}</div>
      <DeltaBadge value={delta} t={t} />
    </div>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-base-color">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function SupervisorDashboard() {
  const { t } = useI18n()
  const chartTheme = useChartTheme()
  const {
    depots,
    loading: depotsLoading,
    selectedValue,
    setSelectedValue,
    canSelectAll,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: true,
    defaultToAll: true,
    scopeToCompanyBrowse: true,
    storageKey: 'app-depot-scope',
  })

  const [period, setPeriod] = useState('month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [compareEnabled, setCompareEnabled] = useState(false)

  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(null)
  const [prevInsights, setPrevInsights] = useState(null)
  const [aging, setAging] = useState(null)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [stock, setStock] = useState([])

  const [sections, setSections] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SECTIONS_STORAGE_KEY) || '{}')
      return { channel: true, products: true, reps: true, stock: true, ...stored }
    } catch {
      return { channel: true, products: true, reps: true, stock: true }
    }
  })

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [ledgerCustomer, setLedgerCustomer] = useState(null)

  const range = useMemo(() => resolveRange(period, dateFrom, dateTo), [period, dateFrom, dateTo])
  const prevRange = useMemo(() => previousEquivalentRange(range.from, range.to), [range])

  const toggleSection = (key) => {
    setSections((current) => {
      const next = { ...current, [key]: !current[key] }
      try {
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage issues
      }
      return next
    })
  }

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    let cancelled = false
    setLoading(true)

    const insightsParams = { ...scopeParams, date_from: range.from, date_to: range.to, period: 'custom' }
    const requests = [
      api.get('/reports/profit-insights', { params: insightsParams }),
      api.get('/reports/aging', { params: scopeParams }),
      api.get('/expenses', { params: { ...scopeParams, date_from: range.from, date_to: range.to } }),
      api.get('/depot', { params: scopeParams }),
      compareEnabled
        ? api.get('/reports/profit-insights', { params: { ...scopeParams, date_from: prevRange.from, date_to: prevRange.to, period: 'custom' } })
        : Promise.resolve(null),
    ]

    Promise.all(requests)
      .then(([insightsRes, agingRes, expensesRes, depotRes, prevRes]) => {
        if (cancelled) return

        setInsights(insightsRes.data)
        setAging(agingRes.data)
        const expenseRows = Array.isArray(expensesRes.data) ? expensesRes.data : (expensesRes.data?.data ?? [])
        setExpensesTotal(expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0))
        setStock(Array.isArray(depotRes.data) ? depotRes.data : [])
        setPrevInsights(prevRes?.data ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [depotsReady, range.from, range.to, compareEnabled, prevRange.from, prevRange.to, scopeParams])

  useEffect(() => {
    const query = customerSearch.trim()

    if (query.length < 2) {
      setCustomerResults([])
      return undefined
    }

    setSearchingCustomers(true)
    const timeout = setTimeout(() => {
      api.get('/customers', { params: { q: query, per_page: 8 } })
        .then((response) => {
          const rows = Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
          setCustomerResults(rows)
        })
        .finally(() => setSearchingCustomers(false))
    }, 300)

    return () => clearTimeout(timeout)
  }, [customerSearch])

  const totals = insights?.totals ?? null
  const prevTotals = prevInsights?.totals ?? null
  const lowStockCount = useMemo(
    () => stock.filter((item) => Number(item.qty ?? 0) <= Math.max(Number(item.product?.min_stock ?? 1), 1)).length,
    [stock],
  )
  const stockValue = useMemo(
    () => stock.reduce((sum, item) => sum + Number(item.qty ?? 0) * Number(item.product?.buy_price ?? 0), 0),
    [stock],
  )
  const creditOutstanding = useMemo(
    () => (aging?.customers ?? []).reduce((sum, row) => sum + Number(row.total_due ?? 0), 0),
    [aging],
  )

  const channelRows = insights?.by_channel ?? []
  const productRows = insights?.by_product ?? []
  const repRows = insights?.by_rep ?? []

  if (loading && !insights) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title={t('supervisorDashboard.title')}
        subtitle={t('supervisorDashboard.subtitle')}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canSelectAll && (
              <DepotScopeControls
                depots={depots}
                loading={depotsLoading}
                selectedValue={selectedValue}
                onChange={setSelectedValue}
                allowAll
                canSelectAll={canSelectAll}
                label={t('supervisorDashboard.depotScopeLabel')}
                allLabel={t('supervisorDashboard.allDepots')}
              />
            )}
          </div>
        )}
      />

      <div className="card mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
            {['today', 'week', 'month', 'custom'].map((option) => (
              <button
                key={option}
                onClick={() => setPeriod(option)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${period === option ? 'bg-teal-500 text-white' : 'text-muted-color hover:text-base-color'}`}
              >
                {t(`supervisorDashboard.periods.${option}`)}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <FrenchDateRangeInput valueFrom={dateFrom} valueTo={dateTo} onChange={({ from, to }) => { setDateFrom(from); setDateTo(to) }} />
          )}

          <label className="inline-flex items-center gap-2 text-xs font-medium text-secondary-color cursor-pointer ml-auto">
            <input type="checkbox" checked={compareEnabled} onChange={(event) => setCompareEnabled(event.target.checked)} />
            {t('supervisorDashboard.compareToggle', { from: prevRange.from, to: prevRange.to })}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard
          t={t}
          label={t('supervisorDashboard.kpis.revenue')}
          value={formatCurrency(totals?.revenue ?? 0)}
          icon="fa-solid fa-sack-dollar"
          color="#0d9488"
          delta={compareEnabled ? deltaPct(totals?.revenue, prevTotals?.revenue) : null}
        />
        <KpiCard
          t={t}
          label={t('supervisorDashboard.kpis.profit')}
          value={formatCurrency(totals?.profit ?? 0)}
          icon="fa-solid fa-chart-line"
          color="#3b82f6"
          delta={compareEnabled ? deltaPct(totals?.profit, prevTotals?.profit) : null}
        />
        <KpiCard
          t={t}
          label={t('supervisorDashboard.kpis.expenses')}
          value={formatCurrency(expensesTotal)}
          icon="fa-solid fa-receipt"
          color="#f59e0b"
        />
        <KpiCard
          t={t}
          label={t('supervisorDashboard.kpis.creditOutstanding')}
          value={formatCurrency(creditOutstanding)}
          icon="fa-solid fa-hand-holding-dollar"
          color="#ef4444"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-semibold text-muted-color uppercase tracking-wider mr-1">{t('supervisorDashboard.sectionsLabel')}</span>
        {['channel', 'products', 'reps', 'stock'].map((key) => (
          <button
            key={key}
            onClick={() => toggleSection(key)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              sections[key] ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-theme text-muted-color'
            }`}
          >
            <i className={`fa-solid ${sections[key] ? 'fa-eye' : 'fa-eye-slash'}`} style={{ fontSize: 10 }} /> {t(`supervisorDashboard.sections.${key}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {sections.channel && (
          <SectionCard title={t('supervisorDashboard.channelTitle')}>
            {channelRows.length === 0 ? (
              <p className="text-sm text-muted-color py-6 text-center">{t('supervisorDashboard.empty')}</p>
            ) : (
              <>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={channelRows.map((row) => ({ ...row, label: t(`supervisorDashboard.channels.${row.sale_channel}`) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                      <XAxis dataKey="label" stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                      <Tooltip contentStyle={chartTheme.tooltip} formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                        {channelRows.map((row) => (
                          <Cell key={row.sale_channel} fill={CHANNEL_COLORS[row.sale_channel] ?? '#64748b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {channelRows.map((row) => (
                    <div key={row.sale_channel} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHANNEL_COLORS[row.sale_channel] ?? '#64748b' }} />
                        <span className="text-secondary-color">{t(`supervisorDashboard.channels.${row.sale_channel}`)}</span>
                      </div>
                      <span className="font-mono font-semibold text-base-color">{formatCurrency(row.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        )}

        {sections.stock && (
          <SectionCard title={t('supervisorDashboard.stockTitle')}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border border-theme" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color">{t('supervisorDashboard.stockValue')}</div>
                <div className="text-lg font-bold font-mono text-base-color mt-1">{formatCurrency(stockValue)}</div>
              </div>
              <div className="rounded-xl p-3 border border-theme" style={{ background: lowStockCount > 0 ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color">{t('supervisorDashboard.lowStockCount')}</div>
                <div className="text-lg font-bold font-mono mt-1" style={{ color: lowStockCount > 0 ? '#dc2626' : 'var(--text-base)' }}>{lowStockCount}</div>
              </div>
            </div>
            <div className="text-xs text-muted-color mt-3">{t('supervisorDashboard.stockRefsCount', { count: stock.length })}</div>
          </SectionCard>
        )}

        {sections.products && (
          <SectionCard title={t('supervisorDashboard.productsTitle')}>
            {productRows.length === 0 ? (
              <p className="text-sm text-muted-color py-6 text-center">{t('supervisorDashboard.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="pb-2 pr-3 text-xs font-semibold text-muted-color uppercase tracking-wider">{t('supervisorDashboard.productsTable.product')}</th>
                      <th className="pb-2 pr-3 text-xs font-semibold text-muted-color uppercase tracking-wider text-right">{t('supervisorDashboard.productsTable.qty')}</th>
                      <th className="pb-2 text-xs font-semibold text-muted-color uppercase tracking-wider text-right">{t('supervisorDashboard.productsTable.revenue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.slice(0, 10).map((row) => (
                      <tr key={row.product_id ?? row.product_name} className="table-row">
                        <td className="py-2 pr-3">
                          <div className="font-medium text-base-color">{row.product_name}</div>
                          <div className="text-xs text-muted-color">{row.product_reference}</div>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-muted-color">{formatNumber(row.qty_sold)}</td>
                        <td className="py-2 text-right font-mono font-semibold text-base-color">{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {sections.reps && (
          <SectionCard title={t('supervisorDashboard.repsTitle')}>
            {repRows.length === 0 ? (
              <p className="text-sm text-muted-color py-6 text-center">{t('supervisorDashboard.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="pb-2 pr-3 text-xs font-semibold text-muted-color uppercase tracking-wider">{t('supervisorDashboard.repsTable.rep')}</th>
                      <th className="pb-2 pr-3 text-xs font-semibold text-muted-color uppercase tracking-wider text-right">{t('supervisorDashboard.repsTable.revenue')}</th>
                      <th className="pb-2 text-xs font-semibold text-muted-color uppercase tracking-wider text-right">{t('supervisorDashboard.repsTable.margin')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repRows.slice(0, 10).map((row) => (
                      <tr key={row.rep_id ?? row.rep_name} className="table-row">
                        <td className="py-2 pr-3 font-medium text-base-color">{row.rep_name}</td>
                        <td className="py-2 pr-3 text-right font-mono font-semibold text-base-color">{formatCurrency(row.revenue)}</td>
                        <td className="py-2 text-right font-mono text-muted-color">{formatNumber(row.margin_pct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      <div className="card mt-5">
        <h2 className="text-sm font-semibold text-base-color mb-3">{t('supervisorDashboard.customerHistoryTitle')}</h2>
        <p className="text-xs text-muted-color mb-3">{t('supervisorDashboard.customerHistorySubtitle')}</p>
        <div className="relative max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
          <input
            value={customerSearch}
            onChange={(event) => setCustomerSearch(event.target.value)}
            placeholder={t('supervisorDashboard.customerSearchPlaceholder')}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {searchingCustomers && <p className="text-xs text-muted-color mt-2">{t('common.loading')}</p>}

        {customerResults.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {customerResults.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setLedgerCustomer(customer)}
                className="w-full flex items-center justify-between gap-3 text-left rounded-xl px-3 py-2.5 border border-theme hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-base-color truncate">{customer.name}</div>
                  <div className="text-xs text-muted-color truncate">{customer.phone || t('common.notAvailable')}</div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-muted-color flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <CustomerLedgerModal
        open={Boolean(ledgerCustomer)}
        customer={ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
      />
    </div>
  )
}
