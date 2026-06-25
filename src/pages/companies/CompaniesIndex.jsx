import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { companyHasDedicatedLogo } from '../../utils/branding'
import { formatCount as formatLocaleCount, formatDateTime as formatLocaleDateTime } from '../../utils/format'

function buildCompanyForm(company = null) {
  return {
    name: company?.name ?? '',
    slug: company?.slug ?? '',
    note: company?.note ?? '',
    max_camions: String(company?.max_camions ?? 5),
    active: company?.active ?? true,
    is_default: company?.is_default ?? false,
    fresh_install_enabled: company?.fresh_install_enabled ?? true,
    background_tasks_enabled: company?.background_tasks_enabled ?? true,
    remove_logo: false,
  }
}

function formatDateTime(value, fallback) {
  if (!value) {
    return fallback
  }

  return formatLocaleDateTime(value)
}

function MetricPill({ label, value, tone = 'default' }) {
  const styles = tone === 'success'
    ? { background: 'rgba(16,185,129,0.10)', color: '#047857' }
    : tone === 'warning'
      ? { background: 'rgba(249,115,22,0.10)', color: '#c2410c' }
      : { background: 'rgba(15,23,42,0.05)', color: 'var(--text-secondary)' }

  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={styles}>
      <span>{label}</span>
      <span>{value}</span>
    </span>
  )
}

