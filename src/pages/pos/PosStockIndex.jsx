import { useEffect, useMemo, useState } from 'react'
import MovementsPanel from '../../components/stock/MovementsPanel'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatQty } from '../../utils/format'

export default function PosStockIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('stock')

  useEffect(() => {
    let cancelled = false

    api.get('/depot').then((stockResponse) => {
      if (cancelled) {
        return
      }

      setStock(Array.isArray(stockResponse.data) ? stockResponse.data : [])
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

  const lowItems = useMemo(
    () => stock.filter((item) => Number(item.qty ?? 0) <= Math.max(Number(item.product?.min_stock ?? 1), 1)),
    [stock],
  )

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
          {lowItems.length > 0 && (
            <div className="mb-4 rounded-xl p-3 border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation" /> {t('posWorkspace.dashboard.lowStockSummary', { count: lowItems.length })}
              </div>
              <div className="flex flex-wrap gap-2">
                {lowItems.map((item) => (
                  <span
                    key={item.product_id}
                    className="text-xs px-2 py-1 rounded-lg border font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}
                  >
                    {item.product?.name ?? notAvailable} - {formatQty(item.qty)}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                      <td className="py-3 pr-4 font-bold font-mono" style={{ color: low ? '#dc2626' : '#0d9488' }}>{formatQty(qty)}</td>
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
          <MovementsPanel />
        </div>
      )}
    </div>
  )
}
