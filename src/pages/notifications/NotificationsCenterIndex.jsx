import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { subscribeToOpsMonitor } from '../../services/realtime'
import {
  formatNotificationAge,
  shouldRefreshNotificationsForEvent,
  notificationChanges,
  resolveNotificationConfig,
} from '../../utils/notificationActivity'

function notificationMessage(notification, fallbackLabel) {
  return notification?.data?.message || fallbackLabel || 'Notification'
}

export default function NotificationsCenterIndex() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [preferences, setPreferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const loadPromiseRef = useRef(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  )

  const load = useCallback(async () => {
    if (loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    setLoading(true)

    const request = Promise.all([
      api.get('/notifications'),
      api.get('/notification-preferences'),
    ])
      .then(([notificationResponse, preferenceResponse]) => {
        setNotifications(notificationResponse.data.notifications ?? [])
        setPreferences(preferenceResponse.data.preferences ?? [])
      })
      .catch(() => null)
      .finally(() => {
        setLoading(false)
        loadPromiseRef.current = null
      })

    loadPromiseRef.current = request
    return request
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    return subscribeToOpsMonitor((event) => {
      if (shouldRefreshNotificationsForEvent(event.kind)) {
        load()
      }
    })
  }, [load, user?.id])

  const markAll = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })))

    try {
      await api.post('/notifications/read-all')
    } finally {
      await load()
    }
  }, [load])

  const markRead = useCallback(async (notificationId) => {
    setNotifications((current) => current.map((item) => (
      item.id === notificationId && !item.read_at
        ? { ...item, read_at: new Date().toISOString() }
        : item
    )))

    try {
      await api.post(`/notifications/${notificationId}/read`)
    } finally {
      await load()
    }
  }, [load])

  const openNotification = useCallback(async (notification) => {
    const config = resolveNotificationConfig(notification)

    if (!notification.read_at) {
      await markRead(notification.id)
    }

    if (config.route) {
      navigate(config.route)
    }
  }, [markRead, navigate])

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
        subtitle="Événements système, activité opérationnelle et préférences par utilisateur."
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
          <div className="text-xs text-muted-color">Notifications totales</div>
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
              <div
                key={preference.key}
                className="rounded-2xl px-4 py-4 flex items-start justify-between gap-3"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
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
                    <><i className="fa-solid fa-toggle-on" /> Activee</>
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
                const config = resolveNotificationConfig(notification)
                const changes = notificationChanges(notification, 6)
                const unread = !notification.read_at

                return (
                  <div
                    key={notification.id}
                    className="rounded-2xl px-4 py-4 transition-colors"
                    style={{
                      background: unread ? 'rgba(13,148,136,0.06)' : 'var(--surface-2)',
                      boxShadow: 'inset 0 0 0 1px var(--border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => openNotification(notification)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openNotification(notification)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
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
                          {notificationMessage(notification, config.label)}
                        </div>
                        {changes.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {changes.map((change) => (
                              <div
                                key={change}
                                className="rounded-xl px-3 py-2 text-xs text-secondary-color"
                                style={{ background: 'rgba(148,163,184,0.08)' }}
                              >
                                {change}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <div className="text-xs text-muted-color">{formatNotificationAge(notification.created_at)}</div>
                          {config.route && (
                            <div className="text-xs font-medium" style={{ color: config.color }}>
                              Ouvrir la page liee
                            </div>
                          )}
                        </div>
                      </div>
                      {unread && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            markRead(notification.id)
                          }}
                          className="btn-secondary text-xs flex-shrink-0"
                        >
                          <i className="fa-solid fa-check" /> Marquer lue
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
