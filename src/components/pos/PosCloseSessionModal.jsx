import { useEffect, useState } from 'react'
import Modal from '../Modal'
import { usePosSession } from '../../contexts/PosSessionContext'
import { useI18n } from '../../contexts/I18nContext'
import { formatCurrency } from '../../utils/format'

export default function PosCloseSessionModal({ open, onClose }) {
  const { t } = useI18n()
  const { session, closeSession, refresh } = usePosSession()
  const [closingCount, setClosingCount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!open) {
      setClosingCount('')
      setError('')
      setResult(null)
      return
    }

    // The cached session (from open()/mount) never carries the live
    // expected_cash preview - only GET /pos-sessions/today computes it, so
    // refresh right when the clerk is about to count the drawer.
    refresh()
  }, [open])

  const submit = async () => {
    if (closingCount === '' || Number(closingCount) < 0) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const closed = await closeSession(Number(closingCount))
      setResult(closed)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.closing_count?.[0] || t('common.genericError'))
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    const variance = Number(result.cash_variance ?? 0)
    const isMatch = Math.abs(variance) < 0.001
    const color = isMatch ? '#0d9488' : (variance < 0 ? '#dc2626' : '#3b82f6')

    return (
      <Modal open={open} onClose={onClose} title={t('posWorkspace.closeSessionModal.resultTitle')} size="sm">
        <div className="rounded-xl p-4 text-center mb-4" style={{ background: `${color}1a` }}>
          <div className="text-2xl font-bold" style={{ color }}>{formatCurrency(variance)}</div>
          <div className="text-sm mt-1" style={{ color }}>
            {isMatch
              ? t('posWorkspace.closeSessionModal.resultMatch')
              : (variance < 0
                ? t('posWorkspace.closeSessionModal.resultShort', { amount: formatCurrency(Math.abs(variance)) })
                : t('posWorkspace.closeSessionModal.resultOver', { amount: formatCurrency(variance) }))}
          </div>
        </div>
        <button type="button" onClick={onClose} className="btn-secondary w-full justify-center">
          {t('posWorkspace.closeSessionModal.close')}
        </button>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={t('posWorkspace.closeSessionModal.title')} size="sm">
      <p className="text-xs text-muted-color mb-4">{t('posWorkspace.closeSessionModal.intro')}</p>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm mb-4"
          style={{ borderColor: 'rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <div className="rounded-xl px-3 py-2.5 text-sm mb-4" style={{ background: 'rgba(13,148,136,0.08)', color: '#0f766e' }}>
        {t('posWorkspace.closeSessionModal.summary', { expected: formatCurrency(session?.expected_cash ?? 0) })}
      </div>

      <div className="mb-4">
        <label className="block text-xs text-muted-color mb-1 font-medium">{t('posWorkspace.closeSessionModal.closingCount')}</label>
        <input
          type="number"
          step="0.001"
          min="0"
          autoFocus
          value={closingCount}
          onChange={(event) => setClosingCount(event.target.value)}
          placeholder="0.000"
        />
      </div>

      <button type="button" onClick={submit} disabled={saving || closingCount === ''} className="btn-primary w-full justify-center">
        {saving
          ? <><i className="fa-solid fa-spinner fa-spin" /> {t('posWorkspace.closeSessionModal.submitting')}</>
          : <><i className="fa-solid fa-lock" /> {t('posWorkspace.closeSessionModal.submit')}</>}
      </button>
    </Modal>
  )
}
