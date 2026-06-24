import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  Boxes,
  Bug,
  ChevronRight,
  Clock3,
  Cpu,
  GitBranch,
  HardDrive,
  LogOut,
  RefreshCcw,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
  Waves,
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

function StatusPill({ status, children }) {
  return (
    <span className={`status-pill status-pill-${status}`}>
      {children}
    </span>
  )
}

function SectionCard({ title, eyebrow, action, children }) {
  return (
    <section className="section-card">
      <div className="section-card-header">
        <div>
          {eyebrow ? <div className="section-eyebrow">{eyebrow}</div> : null}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function MetricCard({ title, value, helper, tone = 'neutral', icon: Icon }) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-topline">
        <span>{title}</span>
        <Icon size={18} />
      </div>
      <div className="metric-card-value">{value}</div>
      <div className="metric-card-helper">{helper}</div>
    </article>
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

function ErrorBanner({ message }) {
  if (!message) {
    return null
  }

  return <div className="error-banner">{message}</div>
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
        <div className="login-eyebrow">El Irtiwaa ops plane</div>
        <h1>Separate monitoring and deploy control for the production stack.</h1>
        <p>
          This console is isolated from the commercial web platform. It keeps the operational data,
          traffic signals, VPS health, and GitHub workflow dispatches in one secured surface.
        </p>
        <div className="login-chip-row">
          <StatusPill status="good">Standalone runtime</StatusPill>
          <StatusPill status="warm">Developer and admin access only</StatusPill>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="section-eyebrow">Secure sign-in</div>
        <h2>Use your existing Irtiwaa credentials</h2>
        <p>The console validates the same product API account and only accepts admin or developer roles.</p>

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

        <ErrorBanner message={error} />

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? <RefreshCcw className="spin" size={16} /> : <ArrowRight size={16} />}
          <span>{loading ? 'Signing in…' : 'Open ops console'}</span>
        </button>
      </form>
    </main>
  )
}

