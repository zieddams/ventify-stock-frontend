import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { I18nProvider, useI18n } from './contexts/I18nContext'
import { ThemeProvider } from './contexts/ThemeContext'
import MaintenanceBoundary from './components/MaintenanceBoundary'
import { PageLoader } from './components/Spinner'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DeveloperDashboard from './pages/developer/DeveloperDashboard'
import DeveloperElementsIndex from './pages/developer/DeveloperElementsIndex'
import ProductsIndex from './pages/products/ProductsIndex'
import CustomersIndex from './pages/customers/CustomersIndex'
import InvoicesIndex from './pages/invoices/InvoicesIndex'
import InvoiceCreate from './pages/invoices/InvoiceCreate'
import InvoiceShow from './pages/invoices/InvoiceShow'
import DepotIndex from './pages/depot/DepotIndex'
import CamionsIndex from './pages/camions/CamionsIndex'
import ReportsIndex from './pages/reports/ReportsIndex'
import UsersIndex from './pages/users/UsersIndex'
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
  const { user, isDeveloperWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function RequireFinance({ children }) {
  const { user, isDeveloperWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
  if (!['admin', 'comptable'].includes(user.role)) return <Navigate to="/" replace />
  return children
}

function RequireDeveloperWorkspace({ children }) {
  const { user, isDeveloperWorkspace } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isDeveloperWorkspace()) return <Navigate to="/" replace />
  return children
}

function RequireMapFeature({ children }) {
  const { user, isDeveloperWorkspace } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  if (isDeveloperWorkspace()) return <Navigate to="/developer" replace />
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
  const { user, isDeveloperWorkspace } = useAuth()
  if (user) return <Navigate to={isDeveloperWorkspace() ? '/developer' : '/'} replace />
  return children
}

function HomeIndex() {
  const { isDeveloperWorkspace } = useAuth()

  if (isDeveloperWorkspace()) {
    return <Navigate to="/developer" replace />
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
                <Route path="elements" element={<RequireDeveloperWorkspace><DeveloperElementsIndex /></RequireDeveloperWorkspace>} />
                <Route path="products" element={<RequireBusinessWorkspace><ProductsIndex /></RequireBusinessWorkspace>} />
                <Route path="customers" element={<RequireBusinessWorkspace><CustomersIndex /></RequireBusinessWorkspace>} />
                <Route path="invoices" element={<RequireBusinessWorkspace><InvoicesIndex /></RequireBusinessWorkspace>} />
                <Route path="invoices/create" element={<RequireBusinessWorkspace><InvoiceCreate /></RequireBusinessWorkspace>} />
                <Route path="invoices/:id" element={<RequireBusinessWorkspace><InvoiceShow /></RequireBusinessWorkspace>} />
                <Route path="depot" element={<RequireAdmin><DepotIndex /></RequireAdmin>} />
                <Route path="camions" element={<RequireAdmin><CamionsIndex /></RequireAdmin>} />
                <Route path="reports" element={<RequireAdmin><ReportsIndex /></RequireAdmin>} />
                <Route path="users" element={<RequireAdmin><UsersIndex /></RequireAdmin>} />
                <Route path="zones" element={<RequireAdmin><ZonesIndex /></RequireAdmin>} />
                <Route path="credit"    element={<RequireFinance><CreditIndex /></RequireFinance>} />
                <Route path="expenses"  element={<RequireFinance><ExpensesIndex /></RequireFinance>} />
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

