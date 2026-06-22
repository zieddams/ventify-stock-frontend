import { useEffect, useMemo, useState } from 'react'
import { DepotSelectionInfo } from '../../components/DepotScopeControls'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { useDepots } from '../../hooks/useDepots'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../../hooks/useConfigItems'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { filterPaymentMethodsByScope } from '../../utils/paymentMethodScopes'
import { paginateItems } from '../../utils/pagination'

const DEFAULT_MONTH = new Date().toISOString().slice(0, 7)

function buildEmptyExpense(defaultCategory, depotId = null, defaultPaymentMethod = 'cash') {
  return {
    expense_date: new Date().toISOString().slice(0, 10),
    category: defaultCategory,
    label: '',
    amount: '',
    payment_method: defaultPaymentMethod,
    depot_id: depotId ? String(depotId) : '',
  }
}

export default function ExpensesIndex() {
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
    : [{ value: 'cash', display_label: 'Especes' }]
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

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(buildEmptyExpense(defaultCategory, scopedDepotId, defaultPaymentMethod))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(DEFAULT_MONTH)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      category: current.category || defaultCategory,
      payment_method: current.payment_method || defaultPaymentMethod,
      depot_id: scopedDepotId ? String(scopedDepotId) : '',
    }))
  }, [defaultCategory, defaultPaymentMethod, scopedDepotId])

  const load = async () => {
    if (!depotsReady) {
      return
    }

    setLoading(true)

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

    try {
      const response = await api.get('/expenses', { params })
      setExpenses(Array.isArray(response.data) ? response.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [month, categoryFilter, dateFrom, dateTo, depotsReady, scopedDepotId])

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const { items: paginatedExpenses, meta: expensesMeta } = useMemo(
    () => paginateItems(expenses, page, perPage),
    [expenses, page, perPage],
  )

  const categoryMap = useMemo(
    () => new Map(allCategories.map((item) => [String(item.value), item])),
    [allCategories],
  )

  useEffect(() => {
    setPage(1)
  }, [month, categoryFilter, dateFrom, dateTo, scopedDepotId])

  useEffect(() => {
    if (page !== expensesMeta.current_page) {
      setPage(expensesMeta.current_page)
    }
  }, [expensesMeta.current_page, page])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    if (!scopedDepotId) {
      setError("Aucun depot actif n'est disponible pour cette depense.")
      setSaving(false)
      return
    }

    try {
      await api.post('/expenses', {
        ...form,
        depot_id: Number(scopedDepotId),
      })
      setForm(buildEmptyExpense(defaultCategory, scopedDepotId, defaultPaymentMethod))
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette depense ?')) {
      return
    }

    await api.delete(`/expenses/${id}`)
    await load()
  }

  const hasFilters = month !== DEFAULT_MONTH || categoryFilter || dateFrom || dateTo
  const exportParams = {
    ...(dateFrom || dateTo
      ? { date_from: dateFrom || dateTo, date_to: dateTo || dateFrom }
      : month
        ? {
            date_from: `${month}-01`,
            date_to: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10),
          }
        : {}),
    ...scopeParams,
  }

  return (
    <div>
      <PageHeader
        title="Depenses"
        subtitle={`Enregistrement et suivi des charges${currentDepot ? ` | Depot ${currentDepot.name}` : ''}`}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            <PageExportActions
              title="Depenses"
              csvEntity="expenses"
              csvParams={exportParams}
              csvFilename="depenses"
              documentKey="expenses_list"
              records={expenses}
              documentLayouts={documentLayouts}
            />
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
            <i className="fa-solid fa-plus text-teal-500" /> Nouvelle depense
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
              <label className="block text-xs text-muted-color mb-1 font-medium">Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Categorie</label>
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {activeCategories.map((item) => (
                  <option key={item.id} value={item.value}>
                    {getConfigItemLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Depot</label>
              {currentDepot ? (
                <DepotSelectionInfo depot={currentDepot} />
              ) : (
                <div
                  className="rounded-2xl px-3 py-2 text-xs text-muted-color"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  Aucun depot actif n&apos;est encore lie a ce compte.
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Libelle</label>
              <input
                type="text"
                placeholder="Description..."
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Montant (TND)</label>
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
              <label className="block text-xs text-muted-color mb-1 font-medium">Mode de paiement</label>
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
            <button type="submit" disabled={saving || !scopedDepotId} className="btn-primary w-full justify-center">
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                : <><i className="fa-solid fa-check" /> Enregistrer</>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-base-color">Depenses</h2>
              <p className="text-xs text-muted-color mt-0.5">
                Total: <span className="font-mono font-semibold" style={{ color: '#ea580c' }}>{total.toFixed(3)} TND</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Mois</label>
              <input
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
              <label className="block text-xs text-muted-color mb-1 font-medium">Categorie</label>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">Toutes</option>
                {allCategories.map((item) => (
                  <option key={item.id} value={item.value}>
                    {getConfigItemLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setMonth('')
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setMonth('')
                }}
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  setMonth(DEFAULT_MONTH)
                  setCategoryFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="btn-secondary text-xs"
              >
                <i className="fa-solid fa-rotate-left" /> Reinitialiser les filtres
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-color">
              <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Date', 'Categorie', 'Depot', 'Libelle', 'Paiement', 'Montant', ''].map((heading) => (
                      <th key={heading} className={`pb-3 pr-3 ${heading === 'Montant' ? 'text-right' : 'text-left'}`}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <i className="fa-solid fa-receipt text-3xl text-muted-color opacity-30 mb-2 block" />
                        <p className="text-muted-color text-sm">Aucune depense sur cette periode</p>
                      </td>
                    </tr>
                  )}
                  {paginatedExpenses.map((expense) => {
                    const categoryValue = expense.category?.value ?? expense.category
                    const categoryLabel = expense.category_label || getConfigItemLabel(categoryMap.get(String(categoryValue)), categoryValue)
                    const categoryMeta = expense.category_meta ?? categoryMap.get(String(categoryValue))
                    const badgeColor = categoryMeta?.color || '#64748b'
                    const badgeIcon = categoryMeta?.icon || 'fa-solid fa-tag'

                    return (
                      <tr key={expense.id} className="table-row">
                        <td className="py-3 pr-3 text-secondary-color text-xs font-mono">
                          {new Date(expense.expense_date).toLocaleDateString('fr-FR')}
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
                        <td className="py-3 pr-3 text-muted-color text-xs">{expense.depot?.name ?? '-'}</td>
                        <td className="py-3 pr-3 text-base-color">{expense.label}</td>
                        <td className="py-3 pr-3 text-muted-color text-xs">{expense.payment_method_label ?? expense.payment_method ?? 'Especes'}</td>
                        <td className="py-3 pr-3 text-right font-mono font-bold text-sm" style={{ color: '#ea580c' }}>
                          {Number(expense.amount).toFixed(3)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <RowDocumentActions
                              documentKey="expense_item"
                              record={expense}
                              documentLayouts={documentLayouts}
                              title={`Depense ${expense.label || expense.id}`}
                              filename={`depense_${expense.id}`}
                            />
                            <button onClick={() => handleDelete(expense.id)} className="text-muted-color hover:text-red-500 transition-colors p-1">
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
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPerPage(value)
                setPage(1)
              }}
              itemLabel="depenses"
            />
          )}
        </div>
      </div>
    </div>
  )
}
