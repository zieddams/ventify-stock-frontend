import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  AppWindow,
  ArrowRight,
  Bug,
  ChevronRight,
  Clock3,
  Cpu,
  GitBranch,
  Globe2,
  HardDrive,
  LayoutGrid,
  LogOut,
  RefreshCcw,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
  Waves,
  Workflow,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildInitialWorkflowInputs } from './workflowCatalog'
import { clearStoredSession, createApiClient, loadStoredSession, persistSession } from './lib/api'
import { formatBytes, formatCompactNumber, formatCurrency, formatDateTime, formatDuration, formatPercent } from './lib/format'

const REFRESH_INTERVAL = 30_000
const DEFAULT_PAGE = 'command'

const NAV_ITEMS = [
  {
    id: 'command',
    label: 'Command center',
    description: 'Live state, production versions, and field activity.',
    icon: LayoutGrid,
  },
  {
    id: 'delivery',
    label: 'Releases',
    description: 'Manual deploys, validated workflows, and rollout refs.',
    icon: Workflow,
  },
  {
    id: 'traffic',
    label: 'Traffic',
    description: 'Request rhythm, status mix, and path hotspots.',
    icon: Waves,
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    description: 'VPS health, services, PM2, and access entrypoints.',
    icon: Server,
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    description: 'Issues, sessions, and mobile version adoption.',
    icon: Bug,
  },
]

function getInitialPage() {
  if (typeof window === 'undefined') {
    return DEFAULT_PAGE
  }

  const nextPage = window.location.hash.replace(/^#/, '').trim()
  return NAV_ITEMS.some((item) => item.id === nextPage) ? nextPage : DEFAULT_PAGE
}

function getToneFromStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (['active', 'online', 'healthy', 'stable', 'success', 'good', 'open'].includes(normalized)) {
    return 'good'
  }

  if (['warning', 'pending', 'queued', 'in_progress', 'running', 'warm', 'maintenance'].includes(normalized)) {
    return 'warm'
  }

  if (['failed', 'failure', 'error', 'danger', 'offline', 'inactive', 'cancelled'].includes(normalized)) {
    return 'danger'
  }

  return 'neutral'
}

function formatSurfaceVersion(surface) {
  const normalized = String(surface?.version || '').trim()

  if (!normalized) {
    return 'Not captured'
  }

  if (surface?.key === 'api' || normalized.startsWith('v')) {
    return normalized
  }

  return `v${normalized}`
}

function formatSurfaceReference(surface) {
  const branch = String(surface?.deployment?.branch || '').trim()
  const sha = String(surface?.deployment?.headSha || '').trim()

  if (!branch && !sha) {
    return 'No rollout ref yet'
  }

  if (!sha) {
    return branch
  }

  return `${branch || 'deploy'} · ${sha.slice(0, 7)}`
}

function formatSessionVersion(value, fallbackValue = '') {
  const normalized = String(value || fallbackValue || '').trim()
  return normalized ? `v${normalized}` : 'Not reported'
}

function buildVersionAdoption(reps) {
  const counters = new Map()

  for (const rep of reps) {
    const label = formatSessionVersion(rep?.device?.app_version, rep?.device?.native_app_version)
    counters.set(label, (counters.get(label) || 0) + 1)
  }

  return [...counters.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
}

function buildRepRows(reps) {
  return [...reps].sort((left, right) => {
    const onlineDelta = Number(Boolean(right?.presence?.is_online)) - Number(Boolean(left?.presence?.is_online))

    if (onlineDelta !== 0) {
      return onlineDelta
    }

    const revenueDelta = Number(right?.today?.invoices_total || 0) - Number(left?.today?.invoices_total || 0)

    if (revenueDelta !== 0) {
      return revenueDelta
    }

    return String(left?.name || '').localeCompare(String(right?.name || ''))
  })
}

function buildSessionRows(sessions) {
  return [...sessions].sort((left, right) => {
    const onlineDelta = Number(Boolean(right?.presence?.is_online || right?.alive)) - Number(Boolean(left?.presence?.is_online || left?.alive))

    if (onlineDelta !== 0) {
      return onlineDelta
    }

    return new Date(right?.last_seen || 0).getTime() - new Date(left?.last_seen || 0).getTime()
  })
}

function buildTopPathRows(items) {
  return (items || []).map((item) => ({
    ...item,
    shortPath: String(item?.path || '/').length > 42 ? `${String(item.path).slice(0, 42)}…` : String(item?.path || '/'),
  }))
}

function sortBugs(bugs) {
  return [...(bugs || [])].sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime())
}

function StatusPill({ status = 'neutral', children }) {
  return <span className={`status-pill status-pill-${status}`}>{children}</span>
}

function MessageBanner({ message, tone = 'danger' }) {
  if (!message) {
    return null
  }

  const Icon = tone === 'good' ? ShieldCheck : AlertCircle

  return (
    <div className={`message-banner message-banner-${tone}`}>
      <Icon size={18} />
      <span>{message}</span>
    </div>
  )
}

function LoadingPanel({ label = 'Refreshing live data…' }) {
  return (
    <div className="loading-panel">
      <RefreshCcw className="spin" size={18} />
      <span>{label}</span>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      <p>{description}</p>
    </div>
  )
}

