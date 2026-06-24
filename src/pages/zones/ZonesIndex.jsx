import { useEffect, useState } from 'react'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'

export default function ZonesIndex() {
  const { t } = useI18n()
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '' })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const load = async () => {
    try {
      const response = await api.get('/zones')
      setZones(response.data)
    } catch {
      // The page already handles empty state gracefully.
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '' })
    setErrors({})
    setModal(true)
  }

  const openEdit = (zone) => {
    setEditing(zone)
    setForm({ name: zone.name })
    setErrors({})
    setModal(true)
  }

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      if (editing) {
        await api.put(`/zones/${editing.id}`, form)
      } else {
        await api.post('/zones', form)
      }
      setModal(false)
      load()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const remove = async (zone) => {
    if (!window.confirm(t('zonesPage.disableConfirm', { name: zone.name }))) return
    await api.delete(`/zones/${zone.id}`)
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title={t('zonesPage.title')}
        subtitle={t('zonesPage.subtitle', { count: zones.length })}
        action={(
          <button onClick={openCreate} className="btn-primary">
            <i className="fa-solid fa-plus" /> {t('zonesPage.newZone')}
          </button>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {zones.map((zone) => (
          <div key={zone.id} className="card flex items-center justify-between gap-3 py-3 px-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(13,148,136,0.1)' }}
              >
                <i className="fa-solid fa-map-pin text-sm" style={{ color: '#0d9488' }} />
              </div>
              <span className="font-semibold text-sm text-base-color">{zone.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(zone)} className="btn-ghost p-1.5 text-xs" title={t('common.edit')}>
                <i className="fa-solid fa-pen text-secondary-color" />
              </button>
              <button onClick={() => remove(zone)} className="btn-ghost p-1.5 text-xs" title={t('common.delete')}>
                <i className="fa-solid fa-trash-can text-red-400 hover:text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {zones.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <i className="fa-solid fa-map text-3xl text-muted-color opacity-30 mb-2 block" />
            <p className="text-muted-color text-sm">{t('zonesPage.empty')}</p>
            <button onClick={openCreate} className="btn-primary mt-4 text-sm">
              <i className="fa-solid fa-plus" /> {t('zonesPage.createFirst')}
            </button>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('zonesPage.editTitle') : t('zonesPage.createTitle')} size="sm">
        <div className="space-y-4">
          <FormField label={t('zonesPage.fieldName')} error={errors.name?.[0]} required>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('zonesPage.placeholder')}
              autoFocus
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