function Dashboard({ api, session, onLogout }) {
  const [workflowInputs, setWorkflowInputs] = useState(() => buildInitialWorkflowInputs())
  const [dispatchMessage, setDispatchMessage] = useState('')

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
  const workflows = workflowsQuery.data?.workflows ?? []
  const canDispatch = Boolean(workflowsQuery.data?.canDispatch)
  const latestBug = overview.bugReports?.[0] ?? null
  const terrainStats = overview.terrain?.stats ?? {}
  const serverStats = infrastructure.server ?? {}
  const serviceStates = infrastructure.services ?? []
  const pm2Processes = infrastructure.processes ?? []
  const productStatusChart = Object.entries(traffic.product?.statusCounts ?? {}).map(([status, value]) => ({
    name: status,
    value,
  }))
  const lastUpdated = [
    overview.generatedAt,
    infrastructure.generatedAt,
    traffic.generatedAt,
    workflowsQuery.data?.generatedAt,
  ].filter(Boolean).sort().pop()

  const productTopPaths = (traffic.product?.topPaths ?? []).map((entry) => ({
    ...entry,
    label: entry.path.length > 28 ? `${entry.path.slice(0, 28)}…` : entry.path,
  }))

  const setWorkflowValue = (workflowKey, fieldId, value) => {
    setWorkflowInputs((current) => ({
      ...current,
      [workflowKey]: {
        ...current[workflowKey],
        [fieldId]: value,
      },
    }))
  }

  const summaryError = overviewQuery.error?.response?.data?.message
    || infrastructureQuery.error?.response?.data?.message
    || trafficQuery.error?.response?.data?.message
    || workflowsQuery.error?.response?.data?.message
    || metaQuery.error?.response?.data?.message
    || dispatchMutation.error?.response?.data?.message
    || ''

  const busy = overviewQuery.isLoading || infrastructureQuery.isLoading || trafficQuery.isLoading || workflowsQuery.isLoading || metaQuery.isLoading

  return (
    <main className="dashboard-shell">
      <header className="hero-header">
        <div className="hero-copy">
          <div className="section-eyebrow">Ops subdomain</div>
          <h1>Irtiwaa Ops Console</h1>
          <p>
            Separate live operations surface for product health, traffic, issues, users, server resources,
            and controlled GitHub workflow dispatches.
          </p>
          <div className="hero-chip-row">
            <StatusPill status="good">{session.user.role}</StatusPill>
            <StatusPill status={overview.systemStatus?.db_ok ? 'good' : 'danger'}>
              API {overview.systemStatus?.db_ok ? 'stable' : 'check required'}
            </StatusPill>
            <StatusPill status="warm">
              Console v{metaQuery.data?.consoleVersion || '…'}
            </StatusPill>
          </div>
        </div>

        <div className="hero-actions">
          <div className="hero-user-card">
            <div className="hero-user-label">Signed in as</div>
            <div className="hero-user-name">{session.user.name}</div>
            <div className="hero-user-meta">{session.user.email}</div>
            <div className="hero-user-meta">Last refresh: {formatDateTime(lastUpdated)}</div>
          </div>

          <div className="hero-button-row">
            <a className="ghost-button" href="https://irtiwaa.ziedtech.com/web-platform/developer-tools" target="_blank" rel="noreferrer">
              <ChevronRight size={16} />
              <span>Open developer tools</span>
            </a>
            <button className="ghost-button" type="button" onClick={() => {
              overviewQuery.refetch()
              infrastructureQuery.refetch()
              trafficQuery.refetch()
              workflowsQuery.refetch()
            }}>
              <RefreshCcw size={16} />
              <span>Refresh now</span>
            </button>
            <button className="ghost-button" type="button" onClick={onLogout}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <ErrorBanner message={summaryError || dispatchMessage} />

      {busy ? <LoadingPanel /> : null}

      <section className="metrics-grid">
        <MetricCard
          title="Online reps"
          value={`${formatCompactNumber(terrainStats.online_reps ?? 0)} / ${formatCompactNumber(terrainStats.reps_total ?? 0)}`}
          helper={`${formatCompactNumber(terrainStats.open_sessions ?? 0)} open sessions`}
          tone="good"
          icon={Users}
        />
        <MetricCard
          title="Open issues"
          value={formatCompactNumber(overview.bugReports?.filter((item) => item.status === 'open').length ?? 0)}
          helper={`${formatCompactNumber(overview.bugReports?.length ?? 0)} total bug reports`}
          tone="danger"
          icon={Bug}
        />
        <MetricCard
          title="Traffic last hour"
          value={formatCompactNumber((traffic.product?.requestsLastHour ?? 0) + (traffic.ops?.requestsLastHour ?? 0))}
          helper={`${formatCompactNumber(traffic.product?.errors5xxLastHour ?? 0)} product 5xx · ${formatCompactNumber(traffic.ops?.errors5xxLastHour ?? 0)} ops 5xx`}
          tone="warm"
          icon={Waves}
        />
        <MetricCard
          title="Server CPU"
          value={formatPercent(serverStats.cpuLoad ?? 0)}
          helper={`${formatBytes(serverStats.memoryUsed ?? 0)} / ${formatBytes(serverStats.memoryTotal ?? 0)} RAM`}
          tone="neutral"
          icon={Cpu}
        />
        <MetricCard
          title="Today revenue"
          value={formatCurrency(terrainStats.today_revenue ?? 0)}
          helper={`${formatCompactNumber(terrainStats.today_invoices ?? 0)} invoices today`}
          tone="good"
          icon={Activity}
        />
        <MetricCard
          title="Disk usage"
          value={`${formatPercent(((serverStats.diskUsed ?? 0) / Math.max(serverStats.diskTotal ?? 1, 1)) * 100)}`}
          helper={`${formatBytes(serverStats.diskUsed ?? 0)} / ${formatBytes(serverStats.diskTotal ?? 0)} on /`}
          tone="neutral"
          icon={HardDrive}
        />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <SectionCard
            eyebrow="Traffic"
            title="Request rhythm and hottest paths"
            action={<StatusPill status="good">Live 30s</StatusPill>}
          >
            <div className="chart-grid">
              <div className="chart-block">
                <div className="chart-title">Irtiwaa platform requests</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={traffic.product?.timeline ?? []}>
                    <defs>
                      <linearGradient id="productTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff6b4a" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ff6b4a" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36, 44, 58, 0.14)" />
                    <XAxis dataKey="label" stroke="#667188" />
                    <YAxis stroke="#667188" allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#ff6b4a" fill="url(#productTraffic)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-block">
                <div className="chart-title">Most requested product paths</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={productTopPaths}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(36, 44, 58, 0.14)" />
                    <XAxis dataKey="label" stroke="#667188" interval={0} angle={-18} textAnchor="end" height={56} />
                    <YAxis stroke="#667188" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1d6fd9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Health" title="Bug flow and platform services">
            <div className="dual-grid">
              <div className="subpanel">
                <div className="subpanel-title">Bug lifecycle snapshot</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={productStatusChart}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {productStatusChart.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={['#ff6b4a', '#1d6fd9', '#0f9d84', '#f4b73b'][index % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="subpanel">
                <div className="subpanel-title">Critical services</div>
                <div className="status-list">
                  {serviceStates.map((service) => (
                    <div className="status-row" key={service.name}>
                      <div>
                        <div className="status-label">{service.name}</div>
                        <div className="status-helper">
                          {service.status === 'active' ? 'Healthy' : 'Needs attention'}
                        </div>
                      </div>
                      <StatusPill status={service.status === 'active' ? 'good' : 'danger'}>
                        {service.status}
                      </StatusPill>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="latest-issue-card">
              <div className="latest-issue-copy">
                <div className="section-eyebrow">Latest reported issue</div>
                <h3>{latestBug?.subject || 'No issue reported in the current payload'}</h3>
                <p>{latestBug?.description || 'When support tickets arrive, the latest one will be surfaced here for triage.'}</p>
              </div>
              <div className="latest-issue-meta">
                <div><strong>Status</strong> {latestBug?.status || 'clear'}</div>
                <div><strong>Severity</strong> {latestBug?.severity || 'n/a'}</div>
                <div><strong>Reported</strong> {formatDateTime(latestBug?.created_at)}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Infrastructure" title="VPS resources and PM2 processes">
            <div className="process-grid">
              <div className="subpanel">
                <div className="subpanel-title">Server runtime</div>
                <div className="meta-grid">
                  <div>
                    <span>Hostname</span>
                    <strong>{serverStats.hostname || 'n/a'}</strong>
                  </div>
                  <div>
                    <span>Uptime</span>
                    <strong>{formatDuration(serverStats.uptimeMinutes ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Memory</span>
                    <strong>{formatBytes(serverStats.memoryUsed ?? 0)} / {formatBytes(serverStats.memoryTotal ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Disk root</span>
                    <strong>{formatBytes(serverStats.diskUsed ?? 0)} / {formatBytes(serverStats.diskTotal ?? 0)}</strong>
                  </div>
                </div>
              </div>

              <div className="subpanel">
                <div className="subpanel-title">PM2 process table</div>
                <div className="table-list">
                  {pm2Processes.map((process) => (
                    <div className="table-row" key={process.name}>
                      <div className="table-row-copy">
                        <div className="status-label">{process.name}</div>
                        <div className="status-helper">
                          CPU {formatPercent(process.cpu)} · RAM {formatBytes(process.memory)} · uptime {formatDuration((Date.now() - process.uptime) / 60_000)}
                        </div>
                      </div>
                      <StatusPill status={process.status === 'online' ? 'good' : 'danger'}>
                        {process.status}
                      </StatusPill>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="dashboard-side">
          <SectionCard eyebrow="CI/CD" title="Manual workflow dispatches">
            {!canDispatch ? (
              <div className="info-card">
                <ShieldCheck size={18} />
                <p>This account can inspect workflows but cannot dispatch deployments under the current console policy.</p>
              </div>
            ) : null}

            <div className="workflow-stack">
              {workflows.map((workflow) => {
                const inputs = workflowInputs[workflow.key] || { ref: 'main' }

                return (
                  <article className="workflow-card" key={workflow.key}>
                    <div className="workflow-card-topline">
                      <div>
                        <div className="workflow-title">{workflow.label}</div>
                        <div className="workflow-meta">{workflow.repo} · {workflow.workflowId}</div>
                      </div>
                      <StatusPill status={workflow.integrationReady ? 'good' : 'danger'}>
                        {workflow.integrationReady ? 'GitHub ready' : 'Runtime missing token'}
                      </StatusPill>
                    </div>

                    <p className="workflow-description">{workflow.description}</p>

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

                    <button
                      className="primary-button"
                      type="button"
                      disabled={!canDispatch || !workflow.integrationReady || dispatchMutation.isPending}
                      onClick={() => {
                        setDispatchMessage('')
                        dispatchMutation.mutate({ workflowKey: workflow.key })
                      }}
                    >
                      {dispatchMutation.isPending ? <RefreshCcw className="spin" size={16} /> : <Rocket size={16} />}
                      <span>Dispatch</span>
                    </button>

                    <div className="workflow-runs">
                      {(workflow.runs || []).map((run) => (
                        <a className="workflow-run" key={run.id} href={run.htmlUrl} target="_blank" rel="noreferrer">
                          <div>
                            <div className="workflow-run-name">{run.branch}</div>
                            <div className="workflow-run-meta">{formatDateTime(run.updatedAt)}</div>
                          </div>
                          <StatusPill status={run.conclusion === 'success' ? 'good' : run.conclusion === 'failure' ? 'danger' : 'warm'}>
                            {run.conclusion || run.status}
                          </StatusPill>
                        </a>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Guidance" title="Quick operational links">
            <div className="link-stack">
              <a className="link-card" href="https://irtiwaa.ziedtech.com/web-platform/" target="_blank" rel="noreferrer">
                <div>
                  <div className="status-label">Commercial web platform</div>
                  <div className="status-helper">Primary product UI</div>
                </div>
                <ChevronRight size={16} />
              </a>
              <a className="link-card" href="https://irtiwaa.ziedtech.com/api/v1/system/ping" target="_blank" rel="noreferrer">
                <div>
                  <div className="status-label">Public API ping</div>
                  <div className="status-helper">Smoke-check entrypoint</div>
                </div>
                <ChevronRight size={16} />
              </a>
              <a className="link-card" href="https://github.com/zieddams/ventify-stock/releases" target="_blank" rel="noreferrer">
                <div>
                  <div className="status-label">Mobile releases</div>
                  <div className="status-helper">APK artifacts and release notes</div>
                </div>
                <ChevronRight size={16} />
              </a>
            </div>

            <div className="tunnel-note">
              <div className="section-eyebrow">Legacy internal tools</div>
              <p>Keep the old internal monitor private behind SSH.</p>
              <code>ssh -L 9301:127.0.0.1:3001 -L 9080:127.0.0.1:8080 irtiwaa-vps</code>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Traffic split" title="Platform vs ops console">
            <div className="mini-metric-grid">
              <div className="mini-metric">
                <div>Platform requests</div>
                <strong>{formatCompactNumber(traffic.product?.requestsLastHour ?? 0)}</strong>
              </div>
              <div className="mini-metric">
                <div>Ops requests</div>
                <strong>{formatCompactNumber(traffic.ops?.requestsLastHour ?? 0)}</strong>
              </div>
              <div className="mini-metric">
                <div>Platform 4xx</div>
                <strong>{formatCompactNumber(traffic.product?.errors4xxLastHour ?? 0)}</strong>
              </div>
              <div className="mini-metric">
                <div>Ops 5xx</div>
                <strong>{formatCompactNumber(traffic.ops?.errors5xxLastHour ?? 0)}</strong>
              </div>
            </div>
          </SectionCard>
        </div>
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
