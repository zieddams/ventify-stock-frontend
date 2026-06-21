import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { SUPPORT_BUG_RECIPIENTS } from '../../config/supportRecipients'
import api from '../../services/api'
import SystemTasksPanel from '../config/SystemTasksPanel'

const EMPTY_OVERVIEW = {
  maintenance: {
    enabled: false,
    global: false,
    paths: [],
    message: 'Maintenance en cours. Revenez bientôt.',
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
  bug_recipients: SUPPORT_BUG_RECIPIENTS,
  system: {},
}

const EMPTY_TASK_SNAPSHOT = {
  generated_at: null,
  stats: {},
  tasks: [],
  recent_runs: [],
}

const MAINTENANCE_PAGE_OPTIONS = [
  { path: '/', label: 'Tableau de bord' },
  { path: '/invoices', label: 'Factures' },
  { path: '/customers', label: 'Clients' },
  { path: '/products', label: 'Produits' },
  { path: '/routes', label: 'Sessions terrain' },
  { path: '/depot', label: 'Dépôt' },
  { path: '/camions', label: 'Camions' },
  { path: '/map', label: 'Carte' },
  { path: '/inventory', label: 'Inventaire' },
  { path: '/reports', label: 'Rapports' },
  { path: '/data-tools', label: 'Imports / exports' },
  { path: '/config', label: 'Configuration' },
  { path: '/bug-reports', label: 'Support' },
]

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
  return new Intl.NumberFormat('fr-FR').format(Number(value ?? 0))
}

function sumValues(record) {
  return Object.values(record ?? {}).reduce((total, value) => total + Number(value ?? 0), 0)
}

function formatDateTime(value) {
  if (!value) {
    return 'Non disponible'
  }

  return new Date(value).toLocaleString('fr-FR')
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

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs text-muted-color">{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono text-xs text-secondary-color' : 'font-medium text-base-color'}`}>
        {value || '-'}
      </span>
    </div>
  )
}

