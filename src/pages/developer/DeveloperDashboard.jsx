import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageLoader } from '../../components/Spinner'
import { APP_VERSION } from '../../config/appMeta'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { DEFAULT_APP_MARK } from '../../utils/branding'

const OPS_CONSOLE_URL = 'https://ops.irtiwaa.ziedtech.com/'

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

function SecureStep({ index, text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl px-4 py-4" style={{ background: '#ffffffa6', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.14)' }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'rgba(13,148,136,0.14)', color: '#0f766e' }}>
        {index}
      </div>
      <div className="text-sm text-secondary-color leading-6">{text}</div>
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
  t,
}) {
  return (
    <div
      className="rounded-[28px] px-4 py-4"
      style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
          <img
            src={company.logo_url || DEFAULT_APP_MARK}
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
                {t('companiesPage.badges.default')}
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
              style={{ background: '#ffffffca', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.16)' }}
            >
              <div className="text-xs font-semibold text-base-color">
                {busy ? t('developerWorkspace.launcher.starting') : t(`badges.roles.${role}`)}
              </div>
              <div className="mt-2 text-[11px] text-secondary-color">
                <i className={icon} /> {t('developerWorkspace.launcher.fixedOneHour')}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DeveloperDashboard() {
  const { t } = useI18n()
  const { startCompanySession, switchingCompanySession } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [launchingKey, setLaunchingKey] = useState('')
  const [overview, setOverview] = useState(null)
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [overviewResponse, companiesResponse] = await Promise.all([
          api.get('/developer-tools'),
          api.get('/companies'),
        ])

        if (!active) {
          return
        }

        setOverview(overviewResponse.data ?? null)
        setCompanies(Array.isArray(companiesResponse.data) ? companiesResponse.data : [])
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError.response?.data?.message || t('developerWorkspace.errors.load'))
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
  }, [t])

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
    setNotice('')
    setError('')
    setLaunchingKey(`${companyId}:${role}`)

    try {
      await startCompanySession(companyId, role)
      navigate('/')
    } catch (launchError) {
      setError(launchError.response?.data?.message || t('developerWorkspace.errors.launchSession'))
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

  return (
    <div className="space-y-6">
      {(error || notice) && (
        <div
          className="rounded-3xl px-4 py-4 text-sm font-medium"
          style={error
            ? { background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }
            : { background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)', color: '#0f766e' }}
        >
          {error || notice}
        </div>
      )}

      <section
        className="relative overflow-hidden rounded-[34px] px-5 py-5 md:px-6 md:py-6"
        style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.14), rgba(59,130,246,0.11), rgba(15,23,42,0.04))', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.12)' }}
      >
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 70%)' }} />
        <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.16) 0%, rgba(13,148,136,0) 72%)' }} />

        <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div>
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ background: 'rgba(255,255,255,0.76)', color: '#0f766e' }}>
              {t('developerWorkspace.hero.eyebrow')}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-base-color">{t('developerWorkspace.page.dashboardTitle')}</h2>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(15,23,42,0.06)', color: '#0f172a' }}>
                v{APP_VERSION}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary-color">
              {t('developerWorkspace.hero.description')}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                t('developerWorkspace.hero.badges.isolated'),
                t('developerWorkspace.hero.badges.secure'),
                t('developerWorkspace.hero.badges.roleSwitch'),
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.82)', color: '#0f172a' }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/companies" className="btn-primary text-xs">
                <i className="fa-solid fa-buildings" /> {t('developerWorkspace.launcher.openCompanies')}
              </Link>
              <Link to="/developer-tools" className="btn-secondary text-xs">
                <i className="fa-solid fa-screwdriver-wrench" /> {t('layout.nav.developerTools')}
              </Link>
              <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                <i className="fa-solid fa-tower-broadcast" /> {t('developerWorkspace.quickActions.opsConsole')}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-color">{t('developerWorkspace.guide.title')}</div>
            <SecureStep index="01" text={t('developerWorkspace.guide.steps.registry')} />
            <SecureStep index="02" text={t('developerWorkspace.guide.steps.launch')} />
            <SecureStep index="03" text={t('developerWorkspace.guide.steps.return')} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('developerWorkspace.metrics.companies')}
          value={companies.length}
          helper={t('developerWorkspace.metrics.activeCompanies', { count: activeCompanies.length })}
          icon="fa-solid fa-buildings"
          tone="#0d9488"
        />
        <MetricCard
          label={t('developerWorkspace.metrics.defaultCompany')}
          value={defaultCompany?.name || t('developerWorkspace.notAvailable')}
          helper={defaultCompany?.slug || t('developerWorkspace.metrics.noDefault')}
          icon="fa-solid fa-location-dot"
          tone="#2563eb"
        />
        <MetricCard
          label={t('developerWorkspace.metrics.maintenance')}
          value={overview?.maintenance?.enabled
            ? (overview?.maintenance?.global ? t('developerToolsPage.metrics.maintenanceGlobal') : t('developerToolsPage.metrics.maintenanceTargeted'))
            : t('developerToolsPage.metrics.inactive')}
          helper={t('developerToolsPage.metrics.targetedPages', { count: overview?.maintenance?.paths?.length || 0 })}
          icon="fa-solid fa-screwdriver-wrench"
          tone="#f97316"
        />
        <MetricCard
          label={t('developerWorkspace.metrics.demo')}
          value={overview?.demo?.count ?? 0}
          helper={t('developerWorkspace.metrics.demoCustomers', { count: overview?.demo?.customers ?? 0 })}
          icon="fa-solid fa-flask"
          tone="#8b5cf6"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-base-color">{t('developerWorkspace.launcher.title')}</div>
              <div className="mt-1 text-sm text-secondary-color">{t('developerWorkspace.launcher.description')}</div>
            </div>
            <Link to="/companies" className="btn-secondary text-xs">
              <i className="fa-solid fa-arrow-right" /> {t('developerWorkspace.launcher.openCompanies')}
            </Link>
          </div>

          {featuredCompanies.length === 0 ? (
            <div className="mt-5 rounded-[28px] px-4 py-8 text-sm text-muted-color text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              {t('developerWorkspace.launcher.empty')}
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
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="text-sm font-semibold text-base-color">{t('developerWorkspace.quickActions.title')}</div>
            <div className="mt-1 text-sm text-secondary-color">{t('developerWorkspace.quickActions.subtitle')}</div>
            <div className="mt-4 space-y-3">
              <ActionSurface
                to="/companies"
                icon="fa-solid fa-buildings"
                title={t('layout.nav.companies')}
                description={t('developerWorkspace.quickActions.descriptions.companies')}
              />
              <ActionSurface
                to="/developer-tools"
                icon="fa-solid fa-screwdriver-wrench"
                title={t('layout.nav.developerTools')}
                description={t('developerWorkspace.quickActions.descriptions.tools')}
              />
              <ActionSurface
                href={OPS_CONSOLE_URL}
                external
                icon="fa-solid fa-tower-broadcast"
                title={t('developerWorkspace.quickActions.opsConsole')}
                description={t('developerWorkspace.quickActions.descriptions.ops')}
              />
            </div>
          </div>

          <div
            className="rounded-[28px] px-4 py-4"
            style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.10), rgba(59,130,246,0.08))', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.12)' }}
          >
            <div className="text-sm font-semibold text-base-color">{t('developerWorkspace.policy.title')}</div>
            <div className="mt-2 text-sm text-secondary-color">{t('developerWorkspace.policy.description')}</div>
            <ul className="mt-4 space-y-2 text-sm text-secondary-color">
              <li>{t('developerWorkspace.policy.items.session')}</li>
              <li>{t('developerWorkspace.policy.items.roles')}</li>
              <li>{t('developerWorkspace.policy.items.return')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
