import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import { formatDepotLabel } from '../components/DepotScopeControls'
import { APP_VERSION } from '../config/appMeta'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ALL_DEPOTS_VALUE, useDepots } from '../hooks/useDepots'

const CORE_NAV = [
  { to: '/invoices', icon: 'fa-solid fa-file-invoice', label: 'Factures' },
  { to: '/customers', icon: 'fa-solid fa-users', label: 'Clients' },
  { to: '/products', icon: 'fa-solid fa-box-open', label: 'Produits' },
]

const FINANCE_NAV = [
  { to: '/credit', icon: 'fa-solid fa-credit-card', label: 'Crédit clients' },
  { to: '/expenses', icon: 'fa-solid fa-receipt', label: 'Dépenses' },
]

const OPERATIONS_NAV = [
  { to: '/routes', icon: 'fa-solid fa-truck-fast', label: 'Sorties journée' },
  { to: '/depot', icon: 'fa-solid fa-warehouse', label: 'Dépôt' },
  { to: '/camions', icon: 'fa-solid fa-truck', label: 'Camions' },
  { to: '/map', icon: 'fa-solid fa-map-location-dot', label: 'Carte et terrain' },
  { to: '/inventory', icon: 'fa-solid fa-clipboard-list', label: 'Inventaire' },
  { to: '/reports', icon: 'fa-solid fa-chart-line', label: 'Rapports' },
  { to: '/data-tools', icon: 'fa-solid fa-file-arrow-up', label: 'Imports / exports' },
]

const SUPPORT_NAV = [
  { to: '/help', icon: 'fa-solid fa-circle-question', label: 'Aide' },
  { to: '/notifications-center', icon: 'fa-solid fa-bell', label: 'Notifications' },
  { to: '/bug-reports', icon: 'fa-solid fa-bug', label: 'Support et signalements' },
]

const DEVELOPER_NAV = [
  { to: '/developer-tools', icon: 'fa-solid fa-code', label: 'Outils developpeur' },
]

const DEFAULT_SYSTEM_STATUS = {
  state: 'checking',
  dbOk: null,
}

const PAGE_TITLES = {
  '/': { label: 'Tableau de bord', icon: 'fa-solid fa-chart-pie' },
  '/invoices': { label: 'Factures', icon: 'fa-solid fa-file-invoice' },
  '/customers': { label: 'Clients', icon: 'fa-solid fa-users' },
  '/products': { label: 'Produits', icon: 'fa-solid fa-box-open' },
  '/credit': { label: 'Crédit clients', icon: 'fa-solid fa-credit-card' },
  '/expenses': { label: 'Dépenses', icon: 'fa-solid fa-receipt' },
  '/routes': { label: 'Sorties journée', icon: 'fa-solid fa-truck-fast' },
  '/depot': { label: 'Dépôt', icon: 'fa-solid fa-warehouse' },
  '/camions': { label: 'Camions', icon: 'fa-solid fa-truck' },
  '/reports': { label: 'Rapports', icon: 'fa-solid fa-chart-line' },
  '/users': { label: 'Utilisateurs', icon: 'fa-solid fa-user-gear' },
  '/zones': { label: 'Zones et tarifs', icon: 'fa-solid fa-map-location-dot' },
  '/config': { label: 'Configuration', icon: 'fa-solid fa-sliders' },
  '/map': { label: 'Carte et terrain', icon: 'fa-solid fa-map-location-dot' },
  '/inventory': { label: 'Inventaire', icon: 'fa-solid fa-clipboard-list' },
  '/data-tools': { label: 'Imports / exports', icon: 'fa-solid fa-file-arrow-up' },
  '/import': { label: 'Imports / exports', icon: 'fa-solid fa-file-arrow-up' },
  '/export': { label: 'Imports / exports', icon: 'fa-solid fa-file-arrow-up' },
  '/help': { label: 'Aide et documentation', icon: 'fa-solid fa-circle-question' },
  '/notifications-center': { label: 'Centre de notifications', icon: 'fa-solid fa-bell' },
  '/bug-reports': { label: 'Support et signalements', icon: 'fa-solid fa-bug' },
  '/developer-tools': { label: 'Outils developpeur', icon: 'fa-solid fa-code' },
}

