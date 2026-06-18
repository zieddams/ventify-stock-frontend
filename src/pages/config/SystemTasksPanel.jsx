import { useEffect, useMemo, useState } from 'react'
import { PageLoader } from '../../components/Spinner'

const STATUS_META = {
  running: {
    label: 'En cours',
    color: '#2563eb',
    background: 'rgba(37,99,235,0.12)',
    icon: 'fa-solid fa-spinner fa-spin',
  },
  success: {
    label: 'Succes',
    color: '#059669',
    background: 'rgba(5,150,105,0.12)',
    icon: 'fa-solid fa-circle-check',
  },
  failed: {
    label: 'Echec',
    color: '#dc2626',
    background: 'rgba(220,38,38,0.12)',
    icon: 'fa-solid fa-circle-xmark',
  },
  idle: {
    label: 'En attente',
    color: '#64748b',
    background: 'rgba(100,116,139,0.12)',
    icon: 'fa-solid fa-clock',
  },
}

const CATEGORY_LABELS = {
  maintenance: 'Maintenance',
  monitoring: 'Monitoring',
  finance: 'Finance',
  notifications: 'Notifications',
}

function formatDateTime(value) {
  if (!value) return 'Jamais'
  return new Date(value).toLocaleString('fr-FR')
}

function formatDuration(durationMs) {
  if (durationMs == null) return '--'
  if (durationMs < 1000) return `${durationMs} ms`
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)} s`
  return `${(durationMs / 60000).toFixed(1)} min`
}

function formatNextDue(value) {
  if (!value) return 'Non disponible'

  const diffMs = new Date(value).getTime() - Date.now()
  if (diffMs <= 0) return `${formatDateTime(value)} · imminent`

  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 60) return `${formatDateTime(value)} · dans ${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${formatDateTime(value)} · dans ${diffHours} h`

  const diffDays = Math.round(diffHours / 24)
  return `${formatDateTime(value)} · dans ${diffDays} j`
}

function formatTrigger(run) {
  if (!run) return 'Aucun declenchement'
  if (run.trigger_type === 'manual') {
    return run.triggered_by?.name ? `Manuel par ${run.triggered_by.name}` : 'Manuel'
  }
  return 'Planifie'
}

function statusMeta(run) {
  if (!run?.status) return STATUS_META.idle
  return STATUS_META[run.status] ?? STATUS_META.idle
}

function compareTasks(left, right, sortKey, sortDirection) {
  const leftValue = sortKey === 'latest_run'
    ? new Date(left?.latest_run?.started_at ?? 0).getTime()
    : String(left?.[sortKey] ?? left?.latest_run?.status ?? '').toLowerCase()
  const rightValue = sortKey === 'latest_run'
    ? new Date(right?.latest_run?.started_at ?? 0).getTime()
    : String(right?.[sortKey] ?? right?.latest_run?.status ?? '').toLowerCase()

  if (leftValue === rightValue) {
    return 0
  }

  const result = leftValue > rightValue ? 1 : -1
  return sortDirection === 'asc' ? result : -result
}

function MetricCard({ label, value, icon, color, sub }) {
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          <i className={icon} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-color">{label}</div>
          <div className="text-sm font-bold text-base-color">{value}</div>
          {sub && <div className="text-[11px] text-secondary-color mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function TaskRunBadge({ run }) {
  const meta = statusMeta(run)

  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: meta.background, color: meta.color }}
    >
      <i className={meta.icon} />
      {meta.label}
    </span>
  )
}

function TaskRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs text-muted-color">{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono text-secondary-color' : 'font-medium text-base-color'}`}>{value}</span>
    </div>
  )
}

