import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaymentStatusBadge, StatusBadge } from '../../components/Badge'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageExportActions from '../../components/PageExportActions'
import PaginationControls from '../../components/PaginationControls'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { paginateItems } from '../../utils/pagination'

const DEFAULT_PERIOD = 'month'
const PERIODS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'custom', label: 'Personnalisé' },
  { key: '', label: 'Tout' },
]

function fmt(value) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(value ?? 0)
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10)
}

function getPeriodDateRange(period, dateFrom, dateTo) {
  const current = new Date()
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate())

  if (dateFrom || dateTo) {
    return {
      date_from: dateFrom || dateTo,
      date_to: dateTo || dateFrom,
    }
  }

  if (period === 'today') {
    const iso = toIsoDate(today)
    return { date_from: iso, date_to: iso }
  }

  if (period === 'week') {
    const start = new Date(today)
    const diff = start.getDay() === 0 ? 6 : start.getDay() - 1
    start.setDate(start.getDate() - diff)
    return { date_from: toIsoDate(start), date_to: toIsoDate(today) }
  }

  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { date_from: toIsoDate(start), date_to: toIsoDate(today) }
  }

  return {}
}

export default function InvoicesIndex() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const { user, isAdmin } = useAuth()
  const { layouts: documentLayouts } = useDocumentLayouts()
  const deferredSearch = useDeferredValue(search)
  const today = new Date().toISOString().slice(0, 10)
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    selectedDepot,
    canSelectAll,
    scopeParams,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  const load = async () => {
    setLoading(true)

    try {
      const params = { ...scopeParams }

      if (period) params.period = period
      if (paymentStatus) params.payment_status = paymentStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (deferredSearch.trim()) params.q = deferredSearch.trim()

      const response = await api.get('/invoices', { params })
      setInvoices(Array.isArray(response.data) ? response.data : (response.data?.data ?? []))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [period, paymentStatus, dateFrom, dateTo, deferredSearch, selectedDepotId])

  const { items: paginatedInvoices, meta: invoicesMeta } = paginateItems(invoices, page, perPage)

  useEffect(() => {
    setPage(1)
  }, [period, paymentStatus, dateFrom, dateTo, deferredSearch, selectedDepotId])

  useEffect(() => {
    if (page !== invoicesMeta.current_page) {
      setPage(invoicesMeta.current_page)
    }
  }, [invoicesMeta.current_page, page])

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)

    if (nextPeriod !== 'custom') {
      setDateFrom('')
      setDateTo('')
      return
    }

    if (!dateFrom && !dateTo) {
      setDateFrom(today)
      setDateTo(today)
    }
  }

  const resetFilters = () => {
    setPeriod(DEFAULT_PERIOD)
    setPaymentStatus('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const removeInvoice = async (invoice) => {
    if (!confirm(`Supprimer la facture ${invoice.number} ?`)) {
      return
    }

    await api.delete(`/invoices/${invoice.id}`)
    await load()
  }

  const total = invoices
    .filter((invoice) => invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)

  const unpaid = invoices
    .filter((invoice) => invoice.payment_status !== 'paid')
    .reduce((sum, invoice) => sum + Math.max(Number(invoice.total ?? 0) - Number(invoice.paid_amount ?? 0), 0), 0)

  const hasFilters = period !== DEFAULT_PERIOD || paymentStatus || search || dateFrom || dateTo
  const exportParams = {
    ...getPeriodDateRange(period, dateFrom, dateTo),
    ...scopeParams,
  }
  const depotSuffix = canSelectAll
    ? ` | ${selectedDepot ? `Dépôt ${selectedDepot.name}` : 'Tous les dépôts'}`
    : ''
  const showDepotColumn = canSelectAll

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Factures</h1>
          <p className="text-sm text-muted-color mt-0.5">{invoices.length} facture(s) | Total: {fmt(total)} TND{depotSuffix}</p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          {canSelectAll && (
            <DepotScopeControls
              depots={depots}
              selectedValue={selectedDepotValue}
              onChange={setSelectedDepotValue}
              allowAll
              canSelectAll={canSelectAll}
              allLabel="Tous les dépôts"
            />
          )}
          <PageExportActions
            title="Factures"
            csvEntity="invoices"
            csvParams={exportParams}
            csvFilename="factures"
            documentKey="invoices_list"
            records={invoices}
            documentLayouts={documentLayouts}
          />
          <Link to="/invoices/create" className="btn-primary">
            <i className="fa-solid fa-plus" /> Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total période', value: `${fmt(total)} TND`, icon: 'fa-solid fa-sack-dollar', color: '#0d9488' },
          { label: 'Impayées', value: `${fmt(unpaid)} TND`, icon: 'fa-solid fa-clock', color: '#dc2626' },
          { label: 'Factures', value: invoices.length, icon: 'fa-solid fa-file-invoice', color: '#3b82f6' },
          { label: 'Payées', value: invoices.filter((invoice) => invoice.payment_status === 'paid').length, icon: 'fa-solid fa-circle-check', color: '#10b981' },
        ].map((kpi) => (
          <div key={kpi.label} className="card py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${kpi.color}1a` }}>
              <i className={`${kpi.icon} text-sm`} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xs text-muted-color">{kpi.label}</div>
              <div className="text-sm font-bold text-base-color">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODS.map((item) => (
          <button
            key={item.key}
            onClick={() => handlePeriodChange(item.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
              period === item.key ? 'bg-teal-600 text-white border-teal-600' : 'border-theme text-muted-color hover:text-base-color'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">Recherche</label>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Numéro, client ou commercial..." />
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">Paiement</label>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
              <option value="">Tous</option>
              <option value="unpaid">Impaye</option>
              <option value="partial">Partiel</option>
              <option value="paid">Payé</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPeriod('custom')
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
                setPeriod('custom')
              }}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button onClick={resetFilters} className="btn-secondary text-xs">
              <i className="fa-solid fa-rotate-left" /> Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    'N°',
                    'Client',
                    ...(isAdmin() ? ['Commercial'] : []),
                    ...(showDepotColumn ? ['Dépôt'] : []),
                    'Total',
                    'Paiement',
                    'Statut',
                    'Date',
                    '',
                  ].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 text-xs font-semibold text-muted-color uppercase tracking-wider">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row">
                    <td className="py-3 pr-4">
                      <Link to={`/invoices/${invoice.id}`} className="font-mono text-xs font-semibold" style={{ color: '#0d9488' }}>
                        {invoice.number}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-medium text-base-color">{invoice.customer_name}</td>
                    {isAdmin() && <td className="py-3 pr-4 text-secondary-color">{invoice.rep_name}</td>}
                    {showDepotColumn && <td className="py-3 pr-4 text-muted-color text-xs">{invoice.depot?.name ?? '-'}</td>}
                    <td className="py-3 pr-4 font-bold text-base-color">{fmt(invoice.total)} TND</td>
                    <td className="py-3 pr-4">{invoice.payment_status && <PaymentStatusBadge status={invoice.payment_status} />}</td>
                    <td className="py-3 pr-4"><StatusBadge status={invoice.status} /></td>
                    <td className="py-3 pr-4 text-muted-color text-xs">{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <RowDocumentActions
                          documentKey="invoice_item"
                          record={invoice}
                          documentLayouts={documentLayouts}
                          title={`Facture ${invoice.number}`}
                          filename={`facture_${invoice.number}`}
                        />
                        <Link to={`/invoices/${invoice.id}`} className="text-xs font-medium hover:underline" style={{ color: '#0d9488' }}>
                          <i className="fa-solid fa-eye mr-1" /> Voir
                        </Link>
                        {isAdmin() && (
                          <button onClick={() => removeInvoice(invoice)} className="text-xs font-medium text-red-500 hover:text-red-700">
                            <i className="fa-solid fa-trash-can mr-1" /> Suppr.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin() ? (showDepotColumn ? 9 : 8) : (showDepotColumn ? 8 : 7)} className="py-12 text-center">
                      <i className="fa-solid fa-file-invoice text-3xl text-muted-color opacity-30 mb-2 block" />
                      <p className="text-muted-color text-sm">Aucune facture sur cette période</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <PaginationControls
            meta={invoicesMeta}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value)
              setPage(1)
            }}
            itemLabel="factures"
          />
        )}
      </div>
    </div>
  )
}
