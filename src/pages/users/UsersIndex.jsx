import { useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import { RoleBadge } from '../../components/Badge'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const EMPTY = { name: '', email: '', password: '', role: 'rep', zone_id: '' }

export default function UsersIndex() {
  const [users, setUsers] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const { user: me } = useAuth()

  const totalAssignedCustomers = users.reduce((sum, entry) => sum + Number(entry.customers_count ?? 0), 0)

  const load = async () => {
    const [usersResponse, zonesResponse] = await Promise.all([api.get('/users'), api.get('/zones')])
    setUsers(usersResponse.data)
    setZones(zonesResponse.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
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
    })
    setErrors({})
    setModal(true)
  }

  const zoneName = (id) => zones.find((zone) => zone.id === id)?.name ?? '--'

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      const payload = {
        ...form,
        zone_id: form.zone_id === '' ? null : Number(form.zone_id),
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

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} utilisateur(s) enregistres · ${totalAssignedCustomers} client(s) affectes`}
        action={<button onClick={openCreate} className="btn-primary"><i className="fa-solid fa-plus" /> Nouvel utilisateur</button>}
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Utilisateur', 'Email', 'Role', 'Zone', 'Liste clients', 'Statut', 'Cree le', 'Actions'].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-left">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
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
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-color">Aucun utilisateur</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
