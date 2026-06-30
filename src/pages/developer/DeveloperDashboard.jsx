import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageLoader } from '../../components/Spinner'
import { APP_VERSION } from '../../config/appMeta'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import api from '../../services/api'
import { DEFAULT_APP_MARK, resolveCompanyBrandLogo } from '../../utils/branding'
import { DEVELOPER_WORKSPACE_COPY as copy } from './developerWorkspaceCopy'

const OPS_CONSOLE_URL = 'https://ops.irtiwaa.ziedtech.com/'

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
          {helper && <div className="mt-1 text-xs text-secondary-color">{helper}</div>}
        </div>
      </div>
    </div>
  )
}

function ActionSurface({ to, href, icon, title, description, external = false }) {
  const classes = 'rounded-[26px] px-4 py-4 text-left transition-colors hover:bg-surface-2'
  const style = { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}>
          <i className={icon} />
        </div>
        <i className={`fa-solid ${external ? 'fa-arrow-up-right-from-square' : 'fa-arrow-right'} text-xs text-muted-color`} />
      </div>
      <div className="mt-4 text-sm font-semibold text-base-color">{title}</div>
      <div className="mt-2 text-sm text-secondary-color leading-6">{description}</div>
    </>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes} style={style}>
        {body}
      </a>
    )
  }

  return (
    <Link to={to} className={classes} style={style}>
      {body}
    </Link>
  )
}