const TOPBAR_ALLOW_ALL_PATHS = new Set(['/', '/credit', '/expenses', '/invoices', '/reports', '/routes', '/users'])

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

function HeaderDepotScopeControl({
  depots,
  loading,
  selectedValue,
  selectedDepot,
  onChange,
  allowAll,
  canSelectAll,
}) {
  const singleDepot = depots.length === 1 ? depots[0] : null
  const selectedLabel = singleDepot
    ? formatDepotLabel(singleDepot)
    : selectedValue === ALL_DEPOTS_VALUE && allowAll && canSelectAll
      ? 'Tous les depots'
      : formatDepotLabel(selectedDepot) || formatDepotLabel(depots[0]) || 'Depot non defini'

  if (!loading && depots.length === 0) {
    return null
  }

  if (depots.length <= 1) {
    return (
      <div
        className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme min-w-[170px]"
        style={{ background: 'var(--surface-2)' }}
        title={selectedLabel}
      >
        <i className="fa-solid fa-warehouse text-[11px] text-muted-color" />
        <span className="text-xs font-semibold text-base-color truncate">{loading ? 'Chargement...' : selectedLabel}</span>
      </div>
    )
  }

  return (
    <div
      className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-theme"
      style={{ background: 'var(--surface-2)' }}
    >
      <i className="fa-solid fa-warehouse text-[11px] text-muted-color" />
      <select
        value={selectedValue}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={loading}
        aria-label="Depot actif"
        className="min-w-[180px] border-0 bg-transparent px-0 py-0 text-xs font-semibold shadow-none focus:outline-none"
        style={{ background: 'transparent' }}
      >
        {allowAll && canSelectAll && (
          <option value={ALL_DEPOTS_VALUE}>Tous les depots</option>
        )}
        {depots.map((depot) => (
          <option key={depot.id} value={String(depot.id)}>
            {formatDepotLabel(depot)}
          </option>
        ))}
      </select>
    </div>
  )
}
function getSystemStatusLabel(systemStatus) {
  if (systemStatus.state === 'online') {
    return systemStatus.dbOk ? 'API en ligne - base OK' : 'API en ligne - base à vérifier'
  }

  if (systemStatus.state === 'offline') {
    return 'API hors ligne - vérifiez la connexion'
  }

  return "Vérification de l'API en cours"
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
        onClick={() => setOpen((value) => !value)}
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
        <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-theme rounded-xl shadow-md z-50 py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-theme">
            <div className="text-sm font-semibold text-base-color">{user?.name}</div>
            <div className="text-xs text-muted-color">{user?.email}</div>
          </div>
          <NavLink
            to="/notifications-center"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
          >
            <i className="fa-solid fa-bell w-4" />
            Notifications
          </NavLink>
          <NavLink
            to="/bug-reports"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
          >
            <i className="fa-solid fa-bug w-4" />
            Support et signalements
          </NavLink>
          {user?.role === 'developer' && (
            <NavLink
              to="/developer-tools"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors"
            >
              <i className="fa-solid fa-code w-4" />
              Outils developpeur
            </NavLink>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}

function MobileDrawer({ open, onClose, onLogout, isAdmin, isFinance, isDeveloper, statusLabel }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden no-print">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-80 rail flex flex-col animate-slide-in shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow">
              <i className="fa-solid fa-droplet text-white text-sm" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">El Irtiwaa</div>
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
            Tableau de bord
          </NavLink>

          <div>
            <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>Exploitation</div>
            <div className="space-y-0.5">
              {CORE_NAV.map((item) => (
                <RailLink key={item.to} {...item} expanded onClick={onClose} />
              ))}
            </div>
          </div>

          {(isFinance() || isAdmin()) && (
            <div>
              <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>Finance</div>
              <div className="space-y-0.5">
                {FINANCE_NAV.map((item) => (
                  <RailLink key={item.to} {...item} expanded onClick={onClose} />
                ))}
              </div>
            </div>
          )}

          {isAdmin() && (
            <>
              <div>
                <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>Terrain et stock</div>
                <div className="space-y-0.5">
                  {OPERATIONS_NAV.map((item) => (
                    <RailLink key={item.to} {...item} expanded onClick={onClose} />
                  ))}
                </div>
              </div>

              <div>
                <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>Assistance</div>
                <div className="space-y-0.5">
                  {SUPPORT_NAV.map((item) => (
                    <RailLink key={item.to} {...item} expanded onClick={onClose} />
                  ))}
                </div>
              </div>
            </>
          )}

          {isDeveloper() && (
            <div>
              <div className="section-label" style={{ color: 'rgba(148,163,184,0.6)' }}>Developpement</div>
              <div className="space-y-0.5">
                {DEVELOPER_NAV.map((item) => (
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
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { user, logout, isAdmin, isFinance, isDeveloper } = useAuth()
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
  const topbarAllowsAll = TOPBAR_ALLOW_ALL_PATHS.has(pageKey)
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
    enabled: Boolean(user),
  })
  const statusLabel = getSystemStatusLabel(systemStatus)

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <aside
        className={`hidden md:flex flex-col rail flex-shrink-0 py-3 gap-3 border-r no-print ${isSidebarExpanded ? 'expanded w-72 px-3' : 'compact w-16 px-2 items-center'}`}
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
              <div className="rail-brand-subtitle">
                <span className="app-version-label">v{APP_VERSION}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-0 w-full overflow-y-auto ${isSidebarExpanded ? 'overflow-x-hidden' : 'overflow-x-visible'}`}>
          <div className="space-y-4 pb-3">
            <NavSection title="Exploitation" items={CORE_NAV} expanded={isSidebarExpanded} />

            {(isFinance() || isAdmin()) && (
              <NavSection title="Finance" items={FINANCE_NAV} expanded={isSidebarExpanded} />
            )}

            {isAdmin() && (
              <>
                <NavSection title="Terrain et stock" items={OPERATIONS_NAV} expanded={isSidebarExpanded} />
              </>
            )}

            {isDeveloper() && (
              <NavSection title="Developpement" items={DEVELOPER_NAV} expanded={isSidebarExpanded} />
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="topbar flex items-center gap-3 px-4 h-14 flex-shrink-0 z-10 no-print">
          <button className="md:hidden btn-ghost p-2" onClick={() => setDrawerOpen(true)}>
            <i className="fa-solid fa-bars text-base" />
          </button>
          <button
            className="hidden md:inline-flex btn-ghost p-2"
            onClick={toggleSidebarMode}
            title={isSidebarExpanded ? 'Mode compact' : 'Mode étendu'}
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
            <div className="min-w-0">
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-semibold text-base-color truncate">{pageInfo.label}</h1>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <TopbarLink to="/help" icon="fa-solid fa-circle-question" label="Aide" />
            <TopbarLink to="/bug-reports" icon="fa-solid fa-bug" label="Support" />
            <HeaderDepotScopeControl
              depots={topbarDepots}
              loading={topbarDepotsLoading}
              selectedValue={topbarDepotValue}
              selectedDepot={topbarSelectedDepot}
              onChange={setTopbarDepotValue}
              allowAll={topbarAllowsAll}
              canSelectAll={topbarCanSelectAll}
            />
            <NotificationBell />
            {isAdmin() && (
              <NavLink
                to="/config"
                className={({ isActive }) =>
                  `btn-ghost p-2 ${isActive ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300' : ''}`
                }
                title="Configuration"
              >
                <i className="fa-solid fa-sliders text-base text-muted-color" />
              </NavLink>
            )}
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
      />
    </div>
  )
}
