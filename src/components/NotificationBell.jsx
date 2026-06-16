import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function timeAgo(dateStr) {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (m < 1)  return 'À l\'instant'
  if (m < 60) return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

const TYPE_CONFIG = {
  'App\\Notifications\\LowStockNotification': {
    icon:  'fa-solid fa-triangle-exclamation',
    color: '#f59e0b',
    bg:    'rgba(245,158,11,0.12)',
    label: 'Stock bas',
    route: '/stock/depot',
  },
  'App\\Notifications\\DailySummaryNotification': {
    icon:  'fa-solid fa-chart-line',
    color: '#0d9488',
    bg:    'rgba(13,148,136,0.12)',
    label: 'Rapport',
    route: '/stock/reports',
  },
  default: {
    icon:  'fa-solid fa-bell',
    color: '#64748b',
    bg:    'rgba(100,116,139,0.1)',
    label: 'Notification',
    route: null,
  },
}

export default function NotificationBell() {
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const ref                  = useRef()
  const navigate             = useNavigate()

  const load = async () => {
    try {
      const r = await api.get('/notifications')
      setNotifs(r.data.notifications ?? [])
      setUnread(r.data.unread_count ?? 0)
    } catch {}
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const markAll = async () => {
    await api.post('/notifications/read-all')
    setUnread(0)
    setNotifs(n => n.map(x => ({ ...x, read_at: new Date().toISOString() })))
  }

  const handleClick = async (n) => {
    if (!n.read_at) {
      await api.post(`/notifications/${n.id}/read`)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      setUnread(u => Math.max(0, u - 1))
    }
    const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.default
    setOpen(false)
    if (cfg.route) navigate(cfg.route)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button onClick={() => {
          if (!open && notifs.length === 0 && unread === 0) { load(); return } // reload but don't open if truly empty
          setOpen(o => !o)
          if (!open) load()
        }}
        className="btn-ghost p-2 relative" title="Notifications">
        <i className="fa-solid fa-bell text-base text-muted-color" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Glassmorphism dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 animate-fade-in"
          style={{
            background:          'rgba(15,23,42,0.82)',
            backdropFilter:      'blur(20px)',
            WebkitBackdropFilter:'blur(20px)',
            border:              '1px solid rgba(255,255,255,0.10)',
            borderRadius:        '20px',
            boxShadow:           '0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
            overflow:            'hidden',
          }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bell text-xs" style={{ color: '#0d9488' }} />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(13,148,136,0.2)', color: '#2dd4bf' }}>
                  {unread} non lue{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAll}
                className="text-xs font-medium"
                style={{ color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer' }}>
                Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <i className="fa-regular fa-bell-slash text-xl" style={{ color: 'rgba(100,116,139,0.6)' }} />
                </div>
                <p className="text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>Aucune notification</p>
              </div>
            ) : (
              notifs.map(n => {
                const cfg   = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.default
                const isNew = !n.read_at
                return (
                  <button key={n.id} onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all"
                    style={{
                      borderBottom:    '1px solid rgba(255,255,255,0.05)',
                      background:      isNew ? 'rgba(255,255,255,0.04)' : 'transparent',
                      cursor:          cfg.route ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isNew ? 'rgba(255,255,255,0.04)' : 'transparent' }}>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}>
                      <i className={`${cfg.icon} text-xs`} style={{ color: cfg.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2" style={{ color: 'rgba(241,245,249,0.9)' }}>
                        {n.data?.message ?? cfg.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.7)' }}>
                          {timeAgo(n.created_at)}
                        </span>
                        {cfg.route && (
                          <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
                            Voir <i className="fa-solid fa-arrow-right" style={{ fontSize: 8 }} />
                          </span>
                        )}
                      </div>
                    </div>

                    {isNew && (
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: '#0d9488', boxShadow: '0 0 6px rgba(13,148,136,0.6)' }} />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-3 text-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setOpen(false)} className="text-xs"
                style={{ color: 'rgba(100,116,139,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
