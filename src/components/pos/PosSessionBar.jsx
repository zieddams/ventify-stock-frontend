import { useState } from 'react'
import { usePosSession } from '../../contexts/PosSessionContext'
import { useI18n } from '../../contexts/I18nContext'
import { formatTime } from '../../utils/format'
import PosOpenSessionModal from './PosOpenSessionModal'
import PosCloseSessionModal from './PosCloseSessionModal'

export default function PosSessionBar() {
  const { t } = useI18n()
  const { session, loading, isOpen } = usePosSession()
  const [openModalVisible, setOpenModalVisible] = useState(false)
  const [closeModalVisible, setCloseModalVisible] = useState(false)

  if (loading) {
    return null
  }

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-2 text-sm no-print"
        style={{
          background: isOpen ? 'rgba(13,148,136,0.08)' : 'rgba(239,68,68,0.06)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: isOpen ? '#0d9488' : '#dc2626' }}
        />
        <span className="font-semibold" style={{ color: isOpen ? '#0f766e' : '#dc2626' }}>
          {isOpen ? t('posWorkspace.sessionBar.openLabel') : t('posWorkspace.sessionBar.closedLabel')}
        </span>
        {isOpen && session?.opened_at && (
          <span className="text-muted-color text-xs">
            {t('posWorkspace.sessionBar.openedAt', { time: formatTime(session.opened_at) })}
          </span>
        )}
        <div className="flex-1" />
        {isOpen ? (
          <button type="button" onClick={() => setCloseModalVisible(true)} className="btn-secondary text-xs px-3 py-1.5">
            <i className="fa-solid fa-lock" /> {t('posWorkspace.sessionBar.closeAction')}
          </button>
        ) : (
          <button type="button" onClick={() => setOpenModalVisible(true)} className="btn-primary text-xs px-3 py-1.5">
            <i className="fa-solid fa-cash-register" /> {t('posWorkspace.sessionBar.openAction')}
          </button>
        )}
      </div>

      <PosOpenSessionModal open={openModalVisible} onClose={() => setOpenModalVisible(false)} />
      <PosCloseSessionModal open={closeModalVisible} onClose={() => setCloseModalVisible(false)} />
    </>
  )
}
