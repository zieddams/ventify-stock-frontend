import { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { RoleBadge } from '../../components/Badge'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'

const EMPTY = { name: '', email: '', password: '', role: 'rep', zone_id: '' }

export default function UsersIndex() {
  const [users,   setUsers]   = useState([])
  const [zones,   setZones]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})
  const { user: me } = useAuth()

  const load = async () => {
    const [uRes, zRes] = await Promise.all([api.get('/users'), api.get('/zones')])
    setUsers(uRes.data); setZones(zRes.data); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true) }
  const openEdit   = (u) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, zone_id: u.zone_id ?? '' })
    setErrors({}); setModal(true)
  }
  const zoneName = (id) => zones.find(z => z.id === id)?.name ?? '—'

  const save = async () => {
    setSaving(true); setErrors({})
    try {
      const payload = { ...form, zone_id: form.zone_id === '' ? null : Number(form.zone_id) }
      if (editing) await api.put(`/users/${editing.id}`, payload)
      else         await api.post('/users', payload)
      setModal(false); load()
    } catch (e) { setErrors(e.response?.data?.errors ?? {}) }
    finally { setSaving(false) }
  }

  const toggle = async (u) => {
    if (u.id === me?.id) return alert("Vous ne pouvez pas désactiver votre propre compte.")
    await api.patch(`/users/${u.id}/toggle`); load()
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle={`${users.length} utilisateur(s) enregistrés`}
        action={<button onClick={openCreate} className="btn-primary"><i className="fa-solid fa-plus" /> Nouvel utilisateur</button>}
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Utilisateur', 'Email', 'Rôle', 'Zone', 'Statut', 'Créé le', 'Actions'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={`table-row ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-base-color">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-secondary-color text-xs font-mono">{u.email}</td>
                  <td className="py-3 pr-4"><RoleBadge role={u.role} /></td>
                  <td className="py-3 pr-4 text-muted-color text-xs">{zoneName(u.zone_id)}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold ${u.active ? 'text-emerald-600' : 'text-muted-color'}`}>
                      <i className={`fa-solid ${u.active ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1 text-[10px]`} />
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-color text-xs">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(u)}
                        className="text-xs font-medium" style={{ color: '#0d9488' }}>
                        <i className="fa-solid fa-pen mr-1" />Modifier
                      </button>
                      <button onClick={() => toggle(u)}
                        className={`text-xs font-medium ${u.active ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {u.active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-color">Aucun utilisateur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}>
        <div className="space-y-4">
          <FormField label="Nom" error={errors.name?.[0]} required>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Prénom Nom" />
          </FormField>
          <FormField label="Email" error={errors.email?.[0]} required>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@ventify.tn" />
          </FormField>
          <FormField
            label={editing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
            error={errors.password?.[0]} required={!editing}>
            <input type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Rôle" error={errors.role?.[0]} required>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="rep">Commercial</option>
                <option value="comptable">Comptable</option>
                <option value="admin">Administrateur</option>
                <option value="developer">Développeur</option>
              </select>
            </FormField>
            <FormField label="Zone (commercial)" error={errors.zone_id?.[0]}>
              <select value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                <option value="">Aucune</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
