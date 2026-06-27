export const DOCK_RAIL_DATE_PICKER_LOCALE = 'irtiwaa-fr'
export const DOCK_RAIL_DATE_PICKER_ACCENT = '#0f766e'
export const DOCK_RAIL_DATE_PICKER_ACCENT_RGB = '15, 118, 110'
export const FRENCH_DATE_RANGE_SEPARATOR = ' au '
export const IRTIWAA_PRODUCTION_WEB_HOSTNAME = 'irtiwaa.ziedtech.com'

const DATE_INPUT_TYPE_DATE = 'date'
const DATE_INPUT_TYPE_MONTH = 'month'
const DATE_INPUT_TYPE_DATETIME = 'datetime-local'

function pad2(value) {
  return String(value).padStart(2, '0')
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function buildLocalDate(year, monthIndex, day = 1) {
  const candidate = new Date(year, monthIndex, day, 12, 0, 0, 0)
  return isValidDate(candidate) ? candidate : null
}

function buildLocalDateTime(year, monthIndex, day, hour, minute) {
  const candidate = new Date(year, monthIndex, day, hour, minute, 0, 0)
  return isValidDate(candidate) ? candidate : null
}

function matchesLocalDate(candidate, year, monthIndex, day) {
  return Boolean(candidate)
    && candidate.getFullYear() === year
    && candidate.getMonth() === monthIndex
    && candidate.getDate() === day
}

function matchesLocalDateTime(candidate, year, monthIndex, day, hour, minute) {
  return matchesLocalDate(candidate, year, monthIndex, day)
    && candidate.getHours() === hour
    && candidate.getMinutes() === minute
}

export function normalizeFrenchDateInputType(type = DATE_INPUT_TYPE_DATE) {
  const raw = String(type || '').trim().toLowerCase()

  if (raw === DATE_INPUT_TYPE_MONTH) {
    return DATE_INPUT_TYPE_MONTH
  }

  if (raw === 'datetime' || raw === DATE_INPUT_TYPE_DATETIME) {
    return DATE_INPUT_TYPE_DATETIME
  }

  return DATE_INPUT_TYPE_DATE
}

export function parseFrenchDateInputValue(type, value) {
  const normalizedType = normalizeFrenchDateInputType(type)
  const raw = String(value || '').trim()

  if (!raw) {
    return null
  }

  if (normalizedType === DATE_INPUT_TYPE_MONTH) {
    const match = raw.match(/^(\d{4})-(\d{2})$/)

    if (!match) {
      return null
    }

    const year = Number(match[1])
    const month = Number(match[2])

    if (month < 1 || month > 12) {
      return null
    }

    const candidate = buildLocalDate(year, month - 1, 1)

    return matchesLocalDate(candidate, year, month - 1, 1) ? candidate : null
  }

  if (normalizedType === DATE_INPUT_TYPE_DATETIME) {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)

    if (!match) {
      return null
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const hour = Number(match[4])
    const minute = Number(match[5])

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
      return null
    }

    const candidate = buildLocalDateTime(year, month - 1, day, hour, minute)

    return matchesLocalDateTime(candidate, year, month - 1, day, hour, minute) ? candidate : null
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  const candidate = buildLocalDate(year, month - 1, day)

  return matchesLocalDate(candidate, year, month - 1, day) ? candidate : null
}

export function formatFrenchDateInputPayload(type, value) {
  const normalizedType = normalizeFrenchDateInputType(type)

  if (!isValidDate(value)) {
    return ''
  }

  const year = value.getFullYear()
  const month = pad2(value.getMonth() + 1)

  if (normalizedType === DATE_INPUT_TYPE_MONTH) {
    return `${year}-${month}`
  }

  const day = pad2(value.getDate())
  const datePart = `${year}-${month}-${day}`

  if (normalizedType === DATE_INPUT_TYPE_DATETIME) {
    return `${datePart}T${pad2(value.getHours())}:${pad2(value.getMinutes())}`
  }

  return datePart
}

export function getFrenchDateInputDisplayFormat(type) {
  const normalizedType = normalizeFrenchDateInputType(type)

  if (normalizedType === DATE_INPUT_TYPE_MONTH) {
    return 'MMMM yyyy'
  }

  if (normalizedType === DATE_INPUT_TYPE_DATETIME) {
    return 'dd/MM/yyyy HH:mm'
  }

  return 'dd/MM/yyyy'
}

export function getFrenchDateInputPlaceholder(type) {
  const normalizedType = normalizeFrenchDateInputType(type)

  if (normalizedType === DATE_INPUT_TYPE_MONTH) {
    return 'mois / annee'
  }

  if (normalizedType === DATE_INPUT_TYPE_DATETIME) {
    return 'jj/mm/aaaa hh:mm'
  }

  return 'jj/mm/aaaa'
}

export function parseFrenchDateRangeValue(valueFrom, valueTo) {
  return [
    parseFrenchDateInputValue(DATE_INPUT_TYPE_DATE, valueFrom),
    parseFrenchDateInputValue(DATE_INPUT_TYPE_DATE, valueTo),
  ]
}

export function formatFrenchDateRangePayload(value) {
  const [startDate, endDate] = Array.isArray(value) ? value : []

  return {
    from: formatFrenchDateInputPayload(DATE_INPUT_TYPE_DATE, startDate),
    to: formatFrenchDateInputPayload(DATE_INPUT_TYPE_DATE, endDate),
  }
}

export function getFrenchDateRangePlaceholder() {
  return `jj/mm/aaaa${FRENCH_DATE_RANGE_SEPARATOR}jj/mm/aaaa`
}

export function usesMonthPicker(type) {
  return normalizeFrenchDateInputType(type) === DATE_INPUT_TYPE_MONTH
}

export function usesTimeInput(type) {
  return normalizeFrenchDateInputType(type) === DATE_INPUT_TYPE_DATETIME
}

export function shouldUseDockRailDateInputs(hostname) {
  const currentHostname = hostname ?? (
    typeof window !== 'undefined'
      ? window.location?.hostname
      : ''
  )

  const normalizedHostname = String(currentHostname || '').trim().toLowerCase()

  if (!normalizedHostname) {
    return true
  }

  return normalizedHostname !== IRTIWAA_PRODUCTION_WEB_HOSTNAME
}
