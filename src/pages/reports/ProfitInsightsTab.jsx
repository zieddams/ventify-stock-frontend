import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import FrenchDateRangeInput from '../../components/FrenchDateRangeInput'
import { useI18n } from '../../contexts/I18nContext'
import { useTheme } from '../../contexts/ThemeContext'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/format'

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

function resolveActiveRange(period, dateFrom, dateTo) {
  const today = new Date()

  if (period === 'custom') {
    return {
      from: dateFrom || dateTo || toYmd(today),
      to: dateTo || dateFrom || toYmd(today),
    }
  }

  if (period === 'today') {
    const value = toYmd(today)

    return { from: value, to: value }
  }

  if (period === 'week') {
    const start = new Date(today)
    const end = new Date(today)
    const delta = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - delta)
    end.setDate(start.getDate() + 6)

    return { from: toYmd(start), to: toYmd(end) }
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return { from: toYmd(start), to: toYmd(end) }
}

function InsightKpiCard({ label, value, icon, color, sub }) {
  return (
    <div className="card py-3.5 px-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}14` }}>
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-lg font-bold text-base-color font-mono leading-tight">{value}</div>
        {sub && <div className="text-xs text-muted-color mt-1">{sub}</div>}
      </div>
    </div>
  )
}

function SpotlightRow({ title, value, sub, accent }) {
  return (
    <div className="rounded-2xl px-3 py-3 flex items-center justify-between gap-3" style={{ background: `${accent}10`, border: `1px solid ${accent}22` }}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-base-color truncate">{title}</div>
        {sub && <div className="text-xs text-muted-color mt-0.5 truncate">{sub}</div>}
      </div>
      <div className="text-sm font-bold font-mono whitespace-nowrap" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function BreakdownTable({ title, columns, rows, empty, children }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-base-color">{title}</h2>
        <div className="text-xs text-muted-color">{rows.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`pb-3 pr-4 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-muted-color">{empty}</td>
              </tr>
            ) : children}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ProfitInsightsTab({ scopeParams, onExportParamsChange }) {
  const { t } = useI18n()
  const theme = useChartTheme()
  const notAvailable = t('common.notAvailable')
  const today = new Date().toISOString().slice(0, 10)
  const [period, setPeriod] = useState('month')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [repId, setRepId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [camionId, setCamionId] = useState('')
  const [routeSessionId, setRouteSessionId] = useState('')
  const [saleChannel, setSaleChannel] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [reps, setReps] = useState([])
  const [zones, setZones] = useState([])
  const [camions, setCamions] = useState([])
  const [routeSessions, setRouteSessions] = useState([])

  const activeRange = useMemo(
    () => resolveActiveRange(period, dateFrom, dateTo),
    [period, dateFrom, dateTo],
  )

  const periodOptions = [
    ['today', t('reportsPage.profit.periods.today')],
    ['week', t('reportsPage.profit.periods.week')],
    ['month', t('reportsPage.profit.periods.month')],
    ['custom', t('reportsPage.profit.periods.custom')],
  ]

  const hasFilters = saleChannel !== 'all' || repId || zoneId || camionId || routeSessionId || period !== 'month'

  useEffect(() => {
    if (!onExportParamsChange) {
      return
    }

    onExportParamsChange({
      ...(scopeParams.depot_id ? { depot_id: scopeParams.depot_id } : {}),
      date_from: activeRange.from,
      date_to: activeRange.to,
    })
  }, [activeRange.from, activeRange.to, onExportParamsChange, scopeParams.depot_id])

  useEffect(() => {
    let active = true
    setOptionsLoading(true)

    const sessionParams = {
      per_page: 100,
      date_from: activeRange.from,
      date_to: activeRange.to,
      ...(scopeParams.depot_id ? { depot_id: scopeParams.depot_id } : {}),
      ...(repId ? { rep_id: repId } : {}),
    }

    Promise.all([
      api.get('/users', { params: scopeParams.depot_id ? { depot_id: scopeParams.depot_id } : {} }),
      api.get('/zones'),
      api.get('/camions'),
      api.get('/route-sessions', { params: sessionParams }),
    ])
      .then(([usersResponse, zonesResponse, camionsResponse, sessionsResponse]) => {
        if (!active) {
          return
        }

        const nextUsers = Array.isArray(usersResponse.data) ? usersResponse.data : []
        const nextZones = Array.isArray(zonesResponse.data) ? zonesResponse.data : []
        const nextCamions = Array.isArray(camionsResponse.data) ? camionsResponse.data : []
        const nextSessions = Array.isArray(sessionsResponse.data?.data)
          ? sessionsResponse.data.data
          : (Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [])

        setReps(nextUsers.filter((entry) => entry.active && ['admin', 'rep'].includes(entry.role)))
        setZones(nextZones.filter((entry) => entry.active !== false))
        setCamions(nextCamions)
        setRouteSessions(nextSessions)
      })
      .finally(() => {
        if (active) {
          setOptionsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [activeRange.from, activeRange.to, repId, scopeParams.depot_id])

  useEffect(() => {
    if (routeSessionId && !routeSessions.some((entry) => String(entry.id) === String(routeSessionId))) {
      setRouteSessionId('')
    }
  }, [routeSessionId, routeSessions])

  useEffect(() => {
    let active = true
    setLoading(true)

    const params = {
      period,
      ...scopeParams,
      ...(period === 'custom' ? { date_from: dateFrom, date_to: dateTo } : {}),
      ...(saleChannel !== 'all' ? { sale_channel: saleChannel } : {}),
      ...(repId ? { rep_id: repId } : {}),
      ...(zoneId ? { zone_id: zoneId } : {}),
      ...(camionId ? { camion_id: camionId } : {}),
      ...(routeSessionId ? { route_session_id: routeSessionId } : {}),
    }

    api.get('/reports/profit-insights', { params })
      .then((response) => {
        if (active) {
          setData(response.data)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [camionId, dateFrom, dateTo, period, repId, routeSessionId, saleChannel, scopeParams.depot_id, zoneId])

  const resetFilters = () => {
    setPeriod('month')
    setDateFrom(today)
    setDateTo(today)
    setRepId('')
    setZoneId('')
    setCamionId('')
    setRouteSessionId('')
    setSaleChannel('all')
  }

  const chartData = (data?.by_day ?? []).map((day) => ({
    date: day.day?.slice(5),
    revenue: Number(day.revenue ?? 0),
    profit: Number(day.profit ?? 0),
  }))

  const saleChannelOptions = [
    { value: 'all', label: t('reportsPage.profit.filters.allChannels') },
    { value: 'depot', label: t('reportsPage.profit.filters.saleChannels.depot') },
    { value: 'camion', label: t('reportsPage.profit.filters.saleChannels.camion') },
  ]

  const sessionStatusLabels = {
    open: t('reportsPage.profit.sessionStatus.open'),
    closed: t('reportsPage.profit.sessionStatus.closed'),
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-color">
        <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('reportsPage.profit.loading')}
      </div>
    )
  }

  const channelRows = data?.by_channel ?? []
  const zoneRows = data?.by_zone ?? []
  const depotRows = data?.by_depot ?? []
  const repRows = data?.by_rep ?? []
  const camionRows = data?.by_camion ?? []
  const sessionRows = data?.by_session ?? []

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold text-base-color">{t('reportsPage.profit.controlPanelTitle')}</div>
            <div className="text-xs text-muted-color mt-1">{t('reportsPage.profit.controlPanelText')}</div>
          </div>
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="btn-secondary text-xs">
              <i className="fa-solid fa-rotate-left" /> {t('reportsPage.profit.filters.reset')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {periodOptions.map(([key, label]) => (
            <button
              key={key}
              type="button"
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
          <div className="mb-4">
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateRange')}</label>
            <FrenchDateRangeInput
              valueFrom={dateFrom}
              valueTo={dateTo}
              onChange={({ from, to }) => {
                setDateFrom(from)
                setDateTo(to)
              }}
            />
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('reportsPage.profit.filters.saleChannel')}</label>
            <select value={saleChannel} onChange={(event) => setSaleChannel(event.target.value)} disabled={optionsLoading}>
              {saleChannelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('reportsPage.profit.filters.commercial')}</label>
            <select value={repId} onChange={(event) => setRepId(event.target.value)} disabled={optionsLoading}>
              <option value="">{t('reportsPage.profit.filters.allCommercials')}</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>{rep.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('reportsPage.profit.filters.zone')}</label>
            <select value={zoneId} onChange={(event) => setZoneId(event.target.value)} disabled={optionsLoading}>
              <option value="">{t('reportsPage.profit.filters.allZones')}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('reportsPage.profit.filters.camion')}</label>
            <select value={camionId} onChange={(event) => setCamionId(event.target.value)} disabled={optionsLoading}>
              <option value="">{t('reportsPage.profit.filters.allCamions')}</option>
              {camions.map((camion) => (
                <option key={camion.id} value={camion.id}>
                  {camion.name}{camion.plate ? ` - ${camion.plate}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('reportsPage.profit.filters.session')}</label>
            <select value={routeSessionId} onChange={(event) => setRouteSessionId(event.target.value)} disabled={optionsLoading}>
              <option value="">{t('reportsPage.profit.filters.allSessions')}</option>
              {routeSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  #{session.id} - {formatDate(session.session_date)} - {session.rep?.name || notAvailable}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <InsightKpiCard
          label={t('reportsPage.profit.totalRevenue')}
          value={formatCurrency(data?.totals?.revenue)}
          icon="fa-solid fa-sack-dollar"
          color="#0d9488"
          sub={t('reportsPage.profit.margin', { value: data?.totals?.margin_pct ?? 0 })}
        />
        <InsightKpiCard
          label={t('reportsPage.profit.grossProfit')}
          value={formatCurrency(data?.totals?.profit)}
          icon="fa-solid fa-coins"
          color="#10b981"
          sub={formatCurrency(data?.totals?.cost)}
        />
        <InsightKpiCard
          label={t('reportsPage.profit.kpis.invoiceCount')}
          value={data?.totals?.invoice_count ?? 0}
          icon="fa-solid fa-file-invoice"
          color="#2563eb"
          sub={t('reportsPage.profit.kpis.sessionCount', { count: data?.totals?.session_count ?? 0 })}
        />
        <InsightKpiCard
          label={t('reportsPage.profit.kpis.depotDirectProfit')}
          value={formatCurrency(data?.totals?.depot_direct_profit)}
          icon="fa-solid fa-store"
          color="#f59e0b"
          sub={formatCurrency(data?.totals?.depot_direct_revenue)}
        />
        <InsightKpiCard
          label={t('reportsPage.profit.kpis.terrainProfit')}
          value={formatCurrency(data?.totals?.terrain_profit)}
          icon="fa-solid fa-truck-fast"
          color="#8b5cf6"
          sub={formatCurrency(data?.totals?.terrain_revenue)}
        />
        <InsightKpiCard
          label={t('reportsPage.profit.belowCost')}
          value={data?.totals?.below_cost_lines ?? 0}
          icon="fa-solid fa-triangle-exclamation"
          color="#dc2626"
          sub={t('reportsPage.profit.belowCostSub')}
        />
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-4">{t('reportsPage.profit.chartTitle')}</h2>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-base-color">{t('reportsPage.profit.byChannelTitle')}</h2>
          {channelRows.length === 0 ? (
            <div className="py-10 text-center text-muted-color">{t('reportsPage.profit.noChannel')}</div>
          ) : channelRows.map((row) => (
            <SpotlightRow
              key={row.sale_channel}
              title={t(`reportsPage.profit.filters.saleChannels.${row.sale_channel}`)}
              value={formatCurrency(row.profit)}
              sub={`${formatCurrency(row.revenue)} · ${row.invoice_count}`}
              accent={row.sale_channel === 'depot' ? '#f59e0b' : '#8b5cf6'}
            />
          ))}
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-base-color">{t('reportsPage.profit.byZoneTitle')}</h2>
          {zoneRows.length === 0 ? (
            <div className="py-10 text-center text-muted-color">{t('reportsPage.profit.noZone')}</div>
          ) : zoneRows.slice(0, 6).map((row) => (
            <SpotlightRow
              key={row.zone_id ?? row.zone_name}
              title={row.zone_name || notAvailable}
              value={formatCurrency(row.profit)}
              sub={`${formatCurrency(row.revenue)} · ${row.invoice_count}`}
              accent="#0f766e"
            />
          ))}
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-base-color">{t('reportsPage.profit.byDepotTitle')}</h2>
          {depotRows.length === 0 ? (
            <div className="py-10 text-center text-muted-color">{t('reportsPage.profit.noDepot')}</div>
          ) : depotRows.slice(0, 6).map((row) => (
            <SpotlightRow
              key={row.depot_id ?? row.depot_name}
              title={row.depot_name || notAvailable}
              value={formatCurrency(row.profit)}
              sub={[row.depot_code, formatCurrency(row.revenue), row.invoice_count].filter(Boolean).join(' · ')}
              accent="#2563eb"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <BreakdownTable
          title={t('reportsPage.profit.byRepTitle')}
          rows={repRows}
          empty={t('reportsPage.profit.noRep')}
          columns={[
            { key: 'rep', label: t('reportsPage.profit.columns.rep') },
            { key: 'revenue', label: t('reportsPage.profit.columns.revenue'), align: 'right' },
            { key: 'cost', label: t('reportsPage.profit.columns.cost'), align: 'right' },
            { key: 'profit', label: t('reportsPage.profit.columns.profit'), align: 'right' },
            { key: 'invoices', label: t('reportsPage.profit.columns.invoices'), align: 'right' },
          ]}
        >
          {repRows.map((row) => (
            <tr key={row.rep_id ?? row.rep_name} className="table-row">
              <td className="py-3 pr-4 font-semibold text-base-color">{row.rep_name || notAvailable}</td>
              <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(row.revenue)}</td>
              <td className="py-3 pr-4 text-right font-mono text-muted-color">{formatCurrency(row.cost)}</td>
              <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(row.profit)}</td>
              <td className="py-3 text-right text-muted-color">{row.invoice_count}</td>
            </tr>
          ))}
        </BreakdownTable>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <BreakdownTable
            title={t('reportsPage.profit.byCamionTitle')}
            rows={camionRows}
            empty={t('reportsPage.profit.noCamion')}
            columns={[
              { key: 'camion', label: t('reportsPage.profit.columns.camion') },
              { key: 'plate', label: t('reportsPage.profit.columns.plate') },
              { key: 'revenue', label: t('reportsPage.profit.columns.revenue'), align: 'right' },
              { key: 'profit', label: t('reportsPage.profit.columns.profit'), align: 'right' },
              { key: 'invoices', label: t('reportsPage.profit.columns.invoices'), align: 'right' },
            ]}
          >
            {camionRows.map((row) => (
              <tr key={row.camion_id ?? row.camion_name} className="table-row">
                <td className="py-3 pr-4 font-semibold text-base-color">{row.camion_name || notAvailable}</td>
                <td className="py-3 pr-4 text-muted-color text-xs">{row.camion_plate || notAvailable}</td>
                <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(row.revenue)}</td>
                <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(row.profit)}</td>
                <td className="py-3 text-right text-muted-color">{row.invoice_count}</td>
              </tr>
            ))}
          </BreakdownTable>

          <BreakdownTable
            title={t('reportsPage.profit.bySessionTitle')}
            rows={sessionRows}
            empty={t('reportsPage.profit.noSession')}
            columns={[
              { key: 'session', label: t('reportsPage.profit.columns.session') },
              { key: 'date', label: t('reportsPage.profit.columns.date') },
              { key: 'commercial', label: t('reportsPage.profit.columns.commercial') },
              { key: 'profit', label: t('reportsPage.profit.columns.profit'), align: 'right' },
            ]}
          >
            {sessionRows.map((row) => (
              <tr key={row.route_session_id ?? row.session_date} className="table-row">
                <td className="py-3 pr-4">
                  {row.route_session_url ? (
                    <Link to={row.route_session_url} className="font-semibold text-base-color hover:text-teal-600 transition-colors">
                      #{row.route_session_id}
                    </Link>
                  ) : (
                    <span className="font-semibold text-base-color">#{row.route_session_id}</span>
                  )}
                  <div className="text-[11px] text-muted-color mt-1">
                    {[row.camion_name, row.camion_plate].filter(Boolean).join(' · ') || notAvailable}
                  </div>
                </td>
                <td className="py-3 pr-4 text-secondary-color text-xs">
                  <div>{row.session_date ? formatDate(row.session_date) : notAvailable}</div>
                  <div className="text-[11px] text-muted-color mt-1">
                    {sessionStatusLabels[row.session_status] || row.session_status || notAvailable}
                  </div>
                </td>
                <td className="py-3 pr-4 text-secondary-color text-xs">
                  <div>{row.rep_name || notAvailable}</div>
                  <div className="text-[11px] text-muted-color mt-1">
                    {[row.zone_name, row.depot_name].filter(Boolean).join(' · ') || notAvailable}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <div className="font-mono font-bold" style={{ color: '#059669' }}>{formatCurrency(row.profit)}</div>
                  <div className="text-[11px] text-muted-color mt-1">
                    {formatCurrency(row.revenue)} · {row.invoice_count}
                  </div>
                </td>
              </tr>
            ))}
          </BreakdownTable>
        </div>
      </div>
    </div>
  )
}
