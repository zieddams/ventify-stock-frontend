import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatCount as formatLocaleCount, formatDateTime as formatLocaleDateTime } from '../../utils/format'
import SystemTasksPanel from '../config/SystemTasksPanel'
import OpsConsoleLaunchCard from './OpsConsoleLaunchCard'

const EMPTY_OVERVIEW = {
  broadcast: {
    active_companies: 0,
    active_users: 0,
  },
  maintenance: {
    enabled: false,
    global: false,
    paths: [],
    message: '',
  },
  demo: {
    has_demo: false,
    count: 0,
    customers: 0,
    sessions: 0,
  },
  fresh_install: {
    delete: {},
    reset: {},
    keep: {},
  },
  bug_recipients: [],
  system: {},
}

const EMPTY_TASK_SNAPSHOT = {
  generated_at: null,
  stats: {},
  tasks: [],
  recent_runs: [],
}

const EMPTY_BROADCAST_CATALOG = {
  summary: {
    active_companies: 0,
    active_users: 0,
  },
  companies: [],
  users: [],
}

function getMaintenancePageOptions(t) {
  return [
    { path: '/', label: t('layout.nav.dashboard') },
    { path: '/invoices', label: t('layout.nav.invoices') },
    { path: '/customers', label: t('layout.nav.customers') },
    { path: '/products', label: t('layout.nav.products') },
    { path: '/routes', label: t('layout.nav.routes') },
    { path: '/depot', label: t('layout.nav.depot') },
    { path: '/camions', label: t('layout.nav.camions') },
    { path: '/inventory', label: t('layout.nav.inventory') },
    { path: '/reports', label: t('layout.nav.reports') },
    { path: '/data-tools', label: t('layout.nav.dataTools') },
    { path: '/config', label: t('layout.nav.config') },
    { path: '/bug-reports', label: t('layout.nav.bugReports') },
  ]
}

function normalizePath(path) {
  const value = String(path ?? '').trim()

  if (!value) {
    return ''
  }

  const normalized = `/${value.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')

  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '')
}

function parsePathInput(value) {
  return Array.from(new Set(
    String(value ?? '')
      .split(/[\n,;]+/)
      .map((item) => normalizePath(item))
      .filter(Boolean)
  ))
}

function formatCount(value) {
  return formatLocaleCount(value)
}

function sumValues(record) {
  return Object.values(record ?? {}).reduce((total, value) => total + Number(value ?? 0), 0)
}

function formatDateTime(value, fallback) {
  if (!value) {
    return fallback
  }

  return formatLocaleDateTime(value)
}

function MetricCard({ label, value, icon, color, helper }) {
  return (
    <div className="card py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          <i className={icon} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-color">{label}</div>
          <div className="text-sm font-bold text-base-color">{value}</div>
          {helper && <div className="text-[11px] text-secondary-color mt-1">{helper}</div>}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono = false, fallback = '-' }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs text-muted-color">{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono text-xs text-secondary-color' : 'font-medium text-base-color'}`}>
        {value || fallback}
      </span>
    </div>
  )
}

