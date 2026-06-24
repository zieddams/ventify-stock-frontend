import { useI18n } from '../contexts/I18nContext'

function buildSummary(meta, itemLabel, t) {
  const total = Number(meta?.total ?? 0)
  const from = Number(meta?.from ?? 0)
  const to = Number(meta?.to ?? 0)

  if (total <= 0) {
    return t('pagination.summaryZero', { itemLabel })
  }

  return t('pagination.summaryRange', { from, to, total, itemLabel })
}

export default function PaginationControls({
  meta,
  onPageChange,
  perPage,
  onPerPageChange = null,
  pageSizeOptions = [10, 20, 50],
  itemLabel = '',
  className = '',
}) {
  const { t } = useI18n()

  if (!meta) {
    return null
  }

  const currentPage = Number(meta.current_page ?? 1)
  const lastPage = Math.max(Number(meta.last_page ?? 1), 1)
  const resolvedItemLabel = itemLabel || t('pagination.items')
  const summary = buildSummary(meta, resolvedItemLabel, t)
  const safePerPage = Number(perPage ?? meta.per_page ?? pageSizeOptions[0] ?? 20)
  const canGoBack = currentPage > 1
  const canGoForward = currentPage < lastPage

  if (lastPage <= 1 && !onPerPageChange) {
    return (
      <div className={`flex items-center justify-between pt-4 mt-4 ${className}`.trim()} style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs text-muted-color">{summary}</span>
        <span className="text-xs text-muted-color">{t('pagination.pageOf', { current: 1, last: 1 })}</span>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-3 pt-4 mt-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-color">{summary}</span>
        {onPerPageChange && (
          <label className="inline-flex items-center gap-2 text-xs text-muted-color">
            <span>{t('pagination.perPage')}</span>
            <select
              value={safePerPage}
              onChange={(event) => onPerPageChange(Number(event.target.value))}
              className="h-9 min-w-[84px] text-xs"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs text-muted-color">
          {t('pagination.pageOf', { current: currentPage, last: lastPage })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => onPageChange(currentPage - 1)}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button
            type="button"
            disabled={!canGoForward}
            onClick={() => onPageChange(currentPage + 1)}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      </div>
    </div>
  )
}
