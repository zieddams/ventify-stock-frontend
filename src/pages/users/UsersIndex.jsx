import { useEffect, useMemo, useState } from 'react'
import { RoleBadge } from '../../components/Badge'
import DepotScopeControls, { DepotSelectionInfo } from '../../components/DepotScopeControls'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import PaginationControls from '../../components/PaginationControls'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'
import { paginateItems } from '../../utils/pagination'

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'rep',
  zone_id: '',
  depot_id: '',
}

export default function UsersIndex() {
  const [users, setUsers] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [errors, setErrors] = useState({})
  const [assignmentModal, setAssignmentModal] = useState(false)
  const [assignmentUser, setAssignmentUser] = useState(null)
  const [assignmentCustomers, setAssignmentCustomers] = useState([])
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([])
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const { user: me } = useAuth()
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    canSelectAll,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  const singleDepot = depots.length === 1 ? depots[0] : null
  const canManageUsers = ['admin', 'developer'].includes(me?.role)
  const canManageAssignments = ['admin', 'developer', 'comptable'].includes(me?.role)
  const totalAssignedCustomers = users.reduce((sum, entry) => sum + Number(entry.customers_count ?? 0), 0)

  const filteredAssignmentCustomers = useMemo(() => {
    const query = assignmentSearch.trim().toLowerCase()

    return assignmentCustomers.filter((customer) => {
      if (!query) {
        return true
      }

      return (
        customer.name?.toLowerCase().includes(query)
        || customer.phone?.includes(assignmentSearch)
        || customer.wilaya?.toLowerCase().includes(query)
        || customer.owner?.name?.toLowerCase().includes(query)
      )
    })
  }, [assignmentCustomers, assignmentSearch])

  const { items: paginatedUsers, meta: usersMeta } = useMemo(
    () => paginateItems(users, page, perPage),
    [page, perPage, users],
  )

  const load = async () => {
    setLoading(true)

    try {
      const params = selectedDepotId ? { depot_id: selectedDepotId } : {}
      const [usersResponse, zonesResponse] = await Promise.all([
        api.get('/users', { params }),
        api.get('/zones'),
      ])

      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : [])
      setZones(Array.isArray(zonesResponse.data) ? zonesResponse.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [selectedDepotId])

  useEffect(() => {
    if (page !== usersMeta.current_page) {
      setPage(usersMeta.current_page)
    }
  }, [page, usersMeta.current_page])

  useEffect(() => {
    if (!modal || !singleDepot) {
      return
    }

    setForm((current) => (
      current.depot_id
        ? current
        : { ...current, depot_id: String(singleDepot.id) }
    ))
  }, [modal, singleDepot])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...EMPTY,
      depot_id: selectedDepotId ? String(selectedDepotId) : (singleDepot ? String(singleDepot.id) : ''),
    })
    setErrors({})
    setModal(true)
  }

  const openEdit = (entry) => {
    setEditing(entry)
    setForm({
      name: entry.name,
      email: entry.email,
      password: '',
      role: entry.role,
      zone_id: entry.zone_id ?? '',
      depot_id: entry.depot_id ?? (singleDepot ? String(singleDepot.id) : ''),
    })
    setErrors({})
    setModal(true)
  }

  const zoneName = (id) => zones.find((zone) => Number(zone.id) === Number(id))?.name ?? '--'
  const depotName = (id) => depots.find((depot) => Number(depot.id) === Number(id))?.name ?? '--'
  const canManageList = (entry) => ['rep', 'comptable'].includes(entry.role)

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      const payload = {
        ...form,
        zone_id: form.zone_id === '' ? null : Number(form.zone_id),
        depot_id: form.depot_id === '' ? null : Number(form.depot_id),
      }

      if (editing) {
        await api.put(`/users/${editing.id}`, payload)
      } else {
        await api.post('/users', payload)
      }

      setModal(false)
      await load()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (entry) => {
    if (entry.id === me?.id) {
      alert('Vous ne pouvez pas desactiver votre propre compte.')
      return
    }

    await api.patch(`/users/${entry.id}/toggle`)
    await load()
  }

  const removeUser = async (entry) => {
    if (entry.id === me?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte.')
      return
    }

    if (!confirm(`Supprimer le compte ${entry.name} ? Cette action reste bloquee si le compte possede deja un historique de sessions, factures ou mouvements.`)) {
      return
    }

    setDeletingUserId(entry.id)

    try {
      await api.delete(`/users/${entry.id}`)
      await load()
    } catch (error) {
      const message = error.response?.data?.message ?? 'Suppression impossible.'
      const blockers = error.response?.data?.blockers ?? []
      alert([message, ...blockers].join('\n'))
    } finally {
      setDeletingUserId(null)
    }
  }

  const closeAssignments = () => {
    setAssignmentModal(false)
    setAssignmentUser(null)
    setAssignmentCustomers([])
    setSelectedCustomerIds([])
    setAssignmentSearch('')
  }

  const openAssignments = async (entry) => {
    setAssignmentUser(entry)
    setAssignmentModal(true)
    setAssignmentLoading(true)
    setAssignmentSearch('')

    try {
      const [customersResponse, assignedResponse] = await Promise.all([
        api.get('/customers'),
        api.get(`/users/${entry.id}/customers`),
      ])

      const allCustomers = Array.isArray(customersResponse.data) ? customersResponse.data : []
      const assignedCustomers = Array.isArray(assignedResponse.data) ? assignedResponse.data : []

      setAssignmentCustomers(
        [...allCustomers].sort((left, right) => String(left.name ?? '').localeCompare(String(right.name ?? ''), 'fr')),
      )
      setSelectedCustomerIds(assignedCustomers.map((customer) => Number(customer.id)))
    } finally {
      setAssignmentLoading(false)
    }
  }

  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomerIds((current) => (
      current.includes(customerId)
        ? current.filter((value) => value !== customerId)
        : [...current, customerId]
    ))
  }

  const saveAssignments = async () => {
    if (!assignmentUser) {
      return
    }

    setAssignmentSaving(true)

    try {
      await api.put(`/users/${assignmentUser.id}/customers`, {
        customer_ids: selectedCustomerIds,
      })

      closeAssignments()
      await load()
    } finally {
      setAssignmentSaving(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} utilisateur(s) enregistres · ${totalAssignedCustomers} client(s) affectes`}
        action={(
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canSelectAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                allowAll
                canSelectAll={canSelectAll}
                allLabel="Tous les depots"
              />
            )}
            {canManageUsers && (
              <button onClick={openCreate} className="btn-primary">
                <i className="fa-solid fa-plus" /> Nouvel utilisateur
              </button>
            )}
          </div>
        )}
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Utilisateur', 'Email', 'Role', 'Zone', 'Depot', 'Liste clients', 'Statut', 'Cree le', 'Actions'].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-left">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((entry) => (
                <tr key={entry.id} className={`table-row ${!entry.active ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
                      >
                        {entry.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-base-color">{entry.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-secondary-color text-xs font-mono">{entry.email}</td>
                  <td className="py-3 pr-4"><RoleBadge role={entry.role} /></td>
                  <td className="py-3 pr-4 text-muted-color text-xs">{zoneName(entry.zone_id)}</td>
                  <td className="py-3 pr-4 text-muted-color text-xs">{entry.depot?.name ?? depotName(entry.depot_id)}</td>
                  <td className="py-3 pr-4 text-secondary-color text-xs font-semibold">{Number(entry.customers_count ?? 0)} client(s)</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold ${entry.active ? 'text-emerald-600' : 'text-muted-color'}`}>
                      <i className={`fa-solid ${entry.active ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1 text-[10px]`} />
                      {entry.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-color text-xs">
                    {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {canManageAssignments && canManageList(entry) && (
                        <button
                          onClick={() => openAssignments(entry)}
                          className="text-xs font-medium"
                          style={{ color: '#2563eb' }}
                        >
                          <i className="fa-solid fa-list-check mr-1" /> Clients
                        </button>
                      )}
                      {canManageUsers && (
                        <>
                          <button
                            onClick={() => openEdit(entry)}
                            className="text-xs font-medium"
                            style={{ color: '#0d9488' }}
                          >
                            <i className="fa-solid fa-pen mr-1" /> Modifier
                          </button>
                          <button
                            onClick={() => toggle(entry)}
                            className={`text-xs font-medium ${entry.active ? 'text-amber-600' : 'text-emerald-600'}`}
                          >
                            {entry.active ? 'Desactiver' : 'Activer'}
                          </button>
                          {entry.id !== me?.id && (
                            <button
                              onClick={() => removeUser(entry)}
                              disabled={deletingUserId === entry.id}
                              className="text-xs font-medium text-red-500 disabled:opacity-50"
                            >
                              {deletingUserId === entry.id ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Suppression...</> : <><i className="fa-solid fa-trash-can mr-1" /> Supprimer</>}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-color">Aucun utilisateur</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          meta={usersMeta}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value)
            setPage(1)
          }}
          itemLabel="utilisateurs"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}>
        <div className="space-y-4">
          <FormField label="Nom" error={errors.name?.[0]} required>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Prenom Nom" />
          </FormField>

          <FormField label="Email" error={errors.email?.[0]} required>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="user@ventify.tn" />
          </FormField>

          <FormField
            label={editing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
            error={errors.password?.[0]}
            required={!editing}
          >
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="********" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Role" error={errors.role?.[0]} required>
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="rep">Commercial</option>
                <option value="comptable">Comptable</option>
                <option value="admin">Administrateur</option>
                <option value="developer">Developpeur</option>
              </select>
            </FormField>

            <FormField label="Zone (commercial)" error={errors.zone_id?.[0]}>
              <select value={form.zone_id} onChange={(event) => setForm((current) => ({ ...current, zone_id: event.target.value }))}>
                <option value="">Aucune</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Depot principal" error={errors.depot_id?.[0]}>
            {singleDepot ? (
              <DepotSelectionInfo depot={singleDepot} />
            ) : (
              <select value={form.depot_id} onChange={(event) => setForm((current) => ({ ...current, depot_id: event.target.value }))}>
                <option value="">Aucun</option>
                {depots.filter((depot) => depot.active !== false).map((depot) => (
                  <option key={depot.id} value={depot.id}>
                    {depot.code ? `${depot.name} (${depot.code})` : depot.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={assignmentModal}
        onClose={closeAssignments}
        title={assignmentUser ? `Liste clients - ${assignmentUser.name}` : 'Liste clients'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 text-sm text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            Cette liste pilote les clients visibles sur le web et le mobile pour ce compte. Un client selectionne ici sera rattache a ce compte.
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={assignmentSearch}
              onChange={(event) => setAssignmentSearch(event.target.value)}
              placeholder="Rechercher un client..."
            />
            <div className="rounded-2xl px-4 py-3 text-xs font-semibold text-base-color" style={{ background: 'var(--surface-2)' }}>
              {selectedCustomerIds.length} selection(s)
            </div>
          </div>

          {assignmentLoading ? (
            <div className="py-12 text-center text-muted-color">
              <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement de la liste...
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-2xl" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              <div className="divide-y divide-theme">
                {filteredAssignmentCustomers.map((customer) => {
                  const checked = selectedCustomerIds.includes(Number(customer.id))

                  return (
                    <label
                      key={customer.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                      style={{ background: checked ? 'rgba(13,148,136,0.06)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCustomerSelection(Number(customer.id))}
                        style={{ width: 16, height: 16, marginTop: 3 }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-base-color">{customer.name}</div>
                          {checked && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                              Affecte
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary-color mt-1">
                          {customer.phone || 'Sans telephone'}
                          {customer.wilaya ? ` · ${customer.wilaya}` : ''}
                          {customer.zone?.name ? ` · ${customer.zone.name}` : ''}
                        </div>
                        <div className="text-[11px] text-muted-color mt-1">
                          Proprietaire actuel: {customer.owner?.name || 'Aucun'}
                        </div>
                      </div>
                    </label>
                  )
                })}

                {filteredAssignmentCustomers.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-muted-color">
                    Aucun client ne correspond a la recherche.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeAssignments} className="btn-secondary">Annuler</button>
            <button onClick={saveAssignments} disabled={assignmentLoading || assignmentSaving} className="btn-primary">
              {assignmentSaving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : 'Sauver la liste'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
