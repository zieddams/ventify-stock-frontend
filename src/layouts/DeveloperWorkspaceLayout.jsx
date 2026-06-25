import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import { APP_VERSION } from '../config/appMeta'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import { DEFAULT_APP_MARK } from '../utils/branding'

const OPS_CONSOLE_URL = 'https://ops.irtiwaa.ziedtech.com/'

const DEVELOPER_NAV = [
  { to: '/developer', icon: 'fa-solid fa-compass-drafting', labelKey: 'developerWorkspace.nav.dashboard' },
  { to: '/companies', icon: 'fa-solid fa-buildings', labelKey: 'layout.nav.companies' },
  { to: '/developer-tools', icon: 'fa-solid fa-screwdriver-wrench', labelKey: 'layout.nav.developerTools' },
  { to: '/notifications-center', icon: 'fa-solid fa-bell', labelKey: 'layout.nav.notificationsCenter' },
  { to: '/bug-reports', icon: 'fa-solid fa-bug', labelKey: 'layout.nav.bugReports' },
]

const PAGE_META = {
  '/developer': {
    titleKey: 'developerWorkspace.page.dashboardTitle',
    subtitleKey: 'developerWorkspace.page.dashboardSubtitle',
  },
  '/companies': {
    titleKey: 'companiesPage.page.title',
    subtitleKey: 'companiesPage.page.subtitle',
  },
  '/developer-tools': {
    titleKey: 'developerToolsPage.page.title',
    subtitleKey: 'developerToolsPage.page.subtitle',
  },
  '/notifications-center': {
    titleKey: 'layout.nav.notificationsCenter',
    subtitleKey: 'developerWorkspace.page.supportSubtitle',
  },
  '/bug-reports': {
    titleKey: 'layout.nav.bugReports',
    subtitleKey: 'developerWorkspace.page.supportSubtitle',
  },
}

function WorkspaceLink({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
            : 'text-secondary-color hover:bg-surface-2 hover:text-base-color'
        }`
      }
    >
      <i className={item.icon} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function DeveloperWorkspaceLayout() {
  const { user, logout } = useAuth()
  const { t, locale, savingLocale, setLocale, supportedLocales } = useI18n()
  const { toggle, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const pageKey = Object.keys(PAGE_META).find((key) =>
    location.pathname === key || (key !== '/developer' && location.pathname.startsWith(`${key}/`))
  ) ?? '/developer'
  const pageMeta = PAGE_META[pageKey]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div
      className="min-h-screen bg-app md:flex"
      style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(13,148,136,0.10), transparent 26%), radial-gradient(circle at bottom left, rgba(59,130,246,0.08), transparent 24%)' }}
    >
      <aside
        className="hidden md:flex w-80 flex-col border-r px-5 py-5"
        style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.58)', backdropFilter: 'blur(18px)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/developer')}
          className="flex items-center gap-3 rounded-[28px] px-3 py-3 text-left transition-colors hover:bg-surface-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
            <img src={DEFAULT_APP_MARK} alt={t('developerWorkspace.brand')} className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color">
              {t('developerWorkspace.eyebrow')}
            </div>
            <div className="truncate text-base font-semibold text-base-color">{t('developerWorkspace.brand')}</div>
            <div className="mt-1 text-xs text-secondary-color">v{APP_VERSION}</div>
          </div>
        </button>

        <div
          className="mt-5 rounded-[28px] px-4 py-4"
          style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.14), rgba(59,130,246,0.10))', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.12)' }}
        >
          <div className="text-sm font-semibold text-base-color">{user?.name}</div>
          <div className="mt-1 text-xs text-secondary-color">{user?.email}</div>
          <div className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.72)', color: '#0f766e' }}>
            {t('developerWorkspace.sessionLabel')}
          </div>
        </div>

        <div
          className="mt-4 rounded-[28px] px-4 py-4"
          style={{ background: 'rgba(15,23,42,0.04)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.14)' }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
            {t('developerWorkspace.hero.eyebrow')}
          </div>
          <div className="mt-2 text-sm text-secondary-color">
            {t('developerWorkspace.policy.items.session')}
          </div>
          <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-secondary mt-4 w-full justify-center text-xs">
            <i className="fa-solid fa-tower-broadcast" /> {t('developerWorkspace.quickActions.opsConsole')}
          </a>
        </div>

        <nav className="mt-5 space-y-2">
          {DEVELOPER_NAV.map((item) => (
            <WorkspaceLink key={item.to} item={{ ...item, label: t(item.labelKey) }} />
          ))}
        </nav>

        <div className="mt-auto space-y-4 rounded-[28px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
              {t('layout.userMenu.language')}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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

          <button onClick={handleLogout} className="btn-danger w-full justify-center text-sm">
            <i className="fa-solid fa-right-from-bracket" /> {t('common.logout')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b px-4 py-4 md:px-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap items-start gap-4 md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color">
                {t('developerWorkspace.eyebrow')}
              </div>
              <h1 className="mt-1 truncate text-xl font-bold text-base-color">{t(pageMeta.titleKey)}</h1>
              <p className="mt-1 max-w-3xl text-sm text-secondary-color">{t(pageMeta.subtitleKey)}</p>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-secondary hidden sm:inline-flex text-xs">
                <i className="fa-solid fa-tower-broadcast" /> {t('developerWorkspace.quickActions.opsConsole')}
              </a>
              <button
                className="btn-ghost p-2"
                onClick={toggle}
                title={isDark ? t('layout.theme.light') : t('layout.theme.dark')}
              >
                <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-base text-muted-color`} />
              </button>
              <button onClick={handleLogout} className="btn-secondary text-xs">
                <i className="fa-solid fa-right-from-bracket" /> <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto md:hidden">
            {DEVELOPER_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                      : 'bg-surface-2 text-secondary-color'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