export default function SystemTasksPanel({
  snapshot,
  loading,
  error,
  runningTaskKey,
  actionMessage,
  actionError,
  onRefresh,
  onRunTask,
}) {
  const stats = snapshot?.stats ?? {}
  const tasks = snapshot?.tasks ?? []
  const recentRuns = snapshot?.recent_runs ?? []
  const historyStartedAt = snapshot?.history_started_at
  const [selectedTaskKey, setSelectedTaskKey] = useState('')
  const [sortKey, setSortKey] = useState('latest_run')
  const [sortDirection, setSortDirection] = useState('desc')

  const sortedTasks = useMemo(() => (
    [...tasks].sort((left, right) => compareTasks(left, right, sortKey, sortDirection))
  ), [sortDirection, sortKey, tasks])

  const selectedTask = sortedTasks.find((task) => task.key === selectedTaskKey) ?? sortedTasks[0] ?? null

  useEffect(() => {
    if (!selectedTaskKey && sortedTasks[0]?.key) {
      setSelectedTaskKey(sortedTasks[0].key)
      return
    }

    if (selectedTaskKey && !sortedTasks.some((task) => task.key === selectedTaskKey)) {
      setSelectedTaskKey(sortedTasks[0]?.key ?? '')
    }
  }, [selectedTaskKey, sortedTasks])

  const toggleSort = (nextKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === 'latest_run' ? 'desc' : 'asc')
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-base-color">Taches de fond & scheduler</h2>
            <p className="text-xs text-muted-color mt-1">
              Liste des taches planifiees cote serveur, dernier etat d execution et relance manuelle pour les admins
              et developpeurs. Les relances s executent directement sur le VPS et attendent la fin avant de repondre.
            </p>
            {historyStartedAt && (
              <p className="text-[11px] text-secondary-color mt-2">
                Historique de suivi disponible depuis {formatDateTime(historyStartedAt)}. Si une tache est marquee
                "En attente", cela veut surtout dire qu elle n a pas encore eu de passage enregistre depuis cette date.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onRefresh} className="btn-secondary text-xs">
              <i className="fa-solid fa-rotate-right" /> Actualiser
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard label="Taches suivies" value={stats.tasks_total ?? tasks.length} icon="fa-solid fa-list-check" color="#0d9488" />
          <MetricCard label="Relance manuelle" value={stats.manual_enabled ?? 0} icon="fa-solid fa-hand-pointer" color="#2563eb" />
          <MetricCard label="Dernier echec" value={stats.failed ?? 0} icon="fa-solid fa-triangle-exclamation" color="#dc2626" />
          <MetricCard
            label="Sans historique"
            value={stats.never_run ?? 0}
            icon="fa-solid fa-clock-rotate-left"
            color="#64748b"
            sub={snapshot?.generated_at ? `MAJ ${formatDateTime(snapshot.generated_at)}` : null}
          />
        </div>

        {(actionMessage || actionError) && (
          <div
            className="rounded-2xl px-4 py-3 mt-4 text-sm"
            style={actionError
              ? { background: 'rgba(220,38,38,0.08)', boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.18)', color: '#991b1b' }
              : { background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)', color: '#0f766e' }}
          >
            {actionError || actionMessage}
          </div>
        )}
      </div>

      {loading ? (
        <div className="card py-12">
          <PageLoader />
        </div>
      ) : error ? (
        <div className="card">
          <div className="rounded-2xl px-4 py-6 text-sm" style={{ background: 'rgba(220,38,38,0.08)', boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.18)', color: '#991b1b' }}>
            {error}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-4">
            <div className="card">
              {sortedTasks.length === 0 ? (
                <div className="rounded-2xl px-4 py-8 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  Aucune tache suivie pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {[
                          ['label', 'Tache'],
                          ['category', 'Categorie'],
                          ['status', 'Statut'],
                          ['schedule_label', 'Planification'],
                          ['latest_run', 'Dernier debut'],
                        ].map(([key, label]) => (
                          <th key={key} className="pb-3 pr-4 text-left text-xs font-semibold text-muted-color uppercase tracking-wider">
                            <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-base-color">
                              <span>{label}</span>
                              {sortKey === key && <i className={`fa-solid ${sortDirection === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`} />}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTasks.map((task) => {
                        const latestRun = task.latest_run
                        const meta = statusMeta(latestRun)

                        return (
                          <tr
                            key={task.key}
                            className="table-row cursor-pointer"
                            onClick={() => setSelectedTaskKey(task.key)}
                            style={selectedTask?.key === task.key ? { background: 'rgba(13,148,136,0.05)' } : undefined}
                          >
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-base-color">{task.label}</div>
                              <div className="text-[11px] text-muted-color font-mono mt-1">{task.key}</div>
                            </td>
                            <td className="py-3 pr-4 text-secondary-color text-xs">{CATEGORY_LABELS[task.category] || task.category || 'Systeme'}</td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: meta.color }}>
                                <i className={meta.icon} />
                                <span>{meta.label}</span>
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-secondary-color text-xs">{task.schedule_label || 'Non planifie'}</td>
                            <td className="py-3 text-secondary-color text-xs">{formatDateTime(latestRun?.started_at)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              {selectedTask ? (() => {
                const latestRun = selectedTask.latest_run
                const runMeta = statusMeta(latestRun)

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-base-color">{selectedTask.label}</div>
                          <div className="text-xs text-secondary-color mt-1">{selectedTask.description}</div>
                        </div>
                        <TaskRunBadge run={latestRun} />
                      </div>
                      <button
                        onClick={() => onRunTask(selectedTask.key)}
                        disabled={!selectedTask.manual_allowed || runningTaskKey === selectedTask.key}
                        className="btn-primary text-xs self-start"
                      >
                        {runningTaskKey === selectedTask.key
                          ? <><i className="fa-solid fa-spinner fa-spin" /> Execution...</>
                          : <><i className="fa-solid fa-play" /> Lancer maintenant</>
                        }
                      </button>
                    </div>

                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <TaskRow label="Planification" value={selectedTask.schedule_label || 'Non planifie'} />
                      <TaskRow label="Prochaine execution" value={formatNextDue(selectedTask.next_due_at)} />
                      <TaskRow label="Dernier declenchement" value={formatTrigger(latestRun)} />
                      <TaskRow label="Dernier debut" value={formatDateTime(latestRun?.started_at)} />
                      <TaskRow label="Derniere fin" value={formatDateTime(latestRun?.finished_at)} />
                      <TaskRow label="Duree" value={formatDuration(latestRun?.duration_ms)} />
                      <TaskRow label="Code retour" value={latestRun?.exit_code ?? '--'} />
                    </div>

                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <TaskRow label="Commande" value={selectedTask.command_signature || 'Routine interne'} mono />
                      <TaskRow label="Cle technique" value={selectedTask.key} mono />
                      <TaskRow label="Statut courant" value={runMeta.label} />
                      <TaskRow label="Autorise en manuel" value={selectedTask.manual_allowed ? 'Oui' : 'Non'} />
                      <TaskRow label="Historique dispo" value={latestRun ? 'Oui' : 'En attente du premier passage'} />
                      <TaskRow label="Rafraichi a" value={formatDateTime(snapshot?.generated_at)} />
                    </div>

                    {(latestRun?.output_excerpt || latestRun?.error_message) && (
                      <div className="space-y-3">
                        {latestRun?.output_excerpt && (
                          <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                            <div className="text-xs font-semibold text-base-color mb-2">Sortie recente</div>
                            <pre className="text-xs text-secondary-color whitespace-pre-wrap font-mono">{latestRun.output_excerpt}</pre>
                          </div>
                        )}

                        {latestRun?.error_message && (
                          <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(220,38,38,0.08)', boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.18)' }}>
                            <div className="text-xs font-semibold mb-2" style={{ color: '#991b1b' }}>Erreur recente</div>
                            <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: '#991b1b' }}>{latestRun.error_message}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })() : (
                <div className="rounded-2xl px-4 py-8 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  Selectionnez une tache pour voir son detail.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-base-color">Historique recent</h3>
                <p className="text-xs text-muted-color mt-1">Dernieres executions planifiees ou manuelles.</p>
              </div>
            </div>

            {recentRuns.length === 0 ? (
              <div className="rounded-2xl px-4 py-8 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                Aucune execution enregistree pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Tache', 'Statut', 'Declenchement', 'Debut', 'Duree', 'Code retour'].map((header) => (
                        <th key={header} className="pb-3 pr-4 text-left text-xs font-semibold text-muted-color uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run) => {
                      const runMeta = statusMeta(run)

                      return (
                        <tr key={run.id} className="table-row">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-base-color">{run.task_name}</div>
                            <div className="text-[11px] text-muted-color font-mono mt-0.5">{run.task_key}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold">
                              <i className={runMeta.icon} style={{ color: runMeta.color }} />
                              <span style={{ color: runMeta.color }}>{runMeta.label}</span>
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{formatTrigger(run)}</td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{formatDateTime(run.started_at)}</td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{formatDuration(run.duration_ms)}</td>
                          <td className="py-3 text-secondary-color text-xs">{run.exit_code ?? '--'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
