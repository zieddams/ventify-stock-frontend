const TYPE_CONFIG = {
  LowStockNotification: {
    icon: 'fa-solid fa-triangle-exclamation',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Stock bas',
    route: '/depot',
  },
  DailySummaryNotification: {
    icon: 'fa-solid fa-chart-line',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    label: 'Rapport journalier',
    route: '/reports',
  },
  default: {
    icon: 'fa-solid fa-bell',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.1)',
    label: 'Notification',
    route: null,
  },
}

export const ACTIVITY_KIND_CONFIG = {
  'route.session.opened': {
    icon: 'fa-solid fa-truck-fast',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    label: 'Session ouverte',
  },
  'route.session.closed': {
    icon: 'fa-solid fa-flag-checkered',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    label: 'Session clôturée',
  },
  'route.load.updated': {
    icon: 'fa-solid fa-boxes-stacked',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    label: 'Chargement camion',
  },
  'route.returns.updated': {
    icon: 'fa-solid fa-rotate-left',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Retour camion',
  },
  'invoice.created': {
    icon: 'fa-solid fa-file-circle-plus',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    label: 'Nouvelle facture',
  },
  'invoice.payment.recorded': {
    icon: 'fa-solid fa-money-bill-wave',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    label: 'Paiement reçu',
  },
  'product.created': {
    icon: 'fa-solid fa-box-open',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.12)',
    label: 'Produit ajouté',
  },
  'product.updated': {
    icon: 'fa-solid fa-pen-ruler',
    color: '#0284c7',
    bg: 'rgba(2,132,199,0.12)',
    label: 'Produit modifié',
  },
  'product.deleted': {
    icon: 'fa-solid fa-box-archive',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    label: 'Produit retire',
  },
  'customer.created': {
    icon: 'fa-solid fa-user-plus',
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    label: 'Client ajouté',
  },
  'customer.updated': {
    icon: 'fa-solid fa-user-pen',
    color: '#0f766e',
    bg: 'rgba(15,118,110,0.12)',
    label: 'Client modifié',
  },
  'customer.deleted': {
    icon: 'fa-solid fa-user-xmark',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.12)',
    label: 'Client désactivé',
  },
  'customer.assignment.updated': {
    icon: 'fa-solid fa-list-check',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
    label: 'Liste clients mise a jour',
  },
  'expense.created': {
    icon: 'fa-solid fa-receipt',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Dépense ajoutée',
  },
  'expense.updated': {
    icon: 'fa-solid fa-file-pen',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    label: 'Dépense modifiée',
  },
  'expense.deleted': {
    icon: 'fa-solid fa-file-circle-minus',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    label: 'Dépense supprimée',
  },
  'inventory.adjusted': {
    icon: 'fa-solid fa-scale-balanced',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
    label: 'Inventaire ajuste',
  },
  'config.item.created': {
    icon: 'fa-solid fa-sliders',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    label: 'Élément de configuration ajouté',
  },
  'config.item.updated': {
    icon: 'fa-solid fa-sliders',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.12)',
    label: 'Élément de configuration modifié',
  },
  'config.item.deleted': {
    icon: 'fa-solid fa-sliders',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    label: 'Élément de configuration désactivé',
  },
  'settings.updated': {
    icon: 'fa-solid fa-gear',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    label: 'Paramètres système',
  },
  'camion.created': {
    icon: 'fa-solid fa-truck',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    label: 'Camion ajouté',
  },
  'camion.updated': {
    icon: 'fa-solid fa-truck-field',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
    label: 'Camion modifié',
  },
  'user.created': {
    icon: 'fa-solid fa-user-plus',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.12)',
    label: 'Compte cree',
  },
  'user.updated': {
    icon: 'fa-solid fa-user-gear',
    color: '#4f46e5',
    bg: 'rgba(79,70,229,0.12)',
    label: 'Compte modifie',
  },
  'session.reported': {
    icon: 'fa-solid fa-mobile-screen-button',
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    label: 'Presence mobile',
  },
  'session.offline': {
    icon: 'fa-solid fa-mobile-screen',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    label: 'Presence coupee',
  },
  'bug.report.created': {
    icon: 'fa-solid fa-bug',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    label: 'Nouveau bug',
  },
}

export const LIVE_NOTIFICATION_EVENT_KINDS = new Set(Object.keys(ACTIVITY_KIND_CONFIG))

export function formatNotificationAge(dateStr) {
  if (!dateStr) return "À l'instant"

  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours} h`

  return `Il y a ${Math.floor(hours / 24)} j`
}

export function resolveNotificationConfig(notification) {
  if (notification.type === 'OpsActivityNotification') {
    const activity = ACTIVITY_KIND_CONFIG[notification.data?.kind] ?? TYPE_CONFIG.default

    return {
      ...activity,
      route: notification.data?.route ?? activity.route ?? null,
    }
  }

  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.default

  return {
    ...config,
    route: notification.data?.route ?? config.route ?? null,
  }
}

export function notificationChanges(notification, limit = 4) {
  const changes = notification?.data?.changes

  if (!Array.isArray(changes)) {
    return []
  }

  return changes
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, limit)
}
