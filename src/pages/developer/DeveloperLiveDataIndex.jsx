import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageLoader } from '../../components/Spinner'
import api from '../../services/api'
import { DEVELOPER_WORKSPACE_COPY as copy } from './developerWorkspaceCopy'

const DEFAULT_FILTERS = {
  companyId: '',
  platform: '',
  query: '',
}

const POLL_INTERVAL_MS = 30 * 1000

function formatDateTime(value, fallback = copy.liveData.states.notAvailable) {
  if (!value) {
    return fallback
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function MetricCard({ label, value, helper, icon, tone = '#0d9488' }) {
  return (
    <div className="card px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${tone}18` }}>
          <i className={icon} style={{ color: tone }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-color">{label}</div>
          <div className="mt-1 text-lg font-bold text-base-color">{value}</div>
          {helper ? <div className="mt-1 text-xs text-secondary-color">{helper}</div> : null}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ online }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={online
        ? { background: 'rgba(13,148,136,0.12)', color: '#0f766e' }
        : { background: 'rgba(245,158,11,0.12)', color: '#c2410c' }}
    >
      {online ? copy.liveData.states.online : copy.liveData.states.stale}
    </span>
  )
}

function SessionRow({ entry }) {
  const companyName = entry.company?.name || copy.liveData.states.notAvailable
  const userLabel = entry.user
    ? [entry.user.name, entry.user.role].filter(Boolean).join(' · ')
    : copy.liveData.states.notAvailable
  const currentView = entry.current_page_title || entry.current_screen_name || entry.current_route_path || copy.liveData.states.noView
  const lastAction = entry.current_action_label || copy.liveData.states.noAction

  return (
    <div className="rounded-[26px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-base-color">{companyName}</div>
            <StatusBadge online={entry.is_online} />
            <span className="badge badge-gray">{entry.platform || copy.liveData.states.notAvailable}</span>
          </div>
          <div className="mt-2 text-sm text-secondary-color">{userLabel}</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">{copy.liveData.table.currentView}</div>
              <div className="mt-1 text-sm text-base-color break-words">{currentView}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">{copy.liveData.table.lastAction}</div>
              <div className="mt-1 text-sm text-base-color break-words">{lastAction}</div>
            </div>
          </div>
        </div>

        <div className="min-w-[180px] rounded-2xl px-3 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">{copy.liveData.table.lastSeen}</div>
          <div className="mt-1 text-sm font-semibold text-base-color">{formatDateTime(entry.last_seen_at)}</div>
          <div className="mt-2 text-xs text-secondary-color">{entry.current_event_name || copy.liveData.states.notAvailable}</div>
        </div>
      </div>
    </div>
  )
}

function HistoryRow({ entry }) {
  const companyName = entry.company?.name || copy.liveData.states.notAvailable
  const userName = entry.user?.name || copy.liveData.states.notAvailable
  const viewLabel = entry.page_title || entry.screen_name || entry.route_path || copy.liveData.states.noView
  const eventLabel = entry.action_label || entry.event_name || copy.liveData.states.notAvailable
  const eventIcon = entry.event_type === 'action'
    ? 'fa-solid fa-bolt'
    : entry.event_type === 'screen_view'
      ? 'fa-solid fa-mobile-screen-button'
      : 'fa-solid fa-compass'

  return (
    <div className="rounded-[22px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}>
              <i className={eventIcon} />
            </span>
            <div className="text-sm font-semibold text-base-color">{eventLabel}</div>
            <span className="badge badge-gray">{entry.platform || copy.liveData.states.notAvailable}</span>
          </div>
          <div className="mt-2 text-sm text-secondary-color">{companyName} · {userName}</div>
          <div className="mt-2 text-sm text-base-color break-words">{viewLabel}</div>
        </div>
        <div className="text-xs text-muted-color">{formatDateTime(entry.created_at)}</div>
      </div>
    </div>
  )
}

export default function DeveloperLiveDataIndex() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSnapshot = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const response = await api.get('/developer-tools/live-data', {
        params: {
          company_id: filters.companyId || undefined,
          platform: filters.platform || undefined,
          q: filters.query.trim() || undefined,
          history_limit: 80,
          active_within_minutes: 10,
        },
      })

      setSnapshot(response.data ?? null)
      setError('')
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load live activity right now.')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [filters.companyId, filters.platform, filters.query])

  useEffect(() => {
    loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSnapshot({ silent: true })
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [loadSnapshot])

  const summary = snapshot?.summary ?? {}
  const companies = Array.isArray(snapshot?.companies) ? snapshot.companies : []
  const active = useMemo(
    () => (Array.isArray(snapshot?.active) ? snapshot.active : []).sort((left, right) => new Date(right.last_seen_at || 0).getTime() - new Date(left.last_seen_at || 0).getTime()),
    [snapshot?.active],
  )
  const history = Array.isArray(snapshot?.history) ? snapshot.history : []

  if (loading) {
    return (
      <div className="card py-12">
        <PageLoader />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-[26px] px-4 py-4 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }}>
          {error}
        </div>
      ) : null}

      <section className="card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color">{copy.liveData.sections.filters}</div>
            <div className="mt-2 text-sm text-secondary-color">{copy.liveData.sections.filtersHelp}</div>
          </div>
          <button type="button" onClick={() => { void loadSnapshot() }} className="btn-primary text-xs">
            <i className="fa-solid fa-rotate-right" /> {copy.liveData.refresh}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[220px_180px_minmax(0,1fr)]">
          <select value={filters.companyId} onChange={(event) => setFilters((current) => ({ ...current, companyId: event.target.value }))}>
            <option value="">{copy.liveData.filters.allCompanies}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          <select value={filters.platform} onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))}>
            <option value="">{copy.liveData.filters.allPlatforms}</option>
            <option value="web">{copy.liveData.filters.web}</option>
            <option value="mobile">{copy.liveData.filters.mobile}</option>
          </select>

          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder={copy.liveData.filters.searchPlaceholder}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copy.liveData.cards.activeSessions} value={summary.active_sessions ?? 0} icon="fa-solid fa-signal" tone="#0d9488" />
        <MetricCard label={copy.liveData.cards.activeUsers} value={summary.active_users ?? 0} icon="fa-solid fa-users" tone="#2563eb" />
        <MetricCard label={copy.liveData.cards.webSessions} value={summary.web_sessions ?? 0} icon="fa-solid fa-globe" tone="#8b5cf6" />
        <MetricCard label={copy.liveData.cards.mobileSessions} value={summary.mobile_sessions ?? 0} helper={formatDateTime(summary.latest_event_at)} icon="fa-solid fa-mobile-screen-button" tone="#f97316" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="card">
          <div className="mb-4">
            <div className="text-sm font-semibold text-base-color">{copy.liveData.sections.active}</div>
            <div className="mt-1 text-sm text-secondary-color">{copy.liveData.sections.activeHelp}</div>
          </div>

          {active.length === 0 ? (
            <div className="rounded-[22px] px-4 py-8 text-sm text-muted-color text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              {copy.liveData.states.noActive}
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((entry) => (
                <SessionRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-4">
            <div className="text-sm font-semibold text-base-color">{copy.liveData.sections.history}</div>
            <div className="mt-1 text-sm text-secondary-color">{copy.liveData.sections.historyHelp}</div>
          </div>

          {history.length === 0 ? (
            <div className="rounded-[22px] px-4 py-8 text-sm text-muted-color text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              {copy.liveData.states.noHistory}
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
