import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { subscribeToOpsMonitor } from '../../services/realtime'

const TYPE_CONFIG = {
  LowStockNotification: {
    icon: 'fa-solid fa-triangle-exclamation',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    label: 'Stock bas',
  },
  DailySummaryNotification: {
    icon: 'fa-solid fa-chart-line',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.12)',
    label: 'Rapport',
  },
  default: {
    icon: 'fa-solid fa-bell',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.1)',
    label: 'Notification',
  },
}

const ACTIVITY_KIND_CONFIG = {
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
    label: 'Session cloturee',
  },
  'route.load.updated': {
    icon: 'fa-solid fa-boxes-stacked',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    label: 'Chargement camion',
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
    label: 'Paiement recu',
  },
  'bug.report.created': {
    icon: 'fa-solid fa-bug',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    label: 'Nouveau bug',
  },
}

const LIVE_EVENT_KINDS = new Set(Object.keys(ACTIVITY_KIND_CONFIG))

function timeAgo(dateStr) {
  if (!dateStr) return 'A l instant'

  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 1) return 'A l instant'
  if (minutes < 60) return `Il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`

  return `Il y a ${Math.floor(hours / 24)}j`
}

function resolveConfig(notification) {
  if (notification.type === 'OpsActivityNotification') {
    return ACTIVITY_KIND_CONFIG[notification.data?.kind] ?? TYPE_CONFIG.default
  }

  return TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.default
}

export default function NotificationsCenterIndex() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [preferences, setPreferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  )

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([
        api.get('/notifications'),
        api.get('/notification-preferences'),
      ])

      setNotifications(notificationResponse.data.notifications ?? [])
      setPreferences(preferenceResponse.data.preferences ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!['admin', 'developer'].includes(user?.role)) {
      return undefined
    }

    return subscribeToOpsMonitor((event) => {
      if (LIVE_EVENT_KINDS.has(event.kind)) {
        load()
      }
    })
  }, [load, user?.role])

  const markAll = async () => {
    await api.post('/notifications/read-all')
    await load()
  }

  const markRead = async (notificationId) => {
    await api.post(`/notifications/${notificationId}/read`)
    await load()
  }

  const togglePreference = async (preference) => {
    setSavingKey(preference.key)

    try {
      const response = await api.put('/notification-preferences', {
        preferences: [
          {
            key: preference.key,
            enabled: !preference.enabled,
          },
        ],
      })

      setPreferences(response.data.preferences ?? [])
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre de notifications"
        subtitle="Evenements systeme, activite operationnelle et preferences par utilisateur."
        action={(
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-secondary text-xs">
              <i className="fa-solid fa-rotate-right" /> Actualiser
            </button>
            {unreadCount > 0 && (
              <button onClick={markAll} className="btn-secondary text-xs">
                <i className="fa-solid fa-check-double" /> Tout lire
              </button>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card py-4 px-4">
          <div className="text-xs text-muted-color">Notifications total</div>
          <div className="text-2xl font-bold text-base-color mt-1">{notifications.length}</div>
        </div>
        <div className="card py-4 px-4">
          <div className="text-xs text-muted-color">Non lues</div>
          <div className="text-2xl font-bold mt-1" style={{ color: unreadCount > 0 ? '#ef4444' : 'var(--text-base)' }}>
            {unreadCount}
          </div>
        </div>
        <div className="card py-4 px-4">
          <div className="text-xs text-muted-color">Preferences actives</div>
          <div className="text-2xl font-bold text-base-color mt-1">
            {preferences.filter((item) => item.enabled).length}/{preferences.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr,1.1fr] gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-sliders text-teal-500" />
            <h2 className="text-sm font-semibold text-base-color">Preferences utilisateur</h2>
          </div>

          <div className="space-y-3">
            {preferences.map((preference) => (
              <div key={preference.key} className="rounded-2xl px-4 py-4 flex items-start justify-between gap-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-base-color">{preference.label}</div>
                  <div className="text-sm text-secondary-color mt-1">{preference.description}</div>
                </div>
                <button
                  onClick={() => togglePreference(preference)}
                  disabled={savingKey === preference.key}
                  className="btn-secondary text-xs flex-shrink-0"
                >
                  {savingKey === preference.key ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> En cours...</>
                  ) : preference.enabled ? (
                    <><i className="fa-solid fa-toggle-on" /> Active</>
                  ) : (
                    <><i className="fa-solid fa-toggle-off" /> Desactivee</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-stream text-sky-500" />
            <h2 className="text-sm font-semibold text-base-color">Historique recent</h2>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-color">
              <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl px-4 py-10 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              Aucune notification disponible pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const config = resolveConfig(notification)
                const unread = !notification.read_at

                return (
                  <div key={notification.id} className="rounded-2xl px-4 py-4" style={{ background: unread ? 'rgba(13,148,136,0.06)' : 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: config.bg, color: config.color }}>
                        <i className={config.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-base-color">{config.label}</div>
                          {unread && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                              Non lue
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-secondary-color mt-1">
                          {notification.data?.message || 'Aucun message detaille'}
                        </div>
                        <div className="text-xs text-muted-color mt-2">
                          {timeAgo(notification.created_at)}
                        </div>
                      </div>
                      {unread && (
                        <button onClick={() => markRead(notification.id)} className="btn-secondary text-xs flex-shrink-0">
                          <i className="fa-solid fa-check" /> Lire
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
