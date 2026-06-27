import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { DepotSelectionInfo } from '../../components/DepotScopeControls'
import FrenchDateRangeInput from '../../components/FrenchDateRangeInput'
import FrenchDateTimeInput from '../../components/FrenchDateTimeInput'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../../hooks/useConfigItems'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'
import { filterPaymentMethodsByScope } from '../../utils/paymentMethodScopes'
import { paginateItems } from '../../utils/pagination'

const DEFAULT_MONTH = new Date().toISOString().slice(0, 7)

function buildEmptyExpense(defaultCategory, depotId = null, defaultPaymentMethod = 'cash') {
  const today = new Date().toISOString().slice(0, 10)

  return {
    expense_date: today,
    category: defaultCategory,
    label: '',
    amount: '',
    initial_paid_amount: '',
    payment_method: defaultPaymentMethod,
    payment_date: today,
    payment_note: '',
    depot_id: depotId ? String(depotId) : '',
  }
}

function buildExpensePayment(defaultPaymentMethod = 'cash') {
  return {
    amount: '',
    payment_method: defaultPaymentMethod,
    payment_date: new Date().toISOString().slice(0, 10),
    note: '',
  }
}

function resolveExpenseStatusMeta(status, t) {
  const map = {
    paid: {
      label: t('expensesPage.status.paid'),
      text: '#059669',
      bg: 'rgba(16,185,129,0.10)',
    },
    partial: {
      label: t('expensesPage.status.partial'),
      text: '#d97706',
      bg: 'rgba(245,158,11,0.12)',
    },
    unpaid: {
      label: t('expensesPage.status.unpaid'),
      text: '#dc2626',
      bg: 'rgba(239,68,68,0.10)',
    },
  }

  return map[status] ?? map.unpaid
}

