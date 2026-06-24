import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'
import {
  DEFAULT_LOCALE,
  getLocaleMeta,
  getRawTranslation,
  getStoredLocale,
  normalizeIntlLocale,
  normalizeLocale,
  setRuntimeLocale,
  setStoredLocale,
  SUPPORTED_LOCALES,
  translate,
} from '../i18n/locales'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const { user, setCurrentUser } = useAuth()
  const [locale, setLocaleState] = useState(() => getStoredLocale())
  const [savingLocale, setSavingLocale] = useState(false)

  useEffect(() => {
    const nextLocale = normalizeLocale(user?.locale || locale || DEFAULT_LOCALE)
    setLocaleState((current) => (current === nextLocale ? current : nextLocale))
  }, [user?.locale])

  useEffect(() => {
    const normalized = normalizeLocale(locale)
    setStoredLocale(normalized)
    setRuntimeLocale(normalized)

    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalizeIntlLocale(normalized)
      document.documentElement.dataset.locale = normalized
      document.documentElement.dataset.localeDirection = getLocaleMeta(normalized).direction
    }
  }, [locale])

  const t = useCallback((key, params = {}) => translate(locale, key, params), [locale])
  const raw = useCallback((key) => getRawTranslation(locale, key), [locale])

  const setLocale = useCallback(async (nextLocale, { persist = true } = {}) => {
    const normalized = normalizeLocale(nextLocale)
    const previousLocale = locale

    setLocaleState(normalized)

    if (!persist || !user?.id) {
      return normalized
    }

    setSavingLocale(true)

    try {
      const response = await api.patch('/auth/preferences', {
        locale: normalized,
      })

      setCurrentUser?.(response.data)
      return normalized
    } catch (error) {
      setLocaleState(previousLocale)
      throw error
    } finally {
      setSavingLocale(false)
    }
  }, [locale, setCurrentUser, user?.id])

  const value = useMemo(() => ({
    locale,
    direction: getLocaleMeta(locale).direction,
    supportedLocales: SUPPORTED_LOCALES.map((item) => ({
      ...item,
      label: translate(locale, `language.options.${item.code}.label`),
      short: translate(locale, `language.options.${item.code}.short`),
    })),
    savingLocale,
    setLocale,
    t,
    raw,
  }), [locale, raw, savingLocale, setLocale, t])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
