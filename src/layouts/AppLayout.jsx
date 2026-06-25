import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import DepotScopeControls from '../components/DepotScopeControls'
import { APP_VERSION } from '../config/appMeta'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import { useDepots } from '../hooks/useDepots'
import { DEFAULT_APP_MARK, resolveUserBrandLogo } from '../utils/branding'

const CORE_NAV = [
  { to: '/invoices', icon: 'fa-solid fa-file-invoice', labelKey: 'layout.nav.invoices' },
  { to: '/customers', icon: 'fa-solid fa-users', labelKey: 'layout.nav.customers' },
  { to: '/products', icon: 'fa-solid fa-box-open', labelKey: 'layout.nav.products' },
]

const FINANCE_NAV = [
  { to: '/credit', icon: 'fa-solid fa-credit-card', labelKey: 'layout.nav.credit' },
  { to: '/expenses', icon: 'fa-solid fa-receipt', labelKey: 'layout.nav.expenses' },
]

const OPERATIONS_NAV = [
  { to: '/routes', icon: 'fa-solid fa-truck-fast', labelKey: 'layout.nav.routes' },
  { to: '/depot', icon: 'fa-solid fa-warehouse', labelKey: 'layout.nav.depot' },
  { to: '/camions', icon: 'fa-solid fa-truck', labelKey: 'layout.nav.camions' },
  { to: '/inventory', icon: 'fa-solid fa-clipboard-list', labelKey: 'layout.nav.inventory' },
  { to: '/reports', icon: 'fa-solid fa-chart-line', labelKey: 'layout.nav.reports' },
  { to: '/data-tools', icon: 'fa-solid fa-file-arrow-up', labelKey: 'layout.nav.dataTools' },
]

const SUPPORT_NAV = [
  { to: '/help', icon: 'fa-solid fa-circle-question', labelKey: 'layout.nav.help' },
  { to: '/notifications-center', icon: 'fa-solid fa-bell', labelKey: 'layout.nav.notificationsCenter' },
  { to: '/bug-reports', icon: 'fa-solid fa-bug', labelKey: 'layout.nav.bugReports' },
]

const DEVELOPER_NAV = [
  { to: '/companies', icon: 'fa-solid fa-buildings', labelKey: 'layout.nav.companies' },
  { to: '/developer-tools', icon: 'fa-solid fa-code', labelKey: 'layout.nav.developerTools' },
]

const DEFAULT_SYSTEM_STATUS = {
  state: 'checking',
  dbOk: null,
}

const PAGE_TITLES = {
  '/': { labelKey: 'layout.nav.dashboard', icon: 'fa-solid fa-chart-pie' },
  '/invoices': { labelKey: 'layout.nav.invoices', icon: 'fa-solid fa-file-invoice' },
  '/customers': { labelKey: 'layout.nav.customers', icon: 'fa-solid fa-users' },
  '/products': { labelKey: 'layout.nav.products', icon: 'fa-solid fa-box-open' },
  '/credit': { labelKey: 'layout.nav.credit', icon: 'fa-solid fa-credit-card' },
  '/expenses': { labelKey: 'layout.nav.expenses', icon: 'fa-solid fa-receipt' },
  '/routes': { labelKey: 'layout.nav.routes', icon: 'fa-solid fa-truck-fast' },
  '/depot': { labelKey: 'layout.nav.depot', icon: 'fa-solid fa-warehouse' },
  '/camions': { labelKey: 'layout.nav.camions', icon: 'fa-solid fa-truck' },
  '/reports': { labelKey: 'layout.nav.reports', icon: 'fa-solid fa-chart-line' },
  '/users': { labelKey: 'layout.nav.users', icon: 'fa-solid fa-user-gear' },
  '/zones': { labelKey: 'layout.nav.zones', icon: 'fa-solid fa-map-location-dot' },
  '/config': { labelKey: 'layout.nav.config', icon: 'fa-solid fa-sliders' },
  '/map': { labelKey: 'layout.nav.map', icon: 'fa-solid fa-map-location-dot' },
  '/inventory': { labelKey: 'layout.nav.inventory', icon: 'fa-solid fa-clipboard-list' },
  '/data-tools': { labelKey: 'layout.nav.dataTools', icon: 'fa-solid fa-file-arrow-up' },
  '/import': { labelKey: 'layout.nav.dataTools', icon: 'fa-solid fa-file-arrow-up' },
  '/export': { labelKey: 'layout.nav.dataTools', icon: 'fa-solid fa-file-arrow-up' },
  '/help': { labelKey: 'layout.nav.help', icon: 'fa-solid fa-circle-question' },
  '/notifications-center': { labelKey: 'layout.nav.notificationsCenter', icon: 'fa-solid fa-bell' },
  '/bug-reports': { labelKey: 'layout.nav.bugReports', icon: 'fa-solid fa-bug' },
  '/companies': { labelKey: 'layout.nav.companies', icon: 'fa-solid fa-buildings' },
  '/developer-tools': { labelKey: 'layout.nav.developerTools', icon: 'fa-solid fa-code' },
}

