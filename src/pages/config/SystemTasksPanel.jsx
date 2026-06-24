import { useEffect, useMemo, useState } from 'react'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { formatDateTime as formatLocaleDateTime } from '../../utils/format'

const STATUS_META = {
  running: {
    labelKey: 'systemTasks.status.running',
    color: '#2563eb',
    background: 'rgba(37,99,235,0.12)',
    icon: 'fa-solid fa-spinner fa-spin',
  },
  success: {
    labelKey: 'systemTasks.status.success',
    color: '#059669',
    background: 'rgba(5,150,105,0.12)',
    icon: 'fa-solid fa-circle-check',
  },
  failed: {
    labelKey: 'systemTasks.status.failed',
    color: '#dc2626',
    background: 'rgba(220,38,38,0.12)',
    icon: 'fa-solid fa-circle-xmark',
  },
  idle: {
    labelKey: 'systemTasks.status.idle',
    color: '#64748b',
    background: 'rgba(100,116,139,0.12)',
    icon: 'fa-solid fa-clock',
  },
}

const CATEGORY_KEYS = {
  maintenance: 'systemTasks.categories.maintenance',
  monitoring: 'systemTasks.categories.monitoring',
  finance: 'systemTasks.categories.finance',
  notifications: 'systemTasks.categories.notifications',
}

function formatDateTimeValue(value, t) {
  return value ? formatLocaleDateTime(value) : t('systemTasks.never')
}

function formatDuration(durationMs, t) {
  if (durationMs == null) return t('common.notAvailable')
  if (durationMs < 1000) return t('systemTasks.duration.ms', { value: durationMs })
  if (durationMs < 60000) return t('systemTasks.duration.seconds', { value: (durationMs / 1000).toFixed(1) })
  return t('systemTasks.duration.minutes', { value: (durationMs / 60000).toFixed(1) })
}

function formatNextDue(value, t) {
  if (!value) return t('systemTasks.nextDue.unavailable')

  const formattedDate = formatLocaleDateTime(value)
  const diffMs = new Date(value).getTime() - Date.now()

  if (diffMs <= 0) {
    return t('systemTasks.nextDue.imminent', { date: formattedDate })
  }

  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 60) {
    return t('systemTasks.nextDue.inMinutes', { date: formattedDate, value: diffMinutes })
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return t('systemTasks.nextDue.inHours', { date: formattedDate, value: diffHours })
  }

  const diffDays = Math.round(diffHours / 24)
  return t('systemTasks.nextDue.inDays', { date: formattedDate, value: diffDays })
}

