import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'

const INITIAL_IDENTITY_FORM = {
  name: '',
  email: '',
}

const INITIAL_PASSWORD_FORM = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

function getFieldError(errors, field) {
  const value = errors?.[field]

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value || ''
}

function getFirstErrorMessage(errors, fallback) {
  const firstKey = Object.keys(errors || {})[0]

  if (!firstKey) {
    return fallback
  }

  return getFieldError(errors, firstKey) || fallback
}

function getPasswordStrength(password, t) {
  if (!password) {
    return {
      score: 0,
      color: '#94a3b8',
      label: t('profilePage.strength.empty'),
    }
  }

  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 2) {
    return {
      score,
      color: '#dc2626',
      label: t('profilePage.strength.weak'),
    }
  }

  if (score === 3) {
    return {
      score,
      color: '#d97706',
      label: t('profilePage.strength.medium'),
    }
  }

  if (score === 4) {
    return {
      score,
      color: '#0f766e',
      label: t('profilePage.strength.strong'),
    }
  }

  return {
    score,
    color: '#059669',
    label: t('profilePage.strength.veryStrong'),
  }
}

function FeedbackBanner({ feedback }) {
  if (!feedback?.message) {
    return null
  }

  const success = feedback.type === 'success'

  return (
    <div
      className="rounded-[20px] px-4 py-3 text-sm"
      style={success
        ? {
            background: 'rgba(16, 185, 129, 0.10)',
            boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.16)',
            color: '#047857',
          }
        : {
            background: 'rgba(239, 68, 68, 0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(239, 68, 68, 0.14)',
            color: '#b91c1c',
          }}
    >
      <div className="flex items-start gap-3">
        <i className={`mt-0.5 ${success ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}`} />
        <span>{feedback.message}</span>
      </div>
    </div>
  )
}

function SummaryChip({ label, value }) {
  return (
    <div
      className="rounded-[20px] px-4 py-4 min-w-0"
      style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">{label}</div>
      <div className="text-sm font-semibold text-base-color mt-2 break-words">{value}</div>
    </div>
  )
}

