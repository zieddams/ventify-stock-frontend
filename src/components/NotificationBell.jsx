import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { subscribeToOpsMonitor } from '../services/realtime'
import {
  formatNotificationAge,
  shouldRefreshNotificationsForEvent,
  notificationChanges,
  resolveNotificationConfig,
} from '../utils/notificationActivity'

function requestDesktopPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }

  if (window.Notification.permission === 'default') {
    window.Notification.requestPermission().catch(() => {})
  }
}

function notificationMessage(notification, fallbackLabel) {
  return notification?.data?.message || fallbackLabel || 'Nouvelle notification'
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)
  const notifsRef = useRef([])
  const loadPromiseRef = useRef(null)
  const interactedRef = useRef(false)
  const audioContextRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDark } = useTheme()

  useEffect(() => {
    notifsRef.current = notifs
  }, [notifs])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleFirstInteraction = () => {
      interactedRef.current = true
    }

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true })
    return () => window.removeEventListener('pointerdown', handleFirstInteraction)
  }, [])

  const playNotificationTone = useCallback(() => {
    if (typeof window === 'undefined' || !interactedRef.current) {
      return
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) {
      return
    }

    try {
      const context = audioContextRef.current ?? new AudioContextCtor()
      audioContextRef.current = context

      if (context.state === 'suspended') {
        context.resume().catch(() => {})
      }

      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.03, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.2)
    } catch {
      // ignore browser audio restrictions
    }
  }, [])

  const announceIncomingNotifications = useCallback((freshUnread) => {
    if (!Array.isArray(freshUnread) || freshUnread.length === 0) {
      return
    }

    const newest = freshUnread[0]
    const cfg = resolveNotificationConfig(newest)
    const message = notificationMessage(newest, cfg.label)

    playNotificationTone()

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (window.Notification.permission !== 'granted') {
      return
    }

    try {
      const desktopNotification = new window.Notification('El Irtiwaa', {
        body: message,
        tag: newest.id,
      })

      desktopNotification.onclick = () => {
        window.focus()
        if (cfg.route) {
          navigate(cfg.route)
        }
        desktopNotification.close()
      }

      window.setTimeout(() => desktopNotification.close(), 7000)
    } catch {
      // ignore desktop notification errors
    }
  }, [navigate, playNotificationTone])

  const load = useCallback(async ({ announce = false } = {}) => {
    if (loadPromiseRef.current) {
      return loadPromiseRef.current
    }

    setLoading(true)
    const previousIds = new Set(notifsRef.current.map((item) => item.id))

    const request = api.get('/notifications')
      .then((response) => {
        const nextNotifs = response.data.notifications ?? []
        const nextUnread = response.data.unread_count ?? 0

        setNotifs(nextNotifs)
        setUnread(nextUnread)

        if (announce) {
          const freshUnread = nextNotifs.filter((item) => !item.read_at && !previousIds.has(item.id))
          announceIncomingNotifications(freshUnread)
        }

        return nextNotifs
      })
      .catch(() => [])
      .finally(() => {
        setLoading(false)
        loadPromiseRef.current = null
      })

    loadPromiseRef.current = request
    return request
  }, [announceIncomingNotifications])

  useEffect(() => {
    load()
    const id = window.setInterval(() => load(), 60000)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    return subscribeToOpsMonitor((event) => {
      if (shouldRefreshNotificationsForEvent(event.kind)) {
        load({ announce: true })
      }
    })
  }, [load, user?.id])

  const markNotificationRead = useCallback(async (notificationId) => {
    setNotifs((current) => current.map((item) => (
      item.id === notificationId && !item.read_at
        ? { ...item, read_at: new Date().toISOString() }
        : item
    )))
    setUnread((current) => Math.max(current - 1, 0))

    try {
      await api.post(`/notifications/${notificationId}/read`)
    } finally {
      await load()
    }
  }, [load])

  const markAll = useCallback(async () => {
    setNotifs((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })))
    setUnread(0)

    try {
      await api.post('/notifications/read-all')
    } finally {
      await load()
    }
  }, [load])

  const handleClick = useCallback(async (notification) => {
    const cfg = resolveNotificationConfig(notification)
    setOpen(false)

    if (!notification.read_at) {
      await markNotificationRead(notification.id)
    }

    if (cfg.route) {
      navigate(cfg.route)
    }
  }, [markNotificationRead, navigate])

  const panelStyle = isDark
    ? {
        background: 'rgba(15,23,42,0.84)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }
    : {
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(148,163,184,0.20)',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.65)',
        overflow: 'hidden',
      }

  const dividerColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(148,163,184,0.16)'
  const titleColor = isDark ? '#ffffff' : 'var(--text-base)'
  const mutedColor = isDark ? 'rgba(100,116,139,0.8)' : 'var(--text-muted)'
  const textColor = isDark ? 'rgba(241,245,249,0.92)' : 'var(--text-base)'
  const changeColor = isDark ? 'rgba(148,163,184,0.92)' : 'var(--text-secondary)'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!open) {
            requestDesktopPermission()
            load()
          }

          setOpen((value) => !value)
        }}
        className="btn-ghost p-2 relative"
        title="Notifications"
      >
        <i className="fa-solid fa-bell text-base text-muted-color" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 animate-fade-in" style={panelStyle}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${dividerColor}` }}>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bell text-xs" style={{ color: '#0d9488' }} />
              <span className="text-sm font-semibold" style={{ color: titleColor }}>Notifications</span>
              {unread > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(13,148,136,0.16)', color: '#0d9488' }}
                >
                  {unread} non lue{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-medium"
                style={{ color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: mutedColor }}>Chargement des notifications...</p>
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-12 text-center">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(148,163,184,0.10)' }}
                >
                  <i className="fa-regular fa-bell-slash text-xl" style={{ color: mutedColor }} />
                </div>
                <p className="text-sm" style={{ color: mutedColor }}>Aucune notification pour le moment.</p>
              </div>
            ) : (
              notifs.map((notification) => {
                const cfg = resolveNotificationConfig(notification)
                const changes = notificationChanges(notification, 2)
                const isNew = !notification.read_at

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all"
                    style={{
                      borderBottom: `1px solid ${dividerColor}`,
                      background: isNew
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(13,148,136,0.06)')
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.04)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = isNew
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(13,148,136,0.06)')
                        : 'transparent'
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                      <i className={`${cfg.icon} text-xs`} style={{ color: cfg.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2" style={{ color: textColor }}>
                        {notificationMessage(notification, cfg.label)}
                      </p>
                      {changes.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {changes.map((change) => (
                            <div key={change} className="text-[11px] line-clamp-1" style={{ color: changeColor }}>
                              {change}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: mutedColor }}>
                          {formatNotificationAge(notification.created_at)}
                        </span>
                        {cfg.route && (
                          <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
                            Ouvrir <i className="fa-solid fa-arrow-right" style={{ fontSize: 8 }} />
                          </span>
                        )}
                      </div>
                    </div>

                    {isNew && (
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: '#0d9488', boxShadow: '0 0 6px rgba(13,148,136,0.6)' }}
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${dividerColor}` }}>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/notifications-center')
              }}
              className="text-xs font-medium"
              style={{ color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Ouvrir le centre
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs"
              style={{ color: mutedColor, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

