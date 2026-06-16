import { useState } from 'react'
import { downloadCsvExport, printCurrentDocument } from '../utils/exporting'

export default function PageExportActions({
  title,
  csvEntity = null,
  csvParams = {},
  csvFilename = null,
}) {
  const [exporting, setExporting] = useState(false)

  const handleExcel = async () => {
    if (!csvEntity) return

    setExporting(true)
    try {
      await downloadCsvExport(csvEntity, csvParams, csvFilename || csvEntity)
    } catch (error) {
      alert(error.response?.data?.message || 'Export impossible pour le moment.')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    printCurrentDocument(title ? `${title} | El Irtiwaa` : 'El Irtiwaa')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      {csvEntity && (
        <button onClick={handleExcel} disabled={exporting} className="btn-secondary text-xs">
          {exporting
            ? <><i className="fa-solid fa-spinner fa-spin" /> Export...</>
            : <><i className="fa-solid fa-file-excel" /> Excel</>
          }
        </button>
      )}
      <button onClick={handlePrint} className="btn-secondary text-xs">
        <i className="fa-solid fa-file-pdf" /> PDF
      </button>
      <button onClick={handlePrint} className="btn-secondary text-xs">
        <i className="fa-solid fa-print" /> Imprimer
      </button>
    </div>
  )
}