function formatTrigger(run, t) {
  if (!run) return t('systemTasks.trigger.none')

  if (run.trigger_type === 'manual') {
    return run.triggered_by?.name
      ? t('systemTasks.trigger.manualBy', { name: run.triggered_by.name })
      : t('systemTasks.trigger.manual')
  }

  return t('systemTasks.trigger.scheduled')
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

function TaskRunBadge({ run, t }) {
  const meta = statusMeta(run)

  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: meta.background, color: meta.color }}
    >
      <i className={meta.icon} />
      {t(meta.labelKey)}
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
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const stats = snapshot?.stats ?? {}
  const tasks = snapshot?.tasks ?? []
  const recentRuns = snapshot?.recent_runs ?? []
  const historyStartedAt = snapshot?.history_started_at
  const [selectedTaskKey, setSelectedTaskKey] = useState('')
  const [sortKey, setSortKey] = useState('latest_run')
  const [sortDirection, setSortDirection] = useState('desc')

  const sortableHeaders = useMemo(() => ([
    ['label', t('systemTasks.table.task')],
    ['category', t('systemTasks.table.category')],
    ['status', t('systemTasks.table.status')],
    ['schedule_label', t('systemTasks.table.schedule')],
    ['latest_run', t('systemTasks.table.lastStart')],
  ]), [t])

  const recentHeaders = useMemo(() => ([
    t('systemTasks.table.task'),
    t('systemTasks.table.status'),
    t('systemTasks.table.trigger'),
    t('systemTasks.table.start'),
    t('systemTasks.table.duration'),
    t('systemTasks.table.exitCode'),
  ]), [t])

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

  const getCategoryLabel = (category) => t(CATEGORY_KEYS[category] ?? 'systemTasks.categories.system')

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-base-color">{t('systemTasks.title')}</h2>
            <p className="text-xs text-muted-color mt-1">{t('systemTasks.subtitle')}</p>
            {historyStartedAt && (
              <p className="text-[11px] text-secondary-color mt-2">
                {t('systemTasks.historySince', { date: formatDateTimeValue(historyStartedAt, t) })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onRefresh} className="btn-secondary text-xs">
              <i className="fa-solid fa-rotate-right" /> {t('systemTasks.refresh')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard label={t('systemTasks.metrics.trackedTasks')} value={stats.tasks_total ?? tasks.length} icon="fa-solid fa-list-check" color="#0d9488" />
          <MetricCard label={t('systemTasks.metrics.manualLaunch')} value={stats.manual_enabled ?? 0} icon="fa-solid fa-hand-pointer" color="#2563eb" />
          <MetricCard label={t('systemTasks.metrics.lastFailure')} value={stats.failed ?? 0} icon="fa-solid fa-triangle-exclamation" color="#dc2626" />
          <MetricCard
            label={t('systemTasks.metrics.noHistory')}
            value={stats.never_run ?? 0}
            icon="fa-solid fa-clock-rotate-left"
            color="#64748b"
            sub={snapshot?.generated_at ? t('systemTasks.metrics.updatedAt', { date: formatDateTimeValue(snapshot.generated_at, t) }) : null}
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
                  {t('systemTasks.empty.noTasks')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {sortableHeaders.map(([key, label]) => (
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
                            <td className="py-3 pr-4 text-secondary-color text-xs">{getCategoryLabel(task.category)}</td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: meta.color }}>
                                <i className={meta.icon} />
                                <span>{t(meta.labelKey)}</span>
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-secondary-color text-xs">{task.schedule_label || t('systemTasks.unscheduled')}</td>
                            <td className="py-3 text-secondary-color text-xs">{formatDateTimeValue(latestRun?.started_at, t)}</td>
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
                        <TaskRunBadge run={latestRun} t={t} />
                      </div>
                      <button
                        onClick={() => onRunTask(selectedTask.key)}
                        disabled={!selectedTask.manual_allowed || runningTaskKey === selectedTask.key}
                        className="btn-primary text-xs self-start"
                      >
                        {runningTaskKey === selectedTask.key
                          ? <><i className="fa-solid fa-spinner fa-spin" /> {t('systemTasks.actions.runningNow')}</>
                          : <><i className="fa-solid fa-play" /> {t('systemTasks.actions.runNow')}</>
                        }
                      </button>
                    </div>

                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <TaskRow label={t('systemTasks.detail.schedule')} value={selectedTask.schedule_label || t('systemTasks.unscheduled')} />
                      <TaskRow label={t('systemTasks.detail.nextRun')} value={formatNextDue(selectedTask.next_due_at, t)} />
                      <TaskRow label={t('systemTasks.detail.lastTrigger')} value={formatTrigger(latestRun, t)} />
                      <TaskRow label={t('systemTasks.detail.lastStart')} value={formatDateTimeValue(latestRun?.started_at, t)} />
                      <TaskRow label={t('systemTasks.detail.lastFinish')} value={formatDateTimeValue(latestRun?.finished_at, t)} />
                      <TaskRow label={t('systemTasks.detail.duration')} value={formatDuration(latestRun?.duration_ms, t)} />
                      <TaskRow label={t('systemTasks.detail.exitCode')} value={latestRun?.exit_code ?? notAvailable} />
                    </div>

                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <TaskRow label={t('systemTasks.detail.command')} value={selectedTask.command_signature || t('systemTasks.detail.internalRoutine')} mono />
                      <TaskRow label={t('systemTasks.detail.technicalKey')} value={selectedTask.key} mono />
                      <TaskRow label={t('systemTasks.detail.currentStatus')} value={t(runMeta.labelKey)} />
                      <TaskRow label={t('systemTasks.detail.manualAllowed')} value={selectedTask.manual_allowed ? t('systemTasks.yes') : t('systemTasks.no')} />
                      <TaskRow label={t('systemTasks.detail.historyAvailable')} value={latestRun ? t('systemTasks.yes') : t('systemTasks.detail.historyPending')} />
                      <TaskRow label={t('systemTasks.detail.refreshedAt')} value={formatDateTimeValue(snapshot?.generated_at, t)} />
                    </div>

                    {(latestRun?.output_excerpt || latestRun?.error_message) && (
                      <div className="space-y-3">
                        {latestRun?.output_excerpt && (
                          <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                            <div className="text-xs font-semibold text-base-color mb-2">{t('systemTasks.output.recent')}</div>
                            <pre className="text-xs text-secondary-color whitespace-pre-wrap font-mono">{latestRun.output_excerpt}</pre>
                          </div>
                        )}

                        {latestRun?.error_message && (
                          <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(220,38,38,0.08)', boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.18)' }}>
                            <div className="text-xs font-semibold mb-2" style={{ color: '#991b1b' }}>{t('systemTasks.output.error')}</div>
                            <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: '#991b1b' }}>{latestRun.error_message}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })() : (
                <div className="rounded-2xl px-4 py-8 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  {t('systemTasks.empty.noSelection')}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-base-color">{t('systemTasks.recentHistory.title')}</h3>
                <p className="text-xs text-muted-color mt-1">{t('systemTasks.recentHistory.subtitle')}</p>
              </div>
            </div>

            {recentRuns.length === 0 ? (
              <div className="rounded-2xl px-4 py-8 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                {t('systemTasks.empty.noRecentRuns')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {recentHeaders.map((header) => (
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
                              <span style={{ color: runMeta.color }}>{t(runMeta.labelKey)}</span>
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{formatTrigger(run, t)}</td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{formatDateTimeValue(run.started_at, t)}</td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{formatDuration(run.duration_ms, t)}</td>
                          <td className="py-3 text-secondary-color text-xs">{run.exit_code ?? notAvailable}</td>
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
