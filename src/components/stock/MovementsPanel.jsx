import { useEffect, useState } from 'react'
import PaginationControls from '../PaginationControls'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatDateTime, formatQty } from '../../utils/format'
import { extractPaginationMeta } from '../../utils/pagination'
import { buildMovementConfig } from '../../utils/stockMovements'

// Reusable movements table (filters + pagination) backed by GET /depot/movements.
// Pass an explicit depotId to view a specific depot (e.g. an admin inspecting a
// POS from the Points de vente list) - resolveSingleScopedDepotId() on the API
// side already authorizes an admin/developer to view any depot in their own
// company, and a pos actor is always pinned to their own depot regardless of
// what's passed, so omitting depotId lets the endpoint resolve "my own depot"
// on its own for POS-workspace usage.
export default function MovementsPanel({ depotId = null, perPage = 20 }) {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const movementConfig = buildMovementConfig(t)

  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)

  const load = async (targetPage = page) => {
    setLoading(true)

    try {
      const response = await api.get('/depot/movements', {
        params: {
          page: targetPage,
          per_page: perPage,
          ...(depotId ? { depot_id: depotId } : {}),
          ...(type ? { type } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
          ...(search.trim() ? { q: search.trim() } : {}),
        },
      })

      const payload = response.data
      const items = Array.isArray(payload) ? payload : (payload.data ?? [])

      setMovements(items)
      setMeta(extractPaginationMeta(payload, { current_page: targetPage, per_page: perPage }))
      setPage(targetPage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depotId, type, dateFrom, dateTo, search])

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('depotPage.movementFilters.search')}</label>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('depotPage.movementFilters.searchPlaceholder')} />
        </div>
        <div>
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('depotPage.movementFilters.type')}</label>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">{t('depotPage.movementFilters.all')}</option>
            {Object.entries(movementConfig).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateRange')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              max={dateTo || undefined}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              min={dateFrom || undefined}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-color gap-2">
          <i className="fa-solid fa-spinner fa-spin" /> {t('depotPage.loading')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  t('depotPage.movementsTable.type'),
                  t('depotPage.movementsTable.product'),
                  t('depotPage.movementsTable.user'),
                  t('depotPage.movementsTable.qty'),
                  t('depotPage.movementsTable.note'),
                  t('depotPage.movementsTable.dateTime'),
                ].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const config = movementConfig[movement.type] ?? { label: movement.type, icon: 'fa-solid fa-circle', color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
                const quantity = Number(movement.qty ?? 0)

                return (
                  <tr key={movement.id} className="table-row">
                    <td className="py-3 pr-4">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: config.bg, color: config.color }}>
                        <i className={`${config.icon} text-[10px]`} />
                        {config.label}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-base-color">{movement.product?.name ?? notAvailable}</div>
                      <div className="text-xs text-muted-color">{movement.product?.reference ?? notAvailable}</div>
                    </td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{movement.user?.name ?? notAvailable}</td>
                    <td className="py-3 pr-4 font-bold font-mono text-sm" style={{ color: quantity >= 0 ? '#10b981' : '#ef4444' }}>
                      {quantity >= 0 ? '+' : '-'}{formatQty(Math.abs(quantity))}
                    </td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{movement.note ?? notAvailable}</td>
                    <td className="py-3 text-muted-color text-xs">{movement.created_at ? formatDateTime(movement.created_at) : notAvailable}</td>
                  </tr>
                )
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-color">{t('depotPage.emptyMovements')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {meta && (
        <PaginationControls
          meta={meta}
          onPageChange={load}
          itemLabel={t('depotPage.tabs.movements').toLowerCase()}
        />
      )}
    </div>
  )
}
