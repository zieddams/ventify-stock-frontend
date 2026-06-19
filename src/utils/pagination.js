function toPositiveInteger(value, fallback) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}

export function buildClientPaginationMeta(totalItems, page = 1, perPage = 20) {
  const total = Math.max(Number(totalItems ?? 0), 0)
  const safePerPage = toPositiveInteger(perPage, 20)
  const lastPage = Math.max(Math.ceil(total / safePerPage), 1)
  const currentPage = Math.min(Math.max(toPositiveInteger(page, 1), 1), lastPage)
  const from = total === 0 ? 0 : ((currentPage - 1) * safePerPage) + 1
  const to = total === 0 ? 0 : Math.min(currentPage * safePerPage, total)

  return {
    current_page: currentPage,
    last_page: lastPage,
    per_page: safePerPage,
    total,
    from,
    to,
  }
}

export function paginateItems(items, page = 1, perPage = 20) {
  const safeItems = Array.isArray(items) ? items : []
  const meta = buildClientPaginationMeta(safeItems.length, page, perPage)
  const startIndex = (meta.current_page - 1) * meta.per_page

  return {
    items: safeItems.slice(startIndex, startIndex + meta.per_page),
    meta,
  }
}

export function extractPaginationMeta(payload, fallback = {}) {
  const source = payload?.meta && typeof payload.meta === 'object'
    ? payload.meta
    : payload

  const currentPage = toPositiveInteger(source?.current_page, toPositiveInteger(fallback.current_page, 1))
  const perPage = toPositiveInteger(source?.per_page, toPositiveInteger(fallback.per_page, 20))
  const total = Math.max(Number(source?.total ?? fallback.total ?? 0), 0)
  const lastPage = Math.max(
    toPositiveInteger(source?.last_page, total > 0 ? Math.ceil(total / perPage) : 1),
    1
  )
  const from = total === 0
    ? 0
    : Number(source?.from ?? fallback.from ?? (((currentPage - 1) * perPage) + 1))
  const to = total === 0
    ? 0
    : Number(source?.to ?? fallback.to ?? Math.min(currentPage * perPage, total))

  return {
    current_page: Math.min(currentPage, lastPage),
    last_page: lastPage,
    per_page: perPage,
    total,
    from,
    to,
  }
}