function resolveHistoryEventMeta(eventType, t) {
  const map = {
    expense: {
      label: t('expensesPage.historyTab.eventTypes.expense'),
      icon: 'fa-solid fa-receipt',
      text: '#0f766e',
      bg: 'rgba(13,148,136,0.10)',
    },
    payment: {
      label: t('expensesPage.historyTab.eventTypes.payment'),
      icon: 'fa-solid fa-wallet',
      text: '#2563eb',
      bg: 'rgba(59,130,246,0.10)',
    },
  }

  return map[eventType] ?? map.expense
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

function ExpensesFilters({
  t,
  month,
  setMonth,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  hasFilters,
  onReset,
  hint = '',
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.filters.month')}</label>
          <FrenchDateTimeInput
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value)
              if (event.target.value) {
                setDateFrom('')
                setDateTo('')
              }
            }}
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.filters.category')}</label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">{t('expensesPage.filters.allCategories')}</option>
            {categoryOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('common.dateRange')}</label>
          <FrenchDateRangeInput
            valueFrom={dateFrom}
            valueTo={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from)
              setDateTo(to)
              setMonth('')
            }}
          />
        </div>
      </div>

      {(hint || hasFilters) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-muted-color">{hint}</div>
          {hasFilters && (
            <div className="flex justify-end">
              <button onClick={onReset} className="btn-secondary text-xs">
                <i className="fa-solid fa-rotate-left" /> {t('common.resetFilters')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ExpensesIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const { items: configItems } = useConfigItems(['expense_category', 'payment_method'], { includeInactive: true })
  const { layouts: documentLayouts } = useDocumentLayouts()
  const allCategories = configItems.expense_category ?? []
  const activeCategories = allCategories.filter((item) => item.active !== false)
  const defaultCategory = getDefaultConfigValue(activeCategories, allCategories[0]?.value ?? 'divers')
  const allPaymentMethods = configItems.payment_method ?? []
  const paymentMethods = filterPaymentMethodsByScope(
    allPaymentMethods.filter((item) => item.active !== false),
    'expense',
  )
  const availablePaymentMethods = paymentMethods.length > 0
    ? paymentMethods
    : [{ value: 'cash', display_label: t('expensesPage.cashFallback') }]
  const defaultPaymentMethod = getDefaultConfigValue(availablePaymentMethods, 'cash')

  const {
    depots,
    selectedDepotId,
    selectedDepot,
    scopeParams,
    ready: depotsReady,
  } = useDepots({
    allowAll: false,
    storageKey: 'app-depot-scope',
    defaultToAll: false,
  })

  const singleDepot = depots.length === 1 ? depots[0] : null
  const currentDepot = selectedDepot ?? singleDepot ?? depots[0] ?? null
  const scopedDepotId = selectedDepotId ?? currentDepot?.id ?? null

  const [tab, setTab] = useState('current')
  const [expenses, setExpenses] = useState([])
  const [historyEntries, setHistoryEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [form, setForm] = useState(buildEmptyExpense(defaultCategory, scopedDepotId, defaultPaymentMethod))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(DEFAULT_MONTH)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expensesPage, setExpensesPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [activeExpense, setActiveExpense] = useState(null)
  const [paymentForm, setPaymentForm] = useState(buildExpensePayment(defaultPaymentMethod))
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    setForm((current) => ({
      ...current,
      category: current.category || defaultCategory,
      payment_method: current.payment_method || defaultPaymentMethod,
      depot_id: scopedDepotId ? String(scopedDepotId) : '',
    }))
    setPaymentForm((current) => ({
      ...current,
      payment_method: current.payment_method || defaultPaymentMethod,
    }))
  }, [defaultCategory, defaultPaymentMethod, scopedDepotId])

  const buildFilterParams = () => {
    const params = { ...scopeParams }

    if (month && !dateFrom && !dateTo) {
      params.month = month
    }
    if (categoryFilter) {
      params.category = categoryFilter
    }
    if (dateFrom) {
      params.date_from = dateFrom
    }
    if (dateTo) {
      params.date_to = dateTo
    }

    return params
  }

  const loadExpenses = async () => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

    try {
      const response = await api.get('/expenses', { params: buildFilterParams() })
      setExpenses(Array.isArray(response.data) ? response.data : [])
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    if (!depotsReady) {
      return
    }

    setHistoryLoading(true)

    try {
      const response = await api.get('/expenses/history', { params: buildFilterParams() })
      setHistoryEntries(Array.isArray(response.data) ? response.data : [])
    } catch {
      setHistoryEntries([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    void loadExpenses()
  }, [categoryFilter, dateFrom, dateTo, depotsReady, month, scopedDepotId])

  useEffect(() => {
    if (tab === 'history') {
      void loadHistory()
    }
  }, [categoryFilter, dateFrom, dateTo, depotsReady, month, scopedDepotId, tab])

  const categoryMap = useMemo(
    () => new Map(allCategories.map((item) => [String(item.value), item])),
    [allCategories],
  )

  const categoryOptions = useMemo(() => {
    const seen = new Set()
    const options = []

    allCategories.forEach((item) => {
      const value = String(item.value ?? '')
      if (!value || seen.has(value)) {
        return
      }

      seen.add(value)
      options.push({
        value,
        label: getConfigItemLabel(item),
      })
    })

    ;[...expenses, ...historyEntries].forEach((entry) => {
      const value = String(entry?.category?.value ?? entry?.category ?? '')
      if (!value || seen.has(value)) {
        return
      }

      seen.add(value)
      options.push({
        value,
        label: entry?.category_label || entry?.category_meta?.label || getConfigItemLabel(categoryMap.get(value), value),
      })
    })

    return options
  }, [allCategories, categoryMap, expenses, historyEntries])

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const totalPaid = expenses.reduce((sum, expense) => sum + Number(expense.paid_amount || 0), 0)
  const totalOutstanding = expenses.reduce((sum, expense) => sum + Number(expense.remaining_amount || 0), 0)
  const followUpCount = expenses.filter((expense) => Number(expense.remaining_amount || 0) > 0).length
  const historyCreatedTotal = historyEntries.reduce(
    (sum, entry) => sum + (entry.event_type === 'expense' ? Number(entry.expense_amount || 0) : 0),
    0,
  )
  const historyPaymentsTotal = historyEntries.reduce((sum, entry) => sum + Number(entry.payment_amount || 0), 0)
  const historyImpactedCount = useMemo(
    () => new Set(historyEntries.map((entry) => entry.expense_id)).size,
    [historyEntries],
  )
  const historyOpenCount = useMemo(
    () => new Set(
      historyEntries
        .filter((entry) => entry.current_payment_status && entry.current_payment_status !== 'paid')
        .map((entry) => entry.expense_id),
    ).size,
    [historyEntries],
  )

  const { items: paginatedExpenses, meta: expensesMeta } = useMemo(
    () => paginateItems(expenses, expensesPage, perPage),
    [expenses, expensesPage, perPage],
  )
  const { items: paginatedHistoryEntries, meta: historyMeta } = useMemo(
    () => paginateItems(historyEntries, historyPage, perPage),
    [historyEntries, historyPage, perPage],
  )

  useEffect(() => {
    setExpensesPage(1)
    setHistoryPage(1)
  }, [categoryFilter, dateFrom, dateTo, month, scopedDepotId])

  useEffect(() => {
    if (expensesPage !== expensesMeta.current_page) {
      setExpensesPage(expensesMeta.current_page)
    }
  }, [expensesMeta.current_page, expensesPage])

  useEffect(() => {
    if (historyPage !== historyMeta.current_page) {
      setHistoryPage(historyMeta.current_page)
    }
  }, [historyMeta.current_page, historyPage])

  const reloadAll = async () => {
    await Promise.all([loadExpenses(), loadHistory()])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    if (!scopedDepotId) {
      setError(t('expensesPage.errors.noActiveDepot'))
      setSaving(false)
      return
    }

    try {
      await api.post('/expenses', {
        expense_date: form.expense_date,
        category: form.category,
        label: form.label,
        amount: Number(form.amount),
        initial_paid_amount: form.initial_paid_amount === '' ? undefined : Number(form.initial_paid_amount),
        payment_method: form.payment_method || defaultPaymentMethod,
        payment_date: form.payment_date || form.expense_date,
        payment_note: form.payment_note || null,
        depot_id: Number(scopedDepotId),
      })
      setForm(buildEmptyExpense(defaultCategory, scopedDepotId, defaultPaymentMethod))
      await reloadAll()
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('expensesPage.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (expense) => {
    if (!confirm(t('expensesPage.deleteConfirm'))) {
      return
    }

    try {
      await api.delete(`/expenses/${expense.id}`)
      await reloadAll()
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('expensesPage.errors.deleteBlocked'))
    }
  }

  const openPaymentModal = (expense) => {
    setActiveExpense(expense)
    setPaymentError('')
    setPaymentForm({
      amount: '',
      payment_method: defaultPaymentMethod,
      payment_date: expense.last_payment_date || expense.expense_date || new Date().toISOString().slice(0, 10),
      note: '',
    })
  }

  const submitExpensePayment = async () => {
    if (!activeExpense?.id || !paymentForm.amount) {
      return
    }

    setPaymentSaving(true)
    setPaymentError('')

    try {
      const response = await api.post(`/expenses/${activeExpense.id}/payments`, {
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method || defaultPaymentMethod,
        payment_date: paymentForm.payment_date,
        note: paymentForm.note || null,
      })

      setActiveExpense(response.data)
      setPaymentForm(buildExpensePayment(defaultPaymentMethod))
      await reloadAll()
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || t('expensesPage.errors.paymentFailed'))
    } finally {
      setPaymentSaving(false)
    }
  }

  const hasFilters = month !== DEFAULT_MONTH || categoryFilter || dateFrom || dateTo
  const resetFilters = () => {
    setMonth(DEFAULT_MONTH)
    setCategoryFilter('')
    setDateFrom('')
    setDateTo('')
  }
  const exportParams = {
    ...(dateFrom || dateTo
      ? { date_from: dateFrom || dateTo, date_to: dateTo || dateFrom }
      : month
        ? {
            date_from: `${month}-01`,
            date_to: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10),
          }
        : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...scopeParams,
  }
  const activeExportConfig = tab === 'history'
    ? {
        title: t('expensesPage.historyTab.title'),
        csvEntity: 'expenses_history',
        csvFilename: 'depenses_historique',
        documentKey: 'expenses_history_list',
        records: historyEntries,
      }
    : {
        title: t('expensesPage.title'),
        csvEntity: 'expenses',
        csvFilename: 'depenses',
        documentKey: 'expenses_list',
        records: expenses,
      }

  return (
    <div>
      <PageHeader
        title={t('expensesPage.title')}
        subtitle={currentDepot ? t('expensesPage.subtitleWithDepot', { name: currentDepot.name }) : t('expensesPage.subtitle')}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            <PageExportActions
              title={activeExportConfig.title}
              csvEntity={activeExportConfig.csvEntity}
              csvParams={exportParams}
              csvFilename={activeExportConfig.csvFilename}
              documentKey={activeExportConfig.documentKey}
              records={activeExportConfig.records}
              documentLayouts={documentLayouts}
            />
          </div>
        )}
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'current', label: t('expensesPage.tabs.current'), icon: 'fa-solid fa-list-check' },
          { key: 'history', label: t('expensesPage.tabs.history'), icon: 'fa-solid fa-clock-rotate-left' },
        ].map((item) => (
          <button
            key={item.key}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
              <i className="fa-solid fa-plus text-teal-500" /> {t('expensesPage.form.title')}
            </h2>
            {error && (
              <div
                className="text-sm mb-3 p-2.5 rounded-xl border"
                style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}
              >
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.date')}</label>
                <FrenchDateTimeInput
                  type="date"
                  value={form.expense_date}
                  onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.category')}</label>
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  {activeCategories.map((item) => (
                    <option key={item.id} value={item.value}>
                      {getConfigItemLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.depot')}</label>
                {currentDepot ? (
                  <DepotSelectionInfo depot={currentDepot} />
                ) : (
                  <div
                    className="rounded-2xl px-3 py-2 text-xs text-muted-color"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    {t('expensesPage.form.noDepotLinked')}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.label')}</label>
                <input
                  type="text"
                  placeholder={t('expensesPage.form.placeholders.label')}
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.amount')}</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.initialPaidAmount')}</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder={t('expensesPage.form.placeholders.initialPaidAmount')}
                  value={form.initial_paid_amount}
                  onChange={(event) => setForm((current) => ({ ...current, initial_paid_amount: event.target.value }))}
                />
                <p className="mt-1 text-[11px] text-muted-color">{t('expensesPage.form.initialPaidHint')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.paymentMethod')}</label>
                  <select
                    value={form.payment_method}
                    onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
                  >
                    {availablePaymentMethods.map((method) => (
                      <option key={method.id ?? method.value} value={method.value}>
                        {getConfigItemLabel(method)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.paymentDate')}</label>
                  <FrenchDateTimeInput
                    type="date"
                    value={form.payment_date}
                    onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.form.fields.paymentNote')}</label>
                <input
                  type="text"
                  placeholder={t('expensesPage.form.placeholders.paymentNote')}
                  value={form.payment_note}
                  onChange={(event) => setForm((current) => ({ ...current, payment_note: event.target.value }))}
                />
              </div>
              <button type="submit" disabled={saving || !scopedDepotId} className="btn-primary w-full justify-center">
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('expensesPage.form.saving')}</>
                  : <><i className="fa-solid fa-check" /> {t('expensesPage.form.submit')}</>}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-base-color">{t('expensesPage.list.title')}</h2>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-color">
                  <span>{t('expensesPage.list.total')}: <span className="font-mono font-semibold" style={{ color: '#ea580c' }}>{formatCurrency(total)}</span></span>
                  <span>{t('expensesPage.list.paidTotal')}: <span className="font-mono font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span></span>
                  <span>{t('expensesPage.list.outstandingTotal')}: <span className="font-mono font-semibold text-red-600">{formatCurrency(totalOutstanding)}</span></span>
                  <span>{t('expensesPage.list.followUpCount', { count: followUpCount })}</span>
                </div>
              </div>
            </div>

            <ExpensesFilters
              t={t}
              month={month}
              setMonth={setMonth}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categoryOptions={categoryOptions}
              dateFrom={dateFrom}
              dateTo={dateTo}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo}
              hasFilters={hasFilters}
              onReset={resetFilters}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-color">
                <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('expensesPage.loading')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {[
                        t('expensesPage.columns.date'),
                        t('expensesPage.columns.category'),
                        t('expensesPage.columns.depot'),
                        t('expensesPage.columns.label'),
                        t('expensesPage.columns.amount'),
                        t('expensesPage.columns.paid'),
                        t('expensesPage.columns.remaining'),
                        t('expensesPage.columns.status'),
                        t('expensesPage.columns.history'),
                        '',
                      ].map((heading, index) => (
                        <th key={heading || 'actions'} className={`pb-3 pr-3 ${index >= 4 && index <= 6 ? 'text-right' : 'text-left'}`}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center">
                          <i className="fa-solid fa-receipt text-3xl text-muted-color opacity-30 mb-2 block" />
                          <p className="text-muted-color text-sm">{t('expensesPage.empty')}</p>
                        </td>
                      </tr>
                    )}
                    {paginatedExpenses.map((expense) => {
                      const categoryValue = expense.category?.value ?? expense.category
                      const categoryLabel = expense.category_label || getConfigItemLabel(categoryMap.get(String(categoryValue)), categoryValue)
                      const categoryMeta = expense.category_meta ?? categoryMap.get(String(categoryValue))
                      const badgeColor = categoryMeta?.color || '#64748b'
                      const badgeIcon = categoryMeta?.icon || 'fa-solid fa-tag'
                      const statusMeta = resolveExpenseStatusMeta(expense.payment_status, t)

                      return (
                        <tr key={expense.id} className="table-row">
                          <td className="py-3 pr-3 text-secondary-color text-xs font-mono">
                            {formatDate(expense.expense_date)}
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                              style={{ background: `${badgeColor}18`, color: badgeColor }}
                            >
                              <i className={badgeIcon} />
                              {categoryLabel}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-muted-color text-xs">{expense.depot?.name ?? notAvailable}</td>
                          <td className="py-3 pr-3 text-base-color">{expense.label}</td>
                          <td className="py-3 pr-3 text-right font-mono font-bold text-sm" style={{ color: '#ea580c' }}>
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-sm text-emerald-600">
                            {formatCurrency(expense.paid_amount)}
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-sm text-red-600">
                            {formatCurrency(expense.remaining_amount)}
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{ color: statusMeta.text, background: statusMeta.bg }}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-xs text-secondary-color">
                            <div>{t('expensesPage.history.summary', { count: expense.payment_count || 0 })}</div>
                            <div>{expense.last_payment_date ? formatDate(expense.last_payment_date) : t('expensesPage.history.never')}</div>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => openPaymentModal(expense)} className="btn-secondary text-xs">
                                <i className="fa-solid fa-wallet" /> {t('expensesPage.actions.followUp')}
                              </button>
                              <RowDocumentActions
                                documentKey="expense_item"
                                record={expense}
                                documentLayouts={documentLayouts}
                                title={t('expensesPage.documentTitle', { label: expense.label || expense.id, id: expense.id })}
                                filename={`depense_${expense.id}`}
                              />
                              <button onClick={() => handleDelete(expense)} className="text-muted-color hover:text-red-500 transition-colors p-1">
                                <i className="fa-solid fa-trash text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (
              <PaginationControls
                meta={expensesMeta}
                perPage={perPage}
                onPageChange={setExpensesPage}
                onPerPageChange={(value) => {
                  setPerPage(value)
                  setExpensesPage(1)
                  setHistoryPage(1)
                }}
                itemLabel={t('expensesPage.itemLabel')}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-teal-500" />
              {t('expensesPage.historyTab.title')}
            </h2>
            <p className="text-xs text-muted-color">{t('expensesPage.historyTab.subtitle')}</p>
          </div>

          <ExpensesFilters
            t={t}
            month={month}
            setMonth={setMonth}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categoryOptions={categoryOptions}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            hasFilters={hasFilters}
            onReset={resetFilters}
            hint={t('expensesPage.historyTab.eventDateHint')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 my-5">
            <HistorySummaryCard
              icon="fa-solid fa-wave-square"
              color="#0f766e"
              label={t('expensesPage.historyTab.kpis.events')}
              value={historyEntries.length}
            />
            <HistorySummaryCard
              icon="fa-solid fa-file-circle-plus"
              color="#ea580c"
              label={t('expensesPage.historyTab.kpis.createdTotal')}
              value={formatCurrency(historyCreatedTotal)}
            />
            <HistorySummaryCard
              icon="fa-solid fa-wallet"
              color="#2563eb"
              label={t('expensesPage.historyTab.kpis.paymentTotal')}
              value={formatCurrency(historyPaymentsTotal)}
            />
            <HistorySummaryCard
              icon="fa-solid fa-list-check"
              color="#dc2626"
              label={t('expensesPage.historyTab.kpis.openExpenses')}
              value={historyOpenCount > 0
                ? `${historyOpenCount} / ${historyImpactedCount}`
                : historyImpactedCount}
            />
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-color">
              <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('expensesPage.historyTab.loading')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[
                      t('expensesPage.historyTab.columns.date'),
                      t('expensesPage.historyTab.columns.event'),
                      t('expensesPage.historyTab.columns.category'),
                      t('expensesPage.historyTab.columns.depot'),
                      t('expensesPage.historyTab.columns.label'),
                      t('expensesPage.historyTab.columns.expenseAmount'),
                      t('expensesPage.historyTab.columns.paymentAmount'),
                      t('expensesPage.historyTab.columns.remaining'),
                      t('expensesPage.historyTab.columns.statusAfter'),
                      t('expensesPage.historyTab.columns.actor'),
                    ].map((heading, index) => (
                      <th key={heading} className={`pb-3 pr-3 ${index >= 5 && index <= 7 ? 'text-right' : 'text-left'}`}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <i className="fa-solid fa-clock-rotate-left text-3xl text-muted-color opacity-30 mb-2 block" />
                        <p className="text-muted-color text-sm">{t('expensesPage.historyTab.empty')}</p>
                      </td>
                    </tr>
                  )}
                  {paginatedHistoryEntries.map((entry) => {
                    const categoryMeta = entry.category_meta ?? categoryMap.get(String(entry.category))
                    const categoryColor = categoryMeta?.color || '#64748b'
                    const categoryIcon = categoryMeta?.icon || 'fa-solid fa-tag'
                    const eventMeta = resolveHistoryEventMeta(entry.event_type, t)
                    const statusMeta = resolveExpenseStatusMeta(entry.event_status_after, t)

                    return (
                      <tr key={entry.history_id} className="table-row">
                        <td className="py-3 pr-3 text-xs">
                          <div className="font-mono text-base-color">{formatDate(entry.event_date)}</div>
                          <div className="text-muted-color mt-1">{formatDateTime(entry.event_recorded_at)}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{ color: eventMeta.text, background: eventMeta.bg }}
                          >
                            <i className={eventMeta.icon} />
                            {eventMeta.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{ background: `${categoryColor}18`, color: categoryColor }}
                          >
                            <i className={categoryIcon} />
                            {entry.category_label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-muted-color text-xs">{entry.depot?.name ?? notAvailable}</td>
                        <td className="py-3 pr-3">
                          <div className="text-base-color font-medium">{entry.label}</div>
                          <div className="text-xs text-secondary-color mt-1">{t(`expensesPage.historyTab.eventDescriptions.${entry.event_type}`)}</div>
                          {entry.payment_method_label && (
                            <div className="text-xs text-secondary-color mt-1">
                              {t('expensesPage.historyTab.paymentMethodPrefix')}: {entry.payment_method_label}
                            </div>
                          )}
                          {entry.note && (
                            <div className="text-xs text-secondary-color mt-1">
                              {t('expensesPage.historyTab.notePrefix')}: {entry.note}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-sm" style={{ color: '#ea580c' }}>
                          {formatCurrency(entry.expense_amount)}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-sm text-emerald-600">
                          {Number(entry.payment_amount) > 0 ? formatCurrency(entry.payment_amount) : '--'}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-sm text-red-600">
                          {formatCurrency(entry.remaining_amount_after_event)}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ color: statusMeta.text, background: statusMeta.bg }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-color">{entry.created_by || notAvailable}</td>
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
              perPage={perPage}
              onPageChange={setHistoryPage}
              onPerPageChange={(value) => {
                setPerPage(value)
                setExpensesPage(1)
                setHistoryPage(1)
              }}
              itemLabel={t('expensesPage.historyTab.itemLabel')}
            />
          )}
        </div>
      )}

      <Modal
        open={!!activeExpense}
        onClose={() => {
          setActiveExpense(null)
          setPaymentError('')
        }}
        title={activeExpense ? t('expensesPage.paymentModal.title', { label: activeExpense.label }) : t('expensesPage.paymentModal.fallbackTitle')}
      >
        {activeExpense && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color mb-1">{t('expensesPage.paymentModal.summary.total')}</div>
                <div className="text-lg font-bold font-mono text-base-color">{formatCurrency(activeExpense.amount)}</div>
              </div>
              <div className="rounded-xl border border-theme p-4" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <div className="text-xs text-muted-color mb-1">{t('expensesPage.paymentModal.summary.paid')}</div>
                <div className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(activeExpense.paid_amount)}</div>
              </div>
              <div className="rounded-xl border border-theme p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
                <div className="text-xs text-muted-color mb-1">{t('expensesPage.paymentModal.summary.remaining')}</div>
                <div className="text-lg font-bold font-mono text-red-600">{formatCurrency(activeExpense.remaining_amount)}</div>
              </div>
              <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color mb-1">{t('expensesPage.paymentModal.summary.status')}</div>
                <div className="text-sm font-semibold text-base-color">{resolveExpenseStatusMeta(activeExpense.payment_status, t).label}</div>
              </div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-3">{t('expensesPage.paymentModal.newPaymentTitle')}</div>
              {paymentError && (
                <div
                  className="mb-3 rounded-xl border px-3 py-2 text-sm"
                  style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}
                >
                  {paymentError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.paymentModal.fields.amount')}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.paymentModal.fields.paymentMethod')}</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, payment_method: event.target.value }))}
                  >
                    {availablePaymentMethods.map((method) => (
                      <option key={method.id ?? method.value} value={method.value}>
                        {getConfigItemLabel(method)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.paymentModal.fields.paymentDate')}</label>
                  <FrenchDateTimeInput
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, payment_date: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-color mb-1 font-medium">{t('expensesPage.paymentModal.fields.note')}</label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder={t('expensesPage.paymentModal.placeholders.note')}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={submitExpensePayment} disabled={paymentSaving || !paymentForm.amount} className="btn-primary">
                  {paymentSaving
                    ? <><i className="fa-solid fa-spinner fa-spin" /> {t('expensesPage.paymentModal.saving')}</>
                    : <><i className="fa-solid fa-circle-check" /> {t('expensesPage.paymentModal.submit')}</>}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-bold text-muted-color uppercase tracking-wider">{t('expensesPage.paymentModal.historyTitle')}</div>
                  <div className="text-xs text-secondary-color mt-1">{t('expensesPage.paymentModal.historyHint')}</div>
                </div>
                <div className="text-xs text-muted-color">{t('expensesPage.history.summary', { count: activeExpense.payment_history?.length || 0 })}</div>
              </div>

              <div className="space-y-2">
                {(activeExpense.payment_history ?? []).map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-theme px-3 py-3" style={{ background: 'var(--surface)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-base-color">{formatCurrency(payment.amount)}</div>
                        <div className="text-xs text-secondary-color mt-1">
                          {payment.payment_method_label || payment.payment_method || t('expensesPage.cashFallback')}
                        </div>
                        <div className="text-xs text-secondary-color mt-1">
                          {payment.note || t('expensesPage.paymentModal.noNote')}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-color">
                        <div>{formatDate(payment.payment_date)}</div>
                        <div className="mt-1">{payment.created_by || notAvailable}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {!(activeExpense.payment_history ?? []).length && (
                  <div className="text-center text-sm text-muted-color py-8">{t('expensesPage.paymentModal.historyEmpty')}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
