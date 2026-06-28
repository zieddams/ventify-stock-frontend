import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CustomerLedgerModal from '../../components/CustomerLedgerModal'
import DepotScopeControls from '../../components/DepotScopeControls'
import FrenchDateRangeInput from '../../components/FrenchDateRangeInput'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { paginateItems } from '../../utils/pagination'

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

function HistorySummaryCard({ icon, color, label, value }) {
  return (
    <div className="card py-3 px-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-sm font-bold text-base-color">{value}</div>
      </div>
    </div>
  )
}

function CreditFilters({
  t,
  search,
  setSearch,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  onReset,
  hint = '',
}) {
  return (
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
        <div className="md:col-span-2">
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateRange')}</label>
          <FrenchDateRangeInput
            valueFrom={dateFrom}
            valueTo={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from)
              setDateTo(to)
            }}
          />
        </div>
        <div className="flex items-end md:col-span-4 justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-color">{hint}</div>
          <button
            type="button"
            onClick={onReset}
            className="btn-secondary w-full md:w-auto justify-center"
          >
            <i className="fa-solid fa-rotate-left" /> {t('credit.reset')}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDateTimeCell(value) {
  return value ? formatDateTime(value) : '-'
}

function resolveCreditHistoryEventMeta(eventType, t) {
  const map = {
    charge: {
      label: t('credit.historyTab.eventTypes.charge'),
      icon: 'fa-solid fa-file-circle-plus',
      text: '#ea580c',
      bg: 'rgba(249,115,22,0.10)',
    },
    payment: {
      label: t('credit.historyTab.eventTypes.payment'),
      icon: 'fa-solid fa-wallet',
      text: '#059669',
      bg: 'rgba(16,185,129,0.10)',
    },
    adjustment: {
      label: t('credit.historyTab.eventTypes.adjustment'),
      icon: 'fa-solid fa-sliders',
      text: '#7c3aed',
      bg: 'rgba(124,58,237,0.10)',
    },
  }

  return map[eventType] ?? map.adjustment
}

function resolveCreditStatusMeta(status, t) {
  const map = {
    paid: {
      label: t('credit.historyTab.statuses.paid'),
      text: '#059669',
      bg: 'rgba(16,185,129,0.10)',
    },
    partial: {
      label: t('credit.historyTab.statuses.partial'),
      text: '#d97706',
      bg: 'rgba(245,158,11,0.12)',
    },
    unpaid: {
      label: t('credit.historyTab.statuses.unpaid'),
      text: '#dc2626',
      bg: 'rgba(239,68,68,0.10)',
    },
    cancelled: {
      label: t('credit.historyTab.statuses.cancelled'),
      text: '#64748b',
      bg: 'rgba(100,116,139,0.12)',
    },
  }

  return map[status] ?? map.unpaid
}

function resolveHistoryAmount(entry) {
  if (entry.event_type === 'charge') {
    return {
      value: entry.charge_amount,
      text: '#ea580c',
      kind: 'charge',
    }
  }

  if (entry.event_type === 'payment') {
    return {
      value: entry.payment_amount,
      text: '#059669',
      kind: 'payment',
    }
  }

  return {
    value: Math.abs(Number(entry.signed_amount || 0)),
    text: '#7c3aed',
    kind: 'adjustment',
  }
}

