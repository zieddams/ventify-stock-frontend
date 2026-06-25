import { getRuntimeLocale, translate } from '../i18n/locales'

function t(key, params = {}) {
  return translate(getRuntimeLocale(), key, params)
}

const TYPE_CONFIG = {
  LowStockNotification: {
    icon: 'fa-solid fa-triangle-exclamation',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    labelKey: 'activity.types.lowStock',
    route: '/depot',
  },
  DailySummaryNotification: {
    icon: 'fa-solid fa-chart-line',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    labelKey: 'activity.types.dailySummary',
    route: '/reports',
  },
  default: {
    icon: 'fa-solid fa-bell',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.10)',
    labelKey: 'activity.types.default',
    route: null,
  },
}

export const ACTIVITY_KIND_CONFIG = {
  'route.session.opened': {
    icon: 'fa-solid fa-truck-fast',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    labelKey: 'activity.kinds.routeSessionOpened',
  },
  'route.session.closed': {
    icon: 'fa-solid fa-flag-checkered',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    labelKey: 'activity.kinds.routeSessionClosed',
  },
  'route.load.updated': {
    icon: 'fa-solid fa-boxes-stacked',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    labelKey: 'activity.kinds.routeLoadUpdated',
  },
  'route.returns.updated': {
    icon: 'fa-solid fa-rotate-left',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    labelKey: 'activity.kinds.routeReturnsUpdated',
  },
  'invoice.created': {
    icon: 'fa-solid fa-file-circle-plus',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    labelKey: 'activity.kinds.invoiceCreated',
  },
  'invoice.payment.recorded': {
    icon: 'fa-solid fa-money-bill-wave',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    labelKey: 'activity.kinds.invoicePaymentRecorded',
  },
  'product.created': {
    icon: 'fa-solid fa-box-open',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.12)',
    labelKey: 'activity.kinds.productCreated',
  },
  'product.updated': {
    icon: 'fa-solid fa-pen-ruler',
    color: '#0284c7',
    bg: 'rgba(2,132,199,0.12)',
    labelKey: 'activity.kinds.productUpdated',
  },
  'product.deleted': {
    icon: 'fa-solid fa-box-archive',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    labelKey: 'activity.kinds.productDeleted',
  },
  'customer.created': {
    icon: 'fa-solid fa-user-plus',
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    labelKey: 'activity.kinds.customerCreated',
  },
  'customer.updated': {
    icon: 'fa-solid fa-user-pen',
    color: '#0f766e',
    bg: 'rgba(15,118,110,0.12)',
    labelKey: 'activity.kinds.customerUpdated',
  },
  'customer.deleted': {
    icon: 'fa-solid fa-user-xmark',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.12)',
    labelKey: 'activity.kinds.customerDeleted',
  },
  'customer.assignment.updated': {
    icon: 'fa-solid fa-list-check',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
    labelKey: 'activity.kinds.customerAssignmentUpdated',
  },
  'expense.created': {
    icon: 'fa-solid fa-receipt',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    labelKey: 'activity.kinds.expenseCreated',
  },
  'expense.updated': {
    icon: 'fa-solid fa-file-pen',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    labelKey: 'activity.kinds.expenseUpdated',
  },
  'expense.deleted': {
    icon: 'fa-solid fa-file-circle-minus',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    labelKey: 'activity.kinds.expenseDeleted',
  },
  'inventory.adjusted': {
    icon: 'fa-solid fa-scale-balanced',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
    labelKey: 'activity.kinds.inventoryAdjusted',
  },
  'config.item.created': {
    icon: 'fa-solid fa-sliders',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    labelKey: 'activity.kinds.configItemCreated',
  },
  'config.item.updated': {
    icon: 'fa-solid fa-sliders',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.12)',
    labelKey: 'activity.kinds.configItemUpdated',
  },
  'config.item.deleted': {
    icon: 'fa-solid fa-sliders',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    labelKey: 'activity.kinds.configItemDeleted',
  },
  'settings.updated': {
    icon: 'fa-solid fa-gear',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    labelKey: 'activity.kinds.settingsUpdated',
  },
  'camion.created': {
    icon: 'fa-solid fa-truck',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    labelKey: 'activity.kinds.camionCreated',
  },
  'camion.updated': {
    icon: 'fa-solid fa-truck-field',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
    labelKey: 'activity.kinds.camionUpdated',
  },
  'user.created': {
    icon: 'fa-solid fa-user-plus',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.12)',
    labelKey: 'activity.kinds.userCreated',
  },
  'user.updated': {
    icon: 'fa-solid fa-user-gear',
    color: '#4f46e5',
    bg: 'rgba(79,70,229,0.12)',
    labelKey: 'activity.kinds.userUpdated',
  },
  'session.reported': {
    icon: 'fa-solid fa-mobile-screen-button',
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    labelKey: 'activity.kinds.sessionReported',
  },
  'session.offline': {
    icon: 'fa-solid fa-mobile-screen',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    labelKey: 'activity.kinds.sessionOffline',
  },
  'bug.report.created': {
    icon: 'fa-solid fa-bug',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    labelKey: 'activity.kinds.bugReportCreated',
  },
  'developer.broadcast': {
    icon: 'fa-solid fa-bullhorn',
    color: '#0f766e',
    bg: 'rgba(13,148,136,0.12)',
    labelKey: 'activity.kinds.developerBroadcast',
    route: '/notifications-center',
  },
}

