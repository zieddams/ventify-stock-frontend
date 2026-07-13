import { useEffect, useMemo, useState } from 'react'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatDateTime, formatNumber } from '../../utils/format'

function movementTypeLabel(t, type) {
  const labels = {
    depot_in: t('reportsPage.movements.types.depot_in'),
    depot_to_camion: t('reportsPage.movements.types.depot_to_camion'),
    camion_to_customer: t('reportsPage.movements.types.camion_to_customer'),
    return: t('reportsPage.movements.types.return'),
    adjustment: t('reportsPage.movements.types.adjustment'),
    transfer_out: t('reportsPage.movements.types.transfer_out'),
    transfer_in: t('reportsPage.movements.types.transfer_in'),
  }

  return labels[type] ?? type
}

export default function PosStockIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const [stock, setStock] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('stock')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      api.get('/depot'),
      api.get('/depot/movements', { params: { per_page: 30 } }),
    ]).then(([stockResponse, movementsResponse]) => {
      if (cancelled) {
        return
      }

      setStock(Array.isArray(stockResponse.data) ? stockResponse.data : [])
      const payload = movementsResponse.data
      setMovements(Array.isArray(payload) ? payload : (payload?.data ?? []))
    }).finally(() => {
      if (!cancelled) {
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredStock = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return stock
    }

    return stock.filter((item) =>
      item.product?.name?.toLowerCase().includes(query)
      || item.product?.reference?.toLowerCase().includes(query)
    )
  }, [search, stock])

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-color tracking-tight">{t('posWorkspace.stock.title')}</h1>
        <p className="text-sm text-muted-color mt-0.5">{t('posWorkspace.stock.subtitle')}</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-theme">
        {[
          ['stock', t('posWorkspace.stock.tabs.stock')],
          ['movements', t('posWorkspace.stock.tabs.movements')],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-muted-color hover:text-base-color'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="card">
          <div className="mb-4 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
            <input placeholder={t('posWorkspace.stock.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    t('posWorkspace.stock.table.product'),
                    t('posWorkspace.stock.table.reference'),
                    t('posWorkspace.stock.table.qty'),
                    t('posWorkspace.stock.table.status'),
                  ].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => {
                  const qty = Number(item.qty ?? 0)
                  const min = Math.max(Number(item.product?.min_stock ?? 1), 1)
                  const low = qty <= min

                  return (
                    <tr key={item.product_id} className="table-row">
                      <td className="py-3 pr-4 font-semibold text-base-color">{item.product?.name ?? notAvailable}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-color">{item.product?.reference ?? notAvailable}</td>
                      <td className="py-3 pr-4 font-bold font-mono" style={{ color: low ? '#dc2626' : '#0d9488' }}>{formatNumber(qty)}</td>
                      <td className="py-3">
                        {low ? (
                          <span className="text-xs font-medium text-red-600">{t('posWorkspace.stock.status.low')}</span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600">{t('posWorkspace.stock.status.normal')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-color">{t('posWorkspace.stock.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    t('posWorkspace.stock.movementsTable.type'),
                    t('posWorkspace.stock.movementsTable.product'),
                    t('posWorkspace.stock.movementsTable.qty'),
                    t('posWorkspace.stock.movementsTable.dateTime'),
                  ].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const quantity = Number(movement.qty ?? 0)

                  return (
                    <tr key={movement.id} className="table-row">
                      <td className="py-3 pr-4 text-xs text-secondary-color">{movementTypeLabel(t, movement.type)}</td>
                      <td className="py-3 pr-4 font-medium text-base-color">{movement.product?.name ?? notAvailable}</td>
                      <td className="py-3 pr-4 font-bold font-mono text-sm" style={{ color: quantity >= 0 ? '#10b981' : '#ef4444' }}>
                        {quantity >= 0 ? '+' : '-'}{formatNumber(Math.abs(quantity))}
                      </td>
                      <td className="py-3 text-muted-color text-xs">{movement.created_at ? formatDateTime(movement.created_at) : notAvailable}</td>
                    </tr>
                  )
                })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-color">{t('posWorkspace.stock.emptyMovements')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
