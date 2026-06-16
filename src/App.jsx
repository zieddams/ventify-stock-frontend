import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
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
import ImportIndex from './pages/import/ImportIndex'
import ExportIndex from './pages/export/ExportIndex'
import LiveMapIndex from './pages/map/LiveMapIndex'
import { APP_BASE_PATH } from './utils/appPaths'

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

function PublicOnly({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter basename={APP_BASE_PATH}>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
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
            <Route path="map"       element={<RequireAdmin><LiveMapIndex /></RequireAdmin>} />
            <Route path="inventory" element={<RequireAdmin><InventaireIndex /></RequireAdmin>} />
            <Route path="import"    element={<RequireAdmin><ImportIndex /></RequireAdmin>} />
            <Route path="export"    element={<RequireAdmin><ExportIndex /></RequireAdmin>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}

