import { useState } from 'react'
import { APP_NAME } from '../config/appMeta'
import { useDocumentLayouts } from '../hooks/useDocumentLayouts'
import { downloadDocumentPdf, printGeneratedDocument } from '../utils/documents'
import { downloadCsvExport, printCurrentDocument } from '../utils/exporting'

export default function PageExportActions({
  title,
  csvEntity = null,
  csvParams = {},
  csvFilename = null,
  documentKey = '',
  records = null,
  record = null,
  documentLayouts = null,
  subtitle = '',
  filename = '',
  meta = [],
}) {
  const shouldLoadLayouts = Boolean(documentKey) && documentLayouts == null
  const { layouts: fetchedDocumentLayouts } = useDocumentLayouts({ enabled: shouldLoadLayouts })
  const [csvExporting, setCsvExporting] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const activeDocumentLayouts = documentLayouts ?? fetchedDocumentLayouts
  const documentRecords = Array.isArray(records)
    ? records
    : record
      ? [record]
      : null
  const hasDocumentTemplate = Boolean(documentKey && documentRecords)

  const handleExcel = async () => {
    if (!csvEntity) return

    setCsvExporting(true)
    try {
      await downloadCsvExport(csvEntity, csvParams, csvFilename || csvEntity)
    } catch (error) {
      alert(error.response?.data?.message || "L'exportation est impossible pour le moment.")
    } finally {
      setCsvExporting(false)
    }
  }

  const handlePdf = async () => {
    if (!hasDocumentTemplate) {
      printCurrentDocument(title ? `${title} | ${APP_NAME}` : APP_NAME)
      return
    }

    setBusyAction('pdf')

    try {
      await downloadDocumentPdf({
        documentKey,
        records: documentRecords,
        documentLayouts: activeDocumentLayouts,
        title,
        subtitle,
        filename,
        meta,
      })
    } catch (error) {
      alert(error?.message === 'print_window_blocked'
        ? "La fenêtre d'impression a été bloquée par le navigateur."
        : 'Impossible de générer le document PDF pour le moment.')
    } finally {
      setBusyAction('')
    }
  }

  const handlePrint = () => {
    if (hasDocumentTemplate) {
      setBusyAction('print')

      try {
        printGeneratedDocument({
          documentKey,
          records: documentRecords,
          documentLayouts: activeDocumentLayouts,
          title,
          subtitle,
          filename,
          meta,
        })
      } catch (error) {
        alert(error?.message === 'print_window_blocked'
          ? "La fenêtre d'impression a été bloquée par le navigateur."
          : "Impossible d'ouvrir l'impression pour le moment.")
      } finally {
        window.setTimeout(() => setBusyAction(''), 400)
      }
      return
    }

    printCurrentDocument(title ? `${title} | ${APP_NAME}` : APP_NAME)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      {csvEntity && (
        <button onClick={handleExcel} disabled={csvExporting || busyAction !== ''} className="btn-secondary text-xs">
          {csvExporting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Exportation...</>
            : <><i className="fa-solid fa-file-excel" /> Excel</>
          }
        </button>
      )}
      <button onClick={handlePdf} disabled={csvExporting || busyAction !== ''} className="btn-secondary text-xs">
        {busyAction === 'pdf'
          ? <><i className="fa-solid fa-spinner fa-spin" /> Génération PDF...</>
          : <><i className="fa-solid fa-file-pdf" /> PDF</>
        }
      </button>
      <button onClick={handlePrint} disabled={csvExporting || busyAction !== ''} className="btn-secondary text-xs">
        {busyAction === 'print'
          ? <><i className="fa-solid fa-spinner fa-spin" /> Préparation...</>
          : <><i className="fa-solid fa-print" /> Imprimer</>
        }
      </button>
    </div>
  )
}
