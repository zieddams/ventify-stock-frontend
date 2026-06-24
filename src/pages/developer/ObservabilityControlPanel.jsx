import { useCallback, useEffect, useMemo, useState } from 'react'
import { APP_VERSION } from '../../config/appMeta'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatCount as formatLocaleCount, formatCurrency as formatLocaleCurrency, formatDateTime as formatLocaleDateTime } from '../../utils/format'

const HEARTBEAT_REFRESH_MS = 45 * 1000
const INTERNAL_TUNNEL_COMMAND = 'ssh -L 9301:127.0.0.1:3001 -L 9080:127.0.0.1:8080 irtiwaa-vps'

const WORKFLOW_LINKS = [
  {
    key: 'api',
    url: 'https://github.com/zieddams/ventify-stock-api/actions/workflows/manual-deploy.yml',
  },
  {
    key: 'web',
    url: 'https://github.com/zieddams/ventify-stock-frontend/actions/workflows/manual-deploy.yml',
  },
  {
    key: 'mobile',
    url: 'https://github.com/zieddams/ventify-stock/actions/workflows/manual-release.yml',
  },
]

const ENDPOINT_LINKS = [
  {
    key: 'web',
    url: 'https://irtiwaa.ziedtech.com/web-platform/',
  },
  {
    key: 'api',
    url: 'https://irtiwaa.ziedtech.com/api/v1/system/ping',
  },
  {
    key: 'mobile',
    url: 'https://github.com/zieddams/ventify-stock/releases',
  },
]

const TUNNEL_LINKS = [
  {
    key: 'monitor',
    url: 'http://127.0.0.1:9301',
  },
  {
    key: 'dashboard',
    url: 'http://127.0.0.1:9080',
  },
]

const EMPTY_OPS_SNAPSHOT = {
  stats: null,
  sessions: [],
  terrain: {
    generated_at: null,
    stats: {},
    reps: [],
  },
  bugReports: [],
}

function formatCount(value) {
  return formatLocaleCount(value)
}

function formatCurrency(value) {
  return formatLocaleCurrency(value)
}

function formatDateTime(value, fallback = '-') {
  if (!value) {
    return fallback
  }

  return formatLocaleDateTime(value)
}

function countBy(items, selector) {
  return items.reduce((carry, item) => {
    const key = selector(item)

    if (!key) {
      return carry
    }

    carry[key] = (carry[key] ?? 0) + 1
    return carry
  }, {})
}

function toSortedEntries(record) {
  return Object.entries(record ?? {}).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0])
  })
}

function MetricShell({ label, value, icon, color, helper }) {
  return (
    <div className="card py-4 px-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}
        >
          <i className={icon} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-color">{label}</div>
          <div className="text-sm font-bold text-base-color">{value}</div>
          {helper && <div className="text-[11px] text-secondary-color mt-1">{helper}</div>}
        </div>
      </div>
    </div>
  )
}

