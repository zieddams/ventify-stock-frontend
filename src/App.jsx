import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { I18nProvider, useI18n } from './contexts/I18nContext'
import { usePosSession } from './contexts/PosSessionContext'
import { ThemeProvider } from './contexts/ThemeContext'
import MaintenanceBoundary from './components/MaintenanceBoundary'
import PosOpenSessionModal from './components/pos/PosOpenSessionModal'
import { PageLoader } from './components/Spinner'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DeveloperDashboard from './pages/developer/DeveloperDashboard'
import DeveloperElementsIndex from './pages/developer/DeveloperElementsIndex'
import DeveloperLiveDataIndex from './pages/developer/DeveloperLiveDataIndex'
import ProductsIndex from './pages/products/ProductsIndex'
import CustomersIndex from './pages/customers/CustomersIndex'
import InvoicesIndex from './pages/invoices/InvoicesIndex'
import InvoiceCreate from './pages/invoices/InvoiceCreate'
import InvoiceShow from './pages/invoices/InvoiceShow'
import DepotIndex from './pages/depot/DepotIndex'
import PosManagementIndex from './pages/pos/PosManagementIndex'
import PosDashboard from './pages/pos/PosDashboard'
import PosStockIndex from './pages/pos/PosStockIndex'
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard'
import StockOverviewIndex from './pages/supervisor/StockOverviewIndex'
import SupervisorReportsIndex from './pages/supervisor/SupervisorReportsIndex'
import CamionsIndex from './pages/camions/CamionsIndex'
import ReportsIndex from './pages/reports/ReportsIndex'
import UsersIndex from './pages/users/UsersIndex'
import EmployeesIndex from './pages/employees/EmployeesIndex'
import EmployeeDetail from './pages/employees/EmployeeDetail'
import SalaryRunsIndex from './pages/employees/SalaryRunsIndex'
import ZonesIndex from './pages/zones/ZonesIndex'
import CreditIndex from './pages/credit/CreditIndex'
import ConfigIndex from './pages/config/ConfigIndex'
import RouteSessionsIndex from './pages/routes/RouteSessionsIndex'
import ExpensesIndex from './pages/expenses/ExpensesIndex'
import InventaireIndex from './pages/inventory/InventaireIndex'
import DataToolsIndex from './pages/data-tools/DataToolsIndex'
import LiveMapIndex from './pages/map/LiveMapIndex'
import HelpCenterIndex from './pages/help/HelpCenterIndex'
import NotificationsCenterIndex from './pages/notifications/NotificationsCenterIndex'
import BugReportsIndex from './pages/support/BugReportsIndex'
import DeveloperToolsIndex from './pages/developer/DeveloperToolsIndex'
import CompaniesIndex from './pages/companies/CompaniesIndex'
import ProfileIndex from './pages/profile/ProfileIndex'
import { APP_BASE_PATH } from './utils/appPaths'
import { isAnyMapExperienceEnabled } from './utils/companyFeatures'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireBusinessWorkspace({ children }) {
  const { user, isDeveloperWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, isDeveloperWorkspace, isPosWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
  if (isPosWorkspace()) return <Navigate to="/pos" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function RequireFinance({ children }) {
  const { user, isDeveloperWorkspace, isPosWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
  if (isPosWorkspace()) return <Navigate to="/pos" replace />
  if (!['admin', 'comptable'].includes(user.role)) return <Navigate to="/" replace />
  return children
}

function RequireDeveloperWorkspace({ children }) {
  const { user, isDeveloperWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isDeveloperWorkspace()) return <Navigate to="/" replace />
  return children
}

function RequireSupervisor({ children }) {
  const { user, isSupervisor } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isSupervisor()) return <Navigate to="/" replace />
  return children
}

function RequirePosWorkspace({ children }) {
  const { user, isPosWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isPosWorkspace()) return <Navigate to="/" replace />
  return children
}

// Admin viewing Inventaire for one specific POS from the Points de vente list.
// depotName travels via navigate(..., { state }) for the nicer subtitle; a
// direct URL/refresh still works correctly (just without the name) since
// InventaireIndex only needs the id to scope every request.
function PosDepotInventoryRoute() {
  const { depotId } = useParams()
  const location = useLocation()
  return <InventaireIndex depotId={Number(depotId)} depotName={location.state?.depotName ?? null} />
}

// Only the pos role has a "sell" hard-gate - every other role renders
// children immediately, so this is a no-op for the rest of the app reusing
// this same route. Relies on PosWorkspaceLayout already providing
// PosSessionContext higher up the tree (it wraps its own <Outlet/>).
function RequirePosSessionOpen({ children }) {
  const { user, isPosWorkspace } = useAuth()
  const { t } = useI18n()
  const posSession = usePosSession()
  const [openModalVisible, setOpenModalVisible] = useState(false)

  if (!user) return <Navigate to="/login" replace />
  if (!isPosWorkspace()) return children
  if (posSession?.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="card py-10 px-8">
          <PageLoader />
        </div>
      </div>
    )
  }

  if (!posSession?.isOpen) {
    return (
      <>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="card py-10 px-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
              <i className="fa-solid fa-cash-register text-xl" />
            </div>
            <h2 className="text-lg font-bold text-base-color mb-2">{t('posWorkspace.sessionGate.title')}</h2>
            <p className="text-sm text-secondary-color mb-6">{t('posWorkspace.sessionGate.message')}</p>
            <button type="button" onClick={() => setOpenModalVisible(true)} className="btn-primary w-full justify-center">
              <i className="fa-solid fa-cash-register" /> {t('posWorkspace.sessionGate.action')}
            </button>
          </div>
        </div>
        <PosOpenSessionModal open={openModalVisible} onClose={() => setOpenModalVisible(false)} />
      </>
    )
  }

  return children
}

function RequireMapFeature({ children }) {
  const { user, isDeveloperWorkspace, isPosWorkspace } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
  if (isPosWorkspace()) return <Navigate to="/pos" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  if (!isAnyMapExperienceEnabled(user)) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          notice: {
            type: 'info',
            title: t('liveMapPage.page.disabledNoticeTitle'),
            message: t('liveMapPage.page.disabledNoticeMessage'),
            sourcePath: location.pathname,
          },
        }}
      />
    )
  }
  return children
}

