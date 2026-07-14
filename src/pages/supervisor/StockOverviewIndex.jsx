import { useEffect, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/format'

function SectionCard({ title, children }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-base-color mb-4">{title}</h2>
      {children}
    </div>
  )
}

function KpiCard({ label, value, icon, color }) {
  return (
    <div className="card py-3.5 px-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-color uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold text-base-color font-mono">{value}</div>
      </div>
    </div>
  )
}

export default function StockOverviewIndex() {
  const { t } = useI18n()
  const {
    depots,
    loading: depotsLoading,
    selectedValue,
    setSelectedValue,
    canSelectAll,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: true,
    defaultToAll: true,
    scopeToCompanyBrowse: true,
    storageKey: 'app-depot-scope',
  })

  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    if (!depotsReady) return

    let cancelled = false
    setLoading(true)

    api.get('/reports/stock-overview', { params: scopeParams })
      .then((response) => { if (!cancelled) setOverview(response.data) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [depotsReady, scopeParams])

  if (loading && !overview) {
    return <PageLoader />
  }

  const byDepot = overview?.by_depot ?? []
  const byProduct = overview?.by_product ?? []
  const recentMovements = overview?.recent_movements ?? []
  const totalQty = byDepot.reduce((sum, row) => sum + Number(row.total_qty ?? 0), 0)
  const totalValue = byDepot.reduce((sum, row) => sum + Number(row.total_value ?? 0), 0)
  const lowStockCount = byDepot.reduce((sum, row) => sum + Number(row.low_stock_count ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={t('supervisorStockPage.title')}
        subtitle={t('supervisorStockPage.subtitle')}
        action={(
          canSelectAll && (
            <DepotScopeControls
              depots={depots}
              loading={depotsLoading}
              selectedValue={selectedValue}
              onChange={setSelectedValue}
              allowAll
              canSelectAll={canSelectAll}
              allLabel={t('supervisorStockPage.allDepots')}
            />
          )
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label={t('supervisorStockPage.kpis.depots')} value={byDepot.length} icon="fa-solid fa-warehouse" color="#0d9488" />
        <KpiCard label={t('supervisorStockPage.kpis.totalQty')} value={formatNumber(totalQty)} icon="fa-solid fa-boxes-stacked" color="#3b82f6" />
        <KpiCard label={t('supervisorStockPage.kpis.totalValue')} value={formatCurrency(totalValue)} icon="fa-solid fa-sack-dollar" color="#10b981" />
        <KpiCard label={t('supervisorStockPage.kpis.lowStock')} value={lowStockCount} icon="fa-solid fa-triangle-exclamation" color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard title={t('supervisorStockPage.byDepotTitle')}>
          {byDepot.length === 0 ? (
            <p className="text-sm text-muted-color py-6 text-center">{t('supervisorStockPage.empty')}</p>
          ) : (
            <div className="space-y-2">
              {byDepot.map((depot) => (
                <div key={depot.depot_id} className="flex items-center justify-between rounded-xl p-3 border border-theme" style={{ background: depot.low_stock_count > 0 ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)' }}>
                  <div>
                    <div className="text-sm font-semibold text-base-color">{depot.depot_name}</div>
                    <div className="text-xs text-muted-color mt-0.5">
                      {t('supervisorStockPage.referenceCount', { count: depot.reference_count })}
                      {depot.low_stock_count > 0 && <span style={{ color: '#dc2626' }}> · {t('supervisorStockPage.lowStockCount', { count: depot.low_stock_count })}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-base-color">{formatNumber(depot.total_qty)}</div>
                    <div className="text-xs text-muted-color font-mono">{formatCurrency(depot.total_value)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={t('supervisorStockPage.recentMovementsTitle')}>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-color py-6 text-center">{t('supervisorStockPage.empty')}</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between text-sm py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="min-w-0">
                    <div className="font-medium text-base-color truncate">{movement.product_name}</div>
                    <div className="text-xs text-muted-color truncate">{movement.depot_name} · {movement.user_name} · {formatDateTime(movement.created_at)}</div>
                  </div>
                  <span className="font-mono font-semibold flex-shrink-0" style={{ color: Number(movement.qty) >= 0 ? '#059669' : '#dc2626' }}>
                    {Number(movement.qty) >= 0 ? '+' : ''}{formatNumber(movement.qty)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="card mt-5">
        <h2 className="text-sm font-semibold text-base-color mb-4">{t('supervisorStockPage.byProductTitle')}</h2>
        {byProduct.length === 0 ? (
          <p className="text-sm text-muted-color py-6 text-center">{t('supervisorStockPage.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="pb-2 pr-3 text-xs font-semibold text-muted-color uppercase tracking-wider">{t('supervisorStockPage.productsTable.product')}</th>
                  <th className="pb-2 pr-3 text-xs font-semibold text-muted-color uppercase tracking-wider text-right">{t('supervisorStockPage.productsTable.totalQty')}</th>
                  <th className="pb-2 text-xs font-semibold text-muted-color uppercase tracking-wider">{t('supervisorStockPage.productsTable.byDepot')}</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((product) => (
                  <tr key={product.product_id} className="table-row">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-base-color">{product.product_name}</div>
                      <div className="text-xs text-muted-color">{product.product_reference}</div>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-semibold text-base-color">{formatNumber(product.total_qty)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {product.by_depot.map((entry) => (
                          <span key={entry.depot_id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                            {entry.depot_name}: {formatNumber(entry.qty)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