function CountTable({ title, description, values, tone = 'neutral', totalLabel, emptyLabel }) {
  const colors = tone === 'danger'
    ? {
        shell: 'rgba(239,68,68,0.06)',
        border: 'rgba(239,68,68,0.14)',
        accent: '#b91c1c',
      }
    : {
        shell: 'rgba(13,148,136,0.06)',
        border: 'rgba(13,148,136,0.14)',
        accent: '#0f766e',
      }

  const entries = Object.entries(values ?? {})

  return (
    <div
      className="rounded-3xl px-4 py-4"
      style={{
        background: colors.shell,
        boxShadow: `inset 0 0 0 1px ${colors.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-base-color">{title}</div>
          <div className="text-xs text-secondary-color mt-1">{description}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-color uppercase tracking-[0.18em]">{totalLabel}</div>
          <div className="text-lg font-bold" style={{ color: colors.accent }}>{formatCount(sumValues(values))}</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-color">{emptyLabel}</div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-mono text-xs text-secondary-color">{key}</span>
              <span className="font-semibold text-base-color">{formatCount(count)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ShortcutLink({ to, icon, label }) {
  return (
    <Link to={to} className="btn-secondary text-xs w-full justify-center">
      <i className={icon} /> {label}
    </Link>
  )
}

export default function DeveloperToolsIndex() {
  const { t } = useI18n()
  const maintenanceDefaultMessage = t('developerToolsPage.maintenance.defaultMessage')
  const [overview, setOverview] = useState(EMPTY_OVERVIEW)
  const [broadcastCatalog, setBroadcastCatalog] = useState(EMPTY_BROADCAST_CATALOG)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(true)
  const [broadcastLoadError, setBroadcastLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [togglingDemo, setTogglingDemo] = useState(false)
  const [runningFreshInstall, setRunningFreshInstall] = useState(false)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    enabled: false,
    message: maintenanceDefaultMessage,
    pathsText: '',
  })
  const [broadcastForm, setBroadcastForm] = useState({
    target: 'company',
    companyId: '',
    userId: '',
    title: '',
    message: '',
  })
  const [freshInstallConfirmation, setFreshInstallConfirmation] = useState('')
  const [taskSnapshot, setTaskSnapshot] = useState(EMPTY_TASK_SNAPSHOT)
  const [taskLoading, setTaskLoading] = useState(true)
  const [taskLoadError, setTaskLoadError] = useState('')
  const [taskActionError, setTaskActionError] = useState('')
  const [runningTaskKey, setRunningTaskKey] = useState('')
  const [taskNotice, setTaskNotice] = useState('')
  const maintenancePageOptions = useMemo(() => getMaintenancePageOptions(t), [t])
  const notAvailableLabel = t('developerToolsPage.notAvailable')
  const supportRecipientCount = Number(overview.bug_recipients?.length ?? 0)
  const broadcastSummary = overview.broadcast ?? EMPTY_OVERVIEW.broadcast
  const broadcastCompanies = Array.isArray(broadcastCatalog.companies) ? broadcastCatalog.companies : []
  const broadcastUsers = Array.isArray(broadcastCatalog.users) ? broadcastCatalog.users : []

  const syncMaintenanceForm = useCallback((maintenance) => {
    setMaintenanceForm({
      enabled: Boolean(maintenance?.enabled),
      message: maintenance?.message || maintenanceDefaultMessage,
      pathsText: Array.isArray(maintenance?.paths) ? maintenance.paths.join('\n') : '',
    })
  }, [maintenanceDefaultMessage])

  const loadOverview = useCallback(async () => {
    try {
      const response = await api.get('/developer-tools')
      const payload = response.data ?? EMPTY_OVERVIEW
      setOverview(payload)
      syncMaintenanceForm(payload.maintenance)
      setLoadError('')
    } catch (error) {
      setLoadError(error.response?.data?.message || t('developerToolsPage.errors.loadOverview'))
    } finally {
      setLoading(false)
    }
  }, [syncMaintenanceForm, t])

  const loadBroadcastCatalog = useCallback(async () => {
    setBroadcastLoading(true)
    setBroadcastLoadError('')

    try {
      const response = await api.get('/developer-tools/notifications/catalog')
      const payload = response.data ?? EMPTY_BROADCAST_CATALOG
      const nextCompanies = Array.isArray(payload.companies) ? payload.companies : []
      const nextUsers = Array.isArray(payload.users) ? payload.users : []

      setBroadcastCatalog({
        summary: payload.summary ?? EMPTY_BROADCAST_CATALOG.summary,
        companies: nextCompanies,
        users: nextUsers,
      })

      setBroadcastForm((current) => {
        const hasCompany = nextCompanies.some((company) => String(company.id) === String(current.companyId))
        const hasUser = nextUsers.some((user) => String(user.id) === String(current.userId))

        return {
          ...current,
          companyId: hasCompany ? current.companyId : String(nextCompanies[0]?.id ?? ''),
          userId: hasUser ? current.userId : String(nextUsers[0]?.id ?? ''),
        }
      })
    } catch (error) {
      setBroadcastLoadError(error.response?.data?.message || t('developerToolsPage.errors.loadBroadcastCatalog'))
    } finally {
      setBroadcastLoading(false)
    }
  }, [t])

  const loadTasks = useCallback(async () => {
    setTaskLoading(true)
    setTaskLoadError('')

    try {
      const response = await api.get('/system/tasks')
      setTaskSnapshot(response.data ?? EMPTY_TASK_SNAPSHOT)
    } catch (error) {
      setTaskLoadError(error.response?.data?.message || t('developerToolsPage.errors.loadTasks'))
    } finally {
      setTaskLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadOverview()
    loadTasks()
    loadBroadcastCatalog()
  }, [loadBroadcastCatalog, loadOverview, loadTasks])

  const maintenancePaths = useMemo(
    () => parsePathInput(maintenanceForm.pathsText),
    [maintenanceForm.pathsText]
  )

  const toggleSuggestedPath = (path) => {
    setMaintenanceForm((current) => {
      const currentPaths = parsePathInput(current.pathsText)
      const nextPaths = currentPaths.includes(path)
        ? currentPaths.filter((item) => item !== path)
        : [...currentPaths, path]

      return {
        ...current,
        pathsText: nextPaths.join('\n'),
      }
    })
  }

  const saveMaintenance = async () => {
    setSavingMaintenance(true)
    setNotice('')
    setActionError('')

    try {
      const response = await api.put('/developer-tools/maintenance', {
        enabled: maintenanceForm.enabled,
        message: maintenanceForm.message.trim(),
        paths: maintenancePaths,
      })

      const maintenance = response.data ?? EMPTY_OVERVIEW.maintenance
      setOverview((current) => ({ ...current, maintenance }))
      syncMaintenanceForm(maintenance)
      setNotice(maintenance.enabled
        ? (maintenancePaths.length > 0 ? t('developerToolsPage.notices.maintenanceTargeted') : t('developerToolsPage.notices.maintenanceGlobal'))
        : t('developerToolsPage.notices.maintenanceDisabled'))
    } catch (error) {
      setActionError(error.response?.data?.message || t('developerToolsPage.errors.saveMaintenance'))
    } finally {
      setSavingMaintenance(false)
    }
  }

  const toggleDemo = async (enabled) => {
    setTogglingDemo(true)
    setNotice('')
    setActionError('')

    try {
      const response = await api.post('/developer-tools/demo', { enabled })
      setOverview((current) => ({
        ...current,
        demo: response.data?.demo ?? current.demo,
      }))
      setNotice(enabled ? t('developerToolsPage.notices.demoEnabled') : t('developerToolsPage.notices.demoPurged'))
    } catch (error) {
      setActionError(error.response?.data?.message || t('developerToolsPage.errors.toggleDemo'))
    } finally {
      setTogglingDemo(false)
    }
  }

  const runFreshInstall = async () => {
    if (freshInstallConfirmation.trim() !== 'FRESH INSTALL') {
      setActionError(t('developerToolsPage.errors.freshInstallConfirmation'))
      return
    }

    setRunningFreshInstall(true)
    setNotice('')
    setActionError('')

    try {
      const response = await api.post('/developer-tools/fresh-install', {
        confirmation: freshInstallConfirmation.trim(),
      })

      const deletedTotal = sumValues(response.data?.result?.deleted ?? {})
      setFreshInstallConfirmation('')
      setNotice(t('developerToolsPage.notices.freshInstallDone', { count: formatCount(deletedTotal) }))
      await Promise.all([loadOverview(), loadTasks()])
    } catch (error) {
      setActionError(error.response?.data?.message || t('developerToolsPage.errors.freshInstall'))
    } finally {
      setRunningFreshInstall(false)
    }
  }

  const sendBroadcast = async () => {
    setSendingBroadcast(true)
    setNotice('')
    setActionError('')

    try {
      const response = await api.post('/developer-tools/notifications/broadcast', {
        target: broadcastForm.target,
        company_id: broadcastForm.target === 'company' && broadcastForm.companyId
          ? Number(broadcastForm.companyId)
          : undefined,
        user_id: broadcastForm.target === 'user' && broadcastForm.userId
          ? Number(broadcastForm.userId)
          : undefined,
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
      })

      const sentCount = response.data?.broadcast?.sent_count ?? 0

      setBroadcastForm((current) => ({
        ...current,
        title: '',
        message: '',
      }))
      setNotice(t('developerToolsPage.notices.broadcastSent', { count: formatCount(sentCount) }))
      await Promise.all([loadOverview(), loadBroadcastCatalog()])
    } catch (error) {
      setActionError(error.response?.data?.message || t('developerToolsPage.errors.sendBroadcast'))
    } finally {
      setSendingBroadcast(false)
    }
  }

  const runBackgroundTask = async (taskKey) => {
    setRunningTaskKey(taskKey)
    setTaskNotice('')
    setTaskActionError('')

    try {
      const response = await api.post(`/system/tasks/${taskKey}/run`)
      setTaskSnapshot(response.data?.snapshot ?? EMPTY_TASK_SNAPSHOT)
      setTaskNotice(response.data?.message || t('developerToolsPage.notices.taskRun'))
    } catch (error) {
      setTaskActionError(error.response?.data?.message || t('developerToolsPage.errors.runTask'))

      if (error.response?.data?.snapshot) {
        setTaskSnapshot(error.response.data.snapshot)
      }
    } finally {
      setRunningTaskKey('')
    }
  }

  const refreshAll = async () => {
    setLoading(true)
    await Promise.all([loadOverview(), loadTasks(), loadBroadcastCatalog()])
  }

  const selectedBroadcastCompany = useMemo(
    () => broadcastCompanies.find((company) => String(company.id) === String(broadcastForm.companyId)) ?? null,
    [broadcastCompanies, broadcastForm.companyId],
  )

  const selectedBroadcastUser = useMemo(
    () => broadcastUsers.find((user) => String(user.id) === String(broadcastForm.userId)) ?? null,
    [broadcastForm.userId, broadcastUsers],
  )

  const estimatedRecipients = useMemo(() => {
    if (broadcastForm.target === 'user') {
      return selectedBroadcastUser ? 1 : 0
    }

    if (broadcastForm.target === 'company') {
      return Number(selectedBroadcastCompany?.active_users_count ?? 0)
    }

    return Number(broadcastCatalog.summary?.active_users ?? 0)
  }, [broadcastCatalog.summary?.active_users, broadcastForm.target, selectedBroadcastCompany, selectedBroadcastUser])

  const selectedTargetLabel = useMemo(() => {
    if (broadcastForm.target === 'user') {
      if (!selectedBroadcastUser) {
        return t('developerToolsPage.broadcast.noneSelected')
      }

      return [
        selectedBroadcastUser.name,
        selectedBroadcastUser.company_name,
        selectedBroadcastUser.email,
      ].filter(Boolean).join(' · ')
    }

    if (broadcastForm.target === 'company') {
      return selectedBroadcastCompany?.name || t('developerToolsPage.broadcast.noneSelected')
    }

    return t('developerToolsPage.broadcast.targets.allUsers.description')
  }, [broadcastForm.target, selectedBroadcastCompany, selectedBroadcastUser, t])

  const broadcastReady = Boolean(
    broadcastForm.title.trim()
    && broadcastForm.message.trim()
    && (
      broadcastForm.target === 'all_users'
      || (broadcastForm.target === 'company' && selectedBroadcastCompany)
      || (broadcastForm.target === 'user' && selectedBroadcastUser)
    )
  )

  if (loading) {
    return (
      <div className="card py-12">
        <PageLoader />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('developerToolsPage.page.title')}
          subtitle={t('developerToolsPage.page.errorSubtitle')}
        />

        <div className="card">
          <div
            className="rounded-2xl px-4 py-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }}
          >
            {loadError}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('developerToolsPage.page.title')}
        subtitle={t('developerToolsPage.page.subtitle')}
        action={(
          <div className="flex flex-wrap gap-2">
            <Link to="/developer" className="btn-secondary text-xs">
              <i className="fa-solid fa-compass-drafting" /> {t('developerWorkspace.nav.dashboard')}
            </Link>
            <Link to="/companies" className="btn-secondary text-xs">
              <i className="fa-solid fa-building" /> {t('layout.nav.companies')}
            </Link>
            <button onClick={refreshAll} className="btn-primary text-xs">
              <i className="fa-solid fa-rotate-right" /> {t('developerToolsPage.page.refresh')}
            </button>
          </div>
        )}
      />

      {(notice || actionError) && (
        <div
          className="rounded-2xl px-4 py-4 text-sm font-medium"
          style={actionError
            ? { background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }
            : { background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)', color: '#0f766e' }}
        >
          {actionError || notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard
          label={t('developerToolsPage.metrics.maintenance')}
          value={overview.maintenance?.enabled
            ? (overview.maintenance?.global ? t('developerToolsPage.metrics.maintenanceGlobal') : t('developerToolsPage.metrics.maintenanceTargeted'))
            : t('developerToolsPage.metrics.inactive')}
          icon="fa-solid fa-screwdriver-wrench"
          color="#0d9488"
          helper={overview.maintenance?.enabled
            ? t('developerToolsPage.metrics.targetedPages', { count: overview.maintenance?.paths?.length || 0 })
            : t('developerToolsPage.metrics.appOpen')}
        />
        <MetricCard
          label={t('developerToolsPage.metrics.demo')}
          value={overview.demo?.has_demo ? t('developerToolsPage.metrics.active') : t('developerToolsPage.metrics.inactive')}
          icon="fa-solid fa-flask"
          color="#2563eb"
          helper={t('developerToolsPage.metrics.demoInvoices', { count: formatCount(overview.demo?.count) })}
        />
        <MetricCard
          label={t('developerToolsPage.metrics.freshInstall')}
          value={t('developerToolsPage.metrics.purgeableRows', { count: formatCount(sumValues(overview.fresh_install?.delete)) })}
          icon="fa-solid fa-broom"
          color="#f97316"
          helper={t('developerToolsPage.metrics.keptRows', { count: formatCount(sumValues(overview.fresh_install?.keep)) })}
        />
        <MetricCard
          label={t('developerToolsPage.metrics.broadcast')}
          value={t('developerToolsPage.metrics.recipients', { count: formatCount(broadcastSummary.active_users) })}
          icon="fa-solid fa-bullhorn"
          color="#0f766e"
          helper={t('developerToolsPage.metrics.broadcastCompanies', { count: formatCount(broadcastSummary.active_companies) })}
        />
        <MetricCard
          label={t('developerToolsPage.metrics.support')}
          value={t('developerToolsPage.metrics.recipients', { count: formatCount(supportRecipientCount) })}
          icon="fa-solid fa-envelope-circle-check"
          color="#8b5cf6"
          helper={t('developerToolsPage.metrics.supportHint')}
        />
      </div>

      <OpsConsoleLaunchCard />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-6">
        <div className="space-y-6">
          <div id="broadcast-panel" className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.broadcast.title')}</h2>
                <p className="text-xs text-muted-color mt-1">
                  {t('developerToolsPage.broadcast.description')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/notifications-center" className="btn-secondary text-xs">
                  <i className="fa-solid fa-bell" /> {t('developerToolsPage.broadcast.openCenter')}
                </Link>
                <button
                  onClick={sendBroadcast}
                  disabled={!broadcastReady || sendingBroadcast || broadcastLoading}
                  className="btn-primary text-xs"
                >
                  {sendingBroadcast
                    ? <><i className="fa-solid fa-spinner fa-spin" /> {t('developerToolsPage.broadcast.sending')}</>
                    : <><i className="fa-solid fa-paper-plane" /> {t('developerToolsPage.broadcast.send')}</>}
                </button>
              </div>
            </div>

            {broadcastLoadError && (
              <div
                className="rounded-2xl px-4 py-4 text-sm mb-4"
                style={{ background: 'rgba(239,68,68,0.08)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)', color: '#b91c1c' }}
              >
                {broadcastLoadError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard
                label={t('developerToolsPage.broadcast.stats.users')}
                value={formatCount(broadcastCatalog.summary?.active_users ?? 0)}
                icon="fa-solid fa-user-group"
                color="#0d9488"
                helper={t('developerToolsPage.broadcast.stats.usersHint')}
              />
              <MetricCard
                label={t('developerToolsPage.broadcast.stats.companies')}
                value={formatCount(broadcastCatalog.summary?.active_companies ?? 0)}
                icon="fa-solid fa-building"
                color="#2563eb"
                helper={t('developerToolsPage.broadcast.stats.companiesHint')}
              />
              <MetricCard
                label={t('developerToolsPage.broadcast.stats.scope')}
                value={formatCount(estimatedRecipients)}
                icon="fa-solid fa-satellite-dish"
                color="#8b5cf6"
                helper={selectedTargetLabel}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-5 mt-5">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em]">
                  {t('developerToolsPage.broadcast.targetLabel')}
                </div>

                {[
                  {
                    value: 'user',
                    icon: 'fa-solid fa-user-large',
                    label: t('developerToolsPage.broadcast.targets.user.label'),
                    description: t('developerToolsPage.broadcast.targets.user.description'),
                  },
                  {
                    value: 'company',
                    icon: 'fa-solid fa-building',
                    label: t('developerToolsPage.broadcast.targets.company.label'),
                    description: t('developerToolsPage.broadcast.targets.company.description'),
                  },
                  {
                    value: 'all_users',
                    icon: 'fa-solid fa-globe',
                    label: t('developerToolsPage.broadcast.targets.allUsers.label'),
                    description: t('developerToolsPage.broadcast.targets.allUsers.description'),
                  },
                ].map((targetOption) => {
                  const selected = broadcastForm.target === targetOption.value

                  return (
                    <button
                      key={targetOption.value}
                      type="button"
                      onClick={() => setBroadcastForm((current) => ({ ...current, target: targetOption.value }))}
                      className="w-full rounded-3xl px-4 py-4 text-left transition-colors"
                      style={selected
                        ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
                        : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={selected
                            ? { background: 'rgba(13,148,136,0.14)', color: '#0f766e' }
                            : { background: '#ffffffc9', color: 'var(--secondary)' }}
                        >
                          <i className={targetOption.icon} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-base-color">{targetOption.label}</div>
                          <div className="text-xs text-secondary-color mt-1">{targetOption.description}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}

                <div className="rounded-3xl px-4 py-4 text-sm" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-color">{t('developerToolsPage.broadcast.recipientsLabel')}</div>
                  <div className="text-lg font-bold text-base-color mt-1">{t('developerToolsPage.broadcast.recipientsValue', { count: formatCount(estimatedRecipients) })}</div>
                  <div className="text-xs text-secondary-color mt-2">{selectedTargetLabel}</div>
                </div>
              </div>

              <div className="space-y-4">
                {broadcastForm.target === 'user' && (
                  <FormField label={t('developerToolsPage.broadcast.userLabel')}>
                    <select
                      value={broadcastForm.userId}
                      onChange={(event) => setBroadcastForm((current) => ({ ...current, userId: event.target.value }))}
                      disabled={broadcastLoading || broadcastUsers.length === 0}
                    >
                      {broadcastUsers.length === 0 && (
                        <option value="">{t('developerToolsPage.broadcast.targets.user.empty')}</option>
                      )}
                      {broadcastUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {[user.name, t(`badges.roles.${user.role}`), user.company_name || user.email].filter(Boolean).join(' · ')}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}

                {broadcastForm.target === 'company' && (
                  <FormField label={t('developerToolsPage.broadcast.companyLabel')}>
                    <select
                      value={broadcastForm.companyId}
                      onChange={(event) => setBroadcastForm((current) => ({ ...current, companyId: event.target.value }))}
                      disabled={broadcastLoading || broadcastCompanies.length === 0}
                    >
                      {broadcastCompanies.length === 0 && (
                        <option value="">{t('developerToolsPage.broadcast.targets.company.empty')}</option>
                      )}
                      {broadcastCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} · {t('developerToolsPage.broadcast.recipientsValue', { count: formatCount(company.active_users_count ?? 0) })}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}

                <FormField label={t('developerToolsPage.broadcast.titleLabel')} required>
                  <input
                    value={broadcastForm.title}
                    onChange={(event) => setBroadcastForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder={t('developerToolsPage.broadcast.titlePlaceholder')}
                    maxLength={120}
                  />
                </FormField>

                <FormField label={t('developerToolsPage.broadcast.messageLabel')} required>
                  <textarea
                    rows="5"
                    value={broadcastForm.message}
                    onChange={(event) => setBroadcastForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder={t('developerToolsPage.broadcast.messagePlaceholder')}
                    maxLength={500}
                  />
                </FormField>

                <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  {t('developerToolsPage.broadcast.serverHint')}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.maintenance.title')}</h2>
                <p className="text-xs text-muted-color mt-1">
                  {t('developerToolsPage.maintenance.description')}
                </p>
              </div>
              <button onClick={saveMaintenance} disabled={savingMaintenance} className="btn-primary text-xs">
                {savingMaintenance
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                  : <><i className="fa-solid fa-floppy-disk" /> {t('common.save')}</>}
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm font-medium text-base-color">
                <input
                  type="checkbox"
                  checked={maintenanceForm.enabled}
                  onChange={(event) => setMaintenanceForm((current) => ({ ...current, enabled: event.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                {t('developerToolsPage.maintenance.toggle')}
              </label>

              <FormField label={t('developerToolsPage.maintenance.messageLabel')}>
                <textarea
                  rows="3"
                  value={maintenanceForm.message}
                  onChange={(event) => setMaintenanceForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder={maintenanceDefaultMessage}
                />
              </FormField>

              <div>
                <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">{t('developerToolsPage.maintenance.quickPages')}</div>
                <div className="flex flex-wrap gap-2">
                  {maintenancePageOptions.map((option) => {
                    const selected = maintenancePaths.includes(option.path)

                    return (
                      <button
                        key={option.path}
                        type="button"
                        onClick={() => toggleSuggestedPath(option.path)}
                        className="text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                        style={selected
                          ? { background: 'rgba(13,148,136,0.12)', color: '#0f766e' }
                          : { background: 'var(--surface-2)', color: 'var(--secondary)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <FormField label={t('developerToolsPage.maintenance.pathsLabel')}>
                <textarea
                  rows="5"
                  value={maintenanceForm.pathsText}
                  onChange={(event) => setMaintenanceForm((current) => ({ ...current, pathsText: event.target.value }))}
                  placeholder={'/invoices\n/products\n/routes'}
                />
              </FormField>

              <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                {t('developerToolsPage.maintenance.hint')}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.demo.title')}</h2>
                <p className="text-xs text-muted-color mt-1">
                  {t('developerToolsPage.demo.description')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleDemo(true)}
                  disabled={togglingDemo}
                  className="btn-secondary text-xs"
                >
                  {togglingDemo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-flask" />}
                  {t('developerToolsPage.demo.activate')}
                </button>
                <button
                  onClick={() => toggleDemo(false)}
                  disabled={togglingDemo}
                  className="btn-danger text-xs"
                >
                  {togglingDemo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-eraser" />}
                  {t('developerToolsPage.demo.purge')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard label={t('developerToolsPage.demo.invoices')} value={formatCount(overview.demo?.count)} icon="fa-solid fa-file-invoice" color="#0d9488" />
              <MetricCard label={t('developerToolsPage.demo.customers')} value={formatCount(overview.demo?.customers)} icon="fa-solid fa-users" color="#2563eb" />
              <MetricCard label={t('developerToolsPage.demo.sessions')} value={formatCount(overview.demo?.sessions)} icon="fa-solid fa-route" color="#8b5cf6" />
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.freshInstall.title')}</h2>
                <p className="text-xs text-muted-color mt-1">
                  {t('developerToolsPage.freshInstall.description')}
                </p>
              </div>
              <button onClick={loadOverview} className="btn-secondary text-xs">
                <i className="fa-solid fa-rotate-right" /> {t('developerToolsPage.freshInstall.recalculate')}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <CountTable
                title={t('developerToolsPage.freshInstall.keepTitle')}
                description={t('developerToolsPage.freshInstall.keepDescription')}
                values={overview.fresh_install?.keep}
                totalLabel={t('common.total')}
                emptyLabel={t('developerToolsPage.freshInstall.emptyTable')}
              />
              <CountTable
                title={t('developerToolsPage.freshInstall.resetTitle')}
                description={t('developerToolsPage.freshInstall.resetDescription')}
                values={overview.fresh_install?.reset}
                totalLabel={t('common.total')}
                emptyLabel={t('developerToolsPage.freshInstall.emptyTable')}
              />
              <CountTable
                title={t('developerToolsPage.freshInstall.deleteTitle')}
                description={t('developerToolsPage.freshInstall.deleteDescription')}
                values={overview.fresh_install?.delete}
                tone="danger"
                totalLabel={t('common.total')}
                emptyLabel={t('developerToolsPage.freshInstall.emptyTable')}
              />
            </div>

            <div className="rounded-2xl px-4 py-4 mt-4" style={{ background: 'rgba(249,115,22,0.08)', boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.16)' }}>
              <div className="text-sm font-semibold" style={{ color: '#c2410c' }}>{t('developerToolsPage.freshInstall.confirmTitle')}</div>
              <div className="text-sm mt-2" style={{ color: '#9a3412' }}>
                {t('developerToolsPage.freshInstall.confirmDescription')}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 mt-4">
                <input
                  value={freshInstallConfirmation}
                  onChange={(event) => setFreshInstallConfirmation(event.target.value)}
                  placeholder="FRESH INSTALL"
                />
                <button
                  onClick={runFreshInstall}
                  disabled={runningFreshInstall}
                  className="btn-danger"
                >
                  {runningFreshInstall
                    ? <><i className="fa-solid fa-spinner fa-spin" /> {t('developerToolsPage.freshInstall.running')}</>
                    : <><i className="fa-solid fa-power-off" /> {t('developerToolsPage.freshInstall.run')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-envelope-open-text text-violet-500" />
              <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.support.title')}</h2>
            </div>

            <div className="text-sm text-secondary-color">
              {t('developerToolsPage.support.description')}
            </div>

            <div className="rounded-2xl px-4 py-4 text-sm mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              {t('developerToolsPage.support.serverManaged', { count: formatCount(supportRecipientCount) })}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Link to="/bug-reports" className="btn-secondary text-xs">
                <i className="fa-solid fa-bug" /> {t('developerToolsPage.support.open')}
              </Link>
              <Link to="/notifications-center" className="btn-secondary text-xs">
                <i className="fa-solid fa-bell" /> {t('layout.nav.notificationsCenter')}
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-terminal text-teal-500" />
              <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.system.title')}</h2>
            </div>

            <InfoRow label="Laravel" value={overview.system?.laravel} fallback={notAvailableLabel} />
            <InfoRow label="PHP" value={overview.system?.php} fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.environment')} value={overview.system?.env} fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.database')} value={overview.system?.db_ok ? t('developerToolsPage.system.databaseOk') : t('developerToolsPage.system.databaseCheck')} fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.databaseDriver')} value={overview.system?.db_driver} fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.queue')} value={overview.system?.queue} fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.cache')} value={overview.system?.cache} fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.frontend')} value={overview.system?.frontend_url || overview.system?.frontend_path} mono fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.appUrl')} value={overview.system?.app_url} mono fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.mailFrom')} value={overview.system?.mail_from} mono fallback={notAvailableLabel} />
            <InfoRow label={t('developerToolsPage.system.updatedAt')} value={formatDateTime(overview.system?.timestamp, notAvailableLabel)} fallback={notAvailableLabel} />
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-compass-drafting text-sky-500" />
              <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.shortcuts.title')}</h2>
            </div>

            <div className="space-y-2">
              <ShortcutLink to="/companies" icon="fa-solid fa-building" label={t('developerToolsPage.shortcuts.companyConsole')} />
              <ShortcutLink to="/developer" icon="fa-solid fa-compass-drafting" label={t('developerToolsPage.shortcuts.developerDashboard')} />
            </div>

            <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              {t('developerToolsPage.shortcuts.description')}
            </div>
          </div>
        </div>
      </div>

      <SystemTasksPanel
        snapshot={taskSnapshot}
        loading={taskLoading}
        error={taskLoadError}
        runningTaskKey={runningTaskKey}
        actionMessage={taskNotice}
        actionError={taskActionError}
        onRefresh={loadTasks}
        onRunTask={runBackgroundTask}
      />
    </div>
  )
}
