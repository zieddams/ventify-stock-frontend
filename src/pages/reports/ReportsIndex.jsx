import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DepotScopeControls from '../../components/DepotScopeControls'
import FrenchDateTimeInput from '../../components/FrenchDateTimeInput'
import PageExportActions from '../../components/PageExportActions'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { useTheme } from '../../contexts/ThemeContext'
import api from '../../services/api'
import { formatCurrency, formatDate, formatNumber } from '../../utils/format'

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

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div className="card py-3 px-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}1a` }}>
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

function OverviewTab({ stats }) {
  const { t } = useI18n()
  const theme = useChartTheme()
  const chartData = (stats?.revenue_by_day ?? []).map((day) => ({
    date: day.date?.slice(5),
    revenue: Number(day.revenue ?? 0),
    profit: Number(day.profit ?? 0),
  }))
  const topProducts = stats?.top_products ?? []

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label={t('reportsPage.overview.todayRevenue')}
          value={formatCurrency(stats?.today_revenue)}
          icon="fa-solid fa-arrow-trend-up"
          color="#0d9488"
        />
        <KpiCard
          label={t('reportsPage.overview.monthProfit')}
          value={formatCurrency(stats?.month_profit)}
          icon="fa-solid fa-coins"
          color="#10b981"
        />
        <KpiCard
          label={t('reportsPage.overview.unpaidTotal')}
          value={formatCurrency(stats?.unpaid_total)}
          icon="fa-solid fa-triangle-exclamation"
          color="#dc2626"
        />
        <KpiCard
          label={t('reportsPage.overview.monthExpenses')}
          value={formatCurrency(stats?.month_expenses)}
          icon="fa-solid fa-receipt"
          color="#f59e0b"
        />
      </div>

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-base-color mb-4">{t('reportsPage.overview.chartTitle')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
              <XAxis dataKey="date" stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <YAxis stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <Tooltip contentStyle={theme.tooltip} formatter={(value, name) => [formatCurrency(value), name]} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name={t('reportsPage.overview.chartRevenue')} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name={t('reportsPage.overview.chartProfit')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">{t('reportsPage.overview.topProductsTitle')}</h2>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-base-color truncate">{product.product_name}</div>
                </div>
                <div className="text-sm font-semibold font-mono" style={{ color: '#0d9488' }}>
                  {formatCurrency(product.total_revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function ProfitTab({ scopeParams }) {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const theme = useChartTheme()

  useEffect(() => {
    setLoading(true)

    const params = { period, ...scopeParams }

    if (period === 'custom') {
      params.date_from = dateFrom
      params.date_to = dateTo
    }

    api.get('/reports/profit', { params })
      .then((response) => setData(response.data))
      .finally(() => setLoading(false))
  }, [period, dateFrom, dateTo, scopeParams.depot_id])

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-color">
        <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('reportsPage.profit.loading')}
      </div>
    )
  }

  const chartData = (data?.by_day ?? []).map((day) => ({
    date: day.day?.slice(5),
    revenue: Number(day.revenue ?? 0),
    profit: Number(day.profit ?? 0),
  }))

  const periodOptions = [
    ['today', t('reportsPage.profit.periods.today')],
    ['week', t('reportsPage.profit.periods.week')],
    ['month', t('reportsPage.profit.periods.month')],
    ['custom', t('reportsPage.profit.periods.custom')],
  ]

  const repColumns = [
    t('reportsPage.profit.columns.rep'),
    t('reportsPage.profit.columns.revenue'),
    t('reportsPage.profit.columns.cost'),
    t('reportsPage.profit.columns.profit'),
    t('reportsPage.profit.columns.invoices'),
  ]

  const camionColumns = [
    t('reportsPage.profit.columns.camion'),
    t('reportsPage.profit.columns.plate'),
    t('reportsPage.profit.columns.revenue'),
    t('reportsPage.profit.columns.profit'),
    t('reportsPage.profit.columns.invoices'),
  ]

  const repCamionColumns = [
    t('reportsPage.profit.columns.commercial'),
    t('reportsPage.profit.columns.camion'),
    t('reportsPage.profit.columns.revenue'),
    t('reportsPage.profit.columns.profit'),
    t('reportsPage.profit.columns.invoices'),
  ]

  return (
    <>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {periodOptions.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-1.5 text-xs rounded-xl font-semibold border transition-colors ${
              period === key ? 'bg-teal-600 text-white border-teal-600' : 'border-theme text-muted-color hover:text-base-color'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="card mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateFrom')}</label>
              <FrenchDateTimeInput type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateTo')}</label>
              <FrenchDateTimeInput type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label={t('reportsPage.profit.totalRevenue')} value={formatCurrency(data?.totals?.revenue)} icon="fa-solid fa-sack-dollar" color="#0d9488" />
        <KpiCard label={t('reportsPage.profit.totalCost')} value={formatCurrency(data?.totals?.cost)} icon="fa-solid fa-boxes-stacked" color="#64748b" />
        <KpiCard
          label={t('reportsPage.profit.grossProfit')}
          value={formatCurrency(data?.totals?.profit)}
          icon="fa-solid fa-coins"
          color="#10b981"
          sub={t('reportsPage.profit.margin', { value: data?.totals?.margin_pct ?? 0 })}
        />
        <KpiCard
          label={t('reportsPage.profit.belowCost')}
          value={data?.totals?.below_cost_lines ?? 0}
          icon="fa-solid fa-triangle-exclamation"
          color="#dc2626"
          sub={t('reportsPage.profit.belowCostSub')}
        />
      </div>

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-base-color mb-4">{t('reportsPage.profit.chartTitle')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
              <XAxis dataKey="date" stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <YAxis stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <Tooltip contentStyle={theme.tooltip} formatter={(value, name) => [formatCurrency(value), name]} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name={t('reportsPage.overview.chartRevenue')} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name={t('reportsPage.overview.chartProfit')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold text-base-color mb-3">{t('reportsPage.profit.byRepTitle')}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {repColumns.map((heading, index) => (
                <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.by_rep ?? []).map((rep, index) => (
              <tr key={index} className="table-row">
                <td className="py-3 pr-4 font-semibold text-base-color">{rep.rep_name || notAvailable}</td>
                <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(rep.revenue)}</td>
                <td className="py-3 pr-4 text-right font-mono text-muted-color">{formatCurrency(rep.cost)}</td>
                <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(rep.profit)}</td>
                <td className="py-3 text-right text-muted-color">{rep.invoice_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">{t('reportsPage.profit.byCamionTitle')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {camionColumns.map((heading, index) => (
                  <th key={heading} className={`pb-3 pr-4 ${index > 1 ? 'text-right' : 'text-left'}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.by_camion ?? []).map((camion, index) => (
                <tr key={`${camion.camion_id ?? 'none'}-${index}`} className="table-row">
                  <td className="py-3 pr-4 font-semibold text-base-color">{camion.camion_name || notAvailable}</td>
                  <td className="py-3 pr-4 text-muted-color text-xs">{camion.camion_plate || notAvailable}</td>
                  <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(camion.revenue)}</td>
                  <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(camion.profit)}</td>
                  <td className="py-3 text-right text-muted-color">{camion.invoice_count}</td>
                </tr>
              ))}
              {(data?.by_camion ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-color">{t('reportsPage.profit.noCamion')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">{t('reportsPage.profit.byRepCamionTitle')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {repCamionColumns.map((heading, index) => (
                  <th key={heading} className={`pb-3 pr-4 ${index > 1 ? 'text-right' : 'text-left'}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.by_rep_camion ?? []).map((row, index) => (
                <tr key={`${row.rep_id ?? 'rep'}-${row.camion_id ?? 'none'}-${index}`} className="table-row">
                  <td className="py-3 pr-4 font-semibold text-base-color">{row.rep_name || notAvailable}</td>
                  <td className="py-3 pr-4 text-secondary-color text-xs">
                    {row.camion_name || notAvailable}
                    {row.camion_plate ? ` - ${row.camion_plate}` : ''}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(row.profit)}</td>
                  <td className="py-3 text-right text-muted-color">{row.invoice_count}</td>
                </tr>
              ))}
              {(data?.by_rep_camion ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-color">{t('reportsPage.profit.noRepCamion')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function SitationTab({ scopeParams }) {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    setLoading(true)
    api.get('/reports/sitation', { params: { month, ...scopeParams } })
      .then((response) => setData(response.data))
      .finally(() => setLoading(false))
  }, [month, scopeParams.depot_id])

  const revenueColumns = [
    t('reportsPage.sitation.columns.rep'),
    t('reportsPage.sitation.columns.revenue'),
    t('reportsPage.sitation.columns.profit'),
  ]

  const expenseColumns = [
    t('reportsPage.sitation.columns.category'),
    t('reportsPage.sitation.columns.amount'),
  ]

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <FrenchDateTimeInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={{ width: 'auto' }} />
        <span className="text-xs text-muted-color">{t('reportsPage.sitation.monthHint')}</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-color">
          <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('reportsPage.sitation.loading')}
        </div>
      ) : data && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
              <i className="fa-solid fa-arrow-trend-up text-teal-500" /> {t('reportsPage.sitation.revenueTitle')}
            </h2>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr>
                  {revenueColumns.map((heading, index) => (
                    <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.recettes?.by_rep ?? []).map((rep, index) => (
                  <tr key={index} className="table-row">
                    <td className="py-2.5 pr-4 text-base-color">{rep.rep_name || notAvailable}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-secondary-color">{formatCurrency(rep.revenue)}</td>
                    <td className="py-2.5 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(rep.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-secondary-color">{t('reportsPage.sitation.totalRevenue')}</span>
              <span className="text-base-color font-mono">{formatCurrency(data.recettes?.total_revenue)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-1">
              <span className="text-secondary-color">{t('reportsPage.sitation.grossProfit')}</span>
              <span className="font-mono" style={{ color: '#059669' }}>{formatCurrency(data.recettes?.total_profit)}</span>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
              <i className="fa-solid fa-receipt" style={{ color: '#ea580c' }} /> {t('reportsPage.sitation.expensesTitle')}
            </h2>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr>
                  {expenseColumns.map((heading, index) => (
                    <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.depenses?.by_category ?? []).map((expense, index) => (
                  <tr key={index} className="table-row">
                    <td className="py-2.5 pr-4 text-secondary-color">{expense.label || notAvailable}</td>
                    <td className="py-2.5 text-right font-mono" style={{ color: '#ea580c' }}>{formatCurrency(expense.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-secondary-color">{t('reportsPage.sitation.totalExpenses')}</span>
              <span className="font-mono" style={{ color: '#ea580c' }}>{formatCurrency(data.depenses?.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
                <i className="fa-solid fa-credit-card" style={{ color: '#d97706' }} /> {t('reportsPage.sitation.creditTitle')}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-color">{t('reportsPage.sitation.creditDue')}</span>
                  <span className="font-mono font-bold" style={{ color: '#dc2626' }}>{formatCurrency(data.credit?.credit_du)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-color">{t('reportsPage.sitation.creditCollected')}</span>
                  <span className="font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(data.credit?.credit_collecte)}</span>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-secondary-color font-medium">{t('reportsPage.sitation.stockValue')}</span>
                  <span className="text-base-color font-mono">{formatCurrency(data.stock_valeur)}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
                <i className="fa-solid fa-coins" style={{ color: '#059669' }} /> {t('reportsPage.sitation.netProfitTitle')}
              </h2>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: '#059669' }}>
                {formatNumber(data.benefice_net)} <span className="text-sm font-normal text-muted-color">TND</span>
              </div>
              <div className="text-xs text-muted-color">
                {t('reportsPage.sitation.errorMargin', { value: Number(data.marge_erreur ?? 0).toFixed(3) })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MovementsTab({ scopeParams }) {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/depot/movements', { params: scopeParams })
      .then((response) => setMovements(Array.isArray(response.data) ? response.data : (response.data?.data ?? [])))
      .finally(() => setLoading(false))
  }, [scopeParams.depot_id])

  const typeConfig = {
    depot_in: { label: t('reportsPage.movements.types.depot_in'), color: '#10b981' },
    depot_to_camion: { label: t('reportsPage.movements.types.depot_to_camion'), color: '#3b82f6' },
    camion_to_customer: { label: t('reportsPage.movements.types.camion_to_customer'), color: '#ef4444' },
    return: { label: t('reportsPage.movements.types.return'), color: '#f59e0b' },
    adjustment: { label: t('reportsPage.movements.types.adjustment'), color: '#94a3b8' },
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-color">
        <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('reportsPage.movements.loading')}
      </div>
    )
  }

  const columns = [
    t('reportsPage.movements.columns.type'),
    t('reportsPage.movements.columns.product'),
    t('reportsPage.movements.columns.depot'),
    t('reportsPage.movements.columns.rep'),
    t('reportsPage.movements.columns.qty'),
    t('reportsPage.movements.columns.date'),
  ]

  return (
    <div className="card">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((heading) => (
              <th key={heading} className={`pb-3 pr-4 ${heading === t('reportsPage.movements.columns.qty') ? 'text-right' : 'text-left'}`}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => {
            const config = typeConfig[movement.type] ?? { label: movement.type, color: '#94a3b8' }
            const quantity = Number(movement.qty)

            return (
              <tr key={movement.id} className="table-row">
                <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: config.color }}>{config.label}</td>
                <td className="py-2.5 pr-4 text-base-color">{movement.product?.name ?? notAvailable}</td>
                <td className="py-2.5 pr-4 text-muted-color text-xs">{movement.depot?.name ?? notAvailable}</td>
                <td className="py-2.5 pr-4 text-secondary-color text-xs">{movement.user?.name ?? notAvailable}</td>
                <td className="py-2.5 pr-4 text-right font-mono font-bold" style={{ color: quantity >= 0 ? '#059669' : '#dc2626' }}>
                  {quantity >= 0 ? '+' : '-'}{formatNumber(Math.abs(quantity))}
                </td>
                <td className="py-2.5 text-muted-color text-xs">{formatDate(movement.created_at)}</td>
              </tr>
            )
          })}
          {movements.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-muted-color">{t('reportsPage.movements.empty')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsIndex() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepot,
    canSelectAll,
    scopeParams,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  useEffect(() => {
    setLoading(true)
    api.get('/stats', { params: scopeParams }).then((response) => setStats(response.data)).finally(() => setLoading(false))
  }, [scopeParams.depot_id])

  if (loading) {
    return <PageLoader />
  }

  const tabs = [
    { key: 'overview', label: t('reportsPage.tabs.overview'), icon: 'fa-solid fa-chart-pie' },
    { key: 'profit', label: t('reportsPage.tabs.profit'), icon: 'fa-solid fa-coins' },
    { key: 'sitation', label: t('reportsPage.tabs.sitation'), icon: 'fa-solid fa-file-lines' },
    { key: 'movements', label: t('reportsPage.tabs.movements'), icon: 'fa-solid fa-arrows-up-down' },
  ]

  const exportConfig = {
    overview: { csvEntity: 'invoices', csvFilename: 'rapport_vue_ensemble', csvParams: scopeParams },
    profit: { csvEntity: 'invoices', csvFilename: 'rapport_benefices', csvParams: scopeParams },
    sitation: { csvEntity: 'expenses', csvFilename: 'rapport_situation', csvParams: scopeParams },
    movements: { csvEntity: 'stock_movements', csvFilename: 'rapport_mouvements', csvParams: scopeParams },
  }

  const currentExport = exportConfig[tab] ?? {}
  const subtitle = selectedDepot
    ? t('reportsPage.subtitleScoped', { depot: selectedDepot.name })
    : t('reportsPage.subtitleSingle')

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-base-color tracking-tight">{t('reportsPage.title')}</h1>
            <p className="text-sm text-muted-color mt-0.5">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canSelectAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                allowAll
                canSelectAll={canSelectAll}
                allLabel={t('layout.depotAll')}
              />
            )}
            <PageExportActions title={t('reportsPage.exportTitle')} {...currentExport} />
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-theme">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === item.key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${item.icon} text-xs`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} />}
      {tab === 'profit' && <ProfitTab scopeParams={scopeParams} />}
      {tab === 'sitation' && <SitationTab scopeParams={scopeParams} />}
      {tab === 'movements' && <MovementsTab scopeParams={scopeParams} />}
    </div>
  )
}