export default function CreditIndex() {
  const { t } = useI18n()
  const [tab, setTab] = useState('current')
  const [data, setData] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [ledgerCustomer, setLedgerCustomer] = useState(null)
  const [ledgerInitialInvoiceId, setLedgerInitialInvoiceId] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPerPage, setHistoryPerPage] = useState(15)
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

  const load = useCallback(async () => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    try {
      const response = await api.get('/reports/aging', {
        params: {
          ...scopeParams,
          ...(deferredSearch ? { q: deferredSearch } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
        },
      })

      setData(response.data)
    } catch {
      setData({
        customers: [],
        entries: [],
        totals: {},
      })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, deferredSearch, depotsReady, scopeParams])

  const loadHistory = useCallback(async () => {
    if (!depotsReady) {
      return
    }

    setHistoryLoading(true)

    try {
      const response = await api.get('/reports/credit-history', {
        params: {
          ...scopeParams,
          ...(deferredSearch ? { q: deferredSearch } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
        },
      })

      setHistoryData(response.data)
    } catch {
      setHistoryData({
        entries: [],
        totals: {},
      })
    } finally {
      setHistoryLoading(false)
    }
  }, [dateFrom, dateTo, deferredSearch, depotsReady, scopeParams])

  useEffect(() => {
    void load()
  }, [load, selectedDepotId])

  useEffect(() => {
    if (tab === 'history') {
      void loadHistory()
    }
  }, [loadHistory, tab])

  useEffect(() => {
    setHistoryPage(1)
  }, [dateFrom, dateTo, deferredSearch, selectedDepotId, tab])

  const openLedger = (customerLike, invoiceId = null) => {
    if (!customerLike) {
      return
    }

    setLedgerCustomer({
      id: customerLike.id ?? customerLike.customer_id,
      name: customerLike.name ?? customerLike.customer_name,
    })
    setLedgerInitialInvoiceId(invoiceId ? String(invoiceId) : '')
  }

  const closeLedger = () => {
    setLedgerCustomer(null)
    setLedgerInitialInvoiceId('')
  }

  const resetFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const reloadAll = async () => {
    await Promise.all([load(), loadHistory()])
  }

  const totals = data?.totals ?? {}
  const entries = data?.entries ?? []
  const customers = data?.customers ?? []
  const historyEntries = historyData?.entries ?? []
  const historyTotals = historyData?.totals ?? {}
  const depotSuffix = canSelectAll
    ? (selectedDepot ? t('credit.selectedDepot', { name: selectedDepot.name }) : t('credit.allDepots'))
    : ''
  const { items: paginatedHistoryEntries, meta: historyMeta } = useMemo(
    () => paginateItems(historyEntries, historyPage, historyPerPage),
    [historyEntries, historyPage, historyPerPage],
  )

  useEffect(() => {
    if (historyPage !== historyMeta.current_page) {
      setHistoryPage(historyMeta.current_page)
    }
  }, [historyMeta.current_page, historyPage])

  if ((loading && !data) || !data) {
    return <PageLoader />
  }

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

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'current', label: t('credit.tabs.current'), icon: 'fa-solid fa-list-check' },
          { key: 'history', label: t('credit.tabs.history'), icon: 'fa-solid fa-clock-rotate-left' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              tab === item.key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-theme text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${item.icon} mr-2`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <>
          <CreditFilters
            t={t}
            search={search}
            setSearch={setSearch}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            onReset={resetFilters}
          />

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
                        <div className="space-y-2">
                          <div>{t('credit.attempts', { count: entry.payment_attempt_count || 0 })}</div>
                          <div>{formatDateTimeCell(entry.last_payment_at)}</div>
                          {entry.customer_id && (
                            <button type="button" className="btn-secondary text-[11px]" onClick={() => openLedger(entry, entry.invoice_id)}>
                              <i className="fa-solid fa-credit-card" /> {t('customers.ledger.collectPayment')}
                            </button>
                          )}
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
                        <button type="button" onClick={() => openLedger(customer)} className="btn-secondary text-xs">
                          <i className="fa-solid fa-credit-card" /> {t('customers.ledger.collectPayment')}
                        </button>
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
        </>
      )}

      {tab === 'history' && (
        <>
          <CreditFilters
            t={t}
            search={search}
            setSearch={setSearch}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            onReset={resetFilters}
            hint={t('credit.historyTab.eventDateHint')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <HistorySummaryCard
              icon="fa-solid fa-wave-square"
              color="#0f766e"
              label={t('credit.historyTab.kpis.events')}
              value={historyTotals.event_count ?? historyEntries.length}
            />
            <HistorySummaryCard
              icon="fa-solid fa-file-circle-plus"
              color="#ea580c"
              label={t('credit.historyTab.kpis.chargeTotal')}
              value={formatCurrency(historyTotals.charge_total || 0)}
            />
            <HistorySummaryCard
              icon="fa-solid fa-wallet"
              color="#059669"
              label={t('credit.historyTab.kpis.paymentTotal')}
              value={formatCurrency(historyTotals.payment_total || 0)}
            />
            <HistorySummaryCard
              icon="fa-solid fa-list-check"
              color="#dc2626"
              label={t('credit.historyTab.kpis.openInvoices')}
              value={historyTotals.open_invoice_count ?? 0}
            />
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-base-color">{t('credit.historyTab.title')}</h2>
                <p className="text-xs text-muted-color mt-1">{t('credit.historyTab.subtitle')}</p>
              </div>
              {historyLoading && <i className="fa-solid fa-spinner fa-spin text-muted-color" />}
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-color">
                <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('credit.historyTab.loading')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {[
                        t('credit.historyTab.columns.date'),
                        t('credit.historyTab.columns.event'),
                        t('credit.historyTab.columns.customerInvoice'),
                        t('credit.historyTab.columns.rep'),
                        t('credit.historyTab.columns.sessionDepot'),
                        t('credit.historyTab.columns.amount'),
                        t('credit.historyTab.columns.balanceAfter'),
                        t('credit.historyTab.columns.trace'),
                      ].map((heading, index) => (
                        <th key={heading} className={`pb-3 pr-4 ${index === 5 || index === 6 ? 'text-right' : 'text-left'}`}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <i className="fa-solid fa-clock-rotate-left text-3xl text-muted-color opacity-30 mb-2 block" />
                          <p className="text-muted-color text-sm">{t('credit.historyTab.empty')}</p>
                        </td>
                      </tr>
                    )}
                    {paginatedHistoryEntries.map((entry) => {
                      const eventMeta = resolveCreditHistoryEventMeta(entry.event_type, t)
                      const amountMeta = resolveHistoryAmount(entry)
                      const statusMeta = resolveCreditStatusMeta(entry.current_invoice_payment_status, t)

                      return (
                        <tr key={entry.history_id} className="table-row">
                          <td className="py-3 pr-4 text-xs whitespace-nowrap">
                            <div className="font-mono text-base-color">{formatDateTimeCell(entry.event_recorded_at)}</div>
                            {entry.event_date && (
                              <div className="text-muted-color mt-1">{entry.event_date}</div>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                              style={{ color: eventMeta.text, background: eventMeta.bg }}
                            >
                              <i className={eventMeta.icon} />
                              {eventMeta.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-base-color">
                              {entry.customer_url ? (
                                <Link to={entry.customer_url} className="text-primary hover:underline">
                                  {entry.customer_name}
                                </Link>
                              ) : (
                                entry.customer_name || t('common.notAvailable')
                              )}
                            </div>
                            <div className="text-xs text-secondary-color mt-1">
                              {entry.invoice_url ? (
                                <Link to={entry.invoice_url} className="font-mono text-primary hover:underline">
                                  {entry.invoice_number}
                                </Link>
                              ) : (
                                <span className="font-mono">{entry.invoice_number || t('credit.historyTab.withoutInvoice')}</span>
                              )}
                            </div>
                            {entry.invoice_total !== null && (
                              <div className="text-xs text-muted-color mt-1">
                                {t('credit.historyTab.trace.invoiceTotal', { value: formatCurrency(entry.invoice_total) })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-secondary-color">{entry.rep_name || t('common.notAvailable')}</td>
                          <td className="py-3 pr-4 text-xs text-secondary-color">
                            <div className="space-y-1">
                              <div>
                                {entry.route_session_id ? (
                                  <Link to={entry.route_session_url} className="text-primary hover:underline">
                                    {t('credit.sessionLink', { id: entry.route_session_id })}
                                  </Link>
                                ) : (
                                  <span>{t('credit.historyTab.withoutSession')}</span>
                                )}
                              </div>
                              <div>
                                {entry.camion_name || t('credit.camionMissing')}
                                {entry.camion_plate ? ` | ${entry.camion_plate}` : ''}
                              </div>
                              <div>{entry.depot?.name || t('credit.allDepotsShort')}</div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <div className="font-mono font-semibold" style={{ color: amountMeta.text }}>
                              {formatCurrency(amountMeta.value)}
                            </div>
                            <div className="text-[11px] text-muted-color mt-1">
                              {t(`credit.historyTab.amountKinds.${amountMeta.kind}`)}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <div className="font-mono font-semibold text-base-color">{formatCurrency(entry.balance_after)}</div>
                            <div className="text-[11px] text-muted-color mt-1">
                              {t('credit.historyTab.trace.customerBalance', { value: formatCurrency(entry.current_customer_balance) })}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs text-secondary-color">
                            <div className="space-y-1">
                              <div>{t('credit.historyTab.trace.actor', { value: entry.created_by || t('common.notAvailable') })}</div>
                              {entry.current_invoice_due_amount !== null && (
                                <div>{t('credit.historyTab.trace.invoiceDue', { value: formatCurrency(entry.current_invoice_due_amount) })}</div>
                              )}
                              {entry.invoice_id && (
                                <div>
                                  <span
                                    className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold"
                                    style={{ color: statusMeta.text, background: statusMeta.bg }}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </div>
                              )}
                              <div>{t('credit.historyTab.trace.attempts', { count: entry.payment_attempt_count || 0 })}</div>
                              {entry.last_payment_at && (
                                <div>{t('credit.historyTab.trace.lastPayment', { value: formatDateTimeCell(entry.last_payment_at) })}</div>
                              )}
                              {entry.payment_method && (
                                <div>{t('credit.historyTab.trace.method', { value: entry.payment_method })}</div>
                              )}
                              {entry.payment_note && (
                                <div>{t('credit.historyTab.trace.note', { value: entry.payment_note })}</div>
                              )}
                              {(entry.allocations ?? []).length > 0 && (
                                <div className="pt-1">
                                  <div className="text-[11px] font-semibold text-muted-color uppercase tracking-wider mb-2">
                                    {t('credit.historyTab.trace.allocations', { count: entry.allocation_count || entry.allocations.length })}
                                  </div>
                                  <div className="space-y-2">
                                    {entry.allocations.map((allocation, index) => (
                                      <div
                                        key={`${entry.history_id}-allocation-${allocation.invoice_id ?? index}`}
                                        className="rounded-xl border border-theme px-3 py-2"
                                        style={{ background: 'var(--surface-2)' }}
                                      >
                                        <div className="font-semibold text-base-color">
                                          {allocation.invoice_url ? (
                                            <Link to={allocation.invoice_url} className="text-primary hover:underline">
                                              {allocation.invoice_number || t('credit.historyTab.invoiceUnknown')}
                                            </Link>
                                          ) : (
                                            allocation.invoice_number || t('credit.historyTab.invoiceUnknown')
                                          )}
                                          <span className="font-mono text-secondary-color ml-2">{formatCurrency(allocation.amount)}</span>
                                        </div>
                                        <div className="text-[11px] text-muted-color mt-1">
                                          {allocation.route_session_id
                                            ? t('credit.sessionLink', { id: allocation.route_session_id })
                                            : t('credit.historyTab.withoutSession')}
                                          {allocation.depot?.name ? ` | ${allocation.depot.name}` : ''}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {entry.customer_id && (
                                <div className="pt-1">
                                  <button type="button" className="btn-secondary text-[11px]" onClick={() => openLedger(entry, entry.invoice_id)}>
                                    <i className="fa-solid fa-credit-card" /> {t('customers.ledger.collectPayment')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!historyLoading && (
              <PaginationControls
                meta={historyMeta}
                perPage={historyPerPage}
                onPageChange={setHistoryPage}
                onPerPageChange={(value) => {
                  setHistoryPerPage(value)
                  setHistoryPage(1)
                }}
                itemLabel={t('credit.historyTab.itemLabel')}
              />
            )}
          </div>
        </>
      )}

      <CustomerLedgerModal
        open={!!ledgerCustomer}
        customer={ledgerCustomer}
        initialInvoiceId={ledgerInitialInvoiceId}
        onClose={closeLedger}
        onPaymentSaved={reloadAll}
      />
    </div>
  )
}
