import { FIXED_DATE_TIME_LOCALE, getRuntimeLocale } from '../i18n/locales'

const DATE_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const TIME_FORMATTER = new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
})

function isArabicLocale() {
  return String(getRuntimeLocale() || '').startsWith('ar')
}

function toValidDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export function formatNumber(value, digits = 3) {
  return new Intl.NumberFormat(getRuntimeLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNumber(value))
}

export function formatCount(value) {
  return new Intl.NumberFormat(getRuntimeLocale(), {
    maximumFractionDigits: 0,
  }).format(toNumber(value))
}

export function formatCurrency(value, digits = 3) {
  return `${formatNumber(value, digits)} TND`
}

export function formatDate(value) {
  const date = toValidDate(value)
  if (!date) {
    return '--'
  }

  return DATE_FORMATTER.format(date)
}

export function formatDateTime(value) {
  const date = toValidDate(value)
  if (!date) {
    return '--'
  }

  return DATE_TIME_FORMATTER.format(date)
}

export function formatTime(value) {
  const date = toValidDate(value)
  if (!date) {
    return '--'
  }

  return TIME_FORMATTER.format(date)
}

export function formatElapsedSeconds(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) {
    return null
  }

  const elapsed = Math.max(0, Math.floor(Number(seconds)))
  const ar = isArabicLocale()

  if (elapsed < 60) {
    return ar ? `${elapsed} ث` : `${elapsed} s`
  }

  const minutes = Math.floor(elapsed / 60)
  if (minutes < 60) {
    return ar ? `${minutes} دق` : `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return ar ? `${hours} س` : `${hours} h`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return ar ? `${days} ي` : `${days} j`
  }

  const weeks = Math.floor(days / 7)
  if (weeks < 5) {
    return ar ? `${weeks} س.أ` : `${weeks} sem`
  }

  const months = Math.floor(days / 30)
  if (months < 12) {
    return ar ? `${months} شهر` : `${months} mois`
  }

  const years = Math.floor(days / 365)
  return ar ? `${years} سنة` : `${years} an${years > 1 ? 's' : ''}`
}
