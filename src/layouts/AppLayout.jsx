import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { APP_VERSION } from '../config/appMeta'

const MAIN_NAV = [
  { to: '/', icon: 'fa-solid fa-chart-pie', label: 'Tableau de bord', exact: true },
  { to: '/invoices', icon: 'fa-solid fa-file-invoice', label: 'Factures' },
  { to: '/customers', icon: 'fa-solid fa-users', label: 'Clients' },
  { to: '/products', icon: 'fa-solid fa-box-open', label: 'Produits' },
]

const FINANCE_NAV = [
  { to: '/credit', icon: 'fa-solid fa-credit-card', label: 'Credit clients' },
  { to: '/expenses', icon: 'fa-solid fa-receipt', label: 'Depenses' },
]

const ADMIN_NAV = [
  { to: '/routes', icon: 'fa-solid fa-truck-fast', label: 'Sorties journee' },
  { to: '/depot', icon: 'fa-solid fa-warehouse', label: 'Depot' },
  { to: '/camions', icon: 'fa-solid fa-truck', label: 'Camions' },
  { to: '/map', icon: 'fa-solid fa-map-pin', label: 'Carte & terrain' },
  { to: '/inventory', icon: 'fa-solid fa-clipboard-list', label: 'Inventaire' },
  { to: '/reports', icon: 'fa-solid fa-chart-line', label: 'Rapports' },
  { to: '/data-tools', icon: 'fa-solid fa-file-arrow-up', label: 'Import / Export' },
  { to: '/users', icon: 'fa-solid fa-user-gear', label: 'Utilisateurs' },
  { to: '/zones', icon: 'fa-solid fa-map-location-dot', label: 'Zones et tarifs' },
  { to: '/config', icon: 'fa-solid fa-sliders', label: 'Configuration' },
]

const PAGE_TITLES = {
  '/': { label: 'Tableau de bord', icon: 'fa-solid fa-chart-pie' },
  '/invoices': { label: 'Factures', icon: 'fa-solid fa-file-invoice' },
  '/customers': { label: 'Clients', icon: 'fa-solid fa-users' },
  '/products': { label: 'Produits', icon: 'fa-solid fa-box-open' },
  '/credit': { label: 'Credit clients', icon: 'fa-solid fa-credit-card' },
  '/expenses': { label: 'Depenses', icon: 'fa-solid fa-receipt' },
  '/routes': { label: 'Sorties journee', icon: 'fa-solid fa-truck-fast' },
  '/depot': { label: 'Depot', icon: 'fa-solid fa-warehouse' },
  '/camions': { label: 'Camions', icon: 'fa-solid fa-truck' },
  '/reports': { label: 'Rapports', icon: 'fa-solid fa-chart-line' },
  '/users': { label: 'Utilisateurs', icon: 'fa-solid fa-user-gear' },
  '/zones': { label: 'Zones et tarifs', icon: 'fa-solid fa-map-location-dot' },
  '/config': { label: 'Configuration', icon: 'fa-solid fa-sliders' },
  '/map': { label: 'Carte & terrain', icon: 'fa-solid fa-map-pin' },
  '/inventory': { label: 'Inventaire', icon: 'fa-solid fa-clipboard-list' },
  '/data-tools': { label: 'Import / Export', icon: 'fa-solid fa-file-arrow-up' },
  '/import': { label: 'Import / Export', icon: 'fa-solid fa-file-arrow-up' },
  '/export': { label: 'Import / Export', icon: 'fa-solid fa-file-arrow-up' },
}

