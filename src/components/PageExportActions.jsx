import { useState } from 'react'
import { APP_NAME } from '../config/appMeta'
import { useI18n } from '../contexts/I18nContext'
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
  documentSettings = null,
  currentUser = null,
}) {
  const { t } = useI18n()
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
      alert(error.response?.data?.message || t('documents.exportUnavailable'))
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
        documentSettings,
        user: currentUser,
      })
    } catch (error) {
      alert(error?.message === 'print_window_blocked'
        ? t('documents.printWindowBlocked')
        : t('documents.pdfUnavailable'))
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
          documentSettings,
          user: currentUser,
        })
    } catch (error) {
      alert(error?.message === 'print_window_blocked'
        ? t('documents.printWindowBlocked')
        : t('documents.printUnavailable'))
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
            ? <><i className="fa-solid fa-spinner fa-spin" /> {t('documents.exporting')}</>
            : <><i className="fa-solid fa-file-excel" /> {t('documents.excel')}</>
          }
        </button>
      )}
      <button onClick={handlePdf} disabled={csvExporting || busyAction !== ''} className="btn-secondary text-xs">
        {busyAction === 'pdf'
          ? <><i className="fa-solid fa-spinner fa-spin" /> {t('documents.generatingPdf')}</>
          : <><i className="fa-solid fa-file-pdf" /> {t('documents.pdf')}</>
        }
      </button>
      <button onClick={handlePrint} disabled={csvExporting || busyAction !== ''} className="btn-secondary text-xs">
        {busyAction === 'print'
          ? <><i className="fa-solid fa-spinner fa-spin" /> {t('documents.preparing')}</>
          : <><i className="fa-solid fa-print" /> {t('documents.print')}</>
        }
      </button>
    </div>
  )
}
