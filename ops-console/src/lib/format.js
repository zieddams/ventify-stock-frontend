export function formatCompactNumber(value) {
  return new Intl.NumberFormat('fr-FR', {
    notation: Math.abs(Number(value ?? 0)) >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

export function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

export function formatDateTime(value) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatBytes(value) {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount) || amount <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = amount
  let unitIndex = 0

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024
    unitIndex += 1
  }

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatDuration(minutes) {
  const totalMinutes = Math.max(0, Math.round(Number(minutes ?? 0)))
  const hours = Math.floor(totalMinutes / 60)
  const remaining = totalMinutes % 60

  if (hours === 0) {
    return `${remaining} min`
  }

  return `${hours} h ${remaining.toString().padStart(2, '0')}`
}
