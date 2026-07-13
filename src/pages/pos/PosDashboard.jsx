import { useEffect, useState } from 'react'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatCurrency, formatNumber } from '../../utils/format'

export default function PosDashboard() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    api.get('/stats')
      .then((response) => {
        if (!cancelled) {
          setStats(response.data)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !stats) {
    return <PageLoader />
  }

  const kpis = [
    { label: t('posWorkspace.dashboard.kpis.todayRevenue'), value: formatCurrency(stats.today_revenue), icon: 'fa-solid fa-sack-dollar', color: '#0d9488' },
    { label: t('posWorkspace.dashboard.kpis.monthRevenue'), value: formatCurrency(stats.month_revenue), icon: 'fa-solid fa-chart-line', color: '#3b82f6' },
    { label: t('posWorkspace.dashboard.kpis.todayInvoices'), value: formatNumber(stats.today_invoices), icon: 'fa-solid fa-file-invoice', color: '#8b5cf6' },
    { label: t('posWorkspace.dashboard.kpis.unpaidTotal'), value: formatCurrency(stats.unpaid_total), icon: 'fa-solid fa-hourglass-half', color: '#ef4444' },
  ]

  const lowStock = Array.isArray(stats.low_depot_stock) ? stats.low_depot_stock : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-color tracking-tight">
          {t('posWorkspace.dashboard.title', { name: user?.depot?.name ?? '' })}
        </h1>
        <p className="text-sm text-muted-color mt-0.5">{t('posWorkspace.dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card py-4 px-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${kpi.color}1a` }}>
              <i className={`${kpi.icon} text-sm`} style={{ color: kpi.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-color truncate">{kpi.label}</div>
              <div className="text-sm font-bold text-base-color">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="mb-5 rounded-xl p-3 border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mb-2">
            <i className="fa-solid fa-triangle-exclamation" /> {t('posWorkspace.dashboard.lowStockSummary', { count: lowStock.length })}
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <span
                key={item.product_id}
                className="text-xs px-2 py-1 rounded-lg border font-medium"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
              >
                {item.product?.name ?? t('common.notAvailable')} - {formatNumber(item.qty)} / {formatNumber(item.product?.min_stock ?? 0)}
              </span>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(stats.top_products) && stats.top_products.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-3">
            {t('posWorkspace.dashboard.topProducts')}
          </h2>
          <div className="space-y-2">
            {stats.top_products.map((product) => (
              <div key={product.id ?? product.name} className="flex items-center justify-between text-sm">
                <span className="text-base-color font-medium">{product.name}</span>
                <span className="text-muted-color font-mono text-xs">{formatCurrency(product.revenue ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
