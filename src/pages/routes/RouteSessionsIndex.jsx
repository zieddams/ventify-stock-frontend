import { useEffect, useMemo, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/format'
import { extractPaginationMeta } from '../../utils/pagination'

function formatMetric(value) {
  return value != null ? Number(value).toFixed(3) : '-'
}

function StatusBadge({ status, t }) {
  return status === 'open' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>
      <i className="fa-solid fa-circle-dot text-[8px]" /> {t('routeSessions.statusOpen')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      {t('routeSessions.statusClosed')}
    </span>
  )
}

export default function RouteSessionsIndex() {
  const { t } = useI18n()
  const { layouts: documentLayouts } = useDocumentLayouts()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [date, setDate] = useState('')
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
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  useEffect(() => {
    setLoading(true)

    const params = { page, ...scopeParams }

    if (date) {
      params.date = date
    } else {
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
    }

    api.get('/route-sessions', { params })
      .then((response) => {
        const payload = response.data
        const items = Array.isArray(payload) ? payload : (payload.data ?? [])
        const pagination = extractPaginationMeta(payload, { current_page: page, per_page: 25 })

        setSessions(items)
        setMeta(pagination)
      })
      .finally(() => setLoading(false))
  }, [page, date, dateFrom, dateTo, selectedDepotId])

  const totalVendu = useMemo(() => sessions.reduce((sum, item) => sum + Number(item.total_sold ?? 0), 0), [sessions])
  const totalProfit = useMemo(() => sessions.reduce((sum, item) => sum + Number(item.profit_total ?? 0), 0), [sessions])
  const openCount = useMemo(() => sessions.filter((session) => session.status === 'open').length, [sessions])
  const hasFilters = Boolean(date || dateFrom || dateTo)
  const exportParams = {
    ...(date ? { date_from: date, date_to: date } : {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    ...scopeParams,
  }

  return (
    <div>
      <PageHeader
        title={t('routeSessions.title')}
        subtitle={t('routeSessions.subtitle', {
          depot: canSelectAll
            ? (selectedDepot ? t('routeSessions.selectedDepot', { name: selectedDepot.name }) : t('routeSessions.allDepots'))
            : '',
        })}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canSelectAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                allowAll
                canSelectAll={canSelectAll}
                allLabel={t('routeSessions.allDepots')}
              />
            )}
            <PageExportActions
              title={t('routeSessions.title')}
              csvEntity="route_sessions"
              csvParams={exportParams}
              csvFilename="sorties_journee"
              documentKey="route_sessions_list"
              records={sessions}
              documentLayouts={documentLayouts}
            />
          </div>
        )}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: t('routeSessions.kpis.sessions'), value: sessions.length, icon: 'fa-solid fa-calendar-days', color: '#0d9488' },
          { label: t('routeSessions.kpis.open'), value: openCount, icon: 'fa-solid fa-circle-dot', color: '#10b981' },
          { label: t('routeSessions.kpis.sales'), value: formatCurrency(totalVendu), icon: 'fa-solid fa-sack-dollar', color: '#3b82f6' },
          { label: t('routeSessions.kpis.profit'), value: formatCurrency(totalProfit), icon: 'fa-solid fa-coins', color: '#8b5cf6' },
        ].map((kpi) => (
          <div key={kpi.label} className="card py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${kpi.color}1a` }}>
              <i className={`${kpi.icon} text-sm`} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xs text-muted-color">{kpi.label}</div>
              <div className="text-sm font-bold text-base-color">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('routeSessions.filters.specificDay')}</label>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setPage(1)
                setDate(event.target.value)
                if (event.target.value) {
                  setDateFrom('')
                  setDateTo('')
                }
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateFrom')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setPage(1)
                setDate('')
                setDateFrom(event.target.value)
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateTo')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setPage(1)
                setDate('')
                setDateTo(event.target.value)
              }}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setPage(1)
                setDate('')
                setDateFrom('')
                setDateTo('')
              }}
              className="btn-secondary text-xs"
            >
              <i className="fa-solid fa-rotate-left" /> {t('common.resetFilters')}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    t('common.date'),
                    t('routeSessions.columns.rep'),
                    t('depot.label'),
                    t('routeSessions.columns.zone'),
                    t('routeSessions.columns.camion'),
                    t('routeSessions.columns.totalSold'),
                    t('routeSessions.columns.profit'),
                    t('routeSessions.columns.creditGiven'),
                    t('common.status'),
                    '',
                  ].map((heading) => (
                    <th key={heading} className={`pb-3 pr-4 ${[
                      t('routeSessions.columns.totalSold'),
                      t('routeSessions.columns.profit'),
                      t('routeSessions.columns.creditGiven'),
                    ].includes(heading) ? 'text-right' : 'text-left'}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <i className="fa-solid fa-truck-fast text-3xl text-muted-color opacity-30 mb-2 block" />
                      <p className="text-muted-color text-sm">{t('routeSessions.empty')}</p>
                    </td>
                  </tr>
                )}
                {sessions.map((session) => (
                  <tr key={session.id} className="table-row">
                    <td className="py-3 pr-4 font-semibold text-base-color">{formatDate(session.session_date)}</td>
                    <td className="py-3 pr-4 text-secondary-color">{session.rep?.name ?? t('common.notAvailable')}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{session.depot?.name ?? t('common.notAvailable')}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{session.zone?.name ?? t('common.notAvailable')}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">
                      {session.camion?.name ? (
                        <div>
                          <div className="font-medium text-base-color">{session.camion.name}</div>
                          <div className="text-[11px] text-muted-color mt-0.5">{session.camion.plate ?? t('routeSessions.noPlate')}</div>
                        </div>
                      ) : (
                        t('routeSessions.unassigned')
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-base-color">{formatMetric(session.total_sold)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{formatMetric(session.profit_total)}</td>
                    <td className="py-3 pr-4 text-right font-mono" style={{ color: '#d97706' }}>{formatMetric(session.credit_given)}</td>
                    <td className="py-3"><StatusBadge status={session.status} t={t} /></td>
                    <td className="py-3">
                      <RowDocumentActions
                        documentKey="route_session_item"
                        record={session}
                        documentLayouts={documentLayouts}
                        title={t('routeSessions.documentTitle', { date: formatDate(session.session_date) })}
                        filename={`session_${session.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <PaginationControls
            meta={meta}
            onPageChange={setPage}
            itemLabel={t('routeSessions.itemsLabel')}
          />
        )}
      </div>
    </div>
  )
}