const NOTIFICATION_REFRESH_EXCLUDED_KINDS = new Set([
  'session.ping',
  'session.reported',
])

export const LIVE_NOTIFICATION_EVENT_KINDS = new Set(Object.keys(ACTIVITY_KIND_CONFIG))
export const NOTIFICATION_REFRESH_EVENT_KINDS = new Set(
  [...LIVE_NOTIFICATION_EVENT_KINDS].filter((kind) => !NOTIFICATION_REFRESH_EXCLUDED_KINDS.has(kind)),
)

export function shouldRefreshNotificationsForEvent(kind) {
  return NOTIFICATION_REFRESH_EVENT_KINDS.has(kind)
}

export function formatNotificationAge(dateStr) {
  if (!dateStr) return t('activity.age.justNow')

  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 1) return t('activity.age.justNow')
  if (minutes < 60) return t('activity.age.minutesAgo', { count: minutes })

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('activity.age.hoursAgo', { count: hours })

  return t('activity.age.daysAgo', { count: Math.floor(hours / 24) })
}

export function resolveNotificationConfig(notification) {
  if (notification.type === 'OpsActivityNotification') {
    const activity = ACTIVITY_KIND_CONFIG[notification.data?.kind] ?? TYPE_CONFIG.default

    return {
      ...activity,
      label: t(activity.labelKey),
      route: notification.data?.route ?? activity.route ?? null,
    }
  }

  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.default

  return {
    ...config,
    label: t(config.labelKey),
    route: notification.data?.route ?? config.route ?? null,
  }
}

export function notificationChanges(notification, limit = 4) {
  const explicitChanges = notification?.data?.changes

  if (Array.isArray(explicitChanges)) {
    return explicitChanges
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, limit)
  }

  const stockItems = notification?.data?.items
  if (Array.isArray(stockItems)) {
    return stockItems
      .map((item) => {
        const productName = String(item?.product_name ?? '').trim()
        const depotName = String(item?.depot_name ?? '').trim() || t('activity.defaultDepot')
        const qty = Number(item?.qty ?? 0)
        const minStock = Number(item?.min_stock ?? 0)

        if (!productName) {
          return ''
        }

        return t('activity.stockItem', { productName, depotName, qty, minStock })
      })
      .filter(Boolean)
      .slice(0, limit)
  }

  return []
}
