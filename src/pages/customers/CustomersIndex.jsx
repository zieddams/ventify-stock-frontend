import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaymentStatusBadge } from '../../components/Badge'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../../hooks/useConfigItems'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { filterPaymentMethodsByScope } from '../../utils/paymentMethodScopes'
import { paginateItems } from '../../utils/pagination'

const EMPTY = {
  name: '',
  phone: '',
  address: '',
  wilaya: '',
  tax_id: '',
  email: '',
  zone_id: '',
  credit_limit: '',
  user_id: '',
}

function fmt(value) {
  return Number(value ?? 0).toFixed(3)
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '-'
}

function formatTransactionLabel(transaction) {
  if (transaction.type === 'charge') {
    return 'Facture'
  }

  if (transaction.type === 'payment') {
    return 'Paiement'
  }

  return 'Ajustement'
}

function matchesLedgerQuery(values, query) {
  if (!query) {
    return true
  }

  const normalized = query.trim().toLowerCase()
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized))
}

export default function CustomersIndex() {
  const { user, canManageAllCustomers } = useAuth()
  const { layouts: documentLayouts } = useDocumentLayouts()
  const [customers, setCustomers] = useState([])
  const [zones, setZones] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [ledgerCustomer, setLedgerCustomer] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [ledgerQuery, setLedgerQuery] = useState('')
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all')
  const [customersPage, setCustomersPage] = useState(1)
  const [customersPerPage, setCustomersPerPage] = useState(20)
  const { items: configItems } = useConfigItems(['governorate', 'payment_method'])
  const governorates = configItems.governorate ?? []
  const paymentMethods = filterPaymentMethodsByScope(configItems.payment_method ?? [], 'customer')
  const availablePaymentMethods = paymentMethods.length > 0 ? paymentMethods : [{ value: 'cash', display_label: 'Espèces' }]
  const defaultPaymentMethod = getDefaultConfigValue(availablePaymentMethods, 'cash')
  const [pay, setPay] = useState({ amount: '', method: defaultPaymentMethod, invoice_id: '', note: '' })
  const [paying, setPaying] = useState(false)
  const canAssignOwner = canManageAllCustomers()

  const load = async () => {
    setLoading(true)

    try {
      const requests = [
        canAssignOwner && ownerFilter
          ? api.get('/customers', { params: { user_id: Number(ownerFilter) } })
          : api.get('/customers'),
        api.get('/zones'),
      ]

      if (canAssignOwner) {
        requests.push(api.get('/users'))
      }

      const [customersResponse, zonesResponse, usersResponse] = await Promise.all(requests)

      setCustomers(customersResponse.data ?? [])
      setZones(zonesResponse.data ?? [])
      setUsers(usersResponse?.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [canAssignOwner, ownerFilter])

  useEffect(() => {
    setPay((current) => {
      if (current.method) {
        return current
      }

      return { ...current, method: defaultPaymentMethod }
    })
  }, [defaultPaymentMethod])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...EMPTY,
      user_id: canAssignOwner ? String(ownerFilter || user?.id || '') : '',
    })
    setErrors({})
    setModal(true)
  }

  const openEdit = (customer) => {
    setEditing(customer)
    setForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      wilaya: customer.wilaya ?? '',
      tax_id: customer.tax_id ?? '',
      email: customer.email ?? '',
      zone_id: customer.zone_id ?? '',
      credit_limit: customer.credit_limit ?? '',
      user_id: customer.user_id ? String(customer.user_id) : '',
    })
    setErrors({})
    setModal(true)
  }

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      const payload = {
        ...form,
        zone_id: form.zone_id === '' ? null : Number(form.zone_id),
        credit_limit: form.credit_limit === '' ? null : Number(form.credit_limit),
      }

      if (canAssignOwner && form.user_id !== '') {
        payload.user_id = Number(form.user_id)
      } else {
        delete payload.user_id
      }

      if (editing) {
        await api.put(`/customers/${editing.id}`, payload)
      } else {
        await api.post('/customers', payload)
      }

      setModal(false)
      await load()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const removeCustomer = async (customer) => {
    if (!confirm(`Supprimer "${customer.name}" ?`)) {
      return
    }

    await api.delete(`/customers/${customer.id}`)
    await load()
  }

  const openLedger = async (customer) => {
    setLedgerCustomer(customer)
    setLedger(null)
    setLedgerQuery('')
    setLedgerTypeFilter('all')
    setPay({ amount: '', method: defaultPaymentMethod, invoice_id: '', note: '' })

    const response = await api.get(`/customers/${customer.id}/ledger`)
    setLedger(response.data)
  }

  const submitPayment = async () => {
    if (!pay.amount || Number(pay.amount) <= 0 || !ledgerCustomer) {
      return
    }

    setPaying(true)

    try {
      await api.post('/payments', {
        customer_id: ledgerCustomer.id,
        invoice_id: pay.invoice_id || null,
        amount: Number(pay.amount),
        method: pay.method || defaultPaymentMethod,
        note: pay.note || null,
      })

      const response = await api.get(`/customers/${ledgerCustomer.id}/ledger`)
      setLedger(response.data)
      setPay({ amount: '', method: defaultPaymentMethod, invoice_id: '', note: '' })
      await load()
    } finally {
      setPaying(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return customers.filter((customer) => {
      if (!normalizedQuery) {
        return true
      }

      return (
        customer.name?.toLowerCase().includes(normalizedQuery) ||
        customer.phone?.includes(search) ||
        customer.wilaya?.toLowerCase().includes(normalizedQuery) ||
        customer.zone?.name?.toLowerCase().includes(normalizedQuery) ||
        customer.owner?.name?.toLowerCase().includes(normalizedQuery) ||
        customer.owner?.email?.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [customers, search])

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

  const assignableUsers = useMemo(() => (
    users.filter((entry) => entry.active && ['admin', 'developer', 'rep', 'comptable'].includes(entry.role))
  ), [users])

  const { items: paginatedCustomers, meta: customersMeta } = useMemo(
    () => paginateItems(filteredCustomers, customersPage, customersPerPage),
    [filteredCustomers, customersPage, customersPerPage]
  )

  useEffect(() => {
    setCustomersPage(1)
  }, [search, ownerFilter])

  useEffect(() => {
    if (customersPage !== customersMeta.current_page) {
      setCustomersPage(customersMeta.current_page)
    }
  }, [customersMeta.current_page, customersPage])

  const selectedOwner = useMemo(() => (
    assignableUsers.find((entry) => String(entry.id) === String(ownerFilter))
  ), [assignableUsers, ownerFilter])

  const subtitle = useMemo(() => {
    if (!canAssignOwner) {
      return `${filteredCustomers.length} client(s) sur votre portefeuille`
    }

    if (selectedOwner) {
      return `${filteredCustomers.length} client(s) affecté(s) a ${selectedOwner.name}`
    }

    return `${filteredCustomers.length} client(s) sur tous les portefeuilles`
  }, [canAssignOwner, filteredCustomers.length, selectedOwner])

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={subtitle}
        action={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PageExportActions
              title="Clients"
              csvEntity="customers"
              csvFilename="clients"
              documentKey="customers_list"
              records={filteredCustomers}
              documentLayouts={documentLayouts}
            />
            <button onClick={openCreate} className="btn-primary">
              <i className="fa-solid fa-plus" /> Nouveau client
            </button>
          </div>
        )}
      />

      <div className="card">
        <div className="mb-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
              <input
                placeholder="Rechercher un client..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            {canAssignOwner && (
              <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="">Tous les comptes</option>
                {assignableUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} - {entry.role}
                  </option>
                ))}
              </select>
            )}
          </div>
          {canAssignOwner && (
            <p className="text-xs text-muted-color mt-2">
              Chaque client reste rattaché à un seul compte. Les rôles globaux voient toute la base, les autres comptes voient seulement leur liste.
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Nom', 'Telephone', 'Affecte a', 'Gouvernorat', 'Zone', 'Solde credit', 'Actions'].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer) => {
                return (
                  <tr key={customer.id} className="table-row">
                    <td className="py-3 pr-4 font-semibold text-base-color">{customer.name}</td>
                    <td className="py-3 pr-4 text-secondary-color font-mono text-xs">{customer.phone ?? '-'}</td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">
                      {customer.owner ? (
                        <div>
                          <div className="font-medium text-base-color">{customer.owner.name}</div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-color">{customer.owner.role}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{customer.wilaya ?? '-'}</td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{customer.zone?.name ?? '-'}</td>
                    <td
                      className="py-3 pr-4 font-bold font-mono text-sm"
                      style={{ color: Number(customer.credit_balance) > 0 ? '#dc2626' : '#059669' }}
                    >
                      {fmt(customer.credit_balance)} TND
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openLedger(customer)} className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
                          <i className="fa-solid fa-credit-card mr-1" /> Credit
                        </button>
                        <button onClick={() => openEdit(customer)} className="text-xs font-medium" style={{ color: '#0d9488' }}>
                          <i className="fa-solid fa-pen mr-1" /> Modifier
                        </button>
                        <button onClick={() => removeCustomer(customer)} className="text-xs font-medium text-red-500 hover:text-red-700">
                          <i className="fa-solid fa-trash-can mr-1" /> Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <i className="fa-solid fa-users text-3xl text-muted-color opacity-30 mb-2 block" />
                    <p className="text-muted-color text-sm">Aucun client</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={customersMeta}
          perPage={customersPerPage}
          onPageChange={setCustomersPage}
          onPerPageChange={(value) => {
            setCustomersPerPage(value)
            setCustomersPage(1)
          }}
          itemLabel="clients"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le client' : 'Nouveau client'}>
        <div className="space-y-4">
          <FormField label="Nom" error={errors.name?.[0]} required>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nom du client" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Telephone" error={errors.phone?.[0]}>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+216 XX XXX XXX" />
            </FormField>
            <FormField label="Email" error={errors.email?.[0]}>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="client@example.com" />
            </FormField>
          </div>

          {canAssignOwner && (
            <FormField label="Compte propriétaire" error={errors.user_id?.[0]}>
              <select value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}>
                <option value="">Mon compte ({user?.name || 'courant'})</option>
                {assignableUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} - {entry.role}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Adresse" error={errors.address?.[0]}>
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Adresse complete" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gouvernorat" error={errors.wilaya?.[0]}>
              <select value={form.wilaya} onChange={(event) => setForm((current) => ({ ...current, wilaya: event.target.value }))}>
                <option value="">Sélectionner...</option>
                {governorates.map((item) => (
                  <option key={item.id} value={item.value}>
                    {getConfigItemLabel(item)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Zone de vente" error={errors.zone_id?.[0]}>
              <select value={form.zone_id} onChange={(event) => setForm((current) => ({ ...current, zone_id: event.target.value }))}>
                <option value="">Aucune</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Matricule fiscal" error={errors.tax_id?.[0]}>
              <input value={form.tax_id} onChange={(event) => setForm((current) => ({ ...current, tax_id: event.target.value }))} placeholder="0000000/A/X/000" />
            </FormField>
            <FormField label="Plafond credit (TND)" error={errors.credit_limit?.[0]}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.credit_limit}
                onChange={(event) => setForm((current) => ({ ...current, credit_limit: event.target.value }))}
                placeholder="Optionnel"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!ledgerCustomer}
        onClose={() => {
          setLedgerCustomer(null)
          setLedger(null)
          setLedgerQuery('')
          setLedgerTypeFilter('all')
        }}
        title={`Credit - ${ledgerCustomer?.name ?? ''}`}
        size="lg"
      >
        {!ledger ? (
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
                <div className="text-xs text-muted-color mb-1">Solde client</div>
                <div className="text-2xl font-bold" style={{ color: Number(ledger.customer.credit_balance) > 0 ? '#dc2626' : '#059669' }}>
                  {fmt(ledger.customer.credit_balance)} <span className="text-sm font-normal text-muted-color">TND</span>
                </div>
                <div className="text-xs text-secondary-color mt-2">{ledger.summary?.open_invoice_count ?? 0} facture(s) ouverte(s)</div>
              </div>

              <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color mb-1">Reste ouvert</div>
                <div className="text-xl font-bold font-mono text-base-color">{fmt(ledger.summary?.open_due_total)} TND</div>
                <div className="text-xs text-secondary-color mt-2">
                  Plafond {ledger.customer.credit_limit ? `${fmt(ledger.customer.credit_limit)} TND` : 'non defini'}
                </div>
              </div>

              <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color mb-1">Paiements traces</div>
                <div className="text-xl font-bold text-base-color">{ledger.summary?.payment_event_count ?? 0}</div>
                <div className="text-xs text-secondary-color mt-2">
                  Derniere activite {formatDateTime(ledger.summary?.last_activity_at)}
                </div>
              </div>

              <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs text-muted-color mb-1">Compte affecte</div>
                <div className="text-base font-semibold text-base-color">{ledger.customer.owner?.name || 'Non affecte'}</div>
                <div className="text-xs text-secondary-color mt-2">{ledger.customer.owner?.role || 'Aucun role'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
              <div className="rounded-xl p-4 border border-theme" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-3">
                  <i className="fa-solid fa-circle-plus mr-1.5" style={{ color: '#0d9488' }} />
                  Encaisser un paiement
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Montant (TND)"
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
                  <option value="">Affecter automatiquement (plus ancienne d'abord)</option>
                  {ledger.open_invoices?.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.number} - reste {fmt(invoice.due_amount)}
                    </option>
                  ))}
                </select>
                <input
                  className="mb-2"
                  value={pay.note}
                  onChange={(event) => setPay((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Note interne (optionnel)"
                />
                <p className="text-[11px] text-muted-color mb-3">
                  Le surplus regle d'abord la facture cible, puis les credits plus anciens du client.
                </p>
                <button onClick={submitPayment} disabled={paying || !pay.amount} className="btn-primary w-full">
                  {paying ? <><i className="fa-solid fa-spinner fa-spin" /> Encaissement...</> : <><i className="fa-solid fa-circle-check" /> Encaisser</>}
                </button>
              </div>

              <div className="rounded-xl p-4 border border-theme" style={{ background: 'var(--surface-2)' }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xs font-bold text-muted-color uppercase tracking-wider">Filtres credit</div>
                    <div className="text-xs text-secondary-color mt-1">Facture, commercial, session, camion, methode, note.</div>
                  </div>
                  <div className="text-xs text-muted-color">
                    {filteredTransactions.length} mouvement(s) | {filteredOpenInvoices.length} facture(s)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-2">
                  <input
                    value={ledgerQuery}
                    onChange={(event) => setLedgerQuery(event.target.value)}
                    placeholder="Rechercher dans le credit client"
                  />
                  <select value={ledgerTypeFilter} onChange={(event) => setLedgerTypeFilter(event.target.value)}>
                    <option value="all">Tous les mouvements</option>
                    <option value="charge">Factures</option>
                    <option value="payment">Paiements</option>
                    <option value="adjustment">Ajustements</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-bold text-muted-color uppercase tracking-wider">Factures ouvertes</div>
                  <div className="text-xs text-secondary-color mt-1">Suivi des restes, tentatives d'encaissement et rattachement session/camion.</div>
                </div>
                <div className="text-xs text-muted-color">{filteredOpenInvoices.length} resultat(s)</div>
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
                          {invoice.rep_name || 'Commercial non renseigne'} | {formatDateTime(invoice.created_at)}
                        </div>
                        <div className="text-xs text-secondary-color mt-1">
                          {invoice.route_session_id ? (
                            <>
                              <Link to={invoice.route_session_url} className="text-primary hover:underline">
                                Session #{invoice.route_session_id}
                              </Link>
                              {' | '}
                              {invoice.camion_name || 'Camion non renseigne'}
                              {invoice.camion_plate ? ` | ${invoice.camion_plate}` : ''}
                            </>
                          ) : (
                            'Aucune session rattachee'
                          )}
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="font-bold font-mono text-sm" style={{ color: '#dc2626' }}>
                          {fmt(invoice.due_amount)} TND
                        </div>
                        <div className="text-[11px] text-muted-color">
                          {invoice.payment_attempt_count || 0} tentative(s)
                        </div>
                        <div className="text-[11px] text-muted-color">
                          Dernier paiement {formatDateTime(invoice.last_payment_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!filteredOpenInvoices.length && (
                  <div className="text-center text-muted-color text-sm py-8">Aucune facture ouverte pour ce filtre.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-theme p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-bold text-muted-color uppercase tracking-wider">Historique des mouvements</div>
                  <div className="text-xs text-secondary-color mt-1">Chaque paiement montre les allocations facture par facture.</div>
                </div>
                <div className="text-xs text-muted-color">{filteredTransactions.length} resultat(s)</div>
              </div>

              <div className="max-h-[28rem] overflow-y-auto space-y-2 rounded-xl">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-xl border border-theme p-3" style={{ background: 'var(--surface)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-base-color">{formatTransactionLabel(transaction)}</div>
                        <div className="text-xs text-secondary-color mt-1">{formatDateTime(transaction.created_at)}</div>
                        <div className="text-xs text-secondary-color mt-1">
                          {transaction.invoice_id ? (
                            <Link to={transaction.invoice_url} className="text-primary hover:underline">
                              {transaction.invoice_number}
                            </Link>
                          ) : (
                            'Sans facture rattachee'
                          )}
                          {transaction.rep_name ? ` | ${transaction.rep_name}` : ''}
                        </div>
                        <div className="text-xs text-secondary-color mt-1">
                          {transaction.route_session_id ? (
                            <>
                              <Link to={transaction.route_session_url} className="text-primary hover:underline">
                                Session #{transaction.route_session_id}
                              </Link>
                              {' | '}
                              {transaction.camion_name || 'Camion non renseigne'}
                              {transaction.camion_plate ? ` | ${transaction.camion_plate}` : ''}
                            </>
                          ) : (
                            'Aucune session rattachee'
                          )}
                        </div>
                        {(transaction.payment_method || transaction.payment_note) && (
                          <div className="text-xs text-secondary-color mt-1">
                            {transaction.payment_method ? `Mode ${transaction.payment_method}` : 'Mode non precise'}
                            {transaction.payment_note ? ` | ${transaction.payment_note}` : ''}
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <div className="font-bold font-mono" style={{ color: Number(transaction.amount) >= 0 ? '#dc2626' : '#059669' }}>
                          {Number(transaction.amount) >= 0 ? '+' : ''}{fmt(transaction.amount)} TND
                        </div>
                        <div className="text-[11px] text-muted-color">Solde {fmt(transaction.balance_after)} TND</div>
                        <div className="text-[11px] text-muted-color">{transaction.allocation_count || 0} allocation(s)</div>
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
                                'Facture non renseignee'
                              )}
                            </div>
                            <div className="text-secondary-color mt-1">
                              Montant {fmt(allocation.amount)} TND
                            </div>
                            <div className="text-secondary-color mt-1">
                              {allocation.route_session_id ? `Session #${allocation.route_session_id}` : 'Sans session'}
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
                  <div className="text-center text-muted-color text-sm py-8">Aucun mouvement pour ce filtre.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
