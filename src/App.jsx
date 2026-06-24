import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { I18nProvider } from './contexts/I18nContext'
import { ThemeProvider } from './contexts/ThemeContext'
import MaintenanceBoundary from './components/MaintenanceBoundary'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
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

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin' && user.role !== 'developer') return <Navigate to="/" replace />
  return children
}

function RequireFinance({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!['admin', 'developer', 'comptable'].includes(user.role)) return <Navigate to="/" replace />
  return children
}

function RequireDeveloper({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'developer') return <Navigate to="/" replace />
  return children
}

function RequireMapFeature({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin' && user.role !== 'developer') return <Navigate to="/" replace />
  if (!isAnyMapExperienceEnabled(user)) return <Navigate to="/config/terrain-visibility" replace />
  return children
}

function PublicOnly({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

function HomeIndex() {
  const { user } = useAuth()

  if (user?.role === 'developer') {
    return <Navigate to="/developer-tools" replace />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <I18nProvider>
      <BrowserRouter basename={APP_BASE_PATH}>
        <MaintenanceBoundary>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<HomeIndex />} />
              <Route path="products" element={<ProductsIndex />} />
              <Route path="customers" element={<CustomersIndex />} />
              <Route path="invoices" element={<InvoicesIndex />} />
              <Route path="invoices/create" element={<InvoiceCreate />} />
              <Route path="invoices/:id" element={<InvoiceShow />} />
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
              <Route path="companies" element={<RequireDeveloper><CompaniesIndex /></RequireDeveloper>} />
              <Route path="companies/:companyId" element={<RequireDeveloper><CompaniesIndex /></RequireDeveloper>} />
              <Route path="developer-tools" element={<RequireDeveloper><DeveloperToolsIndex /></RequireDeveloper>} />
              <Route path="help" element={<HelpCenterIndex />} />
              <Route path="notifications-center" element={<NotificationsCenterIndex />} />
              <Route path="bug-reports" element={<BugReportsIndex />} />
              <Route path="import"    element={<Navigate to="/data-tools" replace />} />
              <Route path="export"    element={<Navigate to="/data-tools" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MaintenanceBoundary>
      </BrowserRouter>
    </I18nProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