const TOPBAR_ALLOW_ALL_PATHS = new Set(['/', '/credit', '/invoices', '/reports', '/routes', '/users'])
const DEVELOPER_WORKSPACE_PATHS = new Set(['/companies', '/developer-tools'])

function RailLink({ to, icon, label, exact, expanded = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={({ isActive }) => `rail-link${expanded ? ' expanded' : ''}${isActive ? ' active' : ''}`}
      title={label}
    >
      <i className={`${icon} text-base`} />
      {expanded && <span className="rail-link-label">{label}</span>}
      {!expanded && <span className="rail-tooltip">{label}</span>}
    </NavLink>
  )
}

function RailDivider({ expanded = false }) {
  return <div className={`rail-divider${expanded ? ' expanded' : ''}`} />
}

function RailSectionTitle({ children }) {
  return <div className="rail-section-title">{children}</div>
}

function NavSection({ title, items, expanded, onClick }) {
  return (
    <div className="space-y-1">
      {expanded && <RailSectionTitle>{title}</RailSectionTitle>}
      <RailDivider expanded={expanded} />
      {items.map((item) => (
        <RailLink key={item.to} {...item} expanded={expanded} onClick={onClick} />
      ))}
    </div>
  )
}

function TopbarLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
          isActive
            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300'
            : 'text-muted-color hover:bg-surface-2 hover:text-base-color'
        }`
      }
      title={label}
    >
      <i className={icon} />
      <span className="hidden xl:inline">{label}</span>
    </NavLink>
  )
}

function getSystemStatusLabel(systemStatus, t) {
  if (systemStatus.state === 'online') {
    return systemStatus.dbOk ? t('layout.status.onlineDbOk') : t('layout.status.onlineDbCheck')
  }

  if (systemStatus.state === 'offline') {
    return t('layout.status.offline')
  }

  return t('layout.status.checking')
}

function buildAppDisplayName(user, companyName, appName) {
  return companyName || appName
}

function setMetaContent(name, content) {
  if (typeof document === 'undefined') {
    return
  }

  const tag = document.querySelector(`meta[name="${name}"]`)

  if (tag) {
    tag.setAttribute('content', content)
  }
}

function setLinkHref(selector, href) {
  if (typeof document === 'undefined' || !href) {
    return
  }

  document.querySelectorAll(selector).forEach((tag) => {
    tag.setAttribute('href', href)
  })
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { locale, savingLocale, setLocale, supportedLocales, t } = useI18n()

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-surface-2"
        title={user?.name}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold shadow">
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-base-color leading-none">{user?.name}</div>
          <div className="text-xs text-muted-color capitalize leading-none mt-0.5">
            {[user?.role, user?.company?.name].filter(Boolean).join(' · ')}
          </div>
        </div>
        <i className="fa-solid fa-chevron-down text-muted-color" style={{ fontSize: 10 }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-theme rounded-xl shadow-md z-50 py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-theme">
            <div className="text-sm font-semibold text-base-color">{user?.name}</div>
            <div className="text-xs text-muted-color">{user?.email}</div>
          </div>
          <div className="px-3 py-2 border-b border-theme">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
              {t('layout.userMenu.language')}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {supportedLocales.map((item) => {
                const active = item.code === locale

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => { void setLocale(item.code) }}
                    disabled={savingLocale}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                    style={{
                      borderColor: active ? '#0d9488' : 'var(--border)',
                      background: active ? 'rgba(13,148,136,0.12)' : 'transparent',
                      color: active ? '#0d9488' : 'var(--text-secondary)',
                    }}
                  >
                    {item.short} · {item.label}
                  </button>
                )
              })}
            </div>
          </div>
          <NavLink
            to="/notifications-center"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
          >
            <i className="fa-solid fa-bell w-4" />
            {t('layout.userMenu.notifications')}
          </NavLink>
          <NavLink
            to="/bug-reports"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
          >
            <i className="fa-solid fa-bug w-4" />
            {t('layout.userMenu.support')}
          </NavLink>
          {user?.role === 'developer' && (
            <>
              <NavLink
                to="/companies"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
              >
                <i className="fa-solid fa-buildings w-4" />
                {t('layout.userMenu.companies')}
              </NavLink>
              <NavLink
                to="/developer-tools"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
              >
                <i className="fa-solid fa-code w-4" />
                {t('layout.userMenu.developerTools')}
              </NavLink>
            </>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4" />
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

function BrandMark({
  user,
  title,
  imageClassName,
  shellClassName,
  onClick = null,
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const logoSrc = imageFailed ? DEFAULT_APP_MARK : resolveUserBrandLogo(user)

  useEffect(() => {
    setImageFailed(false)
  }, [user?.company?.logo_url])

  const shell = (
    <div className={shellClassName} title={title}>
      <img
        src={logoSrc}
        alt={title || 'Logo application'}
        className={imageClassName}
        onError={() => setImageFailed(true)}
      />
    </div>
  )

  if (!onClick) {
    return shell
  }

  return (
    <button type="button" onClick={onClick} className="bg-transparent border-0 p-0">
      {shell}
    </button>
  )
}

function ScopedCompanySessionBanner({
  companyName,
  activeRole,
  onSwitchRole,
  onExit,
  switchingCompanySession,
  exitingCompanySession,
  t,
}) {
  const roles = ['admin', 'comptable', 'rep']

  return (
    <div
      className="mb-5 rounded-[28px] px-4 py-4"
      style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.10), rgba(59,130,246,0.08))', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.14)' }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-color">
            {t('developerWorkspace.sessionActions.activeLabel', { company: companyName || t('common.notAvailable') })}
          </div>
          <div className="mt-1 text-sm text-secondary-color">
            {t(`badges.roles.${activeRole || 'admin'}`)} · {t('developerWorkspace.launcher.fixedOneHour')}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {roles.map((role) => {
            const busy = switchingCompanySession && role === activeRole

            return (
              <button
                key={role}
                type="button"
                onClick={() => onSwitchRole(role)}
                disabled={switchingCompanySession || exitingCompanySession}
                className="rounded-full px-3 py-2 text-xs font-semibold transition-colors"
                style={role === activeRole
                  ? { background: 'rgba(13,148,136,0.14)', color: '#0f766e' }
                  : { background: '#ffffffcc', color: 'var(--text-secondary)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.16)' }}
              >
                {busy ? t('developerWorkspace.launcher.starting') : t(`badges.roles.${role}`)}
              </button>
            )
          })}

          <button
            type="button"
            onClick={onExit}
            disabled={switchingCompanySession || exitingCompanySession}
            className="btn-secondary text-xs"
          >
            {exitingCompanySession
              ? <><i className="fa-solid fa-spinner fa-spin" /> {t('developerWorkspace.sessionActions.exiting')}</>
              : <><i className="fa-solid fa-arrow-left" /> {t('developerWorkspace.sessionActions.exit')}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function MobileDrawer({ open, onClose, onLogout, isAdmin, isFinance, isDeveloper, statusLabel, appDisplayName, user }) {
  const { t } = useI18n()

  if (!open) {
    return null
  }

  const mobileCoreNav = CORE_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const mobileFinanceNav = FINANCE_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const mobileOperationsNav = OPERATIONS_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const mobileSupportNav = SUPPORT_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const mobileDeveloperNav = DEVELOPER_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))

  return (
    <div className="fixed inset-0 z-50 md:hidden no-print">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-80 rail flex flex-col animate-slide-in shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BrandMark
              user={user}
              title={appDisplayName}
              shellClassName="w-8 h-8 rounded-lg bg-white/95 flex items-center justify-center shadow"
              imageClassName="w-5 h-5 object-contain"
            />
            <div>
              <div className="text-sm font-bold text-white">{appDisplayName}</div>
              <div className="text-xs" style={{ color: 'var(--rail-text)' }}>{statusLabel}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-4">
          <NavLink
            to="/"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-teal-600/30 text-teal-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <i className="fa-solid fa-chart-pie w-4 text-center" />
            {t('layout.nav.dashboard')}
          </NavLink>

          <div>
            <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>{t('layout.sections.core')}</div>
            <div className="space-y-0.5">
              {mobileCoreNav.map((item) => (
                <RailLink key={item.to} {...item} expanded onClick={onClose} />
              ))}
            </div>
          </div>

          {(isFinance() || isAdmin()) && (
            <div>
              <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>{t('layout.sections.finance')}</div>
              <div className="space-y-0.5">
                {mobileFinanceNav.map((item) => (
                  <RailLink key={item.to} {...item} expanded onClick={onClose} />
                ))}
              </div>
            </div>
          )}

          {isAdmin() && (
            <>
              <div>
                <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>{t('layout.sections.operations')}</div>
                <div className="space-y-0.5">
                  {mobileOperationsNav.map((item) => (
                    <RailLink key={item.to} {...item} expanded onClick={onClose} />
                  ))}
                </div>
              </div>

              <div>
                <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>{t('layout.sections.assistance')}</div>
                <div className="space-y-0.5">
                  {mobileSupportNav.map((item) => (
                    <RailLink key={item.to} {...item} expanded onClick={onClose} />
                  ))}
                </div>
              </div>
            </>
          )}

          {isDeveloper() && (
            <div>
              <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>{t('layout.sections.developer')}</div>
              <div className="space-y-0.5">
                {mobileDeveloperNav.map((item) => (
                  <RailLink key={item.to} {...item} expanded onClick={onClose} />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-white/5 rounded-xl transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4" />
            {t('common.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const {
    user,
    logout,
    isAdmin,
    isFinance,
    isDeveloper,
    isScopedCompanySession,
    startCompanySession,
    endCompanySession,
    switchingCompanySession,
    exitingCompanySession,
    sessionContext,
  } = useAuth()
  const { t } = useI18n()
  const { toggle, isDark, toggleSidebarMode, isSidebarExpanded } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [systemStatus, setSystemStatus] = useState(DEFAULT_SYSTEM_STATUS)

  useEffect(() => {
    let active = true

    const loadSystemStatus = async () => {
      try {
        const response = await fetch('/api/v1/system/ping', {
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('ping_failed')
        }

        const payload = await response.json()

        if (!active) {
          return
        }

        setSystemStatus({
          state: 'online',
          dbOk: payload?.db_ok === true,
        })
      } catch {
        if (!active) {
          return
        }

        setSystemStatus({
          state: 'offline',
          dbOk: false,
        })
      }
    }

    loadSystemStatus()
    const interval = window.setInterval(loadSystemStatus, 60000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const pageKey = Object.keys(PAGE_TITLES).find((key) =>
    location.pathname === key || (key !== '/' && location.pathname.startsWith(`${key}/`))
  ) ?? '/'

  const pageInfo = PAGE_TITLES[pageKey] ?? PAGE_TITLES['/']
  const pageLabel = t(pageInfo.labelKey)
  const topbarAllowsAll = TOPBAR_ALLOW_ALL_PATHS.has(pageKey)
  const isDeveloperWorkspacePage = isDeveloper() && DEVELOPER_WORKSPACE_PATHS.has(pageKey)
  const {
    depots: topbarDepots,
    loading: topbarDepotsLoading,
    selectedValue: topbarDepotValue,
    setSelectedValue: setTopbarDepotValue,
    selectedDepot: topbarSelectedDepot,
    canSelectAll: topbarCanSelectAll,
  } = useDepots({
    allowAll: topbarAllowsAll,
    defaultToAll: topbarAllowsAll,
    storageKey: 'app-depot-scope',
    enabled: Boolean(user) && !isDeveloperWorkspacePage,
  })
  const statusLabel = getSystemStatusLabel(systemStatus, t)
  const canSeeDepotScope = isDeveloper() && !isDeveloperWorkspacePage
  const activeCompanyName = isDeveloperWorkspacePage
    ? (user?.company?.name ?? null)
    : (topbarSelectedDepot?.company?.name ?? user?.company?.name ?? null)
  const appDisplayName = buildAppDisplayName(user, activeCompanyName, t('app.name'))
  const scopedCompanyId = sessionContext?.company_id ?? user?.company?.id ?? null
  const scopedRole = sessionContext?.acting_role ?? user?.role ?? 'admin'

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.title = `${pageLabel} | ${appDisplayName}`
    setMetaContent('application-name', appDisplayName)
    setMetaContent('apple-mobile-web-app-title', appDisplayName)
    setMetaContent('description', `${pageLabel} - ${appDisplayName}`)
  }, [appDisplayName, pageLabel])

  useEffect(() => {
    setLinkHref('link[rel="icon"]', resolveUserBrandLogo(user))
    setLinkHref('link[rel="apple-touch-icon"]', resolveUserBrandLogo(user))
  }, [user])

  const desktopCoreNav = CORE_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const desktopFinanceNav = FINANCE_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const desktopOperationsNav = OPERATIONS_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))
  const desktopDeveloperNav = DEVELOPER_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))

  const handleExitScopedSession = async () => {
    try {
      await endCompanySession()
      navigate('/developer')
    } catch {
      navigate('/login')
    }
  }

  const handleSwitchScopedRole = async (role) => {
    if (!scopedCompanyId) {
      return
    }

    try {
      await startCompanySession(scopedCompanyId, role)
    } catch {
      // leave the current session untouched when the switch fails
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <aside
        className={`hidden md:flex flex-col rail flex-shrink-0 py-3 gap-3 border-r no-print ${isSidebarExpanded ? 'expanded w-72 px-3' : 'compact w-16 px-2 items-center'}`}
        style={{ borderColor: 'var(--rail-border)' }}
      >
        <div className={`rail-brand${isSidebarExpanded ? ' expanded' : ''}`}>
          <BrandMark
            user={user}
            title={appDisplayName}
            onClick={() => navigate('/')}
            shellClassName="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shadow-lg cursor-pointer flex-shrink-0"
            imageClassName="w-7 h-7 object-contain"
          />
          {isSidebarExpanded && (
            <div className="min-w-0">
              <div className="rail-brand-title">{appDisplayName}</div>
              <div className="rail-brand-subtitle">
                <span className="app-version-label">v{APP_VERSION}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-0 w-full overflow-y-auto ${isSidebarExpanded ? 'overflow-x-hidden' : 'overflow-x-visible'}`}>
          <div className="space-y-4 pb-3">
            <NavSection title={t('layout.sections.core')} items={desktopCoreNav} expanded={isSidebarExpanded} />

            {(isFinance() || isAdmin()) && (
              <NavSection title={t('layout.sections.finance')} items={desktopFinanceNav} expanded={isSidebarExpanded} />
            )}

            {isAdmin() && (
              <NavSection title={t('layout.sections.operations')} items={desktopOperationsNav} expanded={isSidebarExpanded} />
            )}

            {isDeveloper() && (
              <NavSection title={t('layout.sections.developer')} items={desktopDeveloperNav} expanded={isSidebarExpanded} />
            )}
          </div>
        </div>

        {canSeeDepotScope && topbarDepots.length > 0 && (
          <div className={`w-full ${isSidebarExpanded ? 'pt-2 border-t' : ''}`} style={isSidebarExpanded ? { borderColor: 'var(--rail-border)' } : undefined}>
            {isSidebarExpanded ? (
              <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px var(--rail-border)' }}>
                <DepotScopeControls
                  depots={topbarDepots}
                  loading={topbarDepotsLoading}
                  selectedValue={topbarDepotValue}
                  onChange={setTopbarDepotValue}
                  label={t('layout.depotActive')}
                  allowAll={topbarAllowsAll}
                  canSelectAll={topbarCanSelectAll}
                  allLabel={t('layout.depotAll')}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleSidebarMode}
                className="rail-link"
                title={t('layout.depotActive')}
              >
                <i className="fa-solid fa-warehouse text-base" />
                <span className="rail-tooltip">{t('layout.depotActive')}</span>
              </button>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="topbar flex items-center gap-3 px-4 h-14 flex-shrink-0 z-10 no-print">
          <button className="md:hidden btn-ghost p-2" onClick={() => setDrawerOpen(true)}>
            <i className="fa-solid fa-bars text-base" />
          </button>
          <button
            className="hidden md:inline-flex btn-ghost p-2"
            onClick={toggleSidebarMode}
            title={isSidebarExpanded ? t('layout.theme.compact') : t('layout.theme.expanded')}
          >
            <i className={`fa-solid ${isSidebarExpanded ? 'fa-angles-left' : 'fa-angles-right'} text-base`} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="hidden md:flex w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 items-center justify-center flex-shrink-0">
              <i className={`${pageInfo.icon} text-teal-600 dark:text-teal-400`} style={{ fontSize: 12 }} />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <BrandMark
                user={user}
                title={appDisplayName}
                shellClassName="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shadow-sm"
                imageClassName="w-5 h-5 object-contain"
              />
              <span className="font-bold text-sm text-base-color truncate max-w-[180px]">{appDisplayName}</span>
            </div>
            <div className="min-w-0">
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-semibold text-base-color truncate">{pageLabel}</h1>
                {activeCompanyName && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: 'rgba(13,148,136,0.10)', color: '#0f766e' }}
                  >
                    {activeCompanyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <TopbarLink to="/help" icon="fa-solid fa-circle-question" label={t('common.help')} />
            <TopbarLink to="/bug-reports" icon="fa-solid fa-bug" label={t('common.support')} />
            <NotificationBell />
            {isAdmin() && (
              <NavLink
                to="/config"
                className={({ isActive }) =>
                  `btn-ghost p-2 ${isActive ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300' : ''}`
                }
                title={t('layout.nav.config')}
              >
                <i className="fa-solid fa-sliders text-base text-muted-color" />
              </NavLink>
            )}
            <button
              className="btn-ghost p-2"
              onClick={toggle}
              title={isDark ? t('layout.theme.light') : t('layout.theme.dark')}
            >
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-base text-muted-color`} />
            </button>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            {isScopedCompanySession() && (
              <ScopedCompanySessionBanner
                companyName={user?.company?.name}
                activeRole={scopedRole}
                onSwitchRole={(role) => { void handleSwitchScopedRole(role) }}
                onExit={() => { void handleExitScopedSession() }}
                switchingCompanySession={switchingCompanySession}
                exitingCompanySession={exitingCompanySession}
                t={t}
              />
            )}
            <Outlet />
          </div>
        </main>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isFinance={isFinance}
        isDeveloper={isDeveloper}
        statusLabel={statusLabel}
        appDisplayName={appDisplayName}
        user={user}
      />
    </div>
  )
}
