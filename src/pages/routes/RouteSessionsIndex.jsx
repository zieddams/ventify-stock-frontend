import { useEffect, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { extractPaginationMeta } from '../../utils/pagination'

function fmt(value) {
  return value != null ? Number(value).toFixed(3) : '-'
}

function fmtDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }) {
  return status === 'open' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>
      <i className="fa-solid fa-circle-dot text-[8px]" /> En cours
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      Cloturee
    </span>
  )
}

export default function RouteSessionsIndex() {
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

  const totalVendu = sessions.reduce((sum, item) => sum + Number(item.total_sold ?? 0), 0)
  const totalProfit = sessions.reduce((sum, item) => sum + Number(item.profit_total ?? 0), 0)
  const hasFilters = date || dateFrom || dateTo
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
        title="Sorties journee"
        subtitle={`BON DE SORTIE - sessions journalieres par commercial${canSelectAll ? ` | ${selectedDepot ? `Depot ${selectedDepot.name}` : 'Tous les depots'}` : ''}`}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canSelectAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                allowAll
                canSelectAll={canSelectAll}
                allLabel="Tous les depots"
              />
            )}
            <PageExportActions
              title="Sorties journee"
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
          { label: 'Sessions', value: sessions.length, icon: 'fa-solid fa-calendar-days', color: '#0d9488' },
          { label: 'En cours', value: sessions.filter((session) => session.status === 'open').length, icon: 'fa-solid fa-circle-dot', color: '#10b981' },
          { label: 'Total vendu', value: `${fmt(totalVendu)} TND`, icon: 'fa-solid fa-sack-dollar', color: '#3b82f6' },
          { label: 'Benefice', value: `${fmt(totalProfit)} TND`, icon: 'fa-solid fa-coins', color: '#8b5cf6' },
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
            <label className="block text-xs text-muted-color mb-1 font-medium">Jour precis</label>
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
            <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
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
            <label className="block text-xs text-muted-color mb-1 font-medium">Au</label>
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
              <i className="fa-solid fa-rotate-left" /> Reinitialiser les filtres
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
                  {['Date', 'Commercial', 'Depot', 'Zone', 'Camion', 'Total vendu', 'Benefice', 'Credit accorde', 'Statut', ''].map((heading) => (
                    <th key={heading} className={`pb-3 pr-4 ${['Total vendu', 'Benefice', 'Credit accorde'].includes(heading) ? 'text-right' : 'text-left'}`}>
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
                      <p className="text-muted-color text-sm">Aucune session trouvee</p>
                    </td>
                  </tr>
                )}
                {sessions.map((session) => (
                  <tr key={session.id} className="table-row">
                    <td className="py-3 pr-4 font-semibold text-base-color">{fmtDate(session.session_date)}</td>
                    <td className="py-3 pr-4 text-secondary-color">{session.rep?.name ?? '-'}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{session.depot?.name ?? '-'}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{session.zone?.name ?? '-'}</td>
                    <td className="py-3 pr-4 text-muted-color text-xs">
                      {session.camion?.name ? (
                        <div>
                          <div className="font-medium text-base-color">{session.camion.name}</div>
                          <div className="text-[11px] text-muted-color mt-0.5">{session.camion.plate ?? 'Sans plaque'}</div>
                        </div>
                      ) : (
                        'Non assigne'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-base-color">{fmt(session.total_sold)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{fmt(session.profit_total)}</td>
                    <td className="py-3 pr-4 text-right font-mono" style={{ color: '#d97706' }}>{fmt(session.credit_given)}</td>
                    <td className="py-3"><StatusBadge status={session.status} /></td>
                    <td className="py-3">
                      <RowDocumentActions
                        documentKey="route_session_item"
                        record={session}
                        documentLayouts={documentLayouts}
                        title={`Session ${fmtDate(session.session_date)}`}
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
            itemLabel="sessions"
          />
        )}
      </div>
    </div>
  )
}