function CompanyLaunchCard({
  company,
  onLaunch,
  launchingKey,
  switchingCompanySession,
  logoShellStyle,
}) {
  return (
    <div
      className="rounded-[28px] px-4 py-4"
      style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl" style={logoShellStyle}>
          <img
            src={resolveCompanyBrandLogo(company)}
            alt={company.name}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_APP_MARK
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold text-base-color">{company.name}</div>
            {company.is_default && (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}>
                {copy.dashboard.states.defaultBadge}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-color">{company.slug}</div>
          {company.note && <div className="mt-2 line-clamp-2 text-xs text-secondary-color">{company.note}</div>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {['admin', 'comptable', 'rep'].map((role) => {
          const launchKey = `${company.id}:${role}`
          const busy = switchingCompanySession || launchingKey === launchKey
          const icon = role === 'admin'
            ? 'fa-solid fa-shield-halved'
            : role === 'comptable'
              ? 'fa-solid fa-calculator'
              : 'fa-solid fa-truck-field'

          return (
            <button
              key={launchKey}
              type="button"
              onClick={() => { void onLaunch(company.id, role) }}
              disabled={busy}
              className="rounded-2xl px-3 py-3 text-left transition-colors"
              style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
            >
              <div className="text-xs font-semibold text-base-color">
                {busy ? copy.dashboard.states.launching : copy.dashboard.roles[role]}
              </div>
              <div className="mt-2 text-[11px] text-secondary-color">
                <i className={icon} /> {copy.dashboard.states.fixedSession}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DeveloperDashboard() {
  const { startCompanySession, switchingCompanySession } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [launchingKey, setLaunchingKey] = useState('')
  const [companies, setCompanies] = useState([])
  const [liveData, setLiveData] = useState(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [liveDataResponse, companiesResponse] = await Promise.all([
          api.get('/developer-tools/live-data', {
            params: {
              history_limit: 6,
              active_within_minutes: 10,
            },
          }),
          api.get('/companies'),
        ])

        if (!active) {
          return
        }

        setLiveData(liveDataResponse.data ?? null)
        setCompanies(Array.isArray(companiesResponse.data) ? companiesResponse.data : [])
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError.response?.data?.message || 'Unable to load the developer workspace right now.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.active),
    [companies],
  )
  const defaultCompany = useMemo(
    () => companies.find((company) => company.is_default) ?? null,
    [companies],
  )
  const featuredCompanies = useMemo(
    () => activeCompanies.slice(0, 6),
    [activeCompanies],
  )

  const openScopedSession = async (companyId, role) => {
    setError('')
    setLaunchingKey(`${companyId}:${role}`)

    try {
      await startCompanySession(companyId, role)
      navigate('/')
    } catch (launchError) {
      setError(launchError.response?.data?.message || 'Unable to start that company session.')
    } finally {
      setLaunchingKey('')
    }
  }

  if (loading) {
    return (
      <div className="card py-12">
        <PageLoader />
      </div>
    )
  }

  const summary = liveData?.summary ?? {}
  const recentHistory = Array.isArray(liveData?.history) ? liveData.history.slice(0, 5) : []
  const companyLogoShellStyle = isDark
    ? { background: 'rgba(15,23,42,0.72)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.14)' }
    : { background: 'rgba(255,255,255,0.94)', boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }
  const heroShellStyle = isDark
    ? { background: 'linear-gradient(135deg, rgba(13,148,136,0.24), rgba(59,130,246,0.18), rgba(15,23,42,0.58))', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,0.12)' }
    : { background: 'linear-gradient(135deg, rgba(13,148,136,0.14), rgba(59,130,246,0.11), rgba(15,23,42,0.04))', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.12)' }
  const heroGlowTopStyle = isDark
    ? { background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 72%)' }
    : { background: 'radial-gradient(circle, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 70%)' }
  const heroGlowBottomStyle = isDark
    ? { background: 'radial-gradient(circle, rgba(13,148,136,0.20) 0%, rgba(13,148,136,0) 74%)' }
    : { background: 'radial-gradient(circle, rgba(13,148,136,0.16) 0%, rgba(13,148,136,0) 72%)' }
  const heroEyebrowStyle = isDark
    ? { background: 'rgba(15,23,42,0.58)', color: '#99f6e4', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,0.16)' }
    : { background: 'rgba(255,255,255,0.76)', color: '#0f766e' }
  const versionChipStyle = isDark
    ? { background: 'rgba(15,23,42,0.58)', color: 'rgba(226,232,240,0.92)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.14)' }
    : { background: 'rgba(15,23,42,0.06)', color: '#0f172a' }
  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-3xl px-4 py-4 text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }}
        >
          {error}
        </div>
      )}

      <section
        className="relative overflow-hidden rounded-[34px] px-5 py-5 md:px-6 md:py-6"
        style={heroShellStyle}
      >
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full" style={heroGlowTopStyle} />
        <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full" style={heroGlowBottomStyle} />

        <div className="relative max-w-4xl">
          <div>
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]" style={heroEyebrowStyle}>
              {copy.dashboard.eyebrow}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-base-color">{copy.dashboard.title}</h2>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold" style={versionChipStyle}>
                v{APP_VERSION}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary-color">
              {copy.dashboard.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/live-data" className="btn-primary text-xs">
                <i className="fa-solid fa-wave-square" /> {copy.dashboard.actions.liveData}
              </Link>
              <Link to="/companies" className="btn-primary text-xs">
                <i className="fa-solid fa-building" /> {copy.dashboard.actions.companies}
              </Link>
              <Link to="/elements" className="btn-secondary text-xs">
                <i className="fa-solid fa-calendar-days" /> {copy.dashboard.actions.elements}
              </Link>
              <Link to="/developer-tools" className="btn-secondary text-xs">
                <i className="fa-solid fa-screwdriver-wrench" /> {copy.dashboard.actions.tools}
              </Link>
              <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                <i className="fa-solid fa-tower-broadcast" /> {copy.dashboard.actions.ops}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={copy.dashboard.summary.activeCompanies}
          value={activeCompanies.length}
          helper={`${companies.length} registered companies`}
          icon="fa-solid fa-building"
          tone="#0d9488"
        />
        <MetricCard
          label={copy.dashboard.summary.activeSessions}
          value={summary.active_sessions ?? 0}
          helper={`${summary.active_users ?? 0} active users`}
          icon="fa-solid fa-wave-square"
          tone="#2563eb"
        />
        <MetricCard
          label={copy.dashboard.summary.webSessions}
          value={summary.web_sessions ?? 0}
          helper={`Default company: ${defaultCompany?.name || copy.liveData.states.notAvailable}`}
          icon="fa-solid fa-globe"
          tone="#8b5cf6"
        />
        <MetricCard
          label={copy.dashboard.summary.mobileSessions}
          value={summary.mobile_sessions ?? 0}
          helper={`Latest event: ${formatDateTime(summary.latest_event_at)}`}
          icon="fa-solid fa-mobile-screen-button"
          tone="#f97316"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-base-color">{copy.dashboard.sections.launcher}</div>
              <div className="mt-1 text-sm text-secondary-color">{copy.dashboard.sections.launcherHelp}</div>
            </div>
            <Link to="/companies" className="btn-secondary text-xs">
              <i className="fa-solid fa-arrow-right" /> {copy.dashboard.actions.companies}
            </Link>
          </div>

          {featuredCompanies.length === 0 ? (
            <div className="mt-5 rounded-[28px] px-4 py-8 text-sm text-muted-color text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              {copy.dashboard.states.noCompanies}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {featuredCompanies.map((company) => (
                <CompanyLaunchCard
                  key={company.id}
                  company={company}
                  onLaunch={openScopedSession}
                  launchingKey={launchingKey}
                  switchingCompanySession={switchingCompanySession}
                  logoShellStyle={companyLogoShellStyle}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="text-sm font-semibold text-base-color">{copy.dashboard.sections.quickActions}</div>
            <div className="mt-1 text-sm text-secondary-color">{copy.dashboard.sections.quickActionsHelp}</div>
            <div className="mt-4 space-y-3">
              <ActionSurface
                to="/live-data"
                icon="fa-solid fa-wave-square"
                title={copy.nav.liveData}
                description={copy.liveData.sections.activeHelp}
              />
              <ActionSurface
                to="/companies"
                icon="fa-solid fa-building"
                title={copy.nav.companies}
                description="Review company identity, settings, and session-launch access in one place."
              />
              <ActionSurface
                to="/developer-tools"
                icon="fa-solid fa-screwdriver-wrench"
                title={copy.nav.tools}
                description="Open maintenance, demo, system-task, and developer-only operational tools."
              />
              <ActionSurface
                href={OPS_CONSOLE_URL}
                external
                icon="fa-solid fa-tower-broadcast"
                title={copy.layout.ops}
                description="Jump to the separate ops console when the task leaves the product workspace."
              />
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-semibold text-base-color">{copy.dashboard.sections.recentActivity}</div>
            <div className="mt-1 text-sm text-secondary-color">{copy.dashboard.sections.recentActivityHelp}</div>
            {recentHistory.length === 0 ? (
              <div className="mt-4 rounded-[22px] px-4 py-4 text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                {copy.dashboard.states.noRecentActivity}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentHistory.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-base-color">{entry.action_label || entry.event_name}</div>
                        <div className="mt-1 text-xs text-secondary-color">
                          {[entry.company?.name, entry.user?.name, entry.platform].filter(Boolean).join(' · ')}
                        </div>
                        <div className="mt-2 text-sm text-secondary-color break-words">
                          {entry.page_title || entry.screen_name || entry.route_path || copy.liveData.states.noView}
                        </div>
                      </div>
                      <div className="text-xs text-muted-color flex-shrink-0">{formatDateTime(entry.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