function CompanyCard({ company, selected, onOpen, t }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(company)}
      className="w-full rounded-[24px] px-4 py-4 text-left transition-colors"
      style={selected
        ? { background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
        : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-color">{company.name}</div>
          <div className="text-xs text-muted-color mt-1">{company.slug}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {company.is_default && <MetricPill label={t('companiesPage.badges.default')} value={t('companiesPage.badges.yes')} tone="success" />}
          {!company.active && <MetricPill label={t('common.status')} value={t('companiesPage.badges.inactive')} tone="warning" />}
        </div>
      </div>

      {company.note && (
        <div className="text-xs text-secondary-color mt-3 line-clamp-2">{company.note}</div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        {[
          { label: t('layout.nav.depot'), value: company.depots_count },
          { label: t('layout.nav.camions'), value: `${company.camions_count}/${company.max_camions}` },
          { label: t('layout.nav.users'), value: company.users_count },
          { label: t('companiesPage.metrics.audits'), value: company.audits_count },
        ].map((item) => (
          <div
            key={`${company.id}-${item.label}`}
            className="rounded-2xl px-3 py-3 text-center"
            style={{ background: '#ffffff80', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }}
          >
            <div className="text-[11px] text-muted-color">{item.label}</div>
            <div className="text-sm font-bold text-base-color mt-1">{item.value}</div>
          </div>
        ))}
      </div>
    </button>
  )
}

function ActivityList({ title, emptyLabel, items, renderItem, countText }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-base-color">{title}</h2>
        <span className="text-xs text-muted-color">{countText}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl px-4 py-10 text-sm text-muted-color text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  const { t } = useI18n()

  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted-color">{label}</span>
      <span className="font-medium text-base-color text-right">{value || t('companiesPage.notAvailable')}</span>
    </div>
  )
}

function formatCount(value) {
  return formatLocaleCount(Number(value ?? 0))
}

export default function CompaniesIndex() {
  const { t } = useI18n()
  const { startCompanySession, switchingCompanySession, isScopedCompanySession, sessionContext } = useAuth()
  const { companyId: companyIdParam } = useParams()
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companyError, setCompanyError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(buildCompanyForm())
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [freshConfirmation, setFreshConfirmation] = useState('')
  const [runningFreshInstall, setRunningFreshInstall] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapResult, setBootstrapResult] = useState(null)
  const [creating, setCreating] = useState(false)
  const [launchingRoleKey, setLaunchingRoleKey] = useState('')

  const activeCompanyId = companyIdParam ? Number(companyIdParam) : null
  const translateRole = (role) => {
    if (!role) {
      return t('companiesPage.systemFallback')
    }

    const key = `badges.roles.${role}`
    const translated = t(key)
    return translated === key ? role : translated
  }
  const formatDateTimeValue = (value) => formatDateTime(value, t('companiesPage.notAvailable'))
  const companyToggleLabels = [
    ['active', t('companiesPage.form.toggles.active')],
    ['is_default', t('companiesPage.form.toggles.default')],
    ['fresh_install_enabled', t('companiesPage.form.toggles.freshInstall')],
    ['background_tasks_enabled', t('companiesPage.form.toggles.backgroundTasks')],
  ]

  const loadCompanies = async (preferredCompanyId = null) => {
    setLoadingCompanies(true)
    setCompanyError('')

    try {
      const response = await api.get('/companies')
      const rows = Array.isArray(response.data) ? response.data : []
      setCompanies(rows)

      if (!preferredCompanyId && !activeCompanyId && rows[0]) {
        navigate(`/companies/${rows[0].id}`, { replace: true })
      }

      if (preferredCompanyId) {
        navigate(`/companies/${preferredCompanyId}`, { replace: true })
      }
    } catch (error) {
      setCompanyError(error.response?.data?.message || t('companiesPage.errors.loadCompanies'))
      setCompanies([])
    } finally {
      setLoadingCompanies(false)
    }
  }

  const loadCompanyDetail = async (targetCompanyId) => {
    if (!targetCompanyId) {
      setDetail(null)
      return
    }

    setDetailLoading(true)
    setActionError('')

    try {
      const response = await api.get(`/companies/${targetCompanyId}`)
      const payload = response.data ?? null
      setDetail(payload)
      setForm(buildCompanyForm(payload?.company ?? null))
      setLogoFile(null)
      setCreating(false)
    } catch (error) {
      setActionError(error.response?.data?.message || t('companiesPage.errors.loadCompanyDetail'))
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (activeCompanyId) {
      loadCompanyDetail(activeCompanyId)
    } else if (creating) {
      setDetail(null)
      setForm(buildCompanyForm())
    }
  }, [activeCompanyId])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(logoFile)
    setLogoPreviewUrl(nextUrl)

    return () => URL.revokeObjectURL(nextUrl)
  }, [logoFile])

  const selectedCompany = useMemo(
    () => companies.find((entry) => Number(entry.id) === Number(activeCompanyId)) ?? detail?.company ?? null,
    [activeCompanyId, companies, detail],
  )
  const currentScopedCompanyId = Number(sessionContext?.company_id ?? 0) || null
  const currentScopedRole = String(sessionContext?.acting_role || '').trim()
  const companySessionActive = isScopedCompanySession()
    && Number(selectedCompany?.id ?? 0) > 0
    && Number(selectedCompany?.id) === currentScopedCompanyId
  const selectedCompanyRecord = detail?.company ?? selectedCompany ?? null
  const companyHasStoredLogo = companyHasDedicatedLogo(selectedCompanyRecord)
  const companyLogoRequired = creating || !companyHasStoredLogo || form.remove_logo
  const companyPreviewImage = logoPreviewUrl
    || (companyHasStoredLogo ? selectedCompanyRecord?.logo_url : '')

  const openCompany = (company) => {
    setNotice('')
    setActionError('')
    setCreating(false)
    setBootstrapResult(null)
    navigate(`/companies/${company.id}`)
  }

  const startCreate = () => {
    setCreating(true)
    setDetail(null)
    setLogoFile(null)
    setBootstrapResult(null)
    setNotice('')
    setActionError('')
    setForm(buildCompanyForm())
    navigate('/companies')
  }

  const saveCompany = async () => {
    if (!logoFile && (!companyHasStoredLogo || form.remove_logo)) {
      setNotice('')
      setActionError(t('companiesPage.errors.logoRequired'))
      return
    }

    setSaving(true)
    setNotice('')
    setActionError('')

    try {
      const payload = new FormData()
      payload.append('name', form.name.trim())
      if (form.slug.trim()) {
        payload.append('slug', form.slug.trim())
      }
      if (form.note.trim()) {
        payload.append('note', form.note.trim())
      }
      payload.append('max_camions', String(Number(form.max_camions || 5)))
      payload.append('active', form.active ? '1' : '0')
      payload.append('is_default', form.is_default ? '1' : '0')
      payload.append('fresh_install_enabled', form.fresh_install_enabled ? '1' : '0')
      payload.append('background_tasks_enabled', form.background_tasks_enabled ? '1' : '0')
      payload.append('remove_logo', form.remove_logo ? '1' : '0')
      if (logoFile) {
        payload.append('logo', logoFile)
      }

      if (creating) {
        const response = await api.post('/companies', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const created = response.data ?? null
        setNotice(t('companiesPage.notices.created'))
        await loadCompanies(created?.id ?? null)
        if (created?.id) {
          await loadCompanyDetail(created.id)
        }
      } else if (selectedCompany?.id) {
        const response = await api.put(`/companies/${selectedCompany.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setNotice(t('companiesPage.notices.updated'))
        await loadCompanies(selectedCompany.id)
        await loadCompanyDetail(response.data?.id ?? selectedCompany.id)
      }
    } catch (error) {
      const fieldMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .filter(Boolean)
        .join(' ')
      setActionError(fieldMessage || error.response?.data?.message || t('companiesPage.errors.save'))
    } finally {
      setSaving(false)
    }
  }

  const runFreshInstall = async () => {
    if (!selectedCompany?.id) {
      return
    }

    if (freshConfirmation.trim() !== 'FRESH INSTALL') {
      setActionError(t('companiesPage.errors.freshInstallConfirmation'))
      return
    }

    setRunningFreshInstall(true)
    setNotice('')
    setActionError('')

    try {
      await api.post(`/companies/${selectedCompany.id}/fresh-install`, {
        confirmation: freshConfirmation.trim(),
      })
      setFreshConfirmation('')
      setNotice(t('companiesPage.notices.freshInstallDone'))
      await loadCompanies(selectedCompany.id)
      await loadCompanyDetail(selectedCompany.id)
    } catch (error) {
      setActionError(error.response?.data?.message || t('companiesPage.errors.freshInstall'))
    } finally {
      setRunningFreshInstall(false)
    }
  }

  const bootstrapWorkspace = async () => {
    if (!selectedCompany?.id) {
      return
    }

    setBootstrapping(true)
    setNotice('')
    setActionError('')
    setBootstrapResult(null)

    try {
      const response = await api.post(`/companies/${selectedCompany.id}/bootstrap-workspace`)
      setBootstrapResult(response.data?.result ?? null)
      setNotice(t('companiesPage.notices.workspaceReady'))
      await loadCompanies(selectedCompany.id)
      await loadCompanyDetail(selectedCompany.id)
    } catch (error) {
      setActionError(error.response?.data?.message || t('companiesPage.errors.workspace'))
    } finally {
      setBootstrapping(false)
    }
  }

  const launchCompanySession = async (role, path = '/') => {
    if (!selectedCompany?.id) {
      return
    }

    setNotice('')
    setActionError('')
    setLaunchingRoleKey(`${selectedCompany.id}:${role}`)

    try {
      await startCompanySession(selectedCompany.id, role)
      navigate(path)
    } catch (error) {
      setActionError(error.response?.data?.message || t('companiesPage.errors.launchSession'))
    } finally {
      setLaunchingRoleKey('')
    }
  }

  if (loadingCompanies && companies.length === 0) {
    return (
      <div className="card py-12">
        <PageLoader />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companiesPage.page.title')}
        subtitle={t('companiesPage.page.subtitle')}
        action={(
          <div className="flex flex-wrap gap-2">
            <button onClick={startCreate} className="btn-secondary text-xs">
              <i className="fa-solid fa-plus" /> {t('companiesPage.page.newCompany')}
            </button>
            <Link to="/developer-tools" className="btn-secondary text-xs">
              <i className="fa-solid fa-code" /> {t('companiesPage.page.developerTools')}
            </Link>
          </div>
        )}
      />

      {(notice || actionError || companyError) && (
        <div
          className="rounded-2xl px-4 py-4 text-sm font-medium"
          style={(actionError || companyError)
            ? { background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }
            : { background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)', color: '#0f766e' }}
        >
          {actionError || companyError || notice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-3">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              selected={Number(company.id) === Number(selectedCompany?.id)}
              onOpen={openCompany}
              t={t}
            />
          ))}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">
                  {creating ? t('companiesPage.detail.newTitle') : (selectedCompany?.name ?? t('companiesPage.detail.recordTitle'))}
                </h2>
                <p className="text-xs text-muted-color mt-1">
                  {t('companiesPage.detail.subtitle')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!creating && selectedCompany?.id && (
                  <>
                    <button onClick={() => { void launchCompanySession('admin', '/config') }} className="btn-secondary text-xs">
                      <i className="fa-solid fa-sliders" /> {t('companiesPage.detail.configure')}
                    </button>
                    <button onClick={() => { void launchCompanySession('admin', '/data-tools') }} className="btn-secondary text-xs">
                      <i className="fa-solid fa-file-arrow-up" /> {t('companiesPage.detail.dataTools')}
                    </button>
                  </>
                )}
                <button onClick={saveCompany} disabled={saving} className="btn-primary text-xs">
                  {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : <><i className="fa-solid fa-floppy-disk" /> {t('common.save')}</>}
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="rounded-2xl px-4 py-10 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('companiesPage.detail.loading')}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t('companiesPage.form.name')} required>
                      <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('companiesPage.form.placeholders.name')} />
                    </FormField>

                    <FormField label={t('companiesPage.form.slug')}>
                      <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder={t('companiesPage.form.placeholders.slug')} />
                    </FormField>
                  </div>

                  <FormField label={t('companiesPage.form.note')}>
                    <textarea rows="3" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder={t('companiesPage.form.placeholders.note')} />
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t('companiesPage.form.maxCamions')}>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={form.max_camions}
                        onChange={(event) => setForm((current) => ({ ...current, max_camions: event.target.value }))}
                      />
                    </FormField>

                    <FormField label={t('companiesPage.form.logo')} required={companyLogoRequired}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        required={companyLogoRequired}
                        onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                      />
                      <p className="mt-2 text-xs text-muted-color">{t('companiesPage.form.logoHint')}</p>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {companyToggleLabels.map(([key, label]) => (
                      <label key={key} className="rounded-2xl px-4 py-3 text-sm text-base-color cursor-pointer" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={Boolean(form[key])}
                            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                          />
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {!creating && detail?.company && (
                    <div className="rounded-[24px] px-4 py-4" style={{ background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.16)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-base-color">{t('companiesPage.session.title')}</div>
                          <div className="text-xs text-secondary-color mt-2">
                            {t('companiesPage.session.description')}
                          </div>
                        </div>
                        {companySessionActive && (
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.82)', color: '#0f766e' }}>
                            {t('companiesPage.session.activeRole', { role: translateRole(currentScopedRole) })}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mt-4">
                        {['admin', 'comptable', 'rep'].map((role) => {
                          const roleKey = `${selectedCompany.id}:${role}`
                          const busy = switchingCompanySession || launchingRoleKey === roleKey

                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => { void launchCompanySession(role, '/') }}
                              disabled={busy}
                              className="rounded-2xl px-3 py-3 text-left transition-colors"
                              style={role === currentScopedRole && companySessionActive
                                ? { background: 'rgba(13,148,136,0.12)', color: '#0f766e' }
                                : { background: '#ffffffd1', color: 'var(--text-secondary)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.16)' }}
                            >
                              <div className="text-xs font-semibold text-base-color">
                                {busy ? t('companiesPage.session.starting') : translateRole(role)}
                              </div>
                              <div className="text-[11px] text-secondary-color mt-2">
                                {t('companiesPage.session.fixedOneHour')}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[24px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">{t('companiesPage.preview.title')}</div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                        {companyPreviewImage ? (
                          <img src={companyPreviewImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <i className="fa-solid fa-image text-slate-400 text-xl" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-base-color">{form.name || t('companiesPage.preview.newCompany')}</div>
                        <div className="text-xs text-muted-color mt-1">{form.slug || t('companiesPage.preview.slugFallback')}</div>
                        {!companyPreviewImage && (
                          <div className="mt-2 text-[11px] font-medium" style={{ color: '#d97706' }}>
                            {t('companiesPage.preview.logoMissing')}
                          </div>
                        )}
                      </div>
                    </div>

                    {!creating && detail?.company && (
                      <div className="space-y-2 mt-4">
                        <MetricPill label={t('layout.nav.users')} value={detail.company.users_count} />
                        <MetricPill label={t('layout.nav.depot')} value={detail.company.depots_count} />
                        <MetricPill label={t('layout.nav.camions')} value={`${detail.company.camions_count}/${detail.company.max_camions}`} />
                        <MetricPill label={t('companiesPage.metrics.transfers')} value={detail.company.transfer_logs_count} />
                      </div>
                    )}
                  </div>

                  {!creating && detail?.company && (
                    <div className="rounded-[24px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">{t('companiesPage.governance.title')}</div>
                      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        <DetailRow label={t('companiesPage.governance.createdAt')} value={formatDateTimeValue(detail.company.created_at)} />
                        <DetailRow label={t('companiesPage.governance.updatedAt')} value={formatDateTimeValue(detail.company.updated_at)} />
                        <DetailRow label={t('companiesPage.governance.settings')} value={t('companiesPage.governance.settingsCount', { count: detail.company.settings_count ?? 0 })} />
                        <DetailRow label={t('companiesPage.governance.freshInstall')} value={detail.company.fresh_install_enabled ? t('companiesPage.governance.allowed') : t('companiesPage.governance.blocked')} />
                        <DetailRow label={t('companiesPage.governance.backgroundTasks')} value={detail.company.background_tasks_enabled ? t('companiesPage.governance.enabled') : t('companiesPage.governance.blockedPlural')} />
                      </div>

                      {Object.entries(detail.company.settings_groups ?? {}).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {Object.entries(detail.company.settings_groups).map(([group, count]) => (
                            <span
                              key={group}
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
                              style={{ background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}
                            >
                              {group} · {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!creating && detail?.company?.fresh_install_preview && (
                    <div className="rounded-[24px] px-4 py-4" style={{ background: 'rgba(249,115,22,0.08)', boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.16)' }}>
                      <div className="text-sm font-semibold" style={{ color: '#c2410c' }}>{t('companiesPage.freshInstall.title')}</div>
                      <div className="text-xs mt-2" style={{ color: '#9a3412' }}>
                        {t('companiesPage.freshInstall.description')}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="rounded-2xl px-3 py-3 text-center" style={{ background: '#ffffffb8' }}>
                          <div className="text-[11px] text-muted-color">{t('companiesPage.freshInstall.delete')}</div>
                          <div className="text-sm font-bold text-base-color">{Object.values(detail.company.fresh_install_preview.delete ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)}</div>
                        </div>
                        <div className="rounded-2xl px-3 py-3 text-center" style={{ background: '#ffffffb8' }}>
                          <div className="text-[11px] text-muted-color">{t('companiesPage.freshInstall.reset')}</div>
                          <div className="text-sm font-bold text-base-color">{Object.values(detail.company.fresh_install_preview.reset ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)}</div>
                        </div>
                        <div className="rounded-2xl px-3 py-3 text-center" style={{ background: '#ffffffb8' }}>
                          <div className="text-[11px] text-muted-color">{t('companiesPage.freshInstall.keep')}</div>
                          <div className="text-sm font-bold text-base-color">{Object.values(detail.company.fresh_install_preview.keep ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)}</div>
                        </div>
                      </div>
                      <input
                        className="mt-4"
                        value={freshConfirmation}
                        onChange={(event) => setFreshConfirmation(event.target.value)}
                        placeholder={t('companiesPage.freshInstall.placeholder')}
                      />
                      <button onClick={runFreshInstall} disabled={runningFreshInstall} className="btn-danger text-xs mt-3 w-full justify-center">
                        {runningFreshInstall ? <><i className="fa-solid fa-spinner fa-spin" /> {t('companiesPage.freshInstall.running')}</> : <><i className="fa-solid fa-power-off" /> {t('companiesPage.freshInstall.run')}</>}
                      </button>
                    </div>
                  )}

                  {!creating && (
                    <div className="rounded-[24px] px-4 py-4" style={{ background: 'rgba(59,130,246,0.08)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.16)' }}>
                      <div className="text-sm font-semibold text-base-color">{t('companiesPage.workspace.title')}</div>
                      <div className="text-xs text-secondary-color mt-2">
                        {t('companiesPage.workspace.description')}
                      </div>
                      <button onClick={bootstrapWorkspace} disabled={bootstrapping} className="btn-primary text-xs mt-3 w-full justify-center">
                        {bootstrapping ? <><i className="fa-solid fa-spinner fa-spin" /> {t('companiesPage.workspace.preparing')}</> : <><i className="fa-solid fa-wand-magic-sparkles" /> {t('companiesPage.workspace.prepare')}</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!creating && detail && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ActivityList
                  title={t('companiesPage.activity.auditTitle')}
                  emptyLabel={t('companiesPage.activity.auditEmpty')}
                  countText={t('companiesPage.activity.count', { count: (detail.recent_audits ?? []).length })}
                  items={detail.recent_audits ?? []}
                  renderItem={(item) => (
                    <div key={`audit-${item.id}`} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-base-color">{item.message}</div>
                          <div className="text-xs text-muted-color mt-1">{item.action}</div>
                        </div>
                        <div className="text-right text-[11px] text-muted-color">
                          <div>{item.actor_name || t('companiesPage.systemFallback')}</div>
                          <div className="mt-1">{formatDateTimeValue(item.created_at)}</div>
                        </div>
                      </div>
                      {Array.isArray(item.changes) && item.changes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.changes.map((change) => (
                            <span key={`${item.id}-${change}`} className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}>
                              {change}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />

                <ActivityList
                  title={t('companiesPage.activity.transfersTitle')}
                  emptyLabel={t('companiesPage.activity.transfersEmpty')}
                  countText={t('companiesPage.activity.count', { count: (detail.recent_transfers ?? []).length })}
                  items={detail.recent_transfers ?? []}
                  renderItem={(item) => (
                    <div key={`transfer-${item.id}`} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-base-color">{item.entity_label}</div>
                          <div className="text-xs text-muted-color mt-1">{item.direction === 'import' ? t('companiesPage.activity.import') : t('companiesPage.activity.export')} - {item.source}</div>
                        </div>
                        <div className="text-right text-[11px] text-muted-color">
                          <div>{item.created_by || t('companiesPage.systemFallback')}</div>
                          <div className="mt-1">{formatDateTimeValue(item.created_at)}</div>
                        </div>
                      </div>
                      {item.file_name && <div className="text-xs font-mono text-secondary-color mt-3">{item.file_name}</div>}
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="card">
                  <h2 className="text-sm font-semibold text-base-color mb-4">{t('companiesPage.sections.depots')}</h2>
                  <div className="space-y-2">
                    {(detail.depots ?? []).map((entry) => (
                      <div key={`depot-${entry.id}`} className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                          {entry.is_default && <MetricPill label={t('companiesPage.badges.default')} value={t('companiesPage.badges.yes')} tone="success" />}
                          {!entry.active && <MetricPill label={t('common.status')} value={t('companiesPage.badges.inactive')} tone="warning" />}
                        </div>
                        <div className="text-xs text-muted-color mt-1">{entry.code || t('companiesPage.sections.codeMissing')}</div>
                        <div className="text-[11px] text-secondary-color mt-2">{t('companiesPage.sections.createdAt', { value: formatDateTimeValue(entry.created_at) })}</div>
                        <div className="text-[11px] text-secondary-color mt-1">{t('companiesPage.sections.updatedAt', { value: formatDateTimeValue(entry.updated_at) })}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-sm font-semibold text-base-color mb-4">{t('companiesPage.sections.camions')}</h2>
                  <div className="space-y-2">
                    {(detail.camions ?? []).map((entry) => (
                      <div key={`camion-${entry.id}`} className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                          {!entry.active && <MetricPill label={t('common.status')} value={t('companiesPage.badges.inactive')} tone="warning" />}
                        </div>
                        <div className="text-xs text-muted-color mt-1">{entry.plate || t('companiesPage.sections.noPlate')} - {entry.operational_status}</div>
                        <div className="text-[11px] text-secondary-color mt-2">{t('companiesPage.sections.createdAt', { value: formatDateTimeValue(entry.created_at) })}</div>
                        <div className="text-[11px] text-secondary-color mt-1">{t('companiesPage.sections.updatedAt', { value: formatDateTimeValue(entry.updated_at) })}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-sm font-semibold text-base-color mb-4">{t('companiesPage.sections.users')}</h2>
                  <div className="space-y-2">
                    {(detail.users ?? []).map((entry) => (
                      <div key={`user-${entry.id}`} className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                        <div className="text-xs text-muted-color mt-1">{translateRole(entry.role)} - {entry.email}</div>
                        <div className="text-xs text-secondary-color mt-2">{entry.depot?.name || t('companiesPage.sections.depotToConfirm')}</div>
                        <div className="text-[11px] text-secondary-color mt-2">{t('companiesPage.sections.createdAt', { value: formatDateTimeValue(entry.created_at) })}</div>
                        <div className="text-[11px] text-secondary-color mt-1">{t('companiesPage.sections.updatedAt', { value: formatDateTimeValue(entry.updated_at) })}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {bootstrapResult?.credentials?.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-sm font-semibold text-base-color">{t('companiesPage.credentials.title')}</h2>
                    <span className="text-xs text-muted-color">{t('companiesPage.credentials.count', { count: bootstrapResult.credentials.length })}</span>
                  </div>
                  <div className="space-y-3">
                    {bootstrapResult.credentials.map((entry) => (
                      <div key={entry.email} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                        <div className="text-xs text-muted-color mt-1">{translateRole(entry.role)} - {entry.email}</div>
                        <div className="text-xs font-mono text-secondary-color mt-2">{entry.password}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