function RailLink({ to, icon, label, exact, expanded = false }) {
  return (
    <NavLink
      to={to}
      end={exact}
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

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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
        onClick={() => setOpen(value => !value)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-surface-2"
        title={user?.name}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold shadow">
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-base-color leading-none">{user?.name}</div>
          <div className="text-xs text-muted-color capitalize leading-none mt-0.5">{user?.role}</div>
        </div>
        <i className="fa-solid fa-chevron-down text-muted-color" style={{ fontSize: 10 }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-theme rounded-xl shadow-md z-50 py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-theme">
            <div className="text-sm font-semibold text-base-color">{user?.name}</div>
            <div className="text-xs text-muted-color">{user?.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4" />
            Deconnexion
          </button>
        </div>
      )}
    </div>
  )
}

function MobileDrawer({ open, onClose, onLogout, isAdmin, isFinance }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden no-print">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 rail flex flex-col animate-slide-in shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow">
              <i className="fa-solid fa-droplet text-white text-sm" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">El Irtiwaa</div>
              <div className="text-xs" style={{ color: 'var(--rail-text)' }}>Gestion commerciale</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {MAIN_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-600/30 text-teal-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <i className={`${item.icon} w-4 text-center`} />
              {item.label}
            </NavLink>
          ))}

          {(isFinance() || isAdmin()) && (
            <>
              <div className="section-label mt-4" style={{ color: 'rgba(148,163,184,0.6)' }}>Finance</div>
              {FINANCE_NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-teal-600/30 text-teal-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <i className={`${item.icon} w-4 text-center`} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}

          {isAdmin() && (
            <>
              <div className="section-label mt-4" style={{ color: 'rgba(148,163,184,0.6)' }}>Administration</div>
              {ADMIN_NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-teal-600/30 text-teal-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <i className={`${item.icon} w-4 text-center`} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-white/5 rounded-xl transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4" />
            Deconnexion
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { user, logout, isAdmin, isFinance } = useAuth()
  const { toggle, isDark, toggleSidebarMode, isSidebarExpanded } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const pageKey = Object.keys(PAGE_TITLES).find(key =>
    location.pathname === key || (key !== '/' && location.pathname.startsWith(`${key}/`))
  ) ?? '/'

  const pageInfo = PAGE_TITLES[pageKey] ?? PAGE_TITLES['/']

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <aside
        className={`hidden md:flex flex-col rail flex-shrink-0 py-3 gap-1 border-r no-print${isSidebarExpanded ? ' expanded w-64 px-3' : ' compact w-16 items-center'}`}
        style={{ borderColor: 'var(--rail-border)' }}
      >
        <div className={`rail-brand${isSidebarExpanded ? ' expanded' : ''}`}>
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg cursor-pointer flex-shrink-0"
            onClick={() => navigate('/')}
            title="El Irtiwaa"
          >
            <i className="fa-solid fa-droplet text-white" />
          </div>
          {isSidebarExpanded && (
            <div className="min-w-0">
              <div className="rail-brand-title">El Irtiwaa</div>
              <div className="rail-brand-subtitle">Gestion commerciale</div>
            </div>
          )}
        </div>

        {isSidebarExpanded && <RailSectionTitle>Navigation</RailSectionTitle>}
        <RailDivider expanded={isSidebarExpanded} />
        {MAIN_NAV.map(item => <RailLink key={item.to} {...item} expanded={isSidebarExpanded} />)}

        {(isFinance() || isAdmin()) && (
          <>
            {isSidebarExpanded && <RailSectionTitle>Finance</RailSectionTitle>}
            <RailDivider expanded={isSidebarExpanded} />
            {FINANCE_NAV.map(item => <RailLink key={item.to} {...item} expanded={isSidebarExpanded} />)}
          </>
        )}

        {isAdmin() && (
          <>
            {isSidebarExpanded && <RailSectionTitle>Administration</RailSectionTitle>}
            <RailDivider expanded={isSidebarExpanded} />
            {ADMIN_NAV.map(item => <RailLink key={item.to} {...item} expanded={isSidebarExpanded} />)}
          </>
        )}

        <div className="mt-auto pb-2" />
        {isSidebarExpanded && (
          <div className="rail-footer">
            <div className="text-xs text-muted-color">Version web</div>
            <div className="rail-footer-version">v{APP_VERSION}</div>
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
            title={isSidebarExpanded ? 'Mode compact' : 'Mode etendu'}
          >
            <i className={`fa-solid ${isSidebarExpanded ? 'fa-angles-left' : 'fa-angles-right'} text-base`} />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="hidden md:flex w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 items-center justify-center flex-shrink-0">
              <i className={`${pageInfo.icon} text-teal-600 dark:text-teal-400`} style={{ fontSize: 12 }} />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <i className="fa-solid fa-droplet text-white text-xs" />
              </div>
              <span className="font-bold text-sm text-base-color">El Irtiwaa</span>
            </div>
            <h1 className="hidden md:block text-sm font-semibold text-base-color truncate">{pageInfo.label}</h1>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              className="btn-ghost p-2"
              onClick={toggle}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-base text-muted-color`} />
            </button>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
          <div className="px-6 pb-3 flex items-center justify-end gap-2 no-print">
            <span className="text-xs text-muted-color opacity-50">El Irtiwaa</span>
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                color: 'rgba(13,148,136,0.7)',
                background: 'rgba(13,148,136,0.06)',
                border: '1px solid rgba(13,148,136,0.12)',
              }}
            >
              v{APP_VERSION}
            </span>
          </div>
        </main>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isFinance={isFinance}
      />
    </div>
  )
}
