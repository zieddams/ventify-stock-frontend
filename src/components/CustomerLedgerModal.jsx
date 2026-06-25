import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaymentStatusBadge } from './Badge'
import Modal from './Modal'
import { PageLoader } from './Spinner'
import { useI18n } from '../contexts/I18nContext'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../hooks/useConfigItems'
import api from '../services/api'
import { formatCurrency, formatDateTime } from '../utils/format'
import { filterPaymentMethodsByScope } from '../utils/paymentMethodScopes'

function formatTransactionLabel(transaction, t) {
  if (transaction.type === 'charge') {
    return t('customers.ledger.transactionTypes.charge')
  }

  if (transaction.type === 'payment') {
    return t('customers.ledger.transactionTypes.payment')
  }

  return t('customers.ledger.transactionTypes.adjustment')
}

function formatRoleLabel(role, t) {
  if (['admin', 'developer', 'rep', 'comptable'].includes(role)) {
    return t(`badges.roles.${role}`)
  }

  return role
}

function matchesLedgerQuery(values, query) {
  if (!query) {
    return true
  }

  const normalized = query.trim().toLowerCase()
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized))
}

function buildPaymentState(defaultMethod, initialInvoiceId = '') {
  return {
    amount: '',
    method: defaultMethod,
    invoice_id: initialInvoiceId ? String(initialInvoiceId) : '',
    note: '',
  }
}

