import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import { APP_VERSION } from '../config/appMeta'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { DEFAULT_APP_MARK, applyDocumentBranding } from '../utils/branding'
import { DEVELOPER_WORKSPACE_COPY as copy } from '../pages/developer/developerWorkspaceCopy'

const OPS_CONSOLE_URL = 'https://ops.irtiwaa.ziedtech.com/'
const COMPANY_NAV_ICON = 'fa-solid fa-building'

const DEVELOPER_NAV = [
  { to: '/developer', icon: 'fa-solid fa-compass-drafting', label: copy.nav.dashboard },
  { to: '/live-data', icon: 'fa-solid fa-wave-square', label: copy.nav.liveData },
  { to: '/elements', icon: 'fa-solid fa-calendar-days', label: copy.nav.elements },
  { to: '/companies', icon: COMPANY_NAV_ICON, label: copy.nav.companies },
  { to: '/developer-tools', icon: 'fa-solid fa-screwdriver-wrench', label: copy.nav.tools },
  { to: '/profile', icon: 'fa-solid fa-user-pen', label: copy.nav.profile },
  { to: '/notifications-center', icon: 'fa-solid fa-bell', label: copy.nav.notifications },
  { to: '/bug-reports', icon: 'fa-solid fa-bug', label: copy.nav.support },
]

const PAGE_META = copy.pageMeta

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
  const { toggle, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const pageKey = Object.keys(PAGE_META).find((key) =>
    location.pathname === key || (key !== '/developer' && location.pathname.startsWith(`${key}/`))
  ) ?? '/developer'
  const pageMeta = PAGE_META[pageKey]
  const workspaceBrand = copy.brand
  const pageTitle = pageMeta.title
  const pageSubtitle = pageMeta.subtitle
  const sidebarShellStyle = isDark
    ? { borderColor: 'rgba(148,163,184,0.12)', background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(20px)' }
    : { borderColor: 'var(--border)', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)' }
  const profileShellStyle = isDark
    ? { background: 'linear-gradient(135deg, rgba(13,148,136,0.18), rgba(59,130,246,0.16))', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,0.14)' }
    : { background: 'linear-gradient(135deg, rgba(13,148,136,0.14), rgba(59,130,246,0.10))', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.12)' }
  const footerShellStyle = isDark
    ? { background: 'rgba(15,23,42,0.52)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }
    : { background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }
  const brandMarkShellStyle = isDark
    ? { background: 'rgba(15,23,42,0.76)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.14)' }
    : { background: 'rgba(255,255,255,0.94)', boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }
  const sessionChipStyle = isDark
    ? { background: 'rgba(13,148,136,0.18)', color: '#99f6e4', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,0.16)' }
    : { background: 'rgba(255,255,255,0.82)', color: '#0f766e' }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    applyDocumentBranding({
      title: `${pageTitle} | ${workspaceBrand}`,
      appName: workspaceBrand,
      description: pageSubtitle,
      iconHref: DEFAULT_APP_MARK,
    })
  }, [pageSubtitle, pageTitle, workspaceBrand])

  return (
    <div
      className="min-h-screen bg-app md:flex"
      style={isDark
        ? { backgroundImage: 'radial-gradient(circle at top right, rgba(13,148,136,0.18), transparent 26%), radial-gradient(circle at bottom left, rgba(59,130,246,0.14), transparent 24%)' }
        : { backgroundImage: 'radial-gradient(circle at top right, rgba(13,148,136,0.10), transparent 26%), radial-gradient(circle at bottom left, rgba(59,130,246,0.08), transparent 24%)' }}
    >
      <aside
        className="hidden md:flex w-80 flex-col border-r px-5 py-5"
        style={sidebarShellStyle}
      >
        <button
          type="button"
          onClick={() => navigate('/developer')}
          className="flex items-center gap-3 rounded-[28px] px-3 py-3 text-left transition-colors hover:bg-surface-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl" style={brandMarkShellStyle}>
            <img src={DEFAULT_APP_MARK} alt={copy.brand} className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color">
              {copy.brandEyebrow}
            </div>
            <div className="truncate text-base font-semibold text-base-color">{workspaceBrand}</div>
            <div className="mt-1 text-xs text-secondary-color">v{APP_VERSION}</div>
          </div>
        </button>

        <div
          className="mt-5 rounded-[28px] px-4 py-4"
          style={profileShellStyle}
        >
          <div className="text-sm font-semibold text-base-color">{user?.name}</div>
          <div className="mt-1 text-xs text-secondary-color">{user?.email}</div>
          <div className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold" style={sessionChipStyle}>
            {copy.sessionLabel}
          </div>
        </div>

        <nav className="mt-5 space-y-2">
          {DEVELOPER_NAV.map((item) => (
            <WorkspaceLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto space-y-3 rounded-[28px] px-4 py-4" style={footerShellStyle}>
          <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center text-xs">
            <i className="fa-solid fa-tower-broadcast" /> {copy.layout.ops}
          </a>
          <button onClick={handleLogout} className="btn-danger w-full justify-center text-sm">
            <i className="fa-solid fa-right-from-bracket" /> {copy.layout.logout}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b px-4 py-4 md:px-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap items-start gap-4 md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color">
                {copy.brandEyebrow}
              </div>
              <h1 className="mt-1 truncate text-xl font-bold text-base-color">{pageTitle}</h1>
              <p className="mt-1 max-w-3xl text-sm text-secondary-color">{pageSubtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-secondary hidden sm:inline-flex text-xs">
                <i className="fa-solid fa-tower-broadcast" /> {copy.layout.ops}
              </a>
              <button
                className="btn-ghost p-2"
                onClick={toggle}
                title={isDark ? copy.layout.lightTheme : copy.layout.darkTheme}
              >
                <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-base text-muted-color`} />
              </button>
              <button onClick={handleLogout} className="btn-secondary text-xs">
                <i className="fa-solid fa-right-from-bracket" /> <span className="hidden sm:inline">{copy.layout.logout}</span>
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
                {item.label}
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
