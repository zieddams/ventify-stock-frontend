import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { PageLoader } from './Spinner'

function createInitialStatus(t) {
  return {
    maintenance: {
      enabled: false,
      global: false,
      paths: [],
      message: t('maintenance.messageFallback'),
    },
    support: {
      contact_label: t('maintenance.support'),
    },
  }
}

function normalizePath(path) {
  const value = String(path ?? '').trim()

  if (!value) {
    return '/'
  }

  const normalized = `/${value.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')

  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '')
}

function matchesPath(currentPath, selectedPath) {
  if (selectedPath === '/') {
    return currentPath === '/'
  }

  return currentPath === selectedPath || currentPath.startsWith(`${selectedPath}/`)
}

function MaintenanceScreen({ maintenance, contactLabel }) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 flex items-center justify-center bg-app">
      <div className="w-full max-w-3xl space-y-6">
        <div className="card overflow-hidden">
          <div
            className="rounded-[28px] px-6 py-6 md:px-8 md:py-8"
            style={{
              background: 'linear-gradient(135deg, rgba(15,118,110,0.12), rgba(14,165,233,0.08))',
              boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.12)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(13,148,136,0.14)', color: '#0f766e' }}
              >
                <i className="fa-solid fa-screwdriver-wrench text-xl" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-color">{t('maintenance.mode')}</div>
                <h1 className="text-2xl md:text-3xl font-bold text-base-color mt-2">{t('maintenance.title')}</h1>
                <p className="text-sm md:text-base text-secondary-color mt-3 max-w-2xl">
                  {maintenance.message || t('maintenance.messageFallback')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
              <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-xs text-muted-color">{t('maintenance.scope')}</div>
                <div className="text-sm font-semibold text-base-color mt-1">
                  {maintenance.global ? t('maintenance.fullApp') : t('maintenance.selectedPages')}
                </div>
              </div>
              <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-xs text-muted-color">{t('maintenance.support')}</div>
                <div className="text-sm font-semibold text-base-color mt-1">{contactLabel || t('common.support')}</div>
              </div>
              <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-xs text-muted-color">{t('maintenance.developerAccess')}</div>
                <div className="text-sm font-semibold text-base-color mt-1">{t('maintenance.developerAlwaysAllowed')}</div>
              </div>
            </div>

            {!maintenance.global && Array.isArray(maintenance.paths) && maintenance.paths.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">{t('maintenance.blockedPages')}</div>
                <div className="flex flex-wrap gap-2">
                  {maintenance.paths.map((path) => (
                    <span
                      key={path}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(13,148,136,0.10)', color: '#0f766e' }}
                    >
                      {path}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              {!maintenance.global && (
                <Link to="/" className="btn-secondary">
                  <i className="fa-solid fa-house" /> {t('common.backToDashboard')}
                </Link>
              )}
              <button onClick={() => window.location.reload()} className="btn-primary">
                <i className="fa-solid fa-rotate-right" /> {t('common.reload')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MaintenanceBoundary({ children }) {
  const { t } = useI18n()
  const { isDeveloper } = useAuth()
  const location = useLocation()
  const initialStatus = useMemo(() => createInitialStatus(t), [t])
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/v1/system/public-status', {
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('status_failed')
        }

        const payload = await response.json()

        if (!active) {
          return
        }

        setStatus({
          maintenance: {
            enabled: Boolean(payload?.maintenance?.enabled),
            global: Boolean(payload?.maintenance?.global),
            paths: Array.isArray(payload?.maintenance?.paths) ? payload.maintenance.paths : [],
            message: payload?.maintenance?.message || initialStatus.maintenance.message,
          },
          support: {
            contact_label: payload?.support?.contact_label || initialStatus.support.contact_label,
          },
        })
      } catch {
        if (!active) {
          return
        }

        setStatus(initialStatus)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStatus()
    const interval = window.setInterval(loadStatus, 60000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [initialStatus])

  const currentPath = normalizePath(location.pathname)
  const isLoginPage = currentPath === '/login'

  const isBlocked = useMemo(() => {
    if (isDeveloper() || isLoginPage || !status.maintenance?.enabled) {
      return false
    }

    if (status.maintenance.global) {
      return true
    }

    return (status.maintenance.paths ?? []).some((path) => matchesPath(currentPath, normalizePath(path)))
  }, [currentPath, isDeveloper, isLoginPage, status.maintenance])

  if (!isDeveloper() && !isLoginPage && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="card py-10 px-8">
          <PageLoader />
        </div>
      </div>
    )
  }

  if (isBlocked) {
    return (
      <MaintenanceScreen
        maintenance={status.maintenance}
        contactLabel={status.support?.contact_label}
      />
    )
  }

  return children
}
