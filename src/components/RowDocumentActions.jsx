import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { downloadDocumentPdf, printGeneratedDocument } from '../utils/documents'

function ActionButton({ children, title, disabled, onClick }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-theme text-muted-color hover:text-base-color hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

export default function RowDocumentActions({
  documentKey,
  record,
  documentLayouts,
  title,
  subtitle,
  filename,
  meta = [],
  documentSettings = null,
  currentUser = null,
}) {
  const { t } = useI18n()
  const [busyAction, setBusyAction] = useState('')

  const buildOptions = {
    documentKey,
    records: record ? [record] : [],
    documentLayouts,
    title,
    subtitle,
    filename,
    meta,
    documentSettings,
    user: currentUser,
  }

  const handlePdf = async () => {
    setBusyAction('pdf')

    try {
      await downloadDocumentPdf(buildOptions)
    } catch (error) {
      alert(error?.message === 'print_window_blocked'
        ? t('documents.printWindowBlocked')
        : t('documents.rowPdfUnavailable'))
    } finally {
      setBusyAction('')
    }
  }

  const handlePrint = () => {
    setBusyAction('print')

    try {
      printGeneratedDocument(buildOptions)
    } catch (error) {
      alert(error?.message === 'print_window_blocked'
        ? t('documents.printWindowBlocked')
        : t('documents.rowPrintUnavailable'))
    } finally {
      window.setTimeout(() => setBusyAction(''), 400)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        title={t('documents.downloadPdf')}
        disabled={busyAction !== ''}
        onClick={handlePdf}
      >
        {busyAction === 'pdf'
          ? <i className="fa-solid fa-spinner fa-spin text-xs" />
          : <i className="fa-solid fa-file-pdf text-xs" style={{ color: '#dc2626' }} />
        }
      </ActionButton>
      <ActionButton
        title={t('documents.printRecord')}
        disabled={busyAction !== ''}
        onClick={handlePrint}
      >
        {busyAction === 'print'
          ? <i className="fa-solid fa-spinner fa-spin text-xs" />
          : <i className="fa-solid fa-print text-xs" />
        }
      </ActionButton>
    </div>
  )
}
