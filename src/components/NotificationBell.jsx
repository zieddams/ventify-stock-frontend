import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToOpsMonitor } from '../services/realtime'
import {
  formatNotificationAge,
  LIVE_NOTIFICATION_EVENT_KINDS,
  notificationChanges,
  resolveNotificationConfig,
} from '../utils/notificationActivity'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const load = useCallback(async () => {
    try {
      const response = await api.get('/notifications')
      setNotifs(response.data.notifications ?? [])
      setUnread(response.data.unread_count ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
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
      if (LIVE_NOTIFICATION_EVENT_KINDS.has(event.kind)) {
        load()
      }
    })
  }, [load, user?.id])

  const markAll = async () => {
    await api.post('/notifications/read-all')
    setUnread(0)
    setNotifs(prev => prev.map(item => ({ ...item, read_at: new Date().toISOString() })))
  }

  const handleClick = async (notification) => {
    if (!notification.read_at) {
      await api.post(`/notifications/${notification.id}/read`)
      setNotifs(prev => prev.map(item => (
        item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
      )))
      setUnread(value => Math.max(0, value - 1))
    }

    const cfg = resolveNotificationConfig(notification)
    setOpen(false)

    if (cfg.route) {
      navigate(cfg.route)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!open && notifs.length === 0 && unread === 0) {
            load()
            return
          }

          setOpen(value => !value)
          if (!open) {
            load()
          }
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
        <div
          className="absolute right-0 top-full mt-2 w-80 z-50 animate-fade-in"
          style={{
            background: 'rgba(15,23,42,0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '20px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bell text-xs" style={{ color: '#0d9488' }} />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(13,148,136,0.2)', color: '#2dd4bf' }}
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
            {notifs.length === 0 ? (
              <div className="py-12 text-center">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <i className="fa-regular fa-bell-slash text-xl" style={{ color: 'rgba(100,116,139,0.6)' }} />
                </div>
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>Aucune notification pour le moment.</p>
              </div>
            ) : (
              notifs.map(notification => {
                const cfg = resolveNotificationConfig(notification)
                const changes = notificationChanges(notification, 2)
                const isNew = !notification.read_at

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isNew ? 'rgba(255,255,255,0.04)' : 'transparent',
                      cursor: cfg.route ? 'pointer' : 'default',
                    }}
                    onMouseEnter={event => {
                      event.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                    }}
                    onMouseLeave={event => {
                      event.currentTarget.style.background = isNew ? 'rgba(255,255,255,0.04)' : 'transparent'
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                      <i className={`${cfg.icon} text-xs`} style={{ color: cfg.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2" style={{ color: 'rgba(241,245,249,0.9)' }}>
                        {notification.data?.message ?? cfg.label}
                      </p>
                      {changes.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {changes.map((change) => (
                            <div key={change} className="text-[11px] line-clamp-1" style={{ color: 'rgba(148,163,184,0.9)' }}>
                              {change}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.7)' }}>
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

          <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/notifications-center')
              }}
              className="text-xs font-medium"
              style={{ color: '#2dd4bf', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Ouvrir le centre
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs"
              style={{ color: 'rgba(100,116,139,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
