import { useState } from 'react'
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
}) {
  const [busyAction, setBusyAction] = useState('')

  const buildOptions = {
    documentKey,
    records: record ? [record] : [],
    documentLayouts,
    title,
    subtitle,
    filename,
    meta,
  }

  const handlePdf = async () => {
    setBusyAction('pdf')

    try {
      await downloadDocumentPdf(buildOptions)
    } catch (error) {
      alert(error?.message === 'print_window_blocked'
        ? 'La fenêtre d’impression a été bloquée par le navigateur.'
        : 'Impossible de générer ce PDF pour le moment.')
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
        ? 'La fenêtre d’impression a été bloquée par le navigateur.'
        : 'Impossible d’ouvrir l’impression pour le moment.')
    } finally {
      window.setTimeout(() => setBusyAction(''), 400)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        title="Télécharger le PDF"
        disabled={busyAction !== ''}
        onClick={handlePdf}
      >
        {busyAction === 'pdf'
          ? <i className="fa-solid fa-spinner fa-spin text-xs" />
          : <i className="fa-solid fa-file-pdf text-xs" style={{ color: '#dc2626' }} />
        }
      </ActionButton>
      <ActionButton
        title="Imprimer la fiche"
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
