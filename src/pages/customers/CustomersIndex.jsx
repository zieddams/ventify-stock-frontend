import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CustomerLedgerModal from '../../components/CustomerLedgerModal'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getConfigItemLabel, useConfigItems } from '../../hooks/useConfigItems'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCurrency } from '../../utils/format'
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

function formatRoleLabel(role, t) {
  if (['admin', 'developer', 'rep', 'comptable'].includes(role)) {
    return t(`badges.roles.${role}`)
  }

  return role
}

export default function CustomersIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const { user, canManageAllCustomers } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [customersPage, setCustomersPage] = useState(1)
  const [customersPerPage, setCustomersPerPage] = useState(20)
  const { items: configItems } = useConfigItems(['governorate'])
  const governorates = configItems.governorate ?? []
  const canAssignOwner = canManageAllCustomers()
  const requestedLedgerCustomerId = Number(searchParams.get('open_ledger') ?? 0) || null

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
    if (!confirm(t('customers.deleteConfirm', { name: customer.name }))) {
      return
    }

    await api.delete(`/customers/${customer.id}`)
    await load()
  }

  const openLedger = useCallback((customer) => {
    setLedgerCustomer(customer)
  }, [])

  const closeLedger = () => {
    setLedgerCustomer(null)

    if (requestedLedgerCustomerId) {
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.delete('open_ledger')
      setSearchParams(nextSearchParams, { replace: true })
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

  useEffect(() => {
    if (!requestedLedgerCustomerId || loading || ledgerCustomer?.id === requestedLedgerCustomerId) {
      return
    }

    const targetCustomer = customers.find((entry) => Number(entry.id) === requestedLedgerCustomerId)

    if (!targetCustomer) {
      return
    }

    void openLedger(targetCustomer)
  }, [customers, ledgerCustomer?.id, loading, openLedger, requestedLedgerCustomerId])

  const selectedOwner = useMemo(() => (
    assignableUsers.find((entry) => String(entry.id) === String(ownerFilter))
  ), [assignableUsers, ownerFilter])

  const subtitle = useMemo(() => {
    if (!canAssignOwner) {
      return t('customers.subtitlePortfolio', { count: filteredCustomers.length })
    }

    if (selectedOwner) {
      return t('customers.subtitleOwner', { count: filteredCustomers.length, name: selectedOwner.name })
    }

    return t('customers.subtitleAll', { count: filteredCustomers.length })
  }, [canAssignOwner, filteredCustomers.length, selectedOwner, t])

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        subtitle={subtitle}
        action={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PageExportActions
              title={t('customers.title')}
              csvEntity="customers"
              csvFilename="clients"
              documentKey="customers_list"
              records={filteredCustomers}
              documentLayouts={documentLayouts}
            />
            <button onClick={openCreate} className="btn-primary">
              <i className="fa-solid fa-plus" /> {t('customers.newCustomer')}
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
                placeholder={t('customers.searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            {canAssignOwner && (
              <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="">{t('customers.ownerAllAccounts')}</option>
                {assignableUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} - {formatRoleLabel(entry.role, t)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  t('customers.columns.name'),
                  t('customers.columns.phone'),
                  t('customers.columns.assignedTo'),
                  t('customers.columns.governorate'),
                  t('customers.columns.zone'),
                  t('customers.columns.creditBalance'),
                  t('common.actions'),
                ].map((heading) => (
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
                    <td className="py-3 pr-4 text-secondary-color font-mono text-xs">{customer.phone || notAvailable}</td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">
                      {customer.owner ? (
                        <div>
                          <div className="font-medium text-base-color">{customer.owner.name}</div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-color">{formatRoleLabel(customer.owner.role, t)}</div>
                        </div>
                      ) : t('customers.none')}
                    </td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{customer.wilaya ?? t('customers.none')}</td>
                    <td className="py-3 pr-4 text-secondary-color text-xs">{customer.zone?.name ?? t('customers.none')}</td>
                    <td
                      className="py-3 pr-4 font-bold font-mono text-sm"
                      style={{ color: Number(customer.credit_balance) > 0 ? '#dc2626' : '#059669' }}
                    >
                      {formatCurrency(customer.credit_balance)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openLedger(customer)} className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
                          <i className="fa-solid fa-credit-card mr-1" /> {t('customers.creditAction')}
                        </button>
                        <button onClick={() => openEdit(customer)} className="text-xs font-medium" style={{ color: '#0d9488' }}>
                          <i className="fa-solid fa-pen mr-1" /> {t('common.edit')}
                        </button>
                        <button onClick={() => removeCustomer(customer)} className="text-xs font-medium text-red-500 hover:text-red-700">
                          <i className="fa-solid fa-trash-can mr-1" /> {t('common.delete')}
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
                    <p className="text-muted-color text-sm">{t('customers.noResults')}</p>
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
          itemLabel={t('customers.itemLabel')}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('customers.modal.editTitle') : t('customers.modal.createTitle')}>
        <div className="space-y-4">
          <FormField label={t('customers.fields.name')} error={errors.name?.[0]} required>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('customers.placeholders.name')} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('customers.fields.phone')} error={errors.phone?.[0]}>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder={t('customers.placeholders.phone')} />
            </FormField>
            <FormField label={t('customers.fields.email')} error={errors.email?.[0]}>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder={t('customers.placeholders.email')} />
            </FormField>
          </div>

          {canAssignOwner && (
            <FormField label={t('customers.fields.ownerAccount')} error={errors.user_id?.[0]}>
              <select value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}>
                <option value="">{t('customers.ownerCurrentAccount', { name: user?.name || t('customers.currentFallback') })}</option>
                {assignableUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} - {formatRoleLabel(entry.role, t)}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label={t('customers.fields.address')} error={errors.address?.[0]}>
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder={t('customers.placeholders.address')} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('customers.fields.governorate')} error={errors.wilaya?.[0]}>
              <select value={form.wilaya} onChange={(event) => setForm((current) => ({ ...current, wilaya: event.target.value }))}>
                <option value="">{t('customers.selectPlaceholder')}</option>
                {governorates.map((item) => (
                  <option key={item.id} value={item.value}>
                    {getConfigItemLabel(item)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('customers.fields.salesZone')} error={errors.zone_id?.[0]}>
              <select value={form.zone_id} onChange={(event) => setForm((current) => ({ ...current, zone_id: event.target.value }))}>
                <option value="">{t('customers.noneOption')}</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('customers.fields.taxId')} error={errors.tax_id?.[0]}>
              <input value={form.tax_id} onChange={(event) => setForm((current) => ({ ...current, tax_id: event.target.value }))} placeholder={t('customers.placeholders.taxId')} />
            </FormField>
            <FormField label={t('customers.fields.creditLimit')} error={errors.credit_limit?.[0]}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.credit_limit}
                onChange={(event) => setForm((current) => ({ ...current, credit_limit: event.target.value }))}
                placeholder={t('customers.placeholders.creditLimit')}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      <CustomerLedgerModal
        open={!!ledgerCustomer}
        customer={ledgerCustomer}
        onClose={closeLedger}
        onPaymentSaved={load}
      />
    </div>
  )
}