export default function ProfileIndex() {
  const { user, setCurrentUser, isDeveloperWorkspace } = useAuth()
  const { supportedLocales, t } = useI18n()
  const [identityForm, setIdentityForm] = useState(INITIAL_IDENTITY_FORM)
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM)
  const [identityErrors, setIdentityErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})
  const [identityFeedback, setIdentityFeedback] = useState(null)
  const [passwordFeedback, setPasswordFeedback] = useState(null)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    setIdentityForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
    })
  }, [user?.email, user?.name])

  const localeMeta = supportedLocales.find((item) => item.code === user?.locale)
  const localeLabel = localeMeta ? `${localeMeta.short} · ${localeMeta.label}` : (user?.locale ?? t('common.notAvailable'))
  const workspaceLabel = isDeveloperWorkspace()
    ? t('profilePage.summary.developerWorkspace')
    : t('profilePage.summary.businessWorkspace')
  const companyLabel = user?.company?.name || t('profilePage.summary.companyFallback')
  const trimmedName = identityForm.name.trim()
  const trimmedEmail = identityForm.email.trim()
  const identityDirty = trimmedName !== (user?.name ?? '').trim() || trimmedEmail !== (user?.email ?? '').trim()
  const passwordStrength = getPasswordStrength(passwordForm.password, t)
  const passwordReady = Boolean(
    passwordForm.current_password.trim()
      && passwordForm.password.trim()
      && passwordForm.password_confirmation.trim(),
  )

  const handleIdentityChange = (field, value) => {
    setIdentityForm((current) => ({
      ...current,
      [field]: value,
    }))
    setIdentityFeedback(null)
    setIdentityErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }))
    setPasswordFeedback(null)
    setPasswordErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  const handleIdentitySubmit = async (event) => {
    event.preventDefault()
    setSavingIdentity(true)
    setIdentityErrors({})
    setIdentityFeedback(null)

    try {
      const response = await api.put('/auth/profile', {
        name: trimmedName,
        email: trimmedEmail,
      })

      setCurrentUser?.(response.data)
      setIdentityFeedback({
        type: 'success',
        message: t('profilePage.notices.profileSaved'),
      })
    } catch (error) {
      const errors = error.response?.data?.errors ?? {}

      setIdentityErrors(errors)
      setIdentityFeedback({
        type: 'error',
        message: getFirstErrorMessage(errors, error.response?.data?.message || t('profilePage.errors.profileSave')),
      })
    } finally {
      setSavingIdentity(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setSavingPassword(true)
    setPasswordErrors({})
    setPasswordFeedback(null)

    try {
      const response = await api.put('/auth/password', passwordForm)

      setPasswordForm(INITIAL_PASSWORD_FORM)
      setPasswordFeedback({
        type: 'success',
        message: response.data?.message || t('profilePage.notices.passwordSaved'),
      })
    } catch (error) {
      const errors = error.response?.data?.errors ?? {}

      setPasswordErrors(errors)
      setPasswordFeedback({
        type: 'error',
        message: getFirstErrorMessage(errors, error.response?.data?.message || t('profilePage.errors.passwordSave')),
      })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-[28px] px-5 py-5"
        style={{
          background: 'linear-gradient(135deg, rgba(13,148,136,0.10), rgba(59,130,246,0.08))',
          boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.14)',
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-color">
              {t('profilePage.eyebrow')}
            </div>
            <h2 className="text-xl font-bold text-base-color mt-2">{t('profilePage.title')}</h2>
            <p className="text-sm text-secondary-color mt-2">{t('profilePage.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[540px]">
            <SummaryChip label={t('profilePage.summary.workspace')} value={workspaceLabel} />
            <SummaryChip label={t('profilePage.summary.role')} value={t(`badges.roles.${user?.role || 'admin'}`)} />
            <SummaryChip label={t('profilePage.summary.company')} value={companyLabel} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-4">
          <SummaryChip label={t('profilePage.summary.email')} value={user?.email || t('common.notAvailable')} />
          <SummaryChip label={t('profilePage.summary.locale')} value={localeLabel} />
          <SummaryChip label={t('profilePage.summary.accountName')} value={user?.name || t('common.notAvailable')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <section className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
                {t('profilePage.identity.eyebrow')}
              </div>
              <div className="text-lg font-semibold text-base-color mt-2">{t('profilePage.identity.title')}</div>
              <div className="text-sm text-secondary-color mt-2">{t('profilePage.identity.description')}</div>
            </div>
          </div>

          <div className="mt-5">
            <FeedbackBanner feedback={identityFeedback} />
          </div>

          <form className="space-y-5 mt-5" onSubmit={handleIdentitySubmit}>
            <div>
              <label className="text-sm font-semibold text-base-color">{t('profilePage.form.name')}</label>
              <input
                type="text"
                value={identityForm.name}
                onChange={(event) => handleIdentityChange('name', event.target.value)}
                placeholder={t('profilePage.placeholders.name')}
                autoComplete="name"
                className="mt-2"
              />
              {getFieldError(identityErrors, 'name') && (
                <div className="text-xs text-red-500 mt-2">{getFieldError(identityErrors, 'name')}</div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-base-color">{t('profilePage.form.email')}</label>
              <input
                type="email"
                dir="ltr"
                value={identityForm.email}
                onChange={(event) => handleIdentityChange('email', event.target.value)}
                placeholder={t('profilePage.placeholders.email')}
                autoComplete="email"
                className="mt-2"
              />
              <div className="text-xs text-secondary-color mt-2">{t('profilePage.form.emailHint')}</div>
              {getFieldError(identityErrors, 'email') && (
                <div className="text-xs text-red-500 mt-2">{getFieldError(identityErrors, 'email')}</div>
              )}
            </div>

            <div className="rounded-[22px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-color">
                {t('profilePage.identity.noteTitle')}
              </div>
              <div className="text-sm text-secondary-color mt-2">{t('profilePage.identity.noteBody')}</div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingIdentity || !identityDirty}>
                {savingIdentity
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                  : <><i className="fa-solid fa-floppy-disk" /> {t('profilePage.form.saveIdentity')}</>}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
              {t('profilePage.security.eyebrow')}
            </div>
            <div className="text-lg font-semibold text-base-color mt-2">{t('profilePage.security.title')}</div>
            <div className="text-sm text-secondary-color mt-2">{t('profilePage.security.description')}</div>
          </div>

          <div className="mt-5">
            <FeedbackBanner feedback={passwordFeedback} />
          </div>

          <div
            className="rounded-[22px] px-4 py-4 mt-5"
            style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-color">
                {t('profilePage.strength.label')}
              </div>
              <div className="text-sm font-semibold" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={`password-strength-${index}`}
                  className="h-2 rounded-full"
                  style={{
                    background: index < passwordStrength.score
                      ? passwordStrength.color
                      : 'rgba(148, 163, 184, 0.18)',
                    opacity: index < passwordStrength.score ? 1 : 0.8,
                  }}
                />
              ))}
            </div>
            <div className="text-xs text-secondary-color mt-3">{t('profilePage.form.passwordHint')}</div>
          </div>

          <form className="space-y-5 mt-5" onSubmit={handlePasswordSubmit}>
            <div>
              <label className="text-sm font-semibold text-base-color">{t('profilePage.form.currentPassword')}</label>
              <input
                type="password"
                dir="ltr"
                value={passwordForm.current_password}
                onChange={(event) => handlePasswordChange('current_password', event.target.value)}
                placeholder={t('profilePage.placeholders.currentPassword')}
                autoComplete="current-password"
                className="mt-2"
              />
              {getFieldError(passwordErrors, 'current_password') && (
                <div className="text-xs text-red-500 mt-2">{getFieldError(passwordErrors, 'current_password')}</div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-base-color">{t('profilePage.form.newPassword')}</label>
              <input
                type="password"
                dir="ltr"
                value={passwordForm.password}
                onChange={(event) => handlePasswordChange('password', event.target.value)}
                placeholder={t('profilePage.placeholders.newPassword')}
                autoComplete="new-password"
                className="mt-2"
              />
              {getFieldError(passwordErrors, 'password') && (
                <div className="text-xs text-red-500 mt-2">{getFieldError(passwordErrors, 'password')}</div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-base-color">{t('profilePage.form.confirmPassword')}</label>
              <input
                type="password"
                dir="ltr"
                value={passwordForm.password_confirmation}
                onChange={(event) => handlePasswordChange('password_confirmation', event.target.value)}
                placeholder={t('profilePage.placeholders.confirmPassword')}
                autoComplete="new-password"
                className="mt-2"
              />
              {getFieldError(passwordErrors, 'password_confirmation') && (
                <div className="text-xs text-red-500 mt-2">{getFieldError(passwordErrors, 'password_confirmation')}</div>
              )}
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingPassword || !passwordReady}>
                {savingPassword
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                  : <><i className="fa-solid fa-key" /> {t('profilePage.form.savePassword')}</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
