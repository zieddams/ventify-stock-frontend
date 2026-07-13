import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import UserMenu from '../components/UserMenu'
import { APP_VERSION } from '../config/appMeta'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import { DEFAULT_APP_MARK, applyDocumentBranding, resolveUserBrandLogo } from '../utils/branding'

// Invoice/customer pages are the SAME shared pages the main business workspace
// uses (not forked copies under /pos/*), so their internal links (row links,
// "new invoice" button, post-creation redirect) resolve correctly - they are
// hard-coded to these exact top-level paths.
const POS_NAV = [
  { to: '/pos', icon: 'fa-solid fa-chart-pie', labelKey: 'posWorkspace.nav.dashboard' },
  { to: '/invoices/create', icon: 'fa-solid fa-cash-register', labelKey: 'posWorkspace.nav.sell' },
  { to: '/invoices', icon: 'fa-solid fa-file-invoice', labelKey: 'posWorkspace.nav.invoices' },
  { to: '/customers', icon: 'fa-solid fa-users', labelKey: 'posWorkspace.nav.customers' },
  { to: '/pos/stock', icon: 'fa-solid fa-boxes-stacked', labelKey: 'posWorkspace.nav.stock' },
]

// Plain-prefix matching breaks down twice over in this nav: "/invoices" is a
// prefix of "/invoices/create" (would double-highlight "Ventes" and "Nouvelle
// vente" together), and "/pos" is a prefix of "/pos/stock" (would double-
// highlight "Tableau de bord" and "Stock" together). Every item other than
// "Ventes" has no sub-routes in this workspace, so exact matching is correct
// for them; "Ventes" alone gets prefix matching, to also cover invoice detail
// pages, explicitly excluding the create page.
function isNavItemActive(item, pathname) {
  if (item.to === '/invoices') {
    return pathname === '/invoices' || (pathname.startsWith('/invoices/') && pathname !== '/invoices/create')
  }

  return pathname === item.to
}

function NavItem({ item, label, active, onClick }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
          : 'text-secondary-color hover:bg-surface-2 hover:text-base-color'
      }`}
    >
      <i className={item.icon} />
      <span>{label}</span>
    </Link>
  )
}

export default function PosWorkspaceLayout() {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const { toggle, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const appDisplayName = user?.company?.name || t('app.name')
  const posName = user?.depot?.name || t('posWorkspace.fallbackName')

  const activeItem = POS_NAV.find((item) => isNavItemActive(item, location.pathname)) ?? POS_NAV[0]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    applyDocumentBranding({
      title: `${t(activeItem.labelKey)} | ${posName}`,
      appName: appDisplayName,
      description: posName,
      iconHref: resolveUserBrandLogo(user),
    })
  }, [activeItem.labelKey, appDisplayName, posName, t, user])

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <aside
        className="hidden md:flex w-72 flex-shrink-0 flex-col border-r px-4 py-5"
        style={{ borderColor: 'var(--rail-border)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/pos')}
          className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 shadow">
            <img src={resolveUserBrandLogo(user)} alt={appDisplayName} className="h-7 w-7 object-contain" onError={(event) => { event.currentTarget.src = DEFAULT_APP_MARK }} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-base-color">{appDisplayName}</div>
            <div className="mt-0.5 truncate text-xs text-muted-color">{posName}</div>
          </div>
        </button>

        <div className="mt-4 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(13,148,136,0.10)', color: '#0f766e' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider">{t('posWorkspace.badge')}</div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {POS_NAV.map((item) => (
            <NavItem key={item.to} item={item} label={t(item.labelKey)} active={isNavItemActive(item, location.pathname)} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t pt-3" style={{ borderColor: 'var(--rail-border)' }}>
          <div className="px-2 text-xs text-muted-color truncate">{user?.name}</div>
          <button onClick={handleLogout} className="btn-secondary w-full justify-center text-xs">
            <i className="fa-solid fa-right-from-bracket" /> {t('common.logout')}
          </button>
          <div className="px-2 text-[11px] text-muted-color">v{APP_VERSION}</div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="topbar flex items-center gap-3 px-4 h-14 flex-shrink-0 z-10 no-print">
          <button className="md:hidden btn-ghost p-2" onClick={() => setDrawerOpen(true)}>
            <i className="fa-solid fa-bars text-base" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-base-color truncate">{t(activeItem.labelKey)}</h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button className="btn-ghost p-2" onClick={toggle} title={isDark ? t('layout.theme.light') : t('layout.theme.dark')}>
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-base text-muted-color`} />
            </button>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 rail flex flex-col p-4 animate-slide-in shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-white">{appDisplayName}</div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>
            <nav className="space-y-1">
              {POS_NAV.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  label={t(item.labelKey)}
                  active={isNavItemActive(item, location.pathname)}
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
            </nav>
            <button onClick={handleLogout} className="btn-secondary w-full justify-center text-xs mt-auto">
              <i className="fa-solid fa-right-from-bracket" /> {t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
