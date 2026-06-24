import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/format'

const BUCKET_COLORS = {
  '0-30': { text: '#059669', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  '31-60': { text: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  '61-90': { text: '#ea580c', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.2)' },
  '+90': { text: '#dc2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  total: { text: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
}

function BucketCard({ label, value, colorKey }) {
  const c = BUCKET_COLORS[colorKey]

  return (
    <div className="card flex items-center gap-3 py-3 px-4">
      <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
      <div>
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-base font-bold font-mono" style={{ color: c.text }}>{formatCurrency(value)}</div>
      </div>
    </div>
  )
}

function formatDateTimeCell(value) {
  return value ? formatDateTime(value) : '-'
}

export default function CreditIndex() {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    selectedDepot,
    canSelectAll,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    api.get('/reports/aging', {
      params: {
        ...scopeParams,
        ...(deferredSearch ? { q: deferredSearch } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      },
    })
      .then((response) => setData(response.data))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, deferredSearch, depotsReady, selectedDepotId])

  if ((loading && !data) || !data) {
    return <PageLoader />
  }

  const totals = data.totals ?? {}
  const entries = data.entries ?? []
  const customers = data.customers ?? []
  const depotSuffix = canSelectAll
    ? (selectedDepot ? t('credit.selectedDepot', { name: selectedDepot.name }) : t('credit.allDepots'))
    : ''

  return (
    <div>
      <PageHeader
        title={t('credit.title')}
        subtitle={t('credit.subtitle', { depotSuffix })}
        action={canSelectAll ? (
          <DepotScopeControls
            depots={depots}
            selectedValue={selectedDepotValue}
            onChange={setSelectedDepotValue}
            allowAll
            canSelectAll={canSelectAll}
            allLabel={t('credit.allDepots')}
          />
        ) : null}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <BucketCard label={t('credit.buckets.b0_30')} value={totals.b0_30} colorKey="0-30" />
        <BucketCard label={t('credit.buckets.b31_60')} value={totals.b31_60} colorKey="31-60" />
        <BucketCard label={t('credit.buckets.b61_90')} value={totals.b61_90} colorKey="61-90" />
        <BucketCard label={t('credit.buckets.b90_plus')} value={totals.b90_plus} colorKey="+90" />
        <BucketCard label={t('credit.buckets.totalDue')} value={totals.total_due} colorKey="total" />
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.search')}</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('credit.searchPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateFrom')}</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateTo')}</label>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="flex items-end md:col-span-4">
            <button
              onClick={() => {
                setSearch('')
                setDateFrom('')
                setDateTo('')
              }}
              className="btn-secondary w-full md:w-auto justify-center"
            >
              <i className="fa-solid fa-rotate-left" /> {t('credit.reset')}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-base-color">{t('credit.detailsTitle')}</h2>
            <p className="text-xs text-muted-color mt-1">{t('credit.detailsSubtitle')}</p>
          </div>
          {loading && <i className="fa-solid fa-spinner fa-spin text-muted-color" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  t('credit.columns.createdAt'),
                  t('credit.columns.invoice'),
                  t('credit.columns.customer'),
                  t('credit.columns.rep'),
                  t('credit.columns.sessionCamion'),
                  t('depot.label'),
                  t('credit.columns.total'),
                  t('credit.columns.paid'),
                  t('credit.columns.due'),
                  t('credit.columns.history'),
                ].map((heading, index) => (
                  <th key={heading} className={`pb-3 pr-4 ${index >= 6 && index <= 8 ? 'text-right' : 'text-left'}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.invoice_id} className="table-row">
                  <td className="py-3 pr-4 whitespace-nowrap text-secondary-color">{formatDateTimeCell(entry.created_at)}</td>
                  <td className="py-3 pr-4">
                    {entry.invoice_id ? (
                      <Link to={`/invoices/${entry.invoice_id}`} className="font-mono text-xs text-primary hover:underline">
                        {entry.number}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-base-color">{entry.number || t('common.notAvailable')}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-base-color">
                    {entry.customer_id ? (
                      <Link to={`/customers?open_ledger=${entry.customer_id}`} className="font-medium text-primary hover:underline">
                        {entry.customer_name}
                      </Link>
                    ) : (
                      entry.customer_name
                    )}
                  </td>
                  <td className="py-3 pr-4 text-secondary-color">{entry.rep_name || t('common.notAvailable')}</td>
                  <td className="py-3 pr-4 text-xs text-secondary-color">
                    {entry.route_session_id ? (
                      <div className="space-y-1">
                        <div>
                          <Link to={entry.route_session_url} className="text-primary hover:underline">
                            {t('credit.sessionLink', { id: entry.route_session_id })}
                          </Link>
                        </div>
                        <div>
                          {entry.camion?.name || t('credit.camionMissing')}
                          {entry.camion?.plate ? ` | ${entry.camion.plate}` : ''}
                        </div>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-secondary-color">{entry.depot?.name ?? t('credit.allDepotsShort')}</td>
                  <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(entry.total)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-secondary-color">{formatCurrency(entry.paid_amount)}</td>
                  <td className="py-3 text-right font-mono font-semibold" style={{ color: '#7c3aed' }}>
                    {formatCurrency(entry.due_amount)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-secondary-color">
                    <div className="space-y-1">
                      <div>{t('credit.attempts', { count: entry.payment_attempt_count || 0 })}</div>
                      <div>{formatDateTimeCell(entry.last_payment_at)}</div>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2 block opacity-60" />
                    <p className="text-muted-color text-sm">{t('credit.emptyEntries')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-base-color">{t('credit.customerSummaryTitle')}</h2>
            <p className="text-xs text-muted-color mt-1">{t('credit.customerSummarySubtitle')}</p>
          </div>
          {loading && <i className="fa-solid fa-spinner fa-spin text-muted-color" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  t('credit.columns.customer'),
                  t('credit.buckets.short0_30'),
                  t('credit.buckets.short31_60'),
                  t('credit.buckets.short61_90'),
                  t('credit.buckets.short90_plus'),
                  t('credit.buckets.totalDue'),
                  t('common.actions'),
                ].map((heading, index) => (
                  <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id} className="table-row">
                  <td className="py-3 pr-4 font-semibold text-base-color">
                    <Link to={`/customers?open_ledger=${customer.customer_id}`} className="text-primary hover:underline">
                      {customer.customer_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-sm text-secondary-color">{formatCurrency(customer.b0_30)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm" style={{ color: parseFloat(customer.b31_60) > 0 ? '#d97706' : 'var(--text-muted)' }}>{formatCurrency(customer.b31_60)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm" style={{ color: parseFloat(customer.b61_90) > 0 ? '#ea580c' : 'var(--text-muted)' }}>{formatCurrency(customer.b61_90)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm font-bold" style={{ color: parseFloat(customer.b90_plus) > 0 ? '#dc2626' : 'var(--text-muted)' }}>{formatCurrency(customer.b90_plus)}</td>
                  <td className="py-3 font-bold font-mono text-sm text-right" style={{ color: '#7c3aed' }}>{formatCurrency(customer.total_due)}</td>
                  <td className="py-3 pl-4 text-right">
                    <Link to={`/customers?open_ledger=${customer.customer_id}`} className="btn-secondary text-xs">
                      <i className="fa-solid fa-credit-card" /> {t('customers.ledger.collectPayment')}
                    </Link>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-color">
                    {t('credit.emptyCustomers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
