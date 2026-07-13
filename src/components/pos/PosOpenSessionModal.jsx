import { useState } from 'react'
import Modal from '../Modal'
import { usePosSession } from '../../contexts/PosSessionContext'
import { useI18n } from '../../contexts/I18nContext'

export default function PosOpenSessionModal({ open, onClose }) {
  const { t } = useI18n()
  const { openSession } = usePosSession()
  const [openingFloat, setOpeningFloat] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (openingFloat === '' || Number(openingFloat) < 0) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await openSession(Number(openingFloat))
      setOpeningFloat('')
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.opening_float?.[0] || t('common.genericError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('posWorkspace.openSessionModal.title')} size="sm">
      <p className="text-xs text-muted-color mb-4">{t('posWorkspace.openSessionModal.intro')}</p>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm mb-4"
          style={{ borderColor: 'rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs text-muted-color mb-1 font-medium">{t('posWorkspace.openSessionModal.openingFloat')}</label>
        <input
          type="number"
          step="0.001"
          min="0"
          autoFocus
          value={openingFloat}
          onChange={(event) => setOpeningFloat(event.target.value)}
          placeholder="0.000"
        />
      </div>

      <button type="button" onClick={submit} disabled={saving || openingFloat === ''} className="btn-primary w-full justify-center">
        {saving
          ? <><i className="fa-solid fa-spinner fa-spin" /> {t('posWorkspace.openSessionModal.submitting')}</>
          : <><i className="fa-solid fa-cash-register" /> {t('posWorkspace.openSessionModal.submit')}</>}
      </button>
    </Modal>
  )
}