function CountList({ title, description, entries, emptyLabel }) {
  return (
    <div className="rounded-3xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
      <div className="mb-4">
        <div className="text-sm font-semibold text-base-color">{title}</div>
        <div className="text-xs text-secondary-color mt-1">{description}</div>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-color">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {entries.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-mono text-xs text-secondary-color">{label}</span>
              <span className="font-semibold text-base-color">{formatCount(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionLinkCard({ title, description, links, actionLabel, badgeLabel }) {
  return (
    <div className="rounded-3xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-base-color">{title}</div>
          <div className="text-xs text-secondary-color mt-1">{description}</div>
        </div>
        {badgeLabel && <span className="badge badge-blue">{badgeLabel}</span>}
      </div>

      <div className="space-y-2.5">
        {links.map((item) => (
          <div
            key={item.url}
            className="rounded-2xl px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            style={{ background: '#ffffff80', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-base-color">{item.label}</div>
              <div className="text-xs text-secondary-color break-all mt-1">{item.url}</div>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs justify-center md:justify-start flex-shrink-0"
            >
              <i className="fa-solid fa-arrow-up-right-from-square" /> {actionLabel}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ObservabilityControlPanel({ system, notAvailableLabel }) {
  const { t } = useI18n()
  const [snapshot, setSnapshot] = useState(EMPTY_OPS_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSnapshot = useCallback(async () => {
    try {
      const [statsResponse, sessionsResponse, terrainResponse, bugReportsResponse] = await Promise.all([
        api.get('/stats'),
        api.get('/sessions'),
        api.get('/monitor/terrain'),
        api.get('/bug-reports'),
      ])

      setSnapshot({
        stats: statsResponse.data ?? null,
        sessions: Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [],
        terrain: terrainResponse.data ?? EMPTY_OPS_SNAPSHOT.terrain,
        bugReports: Array.isArray(bugReportsResponse.data) ? bugReportsResponse.data : [],
      })
      setError('')
    } catch (loadError) {
      setError(loadError.response?.data?.message || t('developerToolsPage.observability.errors.load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadSnapshot()

    const intervalId = window.setInterval(() => {
      loadSnapshot()
    }, HEARTBEAT_REFRESH_MS)

    return () => window.clearInterval(intervalId)
  }, [loadSnapshot])

  const terrainStats = snapshot.terrain?.stats ?? {}
  const openIssuesCount = snapshot.bugReports.filter((report) => report.status === 'open').length
  const inProgressIssuesCount = snapshot.bugReports.filter((report) => report.status === 'in_progress').length
  const aliveSessionsCount = snapshot.sessions.filter((session) => session?.presence?.is_online || session?.is_online).length

  const latestIssue = useMemo(() => (
    [...snapshot.bugReports]
      .sort((left, right) => new Date(right?.created_at ?? 0).getTime() - new Date(left?.created_at ?? 0).getTime())[0] ?? null
  ), [snapshot.bugReports])

  const issueStatusLabels = useMemo(() => ({
    open: t('bugReports.status.open'),
    in_progress: t('bugReports.status.inProgress'),
    resolved: t('bugReports.status.resolved'),
    closed: t('bugReports.status.closed'),
  }), [t])

  const issueSeverityLabels = useMemo(() => ({
    low: t('bugReports.severity.low'),
    medium: t('bugReports.severity.medium'),
    high: t('bugReports.severity.high'),
    critical: t('bugReports.severity.critical'),
  }), [t])

  const issueStatusEntries = useMemo(
    () => toSortedEntries(countBy(snapshot.bugReports, (item) => item?.status || 'open'))
      .map(([key, value]) => [issueStatusLabels[key] || key, value]),
    [issueStatusLabels, snapshot.bugReports],
  )

  const issueSeverityEntries = useMemo(
    () => toSortedEntries(countBy(snapshot.bugReports, (item) => item?.severity || 'medium'))
      .map(([key, value]) => [issueSeverityLabels[key] || key, value]),
    [issueSeverityLabels, snapshot.bugReports],
  )

  const sessionVersionEntries = useMemo(
    () => toSortedEntries(countBy(snapshot.sessions, (item) => item?.app_version || item?.native_app_version || notAvailableLabel)),
    [notAvailableLabel, snapshot.sessions],
  )

  const terrainVersionEntries = useMemo(
    () => toSortedEntries(countBy(snapshot.terrain?.reps ?? [], (item) => item?.device?.app_version || item?.device?.native_app_version || notAvailableLabel)),
    [notAvailableLabel, snapshot.terrain?.reps],
  )

  const workflowItems = WORKFLOW_LINKS.map((item) => ({
    ...item,
    label: t(`developerToolsPage.observability.workflows.${item.key}`),
  }))

  const endpointItems = ENDPOINT_LINKS.map((item) => ({
    ...item,
    label: t(`developerToolsPage.observability.endpoints.${item.key}`),
  }))

  const tunnelItems = TUNNEL_LINKS.map((item) => ({
    ...item,
    label: t(`developerToolsPage.observability.tunnels.${item.key}`),
  }))

  return (
    <div className="card">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.observability.title')}</h2>
          <p className="text-xs text-muted-color mt-1">{t('developerToolsPage.observability.description')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-blue">{t('developerToolsPage.observability.live')}</span>
          <button onClick={loadSnapshot} className="btn-secondary text-xs">
            <i className="fa-solid fa-wave-square" /> {t('developerToolsPage.observability.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-2xl px-4 py-4 text-sm font-medium mb-4"
          style={{ background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <MetricShell
          label={t('developerToolsPage.observability.cards.health')}
          value={system?.db_ok ? t('developerToolsPage.observability.cards.healthOk') : t('developerToolsPage.observability.cards.healthCheck')}
          icon="fa-solid fa-heart-pulse"
          color={system?.db_ok ? '#0d9488' : '#f97316'}
          helper={`${system?.env || notAvailableLabel} · ${formatDateTime(system?.timestamp, notAvailableLabel)}`}
        />
        <MetricShell
          label={t('developerToolsPage.observability.cards.webVersion')}
          value={`v${APP_VERSION}`}
          icon="fa-solid fa-globe"
          color="#2563eb"
          helper={system?.frontend_url || system?.frontend_path || notAvailableLabel}
        />
        <MetricShell
          label={t('developerToolsPage.observability.cards.onlineReps')}
          value={`${formatCount(terrainStats.online_reps ?? 0)} / ${formatCount(terrainStats.reps_total ?? 0)}`}
          icon="fa-solid fa-tower-broadcast"
          color="#8b5cf6"
          helper={t('developerToolsPage.observability.cards.onlineRepsHelper', {
            sessions: formatCount(terrainStats.open_sessions ?? 0),
          })}
        />
        <MetricShell
          label={t('developerToolsPage.observability.cards.mobileSessions')}
          value={formatCount(snapshot.sessions.length)}
          icon="fa-solid fa-mobile-screen-button"
          color="#0d9488"
          helper={t('developerToolsPage.observability.cards.mobileSessionsHelper', {
            alive: formatCount(aliveSessionsCount),
          })}
        />
        <MetricShell
          label={t('developerToolsPage.observability.cards.issues')}
          value={formatCount(snapshot.bugReports.length)}
          icon="fa-solid fa-life-ring"
          color="#ef4444"
          helper={t('developerToolsPage.observability.cards.issuesHelper', {
            open: formatCount(openIssuesCount),
            progress: formatCount(inProgressIssuesCount),
          })}
        />
        <MetricShell
          label={t('developerToolsPage.observability.cards.todayRevenue')}
          value={formatCurrency(terrainStats.today_revenue ?? 0)}
          icon="fa-solid fa-sack-dollar"
          color="#f59e0b"
          helper={t('developerToolsPage.observability.cards.todayRevenueHelper', {
            invoices: formatCount(terrainStats.today_invoices ?? 0),
            lowStock: formatCount(terrainStats.camion_low_stock ?? 0),
          })}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-6 mt-6">
        <div className="space-y-4">
          <div className="rounded-3xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-base-color">{t('developerToolsPage.observability.issuesTitle')}</div>
                <div className="text-xs text-secondary-color mt-1">{t('developerToolsPage.observability.issuesDescription')}</div>
              </div>
              <div className="text-xs text-muted-color">
                {t('developerToolsPage.observability.lastRefresh')}: {formatDateTime(snapshot.terrain?.generated_at || system?.timestamp, notAvailableLabel)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CountList
                title={t('developerToolsPage.observability.issueStatusTitle')}
                description={t('developerToolsPage.observability.issueStatusDescription')}
                entries={issueStatusEntries}
                emptyLabel={t('developerToolsPage.observability.noIssues')}
              />
              <CountList
                title={t('developerToolsPage.observability.issueSeverityTitle')}
                description={t('developerToolsPage.observability.issueSeverityDescription')}
                entries={issueSeverityEntries}
                emptyLabel={t('developerToolsPage.observability.noIssues')}
              />
            </div>

            <div className="rounded-2xl px-4 py-4 mt-4" style={{ background: '#ffffff80', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }}>
              <div className="text-xs text-muted-color">{t('developerToolsPage.observability.latestIssue')}</div>
              {latestIssue ? (
                <>
                  <div className="text-sm font-semibold text-base-color mt-1">{latestIssue.subject}</div>
                  <div className="text-xs text-secondary-color mt-1">
                    {latestIssue.reporter?.name || notAvailableLabel} · {formatDateTime(latestIssue.created_at, notAvailableLabel)}
                  </div>
                  <div className="text-sm text-secondary-color mt-3">{latestIssue.description || notAvailableLabel}</div>
                </>
              ) : (
                <div className="text-sm text-muted-color mt-1">{t('developerToolsPage.observability.noIssues')}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CountList
              title={t('developerToolsPage.observability.sessionVersionsTitle')}
              description={t('developerToolsPage.observability.sessionVersionsDescription')}
              entries={sessionVersionEntries}
              emptyLabel={t('developerToolsPage.observability.noVersions')}
            />
            <CountList
              title={t('developerToolsPage.observability.terrainVersionsTitle')}
              description={t('developerToolsPage.observability.terrainVersionsDescription')}
              entries={terrainVersionEntries}
              emptyLabel={t('developerToolsPage.observability.noVersions')}
            />
          </div>

          <ActionLinkCard
            title={t('developerToolsPage.observability.endpointsTitle')}
            description={t('developerToolsPage.observability.endpointsDescription')}
            links={endpointItems}
            actionLabel={t('developerToolsPage.observability.openLink')}
          />
        </div>

        <div className="space-y-4">
          <ActionLinkCard
            title={t('developerToolsPage.observability.workflowTitle')}
            description={t('developerToolsPage.observability.workflowDescription')}
            links={workflowItems}
            actionLabel={t('developerToolsPage.observability.openLink')}
          />

          <div className="rounded-3xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-base-color">{t('developerToolsPage.observability.tunnelTitle')}</div>
                <div className="text-xs text-secondary-color mt-1">{t('developerToolsPage.observability.tunnelDescription')}</div>
              </div>
              <span className="badge badge-blue">{t('developerToolsPage.observability.internalOnly')}</span>
            </div>

            <div className="rounded-2xl px-4 py-4 mb-4" style={{ background: '#ffffff80', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }}>
              <div className="text-xs text-muted-color mb-2">{t('developerToolsPage.observability.tunnelCommand')}</div>
              <code className="block text-xs text-secondary-color break-all whitespace-pre-wrap">{INTERNAL_TUNNEL_COMMAND}</code>
            </div>

            <div className="space-y-2.5">
              {tunnelItems.map((item) => (
                <div
                  key={item.url}
                  className="rounded-2xl px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  style={{ background: '#ffffff80', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-base-color">{item.label}</div>
                    <div className="text-xs text-secondary-color break-all mt-1">{item.url}</div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs justify-center md:justify-start flex-shrink-0"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" /> {t('developerToolsPage.observability.openLink')}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-xs text-muted-color mt-4">
          <i className="fa-solid fa-spinner fa-spin mr-2" />
          {t('developerToolsPage.observability.loading')}
        </div>
      )}
    </div>
  )
}
