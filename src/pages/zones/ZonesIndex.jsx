import { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import { PageLoader } from '../../components/Spinner'

export default function ZonesIndex() {
  const [zones,   setZones]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({ name: '' })
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  const load = async () => {
    try { const res = await api.get('/zones'); setZones(res.data) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: '' }); setErrors({}); setModal(true) }
  const openEdit   = (z) => { setEditing(z); setForm({ name: z.name }); setErrors({}); setModal(true) }

  const save = async () => {
    setSaving(true); setErrors({})
    try {
      if (editing) await api.put(`/zones/${editing.id}`, form)
      else         await api.post('/zones', form)
      setModal(false); load()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? {})
    } finally { setSaving(false) }
  }

  const del = async (z) => {
    if (!confirm(`Désactiver la zone "${z.name}" ?`)) return
    await api.delete(`/zones/${z.id}`)
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Zones de vente</h1>
          <p className="text-sm text-muted-color mt-0.5">
            {zones.length} zone(s) — tarifs par zone (Bizerte-centre, Menzel Abderrahmen…)
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <i className="fa-solid fa-plus" /> Nouvelle zone
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {zones.map(z => (
          <div key={z.id} className="card flex items-center justify-between gap-3 py-3 px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(13,148,136,0.1)' }}>
                <i className="fa-solid fa-map-pin text-sm" style={{ color: '#0d9488' }} />
              </div>
              <span className="font-semibold text-sm text-base-color">{z.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(z)}
                className="btn-ghost p-1.5 text-xs" title="Modifier">
                <i className="fa-solid fa-pen text-secondary-color" />
              </button>
              <button onClick={() => del(z)}
                className="btn-ghost p-1.5 text-xs" title="Désactiver">
                <i className="fa-solid fa-trash-can text-red-400 hover:text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {zones.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <i className="fa-solid fa-map text-3xl text-muted-color opacity-30 mb-2 block" />
            <p className="text-muted-color text-sm">Aucune zone configurée</p>
            <button onClick={openCreate} className="btn-primary mt-4 text-sm">
              <i className="fa-solid fa-plus" /> Créer une zone
            </button>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Modifier la zone' : 'Nouvelle zone'} size="sm">
        <div className="space-y-4">
          <FormField label="Nom de la zone" error={errors.name?.[0]} required>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Bizerte-centre" autoFocus />
          </FormField>
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