function PublicOnly({ children }) {
  const { user, isDeveloperWorkspace, isPosWorkspace } = useAuth()
  if (user) return <Navigate to={isDeveloperWorkspace() ? '/developer' : isPosWorkspace() ? '/pos' : '/'} replace />
  return children
}

function HomeIndex() {
  const { isDeveloperWorkspace, isPosWorkspace, isSupervisor } = useAuth()

  if (isDeveloperWorkspace()) {
    return <Navigate to="/developer" replace />
  }

  if (isPosWorkspace()) {
    return <Navigate to="/pos" replace />
  }

  if (isSupervisor()) {
    return <Navigate to="/supervisor" replace />
  }

  return <Dashboard />
}

function AuthBootstrapGate({ children }) {
  const { user, loading } = useAuth()

  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="card py-10 px-8">
          <PageLoader />
        </div>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <I18nProvider>
      <BrowserRouter basename={APP_BASE_PATH}>
        <AuthBootstrapGate>
          <MaintenanceBoundary>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/" element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
                <Route index element={<HomeIndex />} />
                <Route path="developer" element={<RequireDeveloperWorkspace><DeveloperDashboard /></RequireDeveloperWorkspace>} />
                <Route path="live-data" element={<RequireDeveloperWorkspace><DeveloperLiveDataIndex /></RequireDeveloperWorkspace>} />
                <Route path="elements" element={<RequireDeveloperWorkspace><DeveloperElementsIndex /></RequireDeveloperWorkspace>} />
                <Route path="pos" element={<RequirePosWorkspace><PosDashboard /></RequirePosWorkspace>} />
                <Route path="pos/stock" element={<RequirePosWorkspace><PosStockIndex /></RequirePosWorkspace>} />
                <Route path="pos/inventory" element={<RequirePosWorkspace><InventaireIndex /></RequirePosWorkspace>} />
                <Route path="supervisor" element={<RequireSupervisor><SupervisorDashboard /></RequireSupervisor>} />
                <Route path="supervisor/stock" element={<RequireSupervisor><StockOverviewIndex /></RequireSupervisor>} />
                <Route path="supervisor/reports" element={<RequireSupervisor><SupervisorReportsIndex /></RequireSupervisor>} />
                <Route path="products" element={<RequireBusinessWorkspace><ProductsIndex /></RequireBusinessWorkspace>} />
                <Route path="customers" element={<RequireBusinessWorkspace><CustomersIndex /></RequireBusinessWorkspace>} />
                <Route path="invoices" element={<RequireBusinessWorkspace><InvoicesIndex /></RequireBusinessWorkspace>} />
                <Route path="invoices/create" element={<RequireBusinessWorkspace><RequirePosSessionOpen><InvoiceCreate /></RequirePosSessionOpen></RequireBusinessWorkspace>} />
                <Route path="invoices/:id" element={<RequireBusinessWorkspace><InvoiceShow /></RequireBusinessWorkspace>} />
                <Route path="depot" element={<RequireAdmin><DepotIndex /></RequireAdmin>} />
                <Route path="points-de-vente" element={<RequireAdmin><PosManagementIndex /></RequireAdmin>} />
                <Route path="points-de-vente/:depotId/inventory" element={<RequireAdmin><PosDepotInventoryRoute /></RequireAdmin>} />
                <Route path="camions" element={<RequireAdmin><CamionsIndex /></RequireAdmin>} />
                <Route path="reports" element={<RequireAdmin><ReportsIndex /></RequireAdmin>} />
                <Route path="users" element={<RequireAdmin><UsersIndex /></RequireAdmin>} />
                <Route path="zones" element={<RequireAdmin><ZonesIndex /></RequireAdmin>} />
                <Route path="credit"    element={<RequireFinance><CreditIndex /></RequireFinance>} />
                <Route path="expenses"  element={<RequireFinance><ExpensesIndex /></RequireFinance>} />
                <Route path="employees" element={<RequireFinance><EmployeesIndex /></RequireFinance>} />
                <Route path="employees/:employeeId" element={<RequireFinance><EmployeeDetail /></RequireFinance>} />
                <Route path="salary-runs" element={<RequireFinance><SalaryRunsIndex /></RequireFinance>} />
                <Route path="routes"    element={<RequireAdmin><RouteSessionsIndex /></RequireAdmin>} />
                <Route path="config"    element={<RequireAdmin><ConfigIndex /></RequireAdmin>} />
                <Route path="config/:sectionKey" element={<RequireAdmin><ConfigIndex /></RequireAdmin>} />
                <Route path="map"       element={<RequireMapFeature><LiveMapIndex /></RequireMapFeature>} />
                <Route path="inventory" element={<RequireAdmin><InventaireIndex /></RequireAdmin>} />
                <Route path="data-tools" element={<RequireAdmin><DataToolsIndex /></RequireAdmin>} />
                <Route path="companies" element={<RequireDeveloperWorkspace><CompaniesIndex /></RequireDeveloperWorkspace>} />
                <Route path="companies/:companyId" element={<RequireDeveloperWorkspace><CompaniesIndex /></RequireDeveloperWorkspace>} />
                <Route path="developer-tools" element={<RequireDeveloperWorkspace><DeveloperToolsIndex /></RequireDeveloperWorkspace>} />
                <Route path="help" element={<HelpCenterIndex />} />
                <Route path="notifications-center" element={<NotificationsCenterIndex />} />
                <Route path="bug-reports" element={<BugReportsIndex />} />
                <Route path="profile" element={<ProfileIndex />} />
                <Route path="import"    element={<Navigate to="/data-tools" replace />} />
                <Route path="export"    element={<Navigate to="/data-tools" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MaintenanceBoundary>
        </AuthBootstrapGate>
      </BrowserRouter>
    </I18nProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