function SectionCard({ eyebrow, title, description, action, children }) {
  return (
    <section className="section-card">
      <div className="section-card-header">
        <div>
          {eyebrow ? <div className="section-eyebrow">{eyebrow}</div> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function KpiCard({ title, value, helper, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`kpi-card kpi-card-${tone}`}>
      <div className="kpi-card-topline">
        <span>{title}</span>
        <Icon size={18} />
      </div>
      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-helper">{helper}</div>
    </article>
  )
}

function SidebarSurfaceCard({ surface }) {
  return (
    <a className={`sidebar-surface-card sidebar-surface-card-${surface.key}`} href={surface.url} target="_blank" rel="noreferrer">
      <div>
        <div className="sidebar-surface-label">{surface.label}</div>
        <div className="sidebar-surface-version">{formatSurfaceVersion(surface)}</div>
      </div>
      <ChevronRight size={16} />
    </a>
  )
}

function SurfaceCard({ surface }) {
  const releaseAsset = surface?.release?.assets?.[0] ?? null

  return (
    <article className={`surface-card surface-card-${surface.key}`}>
      <div className="surface-card-topline">
        <div className="surface-card-label">{surface.label}</div>
        <StatusPill status={surface.deployment ? 'good' : 'warm'}>
          {surface.deployment ? 'Validated' : 'Pending'}
        </StatusPill>
      </div>

      <div className="surface-card-version">{formatSurfaceVersion(surface)}</div>
      <div className="surface-card-helper">{surface.environment}</div>

      <div className="surface-meta-grid">
        <div>
          <span>Runtime</span>
          <strong>{surface.runtimeLabel || 'Not captured'}</strong>
        </div>
        <div>
          <span>Rollout ref</span>
          <strong>{formatSurfaceReference(surface)}</strong>
        </div>
        <div>
          <span>Updated</span>
          <strong>{formatDateTime(surface.deployment?.updatedAt || surface.release?.publishedAt)}</strong>
        </div>
        <div>
          <span>Next note</span>
          <strong>{surface.buildLabel || 'No extra note'}</strong>
        </div>
      </div>

      {surface.key === 'mobile' ? (
        <div className="surface-card-footnote">
          <div>Prepared candidate: {surface.candidateVersion ? `v${surface.candidateVersion}` : 'Not captured'}</div>
          <div>Android code: {surface.candidateBuild || 'Not captured'}</div>
          <div>Public release asset: {releaseAsset?.name || 'Not captured'}</div>
        </div>
      ) : null}

      <div className="surface-card-actions">
        <a className="ghost-button compact-button" href={surface.url} target="_blank" rel="noreferrer">
          <Globe2 size={16} />
          <span>Open live</span>
        </a>
        {surface.deployment?.htmlUrl ? (
          <a className="ghost-button compact-button" href={surface.deployment.htmlUrl} target="_blank" rel="noreferrer">
            <GitBranch size={16} />
            <span>Run details</span>
          </a>
        ) : null}
      </div>
    </article>
  )
}

function WorkflowCard({
  workflow,
  inputs,
  surface,
  canDispatch,
  dispatchMutation,
  setWorkflowValue,
  setDispatchMessage,
}) {
  const isPending = dispatchMutation.isPending && dispatchMutation.variables?.workflowKey === workflow.key

  return (
    <article className="workflow-card">
      <div className="workflow-card-topline">
        <div>
          <div className="workflow-title">{workflow.label}</div>
          <div className="workflow-meta">{workflow.repo} · {workflow.workflowId}</div>
        </div>
        <StatusPill status={workflow.integrationReady ? 'good' : 'danger'}>
          {workflow.integrationReady ? 'GitHub linked' : 'Token missing'}
        </StatusPill>
      </div>

      <p className="workflow-description">{workflow.description}</p>

      <div className="workflow-live-note">
        <div>
          <span>Live now</span>
          <strong>{surface ? formatSurfaceVersion(surface) : 'Unknown'}</strong>
        </div>
        <div>
          <span>Current ref</span>
          <strong>{surface ? formatSurfaceReference(surface) : 'Unknown'}</strong>
        </div>
      </div>

      <label className="field">
        <span>Git ref</span>
        <input
          type="text"
          value={inputs.ref || 'main'}
          onChange={(event) => setWorkflowValue(workflow.key, 'ref', event.target.value)}
          placeholder="main"
        />
      </label>

      {workflow.inputs.map((input) => (
        <label className="field" key={input.id}>
          <span>{input.id.replace(/_/g, ' ')}</span>
          {input.type === 'choice' ? (
            <select
              value={String(inputs[input.id] ?? input.defaultValue)}
              onChange={(event) => setWorkflowValue(workflow.key, input.id, event.target.value)}
            >
              {input.options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : input.type === 'boolean' ? (
            <select
              value={String(inputs[input.id] ?? input.defaultValue)}
              onChange={(event) => setWorkflowValue(workflow.key, input.id, event.target.value === 'true')}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          ) : (
            <input
              type="text"
              value={String(inputs[input.id] ?? input.defaultValue)}
              onChange={(event) => setWorkflowValue(workflow.key, input.id, event.target.value)}
            />
          )}
        </label>
      ))}

      {!workflow.integrationReady && workflow.integrationMessage ? (
        <div className="workflow-inline-warning">{workflow.integrationMessage}</div>
      ) : null}

      <button
        className="primary-button"
        type="button"
        disabled={!canDispatch || !workflow.integrationReady || dispatchMutation.isPending}
        onClick={() => {
          setDispatchMessage('')
          dispatchMutation.mutate({ workflowKey: workflow.key })
        }}
      >
        {isPending ? <RefreshCcw className="spin" size={16} /> : <Rocket size={16} />}
        <span>{isPending ? 'Dispatching…' : 'Dispatch workflow'}</span>
      </button>

      <div className="workflow-runs">
        {(workflow.runs || []).slice(0, 4).map((run) => (
          <a className="workflow-run" key={run.id} href={run.htmlUrl} target="_blank" rel="noreferrer">
            <div>
              <div className="workflow-run-name">{run.branch || 'workflow-dispatch'}</div>
              <div className="workflow-run-meta">
                {run.headSha ? `${run.headSha.slice(0, 7)} · ` : ''}{formatDateTime(run.updatedAt)}
              </div>
            </div>
            <StatusPill status={getToneFromStatus(run.conclusion || run.status)}>
              {run.conclusion || run.status}
            </StatusPill>
          </a>
        ))}
      </div>
    </article>
  )
}

function LoginScreen({ onLogin, loading, error }) {
  const [email, setEmail] = useState('zieddamsp@gmail.com')
  const [password, setPassword] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    await onLogin(email, password)
  }

  return (
    <main className="login-shell">
      <div className="login-hero">
        <div className="section-eyebrow">Irtiwaa operator workspace</div>
        <h1>Separate monitoring, rollout control, and production visibility.</h1>
        <p>
          The ops console now runs as its own application surface. Use it to inspect live traffic,
          production versions, VPS health, and controlled GitHub Actions dispatches without mixing
          the operator workflow into the commercial web platform.
        </p>
        <div className="hero-chip-row">
          <StatusPill status="good">Standalone subdomain</StatusPill>
          <StatusPill status="warm">Admin and developer roles only</StatusPill>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="section-eyebrow">Secure sign-in</div>
        <h2>Open the ops workspace</h2>
        <p>Use the same Irtiwaa account. The console only accepts admin and developer roles.</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <MessageBanner message={error} tone="danger" />

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? <RefreshCcw className="spin" size={16} /> : <ArrowRight size={16} />}
          <span>{loading ? 'Signing in…' : 'Enter ops console'}</span>
        </button>
      </form>
    </main>
  )
}

function CommandCenterPage({
  terrainStats,
  latestBug,
  maintenanceState,
  surfaces,
  serviceStates,
  repRows,
  versionAdoption,
}) {
  return (
    <>
      <section className="kpi-grid">
        <KpiCard
          title="Online reps"
          value={`${formatCompactNumber(terrainStats.online_reps ?? 0)} / ${formatCompactNumber(terrainStats.reps_total ?? 0)}`}
          helper={`${formatCompactNumber(terrainStats.open_sessions ?? 0)} route sessions currently open`}
          icon={Users}
          tone="good"
        />
        <KpiCard
          title="Today's revenue"
          value={formatCurrency(terrainStats.today_revenue ?? 0)}
          helper={`${formatCompactNumber(terrainStats.today_invoices ?? 0)} invoices closed today`}
          icon={Activity}
          tone="neutral"
        />
        <KpiCard
          title="Low stock alerts"
          value={formatCompactNumber(terrainStats.camion_low_stock ?? 0)}
          helper="Camion items below their minimum stock threshold"
          icon={AppWindow}
          tone="warm"
        />
        <KpiCard
          title="Maintenance mode"
          value={maintenanceState?.enabled ? 'Enabled' : 'Off'}
          helper={maintenanceState?.enabled ? (maintenanceState?.global ? 'Applies to the full app' : `Scoped to ${formatCompactNumber(maintenanceState?.paths?.length ?? 0)} pages`) : 'No maintenance restrictions are active'}
          icon={ShieldCheck}
          tone={maintenanceState?.enabled ? 'warm' : 'good'}
        />
      </section>

      <SectionCard
        eyebrow="Production versions"
        title="Current live surfaces"
        description="Version visibility for the standalone ops app, web platform, API, and mobile release line."
      >
        <div className="surface-grid">
          {surfaces.map((surface) => (
            <SurfaceCard key={surface.key} surface={surface} />
          ))}
        </div>
      </SectionCard>

      <div className="panel-grid panel-grid-2">
        <SectionCard
          eyebrow="Field presence"
          title="Who is active right now"
          description="Operators and reps sorted by online presence and field activity."
        >
          {repRows.length === 0 ? (
            <EmptyState title="No rep presence in the current payload" description="Once session heartbeats arrive, active people will show here." />
          ) : (
            <div className="list-table">
              {repRows.slice(0, 8).map((rep) => (
                <div className="list-row" key={rep.id}>
                  <div>
                    <div className="list-row-title">{rep.name}</div>
                    <div className="list-row-helper">
                      {rep.depot?.name || 'No depot'} · {formatSessionVersion(rep.device?.app_version, rep.device?.native_app_version)} · {rep.route_session?.status || 'no route session'}
                    </div>
                  </div>
                  <div className="list-row-meta">
                    <StatusPill status={rep.presence?.is_online ? 'good' : 'warm'}>
                      {rep.presence?.is_online ? 'online' : 'stale'}
                    </StatusPill>
                    <strong>{formatCurrency(rep.today?.invoices_total ?? 0)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Release adoption"
          title="Mobile versions seen in the field"
          description="Live device version mix reported by the terrain monitor."
        >
          {versionAdoption.length === 0 ? (
            <EmptyState title="No mobile version telemetry yet" description="Once devices report session data, the version mix will appear here." />
          ) : (
            <div className="adoption-list">
              {versionAdoption.slice(0, 6).map((entry) => (
                <div className="adoption-row" key={entry.label}>
                  <div className="adoption-copy">
                    <strong>{entry.label}</strong>
                    <span>{formatCompactNumber(entry.count)} devices</span>
                  </div>
                  <div className="adoption-bar-track">
                    <div
                      className="adoption-bar-fill"
                      style={{ width: `${Math.max(12, (entry.count / Math.max(versionAdoption[0]?.count || 1, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="panel-grid panel-grid-2">
        <SectionCard
          eyebrow="Service pulse"
          title="Critical runtime checks"
          description="Core process and service states from the production VPS."
        >
          <div className="status-list">
            {serviceStates.map((service) => (
              <div className="status-row" key={service.name}>
                <div>
                  <div className="list-row-title">{service.name}</div>
                  <div className="list-row-helper">{service.status === 'active' ? 'Healthy and responding' : 'Needs a closer look'}</div>
                </div>
                <StatusPill status={getToneFromStatus(service.status)}>{service.status}</StatusPill>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Latest issue"
          title={latestBug?.subject || 'No recent bug report'}
          description="Newest report surfaced by the current bug payload."
        >
          {latestBug ? (
            <div className="issue-focus-card">
              <p>{latestBug.description || 'No description supplied on the latest issue.'}</p>
              <div className="issue-meta-row">
                <StatusPill status={getToneFromStatus(latestBug.status)}>{latestBug.status || 'unknown'}</StatusPill>
                <span>Severity {latestBug.severity || 'n/a'}</span>
                <span>{formatDateTime(latestBug.created_at)}</span>
              </div>
            </div>
          ) : (
            <EmptyState title="No bug in the current payload" description="When support issues are recorded, the newest one will appear here for triage." />
          )}
        </SectionCard>
      </div>
    </>
  )
}

function ReleasesPage({
  surfaces,
  surfaceMap,
  workflows,
  workflowInputs,
  canDispatch,
  dispatchMutation,
  setWorkflowValue,
  setDispatchMessage,
}) {
  const latestRuns = workflows
    .flatMap((workflow) => (workflow.runs || []).map((run) => ({
      ...run,
      workflowLabel: workflow.label,
      workflowKey: workflow.key,
    })))
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())

  return (
    <>
      <SectionCard
        eyebrow="Rollout snapshot"
        title="Production versions and recent deploy refs"
        description="Use this page when the dev agent needs to confirm what is currently live before pushing or dispatching."
      >
        <div className="surface-grid">
          {surfaces.map((surface) => (
            <SurfaceCard key={surface.key} surface={surface} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Manual dispatch"
        title="Run controlled updates"
        description="Validated GitHub Actions entrypoints for ops, web, API, and mobile release prep."
        action={<StatusPill status={canDispatch ? 'good' : 'warm'}>{canDispatch ? 'Dispatch enabled' : 'Inspect only'}</StatusPill>}
      >
        {!canDispatch ? (
          <MessageBanner message="This account can inspect workflow state but cannot dispatch updates under the current console policy." tone="danger" />
        ) : null}

        <div className="workflow-grid">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.key}
              workflow={workflow}
              inputs={workflowInputs[workflow.key] || { ref: 'main' }}
              surface={surfaceMap[workflow.key]}
              canDispatch={canDispatch}
              dispatchMutation={dispatchMutation}
              setWorkflowValue={setWorkflowValue}
              setDispatchMessage={setDispatchMessage}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Run history"
        title="Most recent activity across all workflows"
        description="The latest GitHub Actions updates collected from the workflow overview."
      >
        {latestRuns.length === 0 ? (
          <EmptyState title="No workflow history found" description="Recent Actions runs will appear here after the first dispatch or CI pass." />
        ) : (
          <div className="list-table">
            {latestRuns.slice(0, 10).map((run) => (
              <a className="list-row list-row-link" key={`${run.workflowKey}-${run.id}`} href={run.htmlUrl} target="_blank" rel="noreferrer">
                <div>
                  <div className="list-row-title">{run.workflowLabel}</div>
                  <div className="list-row-helper">
                    {run.branch || 'workflow-dispatch'} · {run.headSha ? run.headSha.slice(0, 7) : 'no sha'} · {formatDateTime(run.updatedAt)}
                  </div>
                </div>
                <StatusPill status={getToneFromStatus(run.conclusion || run.status)}>
                  {run.conclusion || run.status}
                </StatusPill>
              </a>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  )
}

function TrafficPage({ traffic, productTopPaths, opsTopPaths, statusMix }) {
  return (
    <>
      <section className="kpi-grid kpi-grid-4">
        <KpiCard
          title="Platform requests"
          value={formatCompactNumber(traffic.product?.requestsLastHour ?? 0)}
          helper={`${formatCompactNumber(traffic.product?.errors4xxLastHour ?? 0)} 4xx in the last hour`}
          icon={Globe2}
          tone="neutral"
        />
        <KpiCard
          title="Ops requests"
          value={formatCompactNumber(traffic.ops?.requestsLastHour ?? 0)}
          helper={`${formatCompactNumber(traffic.ops?.errors5xxLastHour ?? 0)} 5xx in the last hour`}
          icon={Workflow}
          tone="good"
        />
        <KpiCard
          title="Platform 5xx"
          value={formatCompactNumber(traffic.product?.errors5xxLastHour ?? 0)}
          helper="Current public product error pressure"
          icon={AlertCircle}
          tone="danger"
        />
        <KpiCard
          title="Ops 4xx"
          value={formatCompactNumber(traffic.ops?.errors4xxLastHour ?? 0)}
          helper="Operator-console auth and route misses"
          icon={ShieldCheck}
          tone="warm"
        />
      </section>

      <SectionCard
        eyebrow="Live request rhythm"
        title="Platform and ops timelines"
        description="Separate request curves so the operator app stays visible without mixing into the business traffic."
      >
        <div className="chart-grid">
          <div className="chart-panel">
            <div className="chart-title">Irtiwaa platform requests</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={traffic.product?.timeline ?? []}>
                <defs>
                  <linearGradient id="platformTrafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.82} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(130, 146, 173, 0.2)" />
                <XAxis dataKey="label" stroke="#5d6b84" />
                <YAxis stroke="#5d6b84" allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#ea580c" fill="url(#platformTrafficGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-panel">
            <div className="chart-title">Ops console requests</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={traffic.ops?.timeline ?? []}>
                <defs>
                  <linearGradient id="opsTrafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(130, 146, 173, 0.2)" />
                <XAxis dataKey="label" stroke="#5d6b84" />
                <YAxis stroke="#5d6b84" allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0f766e" fill="url(#opsTrafficGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>

      <div className="panel-grid panel-grid-2">
        <SectionCard
          eyebrow="Path hotspots"
          title="Most requested product routes"
          description="Useful when traffic shifts after a deploy or a new operator action."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productTopPaths.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(130, 146, 173, 0.2)" />
              <XAxis dataKey="shortPath" stroke="#5d6b84" interval={0} angle={-14} textAnchor="end" height={72} />
              <YAxis stroke="#5d6b84" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard
          eyebrow="Status mix"
          title="HTTP response distribution"
          description="Current response-code split from the product access log."
        >
          {statusMix.length === 0 ? (
            <EmptyState title="No status mix available yet" description="The chart will populate once the access-log summary sees request activity." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={3}>
                  {statusMix.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={['#ea580c', '#2563eb', '#0f766e', '#b45309', '#dc2626'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <div className="panel-grid panel-grid-2">
        <SectionCard eyebrow="Product top paths" title="Most requested business routes">
          {productTopPaths.length === 0 ? (
            <EmptyState title="No product path activity yet" description="Recent hot routes will appear here when the access log has enough traffic." />
          ) : (
            <div className="list-table">
              {productTopPaths.slice(0, 8).map((entry) => (
                <div className="list-row" key={`product-${entry.path}`}>
                  <div>
                    <div className="list-row-title">{entry.shortPath}</div>
                    <div className="list-row-helper">{entry.path}</div>
                  </div>
                  <strong>{formatCompactNumber(entry.count)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Ops top paths" title="Most requested operator routes">
          {opsTopPaths.length === 0 ? (
            <EmptyState title="No ops-path activity yet" description="Operator routes will appear here once the separate console is actively used." />
          ) : (
            <div className="list-table">
              {opsTopPaths.slice(0, 8).map((entry) => (
                <div className="list-row" key={`ops-${entry.path}`}>
                  <div>
                    <div className="list-row-title">{entry.shortPath}</div>
                    <div className="list-row-helper">{entry.path}</div>
                  </div>
                  <strong>{formatCompactNumber(entry.count)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}

function InfrastructurePage({ serverStats, serviceStates, pm2Processes, traffic }) {
  return (
    <>
      <section className="kpi-grid kpi-grid-4">
        <KpiCard
          title="CPU load"
          value={formatPercent(serverStats.cpuLoad ?? 0)}
          helper="Current total CPU load"
          icon={Cpu}
          tone="neutral"
        />
        <KpiCard
          title="Memory in use"
          value={`${formatBytes(serverStats.memoryUsed ?? 0)} / ${formatBytes(serverStats.memoryTotal ?? 0)}`}
          helper="Active memory consumption"
          icon={Activity}
          tone="good"
        />
        <KpiCard
          title="Disk root"
          value={`${formatBytes(serverStats.diskUsed ?? 0)} / ${formatBytes(serverStats.diskTotal ?? 0)}`}
          helper="Root filesystem occupancy"
          icon={HardDrive}
          tone="warm"
        />
        <KpiCard
          title="Host uptime"
          value={formatDuration(serverStats.uptimeMinutes ?? 0)}
          helper={serverStats.hostname || 'Hostname unavailable'}
          icon={Clock3}
          tone="neutral"
        />
      </section>

      <div className="panel-grid panel-grid-2">
        <SectionCard
          eyebrow="Runtime details"
          title="Server and process summary"
          description="High-signal operational details from the live VPS runtime."
        >
          <div className="detail-grid">
            <div>
              <span>Hostname</span>
              <strong>{serverStats.hostname || 'Not captured'}</strong>
            </div>
            <div>
              <span>Platform</span>
              <strong>{serverStats.platform || 'Not captured'}</strong>
            </div>
            <div>
              <span>CPU load</span>
              <strong>{formatPercent(serverStats.cpuLoad ?? 0)}</strong>
            </div>
            <div>
              <span>Memory</span>
              <strong>{formatBytes(serverStats.memoryUsed ?? 0)} / {formatBytes(serverStats.memoryTotal ?? 0)}</strong>
            </div>
            <div>
              <span>Disk</span>
              <strong>{formatBytes(serverStats.diskUsed ?? 0)} / {formatBytes(serverStats.diskTotal ?? 0)}</strong>
            </div>
            <div>
              <span>Ops requests</span>
              <strong>{formatCompactNumber(traffic.ops?.requestsLastHour ?? 0)} in the last hour</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Critical services"
          title="Service health table"
          description="Systemd checks collected from the same host that serves the ops console."
        >
          <div className="status-list">
            {serviceStates.map((service) => (
              <div className="status-row" key={service.name}>
                <div>
                  <div className="list-row-title">{service.name}</div>
                  <div className="list-row-helper">{service.status === 'active' ? 'Healthy and responding' : 'Needs attention'}</div>
                </div>
                <StatusPill status={getToneFromStatus(service.status)}>{service.status}</StatusPill>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="PM2"
        title="Running process inventory"
        description="Current PM2 runtime load and status for the main application services."
      >
        {pm2Processes.length === 0 ? (
          <EmptyState title="No PM2 processes returned" description="If PM2 is unavailable or not installed, the process table will stay empty." />
        ) : (
          <div className="list-table">
            {pm2Processes.map((process) => (
              <div className="list-row" key={process.name}>
                <div>
                  <div className="list-row-title">{process.name}</div>
                  <div className="list-row-helper">
                    CPU {formatPercent(process.cpu)} · RAM {formatBytes(process.memory)} · uptime {formatDuration((Date.now() - process.uptime) / 60_000)}
                  </div>
                </div>
                <StatusPill status={getToneFromStatus(process.status)}>{process.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Access"
        title="Operator entrypoints"
        description="Primary public checks plus the private SSH tunnel path for the legacy internal tools."
      >
        <div className="quick-link-grid">
          <a className="quick-link-card" href="https://irtiwaa.ziedtech.com/web-platform/" target="_blank" rel="noreferrer">
            <div>
              <div className="list-row-title">Commercial web platform</div>
              <div className="list-row-helper">Primary business-facing frontend</div>
            </div>
            <ChevronRight size={16} />
          </a>
          <a className="quick-link-card" href="https://irtiwaa.ziedtech.com/api/v1/system/ping" target="_blank" rel="noreferrer">
            <div>
              <div className="list-row-title">Public API ping</div>
              <div className="list-row-helper">Quick smoke check for the backend</div>
            </div>
            <ChevronRight size={16} />
          </a>
          <a className="quick-link-card" href="https://github.com/zieddams/ventify-stock/releases" target="_blank" rel="noreferrer">
            <div>
              <div className="list-row-title">Mobile releases</div>
              <div className="list-row-helper">APK artifacts and release notes</div>
            </div>
            <ChevronRight size={16} />
          </a>
        </div>

        <div className="tunnel-note">
          <div className="section-eyebrow">Private legacy monitor</div>
          <p>The older internal monitor remains tunnel-only.</p>
          <code>ssh -L 9301:127.0.0.1:3001 -L 9080:127.0.0.1:8080 irtiwaa-vps</code>
        </div>
      </SectionCard>
    </>
  )
}

function WatchlistPage({ bugReports, sessionRows, versionAdoption, repRows }) {
  return (
    <>
      <div className="panel-grid panel-grid-2">
        <SectionCard
          eyebrow="Bug queue"
          title="Current issue watchlist"
          description="Newest support issues and open items visible from the bug-report feed."
        >
          {bugReports.length === 0 ? (
            <EmptyState title="No issues in the current payload" description="Bug reports will show here once the product feed returns them." />
          ) : (
            <div className="stack-list">
              {bugReports.slice(0, 6).map((bug) => (
                <article className="issue-card" key={bug.id || `${bug.subject}-${bug.created_at}`}>
                  <div className="issue-card-header">
                    <div>
                      <h3>{bug.subject || 'Untitled issue'}</h3>
                      <div className="list-row-helper">{formatDateTime(bug.created_at)}</div>
                    </div>
                    <StatusPill status={getToneFromStatus(bug.status)}>{bug.status || 'unknown'}</StatusPill>
                  </div>
                  <p>{bug.description || 'No description supplied.'}</p>
                  <div className="issue-meta-row">
                    <span>Severity {bug.severity || 'n/a'}</span>
                    <span>Reporter {bug.reported_by || bug.user_name || 'n/a'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Version adoption"
          title="Field device release spread"
          description="Use this to judge whether the mobile public release and prepared candidate are actually visible in the field."
        >
          {versionAdoption.length === 0 ? (
            <EmptyState title="No version telemetry yet" description="The adoption view will populate when session telemetry reaches the API." />
          ) : (
            <div className="adoption-list">
              {versionAdoption.map((entry) => (
                <div className="adoption-row" key={entry.label}>
                  <div className="adoption-copy">
                    <strong>{entry.label}</strong>
                    <span>{formatCompactNumber(entry.count)} devices</span>
                  </div>
                  <div className="adoption-bar-track">
                    <div
                      className="adoption-bar-fill"
                      style={{ width: `${Math.max(12, (entry.count / Math.max(versionAdoption[0]?.count || 1, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Session heartbeat"
        title="Current session tracker feed"
        description="Raw session heartbeat visibility for admin, developer, and rep devices."
      >
        {sessionRows.length === 0 ? (
          <EmptyState title="No session payload returned" description="Session heartbeats will appear here once devices report them." />
        ) : (
          <div className="list-table">
            {sessionRows.slice(0, 10).map((session) => (
              <div className="list-row" key={session.id}>
                <div>
                  <div className="list-row-title">{session.user?.name || 'Unknown user'}</div>
                  <div className="list-row-helper">
                    {session.user?.role || 'n/a'} · {session.user?.depot?.name || 'No depot'} · {formatSessionVersion(session.app_version, session.native_app_version)} · {formatDateTime(session.last_seen)}
                  </div>
                </div>
                <StatusPill status={session.presence?.is_online || session.alive ? 'good' : 'warm'}>
                  {session.presence?.is_online || session.alive ? 'online' : 'stale'}
                </StatusPill>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Field roster"
        title="Rep and operator roster"
        description="Cross-check presence, depot, route-session state, and mobile version in one operator view."
      >
        {repRows.length === 0 ? (
          <EmptyState title="No terrain roster available" description="When the terrain monitor returns reps, the roster will appear here." />
        ) : (
          <div className="list-table">
            {repRows.slice(0, 12).map((rep) => (
              <div className="list-row" key={rep.id}>
                <div>
                  <div className="list-row-title">{rep.name}</div>
                  <div className="list-row-helper">
                    {rep.role} · {rep.depot?.name || 'No depot'} · {formatSessionVersion(rep.device?.app_version, rep.device?.native_app_version)} · {rep.route_session?.status || 'no route session'}
                  </div>
                </div>
                <div className="list-row-meta">
                  <StatusPill status={rep.presence?.is_online ? 'good' : 'warm'}>
                    {rep.presence?.is_online ? 'online' : 'stale'}
                  </StatusPill>
                  <strong>{formatCompactNumber(rep.today?.invoices_count ?? 0)} invoices</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  )
}

function Dashboard({ api, session, onLogout }) {
  const [activePage, setActivePage] = useState(() => getInitialPage())
  const [workflowInputs, setWorkflowInputs] = useState(() => buildInitialWorkflowInputs())
  const [dispatchMessage, setDispatchMessage] = useState('')

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getInitialPage())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activePage])

  const overviewQuery = useQuery({
    queryKey: ['app-overview', session.token],
    queryFn: async () => (await api.get('/app/overview')).data,
    refetchInterval: REFRESH_INTERVAL,
  })

  const infrastructureQuery = useQuery({
    queryKey: ['infrastructure-overview', session.token],
    queryFn: async () => (await api.get('/infrastructure/overview')).data,
    refetchInterval: REFRESH_INTERVAL,
  })

  const trafficQuery = useQuery({
    queryKey: ['traffic-overview', session.token],
    queryFn: async () => (await api.get('/traffic/overview')).data,
    refetchInterval: REFRESH_INTERVAL,
  })

  const workflowsQuery = useQuery({
    queryKey: ['workflow-overview', session.token],
    queryFn: async () => (await api.get('/workflows/overview')).data,
    refetchInterval: REFRESH_INTERVAL,
  })

  const versionsQuery = useQuery({
    queryKey: ['versions-overview', session.token],
    queryFn: async () => (await api.get('/versions/overview')).data,
    refetchInterval: REFRESH_INTERVAL,
  })

  const metaQuery = useQuery({
    queryKey: ['ops-meta', session.token],
    queryFn: async () => (await api.get('/meta')).data,
    staleTime: REFRESH_INTERVAL,
  })

  const dispatchMutation = useMutation({
    mutationFn: async ({ workflowKey }) => {
      const payload = workflowInputs[workflowKey] || { ref: 'main' }
      return api.post(`/workflows/${workflowKey}/dispatch`, payload)
    },
    onSuccess: (_, variables) => {
      const targetRef = workflowInputs[variables.workflowKey]?.ref || 'main'
      setDispatchMessage(`Workflow "${variables.workflowKey}" accepted for ref "${targetRef}".`)
      workflowsQuery.refetch()
      versionsQuery.refetch()
    },
  })

  const overview = overviewQuery.data ?? {
    systemStatus: {},
    developerTools: {},
    stats: {},
    sessions: [],
    terrain: { stats: {}, reps: [] },
    bugReports: [],
  }
  const infrastructure = infrastructureQuery.data ?? { server: {}, services: [], processes: [] }
  const traffic = trafficQuery.data ?? {
    product: { timeline: [], topPaths: [], statusCounts: {} },
    ops: { timeline: [], topPaths: [], statusCounts: {} },
  }
  const versions = versionsQuery.data ?? { surfaces: [] }
  const meta = metaQuery.data ?? {}
  const terrainStats = overview.terrain?.stats ?? {}
  const terrainReps = overview.terrain?.reps ?? []
  const repRows = buildRepRows(terrainReps)
  const sessionRows = buildSessionRows(overview.sessions ?? [])
  const serverStats = infrastructure.server ?? {}
  const serviceStates = infrastructure.services ?? []
  const pm2Processes = infrastructure.processes ?? []
  const workflows = workflowsQuery.data?.workflows ?? []
  const surfaces = versions.surfaces ?? []
  const surfaceMap = Object.fromEntries(surfaces.map((surface) => [surface.key, surface]))
  const bugReports = sortBugs(overview.bugReports ?? [])
  const latestBug = bugReports[0] ?? null
  const versionAdoption = buildVersionAdoption(terrainReps)
  const maintenanceState = overview.developerTools?.maintenance ?? {}
  const systemSnapshot = overview.developerTools?.system ?? {}
  const productTopPaths = buildTopPathRows(traffic.product?.topPaths)
  const opsTopPaths = buildTopPathRows(traffic.ops?.topPaths)
  const statusMix = Object.entries(traffic.product?.statusCounts ?? {}).map(([name, value]) => ({ name, value }))
  const lastUpdated = [
    overview.generatedAt,
    infrastructure.generatedAt,
    traffic.generatedAt,
    versions.generatedAt,
    workflowsQuery.data?.generatedAt,
  ].filter(Boolean).sort().pop()

  const canDispatch = Boolean(workflowsQuery.data?.canDispatch)

  const summaryError = overviewQuery.error?.response?.data?.message
    || infrastructureQuery.error?.response?.data?.message
    || trafficQuery.error?.response?.data?.message
    || workflowsQuery.error?.response?.data?.message
    || versionsQuery.error?.response?.data?.message
    || metaQuery.error?.response?.data?.message
    || dispatchMutation.error?.response?.data?.message
    || ''

  const busy = overviewQuery.isLoading || infrastructureQuery.isLoading || trafficQuery.isLoading || workflowsQuery.isLoading || versionsQuery.isLoading || metaQuery.isLoading

  const navMeta = {
    command: `${formatCompactNumber(terrainStats.online_reps ?? 0)} reps online`,
    delivery: `${workflows.filter((workflow) => workflow.integrationReady).length} pipelines linked`,
    traffic: `${formatCompactNumber((traffic.product?.requestsLastHour ?? 0) + (traffic.ops?.requestsLastHour ?? 0))} req last hour`,
    infrastructure: `${serviceStates.filter((service) => service.status === 'active').length}/${serviceStates.length || 0} services healthy`,
    watchlist: `${formatCompactNumber(bugReports.filter((bug) => String(bug.status || '').toLowerCase() === 'open').length)} open issues`,
  }

  const activeNav = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0]

  const setWorkflowValue = (workflowKey, fieldId, value) => {
    setWorkflowInputs((current) => ({
      ...current,
      [workflowKey]: {
        ...current[workflowKey],
        [fieldId]: value,
      },
    }))
  }

  const handleSelectPage = (pageId) => {
    setActivePage(pageId)
    const nextHash = `#${pageId}`

    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }

  const refreshAll = () => {
    overviewQuery.refetch()
    infrastructureQuery.refetch()
    trafficQuery.refetch()
    workflowsQuery.refetch()
    versionsQuery.refetch()
    metaQuery.refetch()
  }

  let pageContent = null

  if (activePage === 'delivery') {
    pageContent = (
      <ReleasesPage
        surfaces={surfaces}
        surfaceMap={surfaceMap}
        workflows={workflows}
        workflowInputs={workflowInputs}
        canDispatch={canDispatch}
        dispatchMutation={dispatchMutation}
        setWorkflowValue={setWorkflowValue}
        setDispatchMessage={setDispatchMessage}
      />
    )
  } else if (activePage === 'traffic') {
    pageContent = (
      <TrafficPage
        traffic={traffic}
        productTopPaths={productTopPaths}
        opsTopPaths={opsTopPaths}
        statusMix={statusMix}
      />
    )
  } else if (activePage === 'infrastructure') {
    pageContent = (
      <InfrastructurePage
        serverStats={serverStats}
        serviceStates={serviceStates}
        pm2Processes={pm2Processes}
        traffic={traffic}
      />
    )
  } else if (activePage === 'watchlist') {
    pageContent = (
      <WatchlistPage
        bugReports={bugReports}
        sessionRows={sessionRows}
        versionAdoption={versionAdoption}
        repRows={repRows}
      />
    )
  } else {
    pageContent = (
      <CommandCenterPage
        terrainStats={terrainStats}
        latestBug={latestBug}
        maintenanceState={maintenanceState}
        surfaces={surfaces}
        serviceStates={serviceStates}
        repRows={repRows}
        versionAdoption={versionAdoption}
      />
    )
  }

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">IO</div>
          <div>
            <div className="sidebar-brand-title">Irtiwaa Ops</div>
            <div className="sidebar-brand-helper">Separate operator control plane</div>
          </div>
        </div>

        <div className="sidebar-hero-card">
          <div className="section-eyebrow">Production subdomain</div>
          <h2>Live version visibility and controlled dispatches.</h2>
          <p>
            Refactored into a real operator workspace with pages, side navigation, and rollout context.
          </p>
          <div className="hero-chip-row">
            <StatusPill status="good">{session.user.role}</StatusPill>
            <StatusPill status={systemSnapshot.db_ok ? 'good' : 'warm'}>
              {systemSnapshot.db_ok ? 'DB linked' : 'DB check'}
            </StatusPill>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activePage

            return (
              <button
                key={item.id}
                className={`sidebar-nav-button ${isActive ? 'sidebar-nav-button-active' : ''}`}
                type="button"
                onClick={() => handleSelectPage(item.id)}
              >
                <div className="sidebar-nav-icon">
                  <Icon size={18} />
                </div>
                <div className="sidebar-nav-copy">
                  <div className="sidebar-nav-label">{item.label}</div>
                  <div className="sidebar-nav-helper">{navMeta[item.id]}</div>
                </div>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Live surfaces</div>
          <div className="sidebar-surface-list">
            {surfaces.map((surface) => (
              <SidebarSurfaceCard key={surface.key} surface={surface} />
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-title">{session.user.name}</div>
            <div className="sidebar-user-helper">{session.user.email}</div>
            <div className="sidebar-user-helper">Console v{meta.consoleVersion || surfaceMap.ops?.sourceVersion || '…'}</div>
            <div className="sidebar-user-helper">Last sync {formatDateTime(lastUpdated)}</div>
          </div>

          <div className="sidebar-action-stack">
            <button className="ghost-button sidebar-action-button" type="button" onClick={refreshAll}>
              <RefreshCcw size={16} />
              <span>Refresh all pages</span>
            </button>
            <a className="ghost-button sidebar-action-button" href="https://irtiwaa.ziedtech.com/web-platform/developer-tools" target="_blank" rel="noreferrer">
              <ChevronRight size={16} />
              <span>Open developer-tools launch</span>
            </a>
            <button className="ghost-button sidebar-action-button" type="button" onClick={onLogout}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <section className="workspace-content">
        <header className="page-hero">
          <div className="page-hero-copy">
            <div className="section-eyebrow">Operator workspace</div>
            <h1>{activeNav.label}</h1>
            <p>{activeNav.description}</p>
            <div className="page-chip-row">
              <StatusPill status="neutral">Console v{meta.consoleVersion || surfaceMap.ops?.sourceVersion || '…'}</StatusPill>
              <StatusPill status={maintenanceState?.enabled ? 'warm' : 'good'}>
                {maintenanceState?.enabled ? 'Maintenance live' : 'Maintenance off'}
              </StatusPill>
              <StatusPill status={canDispatch ? 'good' : 'warm'}>
                {canDispatch ? 'Dispatch enabled' : 'Inspect only'}
              </StatusPill>
            </div>
          </div>

          <div className="page-summary-card">
            <div className="page-summary-label">Live snapshot</div>
            <div className="page-summary-value">{navMeta[activePage]}</div>
            <div className="page-summary-helper">{formatDateTime(lastUpdated)}</div>
          </div>
        </header>

        <MessageBanner message={summaryError} tone="danger" />
        <MessageBanner message={!summaryError ? dispatchMessage : ''} tone="good" />
        {busy ? <LoadingPanel /> : null}

        {pageContent}
      </section>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(() => loadStoredSession())
  const [loginError, setLoginError] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(session))
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const api = useMemo(() => createApiClient(session?.token), [session?.token])

  useEffect(() => {
    if (!session?.token) {
      setIsCheckingSession(false)
      return
    }

    let active = true
    setIsCheckingSession(true)

    api.get('/auth/me')
      .then((response) => {
        if (!active) {
          return
        }

        const nextSession = {
          token: session.token,
          user: response.data,
        }

        persistSession(nextSession)
        setSession(nextSession)
      })
      .catch(() => {
        if (!active) {
          return
        }

        clearStoredSession()
        setSession(null)
      })
      .finally(() => {
        if (active) {
          setIsCheckingSession(false)
        }
      })

    return () => {
      active = false
    }
  }, [api, session?.token])

  const handleLogin = async (email, password) => {
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const response = await createApiClient().post('/auth/login', { email, password })
      const nextSession = response.data
      persistSession(nextSession)
      setSession(nextSession)
      window.history.replaceState(null, '', `#${DEFAULT_PAGE}`)
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Unable to sign in right now.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout propagation failures.
    }

    clearStoredSession()
    setSession(null)
  }

  if (!session || isCheckingSession) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={isLoggingIn || isCheckingSession}
        error={loginError}
      />
    )
  }

  return <Dashboard api={api} session={session} onLogout={handleLogout} />
}
