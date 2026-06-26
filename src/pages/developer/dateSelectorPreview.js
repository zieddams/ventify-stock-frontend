import { FIXED_DATE_TIME_LOCALE } from '../../i18n/locales'

export const RANGE_PAYLOAD_SEPARATOR = ' to '

export const DATE_SELECTOR_DEFAULTS = {
  date: '2026-06-26',
  datetime: '2026-06-26 08:30',
  range: `2026-06-20${RANGE_PAYLOAD_SEPARATOR}2026-06-26`,
}

export const DATE_SELECTOR_VARIANTS = [
  {
    id: 'glass-inline',
    key: 'glass',
    library: 'flatpickr',
    accent: '#0d9488',
    accentRgb: '13, 148, 136',
    icon: 'fa-solid fa-sparkles',
    accepted: true,
  },
  {
    id: 'slate-pop',
    key: 'slate',
    library: 'react-datepicker',
    accent: '#1d4ed8',
    accentRgb: '29, 78, 216',
    icon: 'fa-solid fa-layer-group',
  },
  {
    id: 'dock-rail',
    key: 'dock',
    library: 'react-datepicker',
    accent: '#0f766e',
    accentRgb: '15, 118, 110',
    icon: 'fa-solid fa-table-columns',
    favorite: true,
  },
  {
    id: 'sage-flat',
    key: 'sage',
    library: 'flatpickr',
    accent: '#6b8a74',
    accentRgb: '107, 138, 116',
    icon: 'fa-solid fa-leaf',
  },
  {
    id: 'soft-pill',
    key: 'pill',
    library: 'react-datepicker',
    accent: '#ea580c',
    accentRgb: '234, 88, 12',
    icon: 'fa-solid fa-hourglass-half',
  },
  {
    id: 'frame-panel',
    key: 'frame',
    library: 'react-datepicker',
    accent: '#7c3aed',
    accentRgb: '124, 58, 237',
    icon: 'fa-solid fa-border-all',
  },
]

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const DATE_CONTEXT_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const DATE_TIME_DISPLAY_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DATE_TIME_CONTEXT_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

function pad2(value) {
  return String(value).padStart(2, '0')
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime())
}

function formatDatePayload(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function buildDatePayload(raw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null
  }

  const candidate = new Date(`${raw}T00:00:00`)
  return isValidDate(candidate) ? candidate : null
}

function buildDateTimePayload(raw) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    return null
  }

  const candidate = new Date(raw.replace(' ', 'T') + ':00')
  return isValidDate(candidate) ? candidate : null
}

function buildRangePayload(value) {
  const raw = String(value || '').trim()

  if (!raw) {
    return []
  }

  const parts = raw
    .split(RANGE_PAYLOAD_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length === 0 || parts.length > 2) {
    return null
  }

  const dates = parts.map((item) => buildDatePayload(item))

  return dates.every(isValidDate) ? dates : null
}

function buildPreviewDate(fieldType, value) {
  const raw = String(value || '').trim()

  if (!raw) {
    return null
  }

  return fieldType === 'datetime' ? buildDateTimePayload(raw) : buildDatePayload(raw)
}

export function toDateSelectorPayload(fieldType, value) {
  if (fieldType === 'range') {
    if (!Array.isArray(value)) {
      return ''
    }

    return value
      .filter(isValidDate)
      .map((date) => formatDatePayload(date))
      .join(RANGE_PAYLOAD_SEPARATOR)
  }

  const selected = Array.isArray(value)
    ? value.find(isValidDate)
    : value

  if (!isValidDate(selected)) {
    return ''
  }

  if (fieldType === 'datetime') {
    return `${formatDatePayload(selected)} ${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`
  }

  return formatDatePayload(selected)
}

export function toDateSelectorFlatpickrValue(fieldType, value) {
  const normalized = normalizeDateSelectorValue(fieldType, value, { allowEmpty: true })

  if (fieldType === 'range') {
    return buildRangePayload(normalized) ?? []
  }

  return buildPreviewDate(fieldType, normalized) ?? ''
}

export function normalizeDateSelectorValue(fieldType, value, { allowEmpty = false } = {}) {
  const raw = String(value || '').trim()

  if (!raw) {
    return allowEmpty ? '' : (DATE_SELECTOR_DEFAULTS[fieldType] || DATE_SELECTOR_DEFAULTS.date)
  }

  if (fieldType === 'range') {
    const range = buildRangePayload(raw)

    if (!range) {
      return DATE_SELECTOR_DEFAULTS.range
    }

    return range.map((date) => formatDatePayload(date)).join(RANGE_PAYLOAD_SEPARATOR)
  }

  return buildPreviewDate(fieldType, raw)
    ? raw
    : (DATE_SELECTOR_DEFAULTS[fieldType] || DATE_SELECTOR_DEFAULTS.date)
}

export function getTodayDateSelectorValue(fieldType, now = new Date()) {
  if (!isValidDate(now)) {
    return DATE_SELECTOR_DEFAULTS[fieldType] || DATE_SELECTOR_DEFAULTS.date
  }

  if (fieldType === 'datetime') {
    return toDateSelectorPayload('datetime', now)
  }

  if (fieldType === 'range') {
    const end = new Date(now)
    end.setDate(end.getDate() + 6)
    return `${toDateSelectorPayload('date', now)}${RANGE_PAYLOAD_SEPARATOR}${toDateSelectorPayload('date', end)}`
  }

  return toDateSelectorPayload('date', now)
}

export function formatDateSelectorValue(fieldType, value) {
  const normalized = normalizeDateSelectorValue(fieldType, value, { allowEmpty: true })

  if (fieldType === 'range') {
    const range = buildRangePayload(normalized)

    if (!range || range.length === 0) {
      return {
        normalized: '',
        isEmpty: true,
        display: '--',
        context: '',
      }
    }

    const [start, end] = range

    if (!end) {
      return {
        normalized,
        isEmpty: false,
        display: DATE_DISPLAY_FORMATTER.format(start),
        context: `Debut selectionne: ${DATE_CONTEXT_FORMATTER.format(start)}`,
      }
    }

    return {
      normalized,
      isEmpty: false,
      display: `${DATE_DISPLAY_FORMATTER.format(start)} -> ${DATE_DISPLAY_FORMATTER.format(end)}`,
      context: `Du ${DATE_CONTEXT_FORMATTER.format(start)} au ${DATE_CONTEXT_FORMATTER.format(end)}`,
    }
  }

  const date = buildPreviewDate(fieldType, normalized)

  if (!date) {
    return {
      normalized: '',
      isEmpty: true,
      display: '--',
      context: '',
    }
  }

  if (fieldType === 'datetime') {
    return {
      normalized,
      isEmpty: false,
      display: DATE_TIME_DISPLAY_FORMATTER.format(date),
      context: DATE_TIME_CONTEXT_FORMATTER.format(date),
    }
  }

  return {
    normalized,
    isEmpty: false,
    display: DATE_DISPLAY_FORMATTER.format(date),
    context: DATE_CONTEXT_FORMATTER.format(date),
  }
}
