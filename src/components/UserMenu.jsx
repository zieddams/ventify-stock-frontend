import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'

const COMPANY_NAV_ICON = 'fa-solid fa-building'

export default function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { locale, savingLocale, setLocale, supportedLocales, t } = useI18n()
  const menuLinkClassName = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary-color hover:bg-surface-2 transition-colors'

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-surface-2"
        title={user?.name}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold shadow">
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-base-color leading-none">{user?.name}</div>
          <div className="text-xs text-muted-color capitalize leading-none mt-0.5">
            {[user?.role, user?.company?.name].filter(Boolean).join(' · ')}
          </div>
        </div>
        <i className="fa-solid fa-chevron-down text-muted-color" style={{ fontSize: 10 }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-theme rounded-xl shadow-md z-50 py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-theme">
            <div className="text-sm font-semibold text-base-color">{user?.name}</div>
            <div className="text-xs text-muted-color">{user?.email}</div>
          </div>
          <div className="px-3 py-2 border-b border-theme">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
              {t('layout.userMenu.language')}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {supportedLocales.map((item) => {
                const active = item.code === locale

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => { void setLocale(item.code) }}
                    disabled={savingLocale}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                    style={{
                      borderColor: active ? '#0d9488' : 'var(--border)',
                      background: active ? 'rgba(13,148,136,0.12)' : 'transparent',
                      color: active ? '#0d9488' : 'var(--text-secondary)',
                    }}
                  >
                    {item.short} · {item.label}
                  </button>
                )
              })}
            </div>
          </div>
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className={menuLinkClassName}
          >
            <i className="fa-solid fa-user-pen w-4" />
            {t('layout.userMenu.profile')}
          </NavLink>
          <NavLink
            to="/notifications-center"
            onClick={() => setOpen(false)}
            className={menuLinkClassName}
          >
            <i className="fa-solid fa-bell w-4" />
            {t('layout.userMenu.notifications')}
          </NavLink>
          <NavLink
            to="/help"
            onClick={() => setOpen(false)}
            className={menuLinkClassName}
          >
            <i className="fa-solid fa-circle-question w-4" />
            {t('layout.userMenu.help')}
          </NavLink>
          <NavLink
            to="/bug-reports"
            onClick={() => setOpen(false)}
            className={menuLinkClassName}
          >
            <i className="fa-solid fa-bug w-4" />
            {t('layout.userMenu.support')}
          </NavLink>
          {user?.role === 'developer' && (
            <>
              <NavLink
                to="/companies"
                onClick={() => setOpen(false)}
                className={menuLinkClassName}
              >
                <i className={`${COMPANY_NAV_ICON} w-4`} />
                {t('layout.userMenu.companies')}
              </NavLink>
              <NavLink
                to="/developer-tools"
                onClick={() => setOpen(false)}
                className={menuLinkClassName}
              >
                <i className="fa-solid fa-code w-4" />
                {t('layout.userMenu.developerTools')}
              </NavLink>
            </>
          )}
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4" />
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
