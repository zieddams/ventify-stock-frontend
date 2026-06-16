import api from '../services/api'

export async function downloadCsvExport(entityType, params = {}, filenamePrefix = entityType) {
  const response = await api.get('/export/csv', {
    params: { entity_type: entityType, ...params },
    responseType: 'blob',
  })

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const filename = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)

  return filename
}

export function printCurrentDocument(title) {
  const previousTitle = document.title

  if (title) {
    document.title = title
  }

  window.print()

  setTimeout(() => {
    document.title = previousTitle
  }, 0)
}