function CountTable({ title, description, values, tone = 'neutral' }) {
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
          <div className="text-[11px] text-muted-color uppercase tracking-[0.18em]">Total</div>
          <div className="text-lg font-bold" style={{ color: colors.accent }}>{formatCount(sumValues(values))}</div>
        </div>
      </div>

      {entries.length === 0 ? (
          <div className="text-sm text-muted-color">Aucune table remontée.</div>
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

export default function DeveloperToolsIndex() {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [togglingDemo, setTogglingDemo] = useState(false)
  const [runningFreshInstall, setRunningFreshInstall] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    enabled: false,
    message: 'Maintenance en cours. Revenez bientôt.',
    pathsText: '',
  })
  const [freshInstallConfirmation, setFreshInstallConfirmation] = useState('')
  const [taskSnapshot, setTaskSnapshot] = useState(EMPTY_TASK_SNAPSHOT)
  const [taskLoading, setTaskLoading] = useState(true)
  const [taskLoadError, setTaskLoadError] = useState('')
  const [taskActionError, setTaskActionError] = useState('')
  const [runningTaskKey, setRunningTaskKey] = useState('')
  const [taskNotice, setTaskNotice] = useState('')

  const syncMaintenanceForm = useCallback((maintenance) => {
    setMaintenanceForm({
      enabled: Boolean(maintenance?.enabled),
      message: maintenance?.message || 'Maintenance en cours. Revenez bientôt.',
      pathsText: Array.isArray(maintenance?.paths) ? maintenance.paths.join('\n') : '',
    })
  }, [])

  const loadOverview = useCallback(async () => {
    try {
      const response = await api.get('/developer-tools')
      const payload = response.data ?? EMPTY_OVERVIEW
      setOverview(payload)
      syncMaintenanceForm(payload.maintenance)
      setLoadError('')
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Impossible de charger les outils développeur pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [syncMaintenanceForm])

  const loadTasks = useCallback(async () => {
    setTaskLoading(true)
    setTaskLoadError('')

    try {
      const response = await api.get('/system/tasks')
      setTaskSnapshot(response.data ?? EMPTY_TASK_SNAPSHOT)
    } catch (error) {
      setTaskLoadError(error.response?.data?.message || 'Impossible de charger les tâches serveur.')
    } finally {
      setTaskLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
    loadTasks()
  }, [loadOverview, loadTasks])

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
        ? (maintenancePaths.length > 0 ? 'Maintenance ciblée mise à jour.' : 'Maintenance globale activee.')
        : 'Maintenance désactivée.')
    } catch (error) {
      setActionError(error.response?.data?.message || 'Impossible de mettre à jour la maintenance.')
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
      setNotice(enabled ? 'Le mode démo a été activé.' : 'Les données démo ont été purgées.')
    } catch (error) {
      setActionError(error.response?.data?.message || 'Impossible de mettre à jour le mode démo.')
    } finally {
      setTogglingDemo(false)
    }
  }

  const runFreshInstall = async () => {
    if (freshInstallConfirmation.trim() !== 'FRESH INSTALL') {
      setActionError('Tapez exactement FRESH INSTALL pour confirmer la réinitialisation.')
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
      setNotice(`Fresh install exécuté. ${formatCount(deletedTotal)} enregistrement(s) opérationnels ont été purgés.`)
      await Promise.all([loadOverview(), loadTasks()])
    } catch (error) {
      setActionError(error.response?.data?.message || 'La réinitialisation fraîche a échoué.')
    } finally {
      setRunningFreshInstall(false)
    }
  }

  const runBackgroundTask = async (taskKey) => {
    setRunningTaskKey(taskKey)
    setTaskNotice('')
    setTaskActionError('')

    try {
      const response = await api.post(`/system/tasks/${taskKey}/run`)
      setTaskSnapshot(response.data?.snapshot ?? EMPTY_TASK_SNAPSHOT)
      setTaskNotice(response.data?.message || 'Tâche exécutée avec succès.')
    } catch (error) {
      setTaskActionError(error.response?.data?.message || 'La tâche a échoué.')

      if (error.response?.data?.snapshot) {
        setTaskSnapshot(error.response.data.snapshot)
      }
    } finally {
      setRunningTaskKey('')
    }
  }

  const refreshAll = async () => {
    setLoading(true)
    await Promise.all([loadOverview(), loadTasks()])
  }

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
          title="Outils développeur"
          subtitle="Console réservée au rôle développeur."
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
        title="Outils développeur"
        subtitle="Maintenance globale ou ciblée, mode démo, fresh install, bug center et diagnostic VPS réservés au rôle développeur."
        action={(
          <div className="flex flex-wrap gap-2">
            <Link to="/bug-reports" className="btn-secondary text-xs">
              <i className="fa-solid fa-bug" /> Support
            </Link>
            <button onClick={refreshAll} className="btn-primary text-xs">
              <i className="fa-solid fa-rotate-right" /> Actualiser
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Maintenance"
          value={overview.maintenance?.enabled
            ? (overview.maintenance?.global ? 'Globale active' : 'Ciblée active')
            : 'Inactive'}
          icon="fa-solid fa-screwdriver-wrench"
          color="#0d9488"
          helper={overview.maintenance?.enabled ? `${overview.maintenance?.paths?.length || 0} page(s) ciblée(s)` : 'Application ouverte'}
        />
        <MetricCard
          label="Mode démo"
          value={overview.demo?.has_demo ? 'Actif' : 'Inactif'}
          icon="fa-solid fa-flask"
          color="#2563eb"
          helper={`${formatCount(overview.demo?.count)} facture(s) démo`}
        />
        <MetricCard
          label="Fresh install"
          value={`${formatCount(sumValues(overview.fresh_install?.delete))} lignes purgeables`}
          icon="fa-solid fa-broom"
          color="#f97316"
          helper={`${formatCount(sumValues(overview.fresh_install?.keep))} lignes conservees`}
        />
        <MetricCard
          label="Support mail"
          value={`${overview.bug_recipients?.length || SUPPORT_BUG_RECIPIENTS.length} destinataire(s)`}
          icon="fa-solid fa-envelope-circle-check"
          color="#8b5cf6"
          helper="Liste figée côté application"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-6">
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">Maintenance applicative</h2>
                <p className="text-xs text-muted-color mt-1">
                  Activez une maintenance complète ou ciblez seulement certaines pages. Les développeurs gardent toujours l'accès.
                </p>
              </div>
              <button onClick={saveMaintenance} disabled={savingMaintenance} className="btn-primary text-xs">
                {savingMaintenance
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                  : <><i className="fa-solid fa-floppy-disk" /> Sauver</>}
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
                Activer le mode maintenance
              </label>

              <FormField label="Message affiche">
                <textarea
                  rows="3"
                  value={maintenanceForm.message}
                  onChange={(event) => setMaintenanceForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Maintenance en cours. Revenez bientôt."
                />
              </FormField>

              <div>
                <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">Pages rapides</div>
                <div className="flex flex-wrap gap-2">
                  {MAINTENANCE_PAGE_OPTIONS.map((option) => {
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

              <FormField label="Pages ciblées (une ligne = un chemin)">
                <textarea
                  rows="5"
                  value={maintenanceForm.pathsText}
                  onChange={(event) => setMaintenanceForm((current) => ({ ...current, pathsText: event.target.value }))}
                  placeholder={'/invoices\n/products\n/routes'}
                />
              </FormField>

              <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                Laissez la liste vide pour une maintenance globale. Quand une ou plusieurs pages sont renseignées,
                seule cette sélection est bloquée pour les profils non développeurs.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">Mode démo</h2>
                <p className="text-xs text-muted-color mt-1">
                  Seed démo pour une instance de présentation ou purge rapide des données de démonstration.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleDemo(true)}
                  disabled={togglingDemo}
                  className="btn-secondary text-xs"
                >
                  {togglingDemo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-flask" />}
                  Activer
                </button>
                <button
                  onClick={() => toggleDemo(false)}
                  disabled={togglingDemo}
                  className="btn-danger text-xs"
                >
                  {togglingDemo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-eraser" />}
                  Purger
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard label="Factures démo" value={formatCount(overview.demo?.count)} icon="fa-solid fa-file-invoice" color="#0d9488" />
              <MetricCard label="Clients démo" value={formatCount(overview.demo?.customers)} icon="fa-solid fa-users" color="#2563eb" />
              <MetricCard label="Sessions démo" value={formatCount(overview.demo?.sessions)} icon="fa-solid fa-route" color="#8b5cf6" />
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">Fresh install sécurisé</h2>
                <p className="text-xs text-muted-color mt-1">
                  Réinitialise l'opérationnel, recrée un dépôt principal propre et deux camions El Irtiwaa,
                  tout en conservant les bases métier : utilisateurs, produits, zones et configuration.
                </p>
              </div>
              <button onClick={loadOverview} className="btn-secondary text-xs">
                <i className="fa-solid fa-rotate-right" /> Recalculer
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <CountTable
                title="Données conservées"
                description="Base métier conservée après la remise à zéro."
                values={overview.fresh_install?.keep}
              />
              <CountTable
                title="Éléments recréés"
                description="Dépôts et flotte régénérés pour repartir sur une base propre."
                values={overview.fresh_install?.reset}
              />
              <CountTable
                title="Données supprimées"
                description="Opérationnel, mouvements, sessions, tickets, notifications et historique."
                values={overview.fresh_install?.delete}
                tone="danger"
              />
            </div>

            <div className="rounded-2xl px-4 py-4 mt-4" style={{ background: 'rgba(249,115,22,0.08)', boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.16)' }}>
              <div className="text-sm font-semibold" style={{ color: '#c2410c' }}>Confirmation stricte requise</div>
              <div className="text-sm mt-2" style={{ color: '#9a3412' }}>
                Tapez exactement <span className="font-mono font-semibold">FRESH INSTALL</span> avant d'exécuter la purge.
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
                    ? <><i className="fa-solid fa-spinner fa-spin" /> Exécution...</>
                    : <><i className="fa-solid fa-power-off" /> Lancer le fresh install</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-envelope-open-text text-violet-500" />
              <h2 className="text-sm font-semibold text-base-color">Destinataires support figés</h2>
            </div>

            <div className="space-y-2">
              {(overview.bug_recipients?.length ? overview.bug_recipients : SUPPORT_BUG_RECIPIENTS).map((email) => (
                <div
                  key={email}
                  className="rounded-2xl px-3 py-3 text-sm font-medium text-base-color"
                  style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                >
                  {email}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Link to="/bug-reports" className="btn-secondary text-xs">
                <i className="fa-solid fa-bug" /> Ouvrir le support
              </Link>
              <Link to="/notifications-center" className="btn-secondary text-xs">
                <i className="fa-solid fa-bell" /> Notifications
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-terminal text-teal-500" />
              <h2 className="text-sm font-semibold text-base-color">Snapshot système</h2>
            </div>

            <InfoRow label="Laravel" value={overview.system?.laravel} />
            <InfoRow label="PHP" value={overview.system?.php} />
            <InfoRow label="Environnement" value={overview.system?.env} />
            <InfoRow label="Base" value={overview.system?.db_ok ? 'Connexion OK' : 'À vérifier'} />
            <InfoRow label="Driver DB" value={overview.system?.db_driver} />
            <InfoRow label="Queue" value={overview.system?.queue} />
            <InfoRow label="Cache" value={overview.system?.cache} />
            <InfoRow label="Frontend" value={overview.system?.frontend_url || overview.system?.frontend_path} mono />
            <InfoRow label="App URL" value={overview.system?.app_url} mono />
            <InfoRow label="Mail from" value={overview.system?.mail_from} mono />
            <InfoRow label="Mis à jour" value={formatDateTime(overview.system?.timestamp)} />
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-compass-drafting text-sky-500" />
              <h2 className="text-sm font-semibold text-base-color">Raccourcis développeur</h2>
            </div>

            <div className="space-y-2">
              <Link to="/config/system-support" className="btn-secondary text-xs w-full justify-center">
                <i className="fa-solid fa-sliders" /> Configuration support
              </Link>
              <Link to="/help" className="btn-secondary text-xs w-full justify-center">
                <i className="fa-solid fa-book-open" /> Documentation
              </Link>
              <Link to="/map" className="btn-secondary text-xs w-full justify-center">
                <i className="fa-solid fa-map-location-dot" /> Carte terrain
              </Link>
            </div>

            <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              Cette console centralise les actions sensibles du cycle de vie environnement: maintenance, reset
              opérationnel, mode démo, vérification serveur et suivi des tickets.
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
