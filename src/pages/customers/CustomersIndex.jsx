import { useEffect, useMemo, useState } from 'react'
import { PaymentStatusBadge } from '../../components/Badge'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../../hooks/useConfigItems'
import api from '../../services/api'

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

export default function CustomersIndex() {
  const { user, isAdmin } = useAuth()
  const [customers, setCustomers] = useState([])
  const [zones, setZones] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [ledgerCustomer, setLedgerCustomer] = useState(null)
  const [ledger, setLedger] = useState(null)
  const { items: configItems } = useConfigItems(['governorate', 'payment_method'])
  const governorates = configItems.governorate ?? []
  const paymentMethods = configItems.payment_method ?? []
  const defaultPaymentMethod = getDefaultConfigValue(paymentMethods, 'cash')
  const [pay, setPay] = useState({ amount: '', method: defaultPaymentMethod, invoice_id: '', note: '' })
  const [paying, setPaying] = useState(false)
  const canAssignOwner = isAdmin()

  const load = async () => {
    setLoading(true)

    try {
      const requests = [
        api.get('/customers'),
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
  }, [canAssignOwner])

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
      user_id: canAssignOwner ? String(user?.id ?? '') : '',
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
      user_id: customer.user_id ?? '',
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

  const assignableUsers = useMemo(() => (
    users.filter((entry) => ['admin', 'developer', 'rep'].includes(entry.role))
  ), [users])

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${customers.length} client(s)`}
        action={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PageExportActions title="Clients" csvEntity="customers" csvFilename="clients" />
            <button onClick={openCreate} className="btn-primary">
              <i className="fa-solid fa-plus" /> Nouveau client
            </button>
          </div>
        )}
      />

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
            <input
              placeholder="Rechercher un client..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Nom', 'Telephone', 'Affecte a', 'Gouvernorat', 'Zone', 'Carte', 'Solde credit', 'Actions'].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const mapped = customer.lat != null && customer.lng != null

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
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          background: mapped ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)',
                          color: mapped ? '#059669' : '#d97706',
                        }}
                      >
                        <i className={`fa-solid ${mapped ? 'fa-location-dot' : 'fa-location-dot-slash'}`} />
                        {mapped ? 'Position OK' : 'A geolocaliser'}
                      </span>
                    </td>
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
                  <td colSpan={8} className="py-12 text-center">
                    <i className="fa-solid fa-users text-3xl text-muted-color opacity-30 mb-2 block" />
                    <p className="text-muted-color text-sm">Aucun client</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            <FormField label="Commercial affecte" error={errors.user_id?.[0]}>
              <select value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}>
                <option value="">Moi (back office)</option>
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
                <option value="">Selectionner...</option>
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

      <Modal open={!!ledgerCustomer} onClose={() => setLedgerCustomer(null)} title={`Credit - ${ledgerCustomer?.name ?? ''}`} size="lg">
        {!ledger ? (
          <PageLoader />
        ) : (
          <div className="space-y-4">
            <div
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background: Number(ledger.customer.credit_balance) > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                borderColor: Number(ledger.customer.credit_balance) > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              }}
            >
              <div>
                <div className="text-xs text-muted-color mb-0.5">Solde du</div>
                <div className="text-xs text-secondary-color">{ledger.open_invoices?.length ?? 0} facture(s) ouverte(s)</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: Number(ledger.customer.credit_balance) > 0 ? '#dc2626' : '#059669' }}>
                {fmt(ledger.customer.credit_balance)} <span className="text-sm font-normal text-muted-color">TND</span>
              </div>
            </div>

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
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.value}>
                      {getConfigItemLabel(method)}
                    </option>
                  ))}
                </select>
              </div>
              <select className="mb-2" value={pay.invoice_id} onChange={(event) => setPay((current) => ({ ...current, invoice_id: event.target.value }))}>
                <option value="">Affecter automatiquement (plus ancienne d'abord)</option>
                {ledger.open_invoices?.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} - du {fmt(invoice.total - invoice.paid_amount)}
                  </option>
                ))}
              </select>
              <input
                className="mb-3"
                value={pay.note}
                onChange={(event) => setPay((current) => ({ ...current, note: event.target.value }))}
                placeholder="Note interne (optionnel)"
              />
              <button onClick={submitPayment} disabled={paying || !pay.amount} className="btn-primary w-full">
                {paying ? <><i className="fa-solid fa-spinner fa-spin" /> Encaissement...</> : <><i className="fa-solid fa-circle-check" /> Encaisser</>}
              </button>
            </div>

            {ledger.open_invoices?.length > 0 && (
              <div>
                <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-2">Factures ouvertes</div>
                <div className="space-y-1">
                  {ledger.open_invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-xl border border-theme" style={{ background: 'var(--surface-2)' }}>
                      <span className="text-secondary-color font-mono text-xs">{invoice.number}</span>
                      <div className="flex items-center gap-3">
                        <PaymentStatusBadge status={invoice.payment_status} />
                        <span className="font-bold font-mono text-xs" style={{ color: '#dc2626' }}>
                          {fmt(invoice.total - invoice.paid_amount)} TND
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-2">Historique des mouvements</div>
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-theme" style={{ background: 'var(--surface-2)' }}>
                {ledger.transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between text-xs py-2.5 px-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span className="text-secondary-color">
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="mx-1.5 text-muted-color">|</span>
                      <span className="text-secondary-color">
                        {transaction.type === 'charge' ? 'Facture' : transaction.type === 'payment' ? 'Paiement' : 'Ajustement'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono" style={{ color: Number(transaction.amount) >= 0 ? '#dc2626' : '#059669' }}>
                        {Number(transaction.amount) >= 0 ? '+' : ''}{fmt(transaction.amount)}
                      </span>
                      <span className="text-muted-color w-24 text-right font-mono">solde {fmt(transaction.balance_after)}</span>
                    </div>
                  </div>
                ))}
                {!ledger.transactions?.length && (
                  <div className="text-center text-muted-color text-sm py-6">Aucun mouvement</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