export default function CustomerLedgerModal({
  open,
  customer,
  initialInvoiceId = '',
  onClose,
  onPaymentSaved,
}) {
  const { t } = useI18n()
  const { items: configItems } = useConfigItems(['payment_method'])
  const paymentMethods = filterPaymentMethodsByScope(configItems.payment_method ?? [], 'customer')
  const availablePaymentMethods = paymentMethods.length > 0 ? paymentMethods : [{ value: 'cash', display_label: t('customers.cashFallback') }]
  const defaultPaymentMethod = getDefaultConfigValue(availablePaymentMethods, 'cash')
  const [ledger, setLedger] = useState(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState('')
  const [ledgerQuery, setLedgerQuery] = useState('')
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all')
  const [pay, setPay] = useState(() => buildPaymentState(defaultPaymentMethod, initialInvoiceId))
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    setPay((current) => {
      if (current.method) {
        return current
      }

      return { ...current, method: defaultPaymentMethod }
    })
  }, [defaultPaymentMethod])

  useEffect(() => {
    if (!open || !customer?.id) {
      setLedger(null)
      setLedgerError('')
      setLedgerQuery('')
      setLedgerTypeFilter('all')
      setPay(buildPaymentState(defaultPaymentMethod, ''))
      return
    }

    let active = true

    const loadLedger = async () => {
      setLedgerLoading(true)
      setLedgerError('')
      setLedger(null)
      setLedgerQuery('')
      setLedgerTypeFilter('all')
      setPay(buildPaymentState(defaultPaymentMethod, initialInvoiceId))

      try {
        const response = await api.get(`/customers/${customer.id}/ledger`)
        if (!active) {
          return
        }

        setLedger(response.data)
      } catch (error) {
        if (!active) {
          return
        }

        setLedgerError(error.response?.data?.message || t('customers.ledger.loadFailed'))
      } finally {
        if (active) {
          setLedgerLoading(false)
        }
      }
    }

    void loadLedger()

    return () => {
      active = false
    }
  }, [customer?.id, defaultPaymentMethod, initialInvoiceId, open, t])

  const filteredOpenInvoices = useMemo(() => {
    const items = ledger?.open_invoices ?? []

    return items.filter((invoice) => matchesLedgerQuery([
      invoice.number,
      invoice.rep_name,
      invoice.route_session_id,
      invoice.camion_name,
      invoice.camion_plate,
      invoice.status,
      invoice.payment_status,
    ], ledgerQuery))
  }, [ledger?.open_invoices, ledgerQuery])

  const filteredTransactions = useMemo(() => {
    const items = ledger?.transactions ?? []

    return items.filter((transaction) => {
      if (ledgerTypeFilter !== 'all' && transaction.type !== ledgerTypeFilter) {
        return false
      }

      return matchesLedgerQuery([
        transaction.type,
        transaction.invoice_number,
        transaction.rep_name,
        transaction.payment_method,
        transaction.payment_note,
        transaction.route_session_id,
        transaction.camion_name,
        transaction.camion_plate,
        ...(transaction.allocations ?? []).flatMap((allocation) => [
          allocation.invoice_number,
          allocation.route_session_id,
          allocation.camion_name,
          allocation.camion_plate,
        ]),
      ], ledgerQuery)
    })
  }, [ledger?.transactions, ledgerQuery, ledgerTypeFilter])

  const handleClose = () => {
    setLedger(null)
    setLedgerError('')
    setLedgerQuery('')
    setLedgerTypeFilter('all')
    setPay(buildPaymentState(defaultPaymentMethod, ''))
    onClose?.()
  }

  const submitPayment = async () => {
    if (!pay.amount || Number(pay.amount) <= 0 || !customer?.id) {
      return
    }

    setPaying(true)
    setLedgerError('')

    try {
      await api.post('/payments', {
        customer_id: customer.id,
        invoice_id: pay.invoice_id || null,
        amount: Number(pay.amount),
        method: pay.method || defaultPaymentMethod,
        note: pay.note || null,
      })

      const response = await api.get(`/customers/${customer.id}/ledger`)
      setLedger(response.data)
      setPay(buildPaymentState(defaultPaymentMethod, pay.invoice_id))
      await onPaymentSaved?.()
    } catch (error) {
      setLedgerError(error.response?.data?.message || t('customers.ledger.paymentFailed'))
    } finally {
      setPaying(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('customers.ledger.title', { name: customer?.name ?? '' })}
      size="lg"
    >
      {ledgerLoading ? (
        <PageLoader />
      ) : ledgerError ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
        >
          {ledgerError}
        </div>
      ) : !ledger ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div
              className="rounded-xl border p-4"
              style={{
                background: Number(ledger.customer.credit_balance) > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                borderColor: Number(ledger.customer.credit_balance) > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              }}
            >
              <div className="text-xs text-muted-color mb-1">{t('customers.ledger.customerBalance')}</div>
              <div className="text-2xl font-bold" style={{ color: Number(ledger.customer.credit_balance) > 0 ? '#dc2626' : '#059669' }}>
                {formatCurrency(ledger.customer.credit_balance)}
              </div>
              <div className="text-xs text-secondary-color mt-2">{t('customers.ledger.openInvoicesCount', { count: ledger.summary?.open_invoice_count ?? 0 })}</div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs text-muted-color mb-1">{t('customers.ledger.openRemaining')}</div>
              <div className="text-xl font-bold font-mono text-base-color">{formatCurrency(ledger.summary?.open_due_total)}</div>
              <div className="text-xs text-secondary-color mt-2">
                {ledger.customer.credit_limit
                  ? t('customers.ledger.limitWithValue', { value: formatCurrency(ledger.customer.credit_limit) })
                  : t('customers.ledger.limitUndefined')}
              </div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs text-muted-color mb-1">{t('customers.ledger.paymentEvents')}</div>
              <div className="text-xl font-bold text-base-color">{ledger.summary?.payment_event_count ?? 0}</div>
              <div className="text-xs text-secondary-color mt-2">
                {t('customers.ledger.lastActivity', { value: formatDateTime(ledger.summary?.last_activity_at) })}
              </div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs text-muted-color mb-1">{t('customers.ledger.assignedAccount')}</div>
              <div className="text-base font-semibold text-base-color">{ledger.customer.owner?.name || t('customers.unassigned')}</div>
              <div className="text-xs text-secondary-color mt-2">{ledger.customer.owner?.role ? formatRoleLabel(ledger.customer.owner.role, t) : t('customers.noRole')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
            <div className="rounded-xl p-4 border border-theme" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-3">
                <i className="fa-solid fa-circle-plus mr-1.5" style={{ color: '#0d9488' }} />
                {t('customers.ledger.collectPayment')}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder={t('customers.ledger.amountPlaceholder')}
                  value={pay.amount}
                  onChange={(event) => setPay((current) => ({ ...current, amount: event.target.value }))}
                />
                <select value={pay.method} onChange={(event) => setPay((current) => ({ ...current, method: event.target.value }))}>
                  {availablePaymentMethods.map((method) => (
                    <option key={method.id ?? method.value} value={method.value}>
                      {getConfigItemLabel(method)}
                    </option>
                  ))}
                </select>
              </div>
              <select className="mb-2" value={pay.invoice_id} onChange={(event) => setPay((current) => ({ ...current, invoice_id: event.target.value }))}>
                <option value="">{t('customers.ledger.autoAllocate')}</option>
                {ledger.open_invoices?.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} - {t('customers.ledger.remainingLabel', { value: formatCurrency(invoice.due_amount) })}
                  </option>
                ))}
              </select>
              <input
                className="mb-2"
                value={pay.note}
                onChange={(event) => setPay((current) => ({ ...current, note: event.target.value }))}
                placeholder={t('customers.ledger.internalNotePlaceholder')}
              />
              <p className="text-[11px] text-muted-color mb-3">
                {t('customers.ledger.surplusHint')}
              </p>
              <button onClick={submitPayment} disabled={paying || !pay.amount} className="btn-primary w-full">
                {paying ? <><i className="fa-solid fa-spinner fa-spin" /> {t('customers.ledger.collecting')}</> : <><i className="fa-solid fa-circle-check" /> {t('customers.ledger.collectNow')}</>}
              </button>
            </div>

            <div className="rounded-xl p-4 border border-theme" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-bold text-muted-color uppercase tracking-wider">{t('customers.ledger.filtersTitle')}</div>
                  <div className="text-xs text-secondary-color mt-1">{t('customers.ledger.filtersHint')}</div>
                </div>
                <div className="text-xs text-muted-color">
                  {t('customers.ledger.countSummary', { movements: filteredTransactions.length, invoices: filteredOpenInvoices.length })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-2">
                <input
                  value={ledgerQuery}
                  onChange={(event) => setLedgerQuery(event.target.value)}
                  placeholder={t('customers.ledger.searchPlaceholder')}
                />
                <select value={ledgerTypeFilter} onChange={(event) => setLedgerTypeFilter(event.target.value)}>
                  <option value="all">{t('customers.ledger.allMovements')}</option>
                  <option value="charge">{t('customers.ledger.transactionTypes.charge')}</option>
                  <option value="payment">{t('customers.ledger.transactionTypes.payment')}</option>
                  <option value="adjustment">{t('customers.ledger.transactionTypes.adjustment')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-xs font-bold text-muted-color uppercase tracking-wider">{t('customers.ledger.openInvoicesTitle')}</div>
                <div className="text-xs text-secondary-color mt-1">{t('customers.ledger.openInvoicesHint')}</div>
              </div>
              <div className="text-xs text-muted-color">{t('customers.ledger.results', { count: filteredOpenInvoices.length })}</div>
            </div>

            <div className="space-y-2">
              {filteredOpenInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl border border-theme p-3" style={{ background: 'var(--surface)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={invoice.invoice_url} className="font-mono text-xs text-primary hover:underline">
                          {invoice.number}
                        </Link>
                        <PaymentStatusBadge status={invoice.payment_status} />
                      </div>
                      <div className="text-xs text-secondary-color mt-1">
                        {invoice.rep_name || t('customers.ledger.repUnknown')} | {formatDateTime(invoice.created_at)}
                      </div>
                      <div className="text-xs text-secondary-color mt-1">
                        {invoice.route_session_id ? (
                          <>
                            <Link to={invoice.route_session_url} className="text-primary hover:underline">
                              {t('customers.ledger.sessionLabel', { id: invoice.route_session_id })}
                            </Link>
                            {' | '}
                            {invoice.camion_name || t('customers.ledger.camionUnknown')}
                            {invoice.camion_plate ? ` | ${invoice.camion_plate}` : ''}
                          </>
                        ) : (
                          t('customers.ledger.noSessionAttached')
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-bold font-mono text-sm" style={{ color: '#dc2626' }}>
                        {formatCurrency(invoice.due_amount)}
                      </div>
                      <div className="text-[11px] text-muted-color">
                        {t('customers.ledger.attemptCount', { count: invoice.payment_attempt_count || 0 })}
                      </div>
                      <div className="text-[11px] text-muted-color">
                        {t('customers.ledger.lastPayment', { value: formatDateTime(invoice.last_payment_at) })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!filteredOpenInvoices.length && (
                <div className="text-center text-muted-color text-sm py-8">{t('customers.ledger.noOpenInvoices')}</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-xs font-bold text-muted-color uppercase tracking-wider">{t('customers.ledger.historyTitle')}</div>
                <div className="text-xs text-secondary-color mt-1">{t('customers.ledger.historyHint')}</div>
              </div>
              <div className="text-xs text-muted-color">{t('customers.ledger.results', { count: filteredTransactions.length })}</div>
            </div>

            <div className="max-h-[28rem] overflow-y-auto space-y-2 rounded-xl">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-theme p-3" style={{ background: 'var(--surface)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-base-color">{formatTransactionLabel(transaction, t)}</div>
                      <div className="text-xs text-secondary-color mt-1">{formatDateTime(transaction.created_at)}</div>
                      <div className="text-xs text-secondary-color mt-1">
                        {transaction.invoice_id ? (
                          <Link to={transaction.invoice_url} className="text-primary hover:underline">
                            {transaction.invoice_number}
                          </Link>
                        ) : (
                          t('customers.ledger.withoutInvoice')
                        )}
                        {transaction.rep_name ? ` | ${transaction.rep_name}` : ''}
                      </div>
                      <div className="text-xs text-secondary-color mt-1">
                        {transaction.route_session_id ? (
                          <>
                            <Link to={transaction.route_session_url} className="text-primary hover:underline">
                              {t('customers.ledger.sessionLabel', { id: transaction.route_session_id })}
                            </Link>
                            {' | '}
                            {transaction.camion_name || t('customers.ledger.camionUnknown')}
                            {transaction.camion_plate ? ` | ${transaction.camion_plate}` : ''}
                          </>
                        ) : (
                          t('customers.ledger.noSessionAttached')
                        )}
                      </div>
                      {(transaction.payment_method || transaction.payment_note) && (
                        <div className="text-xs text-secondary-color mt-1">
                          {transaction.payment_method
                            ? t('customers.ledger.paymentMethodLabel', { value: transaction.payment_method })
                            : t('customers.ledger.paymentMethodUnknown')}
                          {transaction.payment_note ? ` | ${transaction.payment_note}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-bold font-mono" style={{ color: Number(transaction.amount) >= 0 ? '#dc2626' : '#059669' }}>
                        {Number(transaction.amount) >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </div>
                      <div className="text-[11px] text-muted-color">{t('customers.ledger.balanceLabel', { value: formatCurrency(transaction.balance_after) })}</div>
                      <div className="text-[11px] text-muted-color">{t('customers.ledger.allocationCount', { count: transaction.allocation_count || 0 })}</div>
                    </div>
                  </div>

                  {transaction.allocations?.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {transaction.allocations.map((allocation, index) => (
                        <div key={`${transaction.id}-${allocation.invoice_id || index}`} className="rounded-lg border border-theme px-3 py-2 text-xs" style={{ background: 'var(--surface-2)' }}>
                          <div className="font-semibold text-base-color">
                            {allocation.invoice_id ? (
                              <Link to={allocation.invoice_url} className="text-primary hover:underline">
                                {allocation.invoice_number}
                              </Link>
                            ) : (
                              t('customers.ledger.invoiceUnknown')
                            )}
                          </div>
                          <div className="text-secondary-color mt-1">
                            {t('customers.ledger.amountLabel', { value: formatCurrency(allocation.amount) })}
                          </div>
                          <div className="text-secondary-color mt-1">
                            {allocation.route_session_id ? t('customers.ledger.sessionLabel', { id: allocation.route_session_id }) : t('customers.ledger.withoutSession')}
                            {allocation.camion_name ? ` | ${allocation.camion_name}` : ''}
                            {allocation.camion_plate ? ` | ${allocation.camion_plate}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {!filteredTransactions.length && (
                <div className="text-center text-muted-color text-sm py-8">{t('customers.ledger.noTransactions')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
