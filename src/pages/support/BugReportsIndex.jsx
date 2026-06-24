import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatDateTime } from '../../utils/format'

const ISSUE_AREAS = [
  { value: 'dashboard', labelKey: 'bugReports.areas.dashboard' },
  { value: 'customers', labelKey: 'bugReports.areas.customers' },
  { value: 'products', labelKey: 'bugReports.areas.products' },
  { value: 'invoices', labelKey: 'bugReports.areas.invoices' },
  { value: 'payments', labelKey: 'bugReports.areas.payments' },
  { value: 'map', labelKey: 'bugReports.areas.map' },
  { value: 'camions', labelKey: 'bugReports.areas.camions' },
  { value: 'routes', labelKey: 'bugReports.areas.routes' },
  { value: 'inventory', labelKey: 'bugReports.areas.inventory' },
  { value: 'config', labelKey: 'bugReports.areas.config' },
  { value: 'notifications', labelKey: 'bugReports.areas.notifications' },
  { value: 'mobile-sync', labelKey: 'bugReports.areas.mobileSync' },
  { value: 'other', labelKey: 'bugReports.areas.other' },
]

const STATUS_META = {
  open: { labelKey: 'bugReports.status.open', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  in_progress: { labelKey: 'bugReports.status.inProgress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  resolved: { labelKey: 'bugReports.status.resolved', color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
  closed: { labelKey: 'bugReports.status.closed', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

const SEVERITY_META = {
  low: { labelKey: 'bugReports.severity.low', color: '#64748b' },
  medium: { labelKey: 'bugReports.severity.medium', color: '#3b82f6' },
  high: { labelKey: 'bugReports.severity.high', color: '#f59e0b' },
  critical: { labelKey: 'bugReports.severity.critical', color: '#ef4444' },
}

function emptyForm(currentPath) {
  return {
    subject: '',
    area: 'other',
    severity: 'medium',
    page_url: currentPath,
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    description: '',
  }
}

function compareReports(a, b, sortKey, sortDirection) {
  const left = sortKey === 'created_at'
    ? new Date(a?.created_at ?? 0).getTime()
    : String(a?.[sortKey] ?? a?.reporter?.name ?? '').toLowerCase()
  const right = sortKey === 'created_at'
    ? new Date(b?.created_at ?? 0).getTime()
    : String(b?.[sortKey] ?? b?.reporter?.name ?? '').toLowerCase()

  if (left === right) {
    return 0
  }

  const result = left > right ? 1 : -1
  return sortDirection === 'asc' ? result : -result
}

export default function BugReportsIndex() {
  const { user } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const isPrivileged = ['admin', 'developer'].includes(user?.role)

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitFeedback, setSubmitFeedback] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [form, setForm] = useState(() => emptyForm(window.location.href))
  const [selectedId, setSelectedId] = useState(null)
  const [review, setReview] = useState({
    status: 'open',
    developer_reply: '',
    internal_notes: '',
  })

  const areaOptions = useMemo(
    () => ISSUE_AREAS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  )

  const statusOptions = useMemo(
    () => Object.entries(STATUS_META).map(([key, meta]) => ({ key, ...meta, label: t(meta.labelKey) })),
    [t],
  )

  const severityOptions = useMemo(
    () => Object.entries(SEVERITY_META).map(([key, meta]) => ({ key, ...meta, label: t(meta.labelKey) })),
    [t],
  )

  const tableHeaders = useMemo(() => ([
    ['subject', t('bugReports.table.subject')],
    ['area', t('bugReports.table.area')],
    ['reporter', t('bugReports.table.reporter')],
    ['status', t('bugReports.table.status')],
    ['severity', t('bugReports.table.severity')],
    ['created_at', t('bugReports.table.createdAt')],
  ]), [t])

  const areaLabel = useCallback((value) => (
    areaOptions.find((item) => item.value === value)?.label ?? value
  ), [areaOptions])

  const loadReports = useCallback(async () => {
    setLoading(true)

    try {
      const response = await api.get('/bug-reports', {
        params: statusFilter ? { status: statusFilter } : {},
      })

      const nextReports = response.data ?? []
      setReports(nextReports)

      if (nextReports.length > 0) {
        setSelectedId((current) => current ?? nextReports[0].id)
      } else {
        setSelectedId(null)
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  useEffect(() => {
    setForm((current) => ({
      ...current,
      page_url: window.location.origin + location.pathname,
    }))
  }, [location.pathname])

  const sortedReports = useMemo(() => (
    [...reports].sort((left, right) => compareReports(left, right, sortKey, sortDirection))
  ), [reports, sortDirection, sortKey])

  const selectedReport = useMemo(
    () => sortedReports.find((report) => report.id === selectedId) ?? sortedReports[0] ?? null,
    [selectedId, sortedReports],
  )

  useEffect(() => {
    if (!selectedReport) {
      return
    }

    setReview({
      status: selectedReport.status ?? 'open',
      developer_reply: selectedReport.developer_reply ?? '',
      internal_notes: selectedReport.internal_notes ?? '',
    })
  }, [selectedReport])

  const submitReport = async () => {
    setSaving(true)
    setErrors({})
    setSubmitFeedback(null)

    try {
      await api.post('/bug-reports', {
        ...form,
        metadata: {
          locale: typeof navigator !== 'undefined' ? navigator.language : '',
          path: location.pathname,
        },
      })

      setForm(emptyForm(window.location.origin + location.pathname))
      setComposeOpen(false)
      setSubmitFeedback({
        tone: 'success',
        message: t('bugReports.feedback.created'),
      })
      await loadReports()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
      setSubmitFeedback({
        tone: 'danger',
        message: error.response?.data?.message || t('bugReports.feedback.failed'),
      })
    } finally {
      setSaving(false)
    }
  }

  const saveReview = async () => {
    if (!selectedReport) {
      return
    }

    setReviewSaving(true)

    try {
      const response = await api.patch(`/bug-reports/${selectedReport.id}`, review)
      const updated = response.data
      setReports((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } finally {
      setReviewSaving(false)
    }
  }

  const toggleSort = (nextKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === 'created_at' ? 'desc' : 'asc')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('bugReports.title')}
        subtitle={isPrivileged ? t('bugReports.subtitlePrivileged') : t('bugReports.subtitleStandard')}
        action={(
          <button onClick={() => setComposeOpen(true)} className="btn-primary">
            <i className="fa-solid fa-plus" /> {t('bugReports.newReport')}
          </button>
        )}
      />

      {submitFeedback && (
        <div
          className="rounded-2xl px-4 py-4 text-sm font-medium"
          style={submitFeedback.tone === 'success'
            ? { background: 'rgba(13,148,136,0.08)', color: '#0f766e', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.16)' }
            : { background: 'rgba(239,68,68,0.08)', color: '#b91c1c', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)' }}
        >
          {submitFeedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_420px] gap-6">
        <div className="card">
          <div className="rounded-2xl px-4 py-4 mb-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
            {t('bugReports.intro')}
          </div>

          <div className="card" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-life-ring text-sky-500" />
                <h2 className="text-sm font-semibold text-base-color">
                  {isPrivileged ? t('bugReports.queueTitle') : t('bugReports.myReportsTitle')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="max-w-[180px]">
                  <option value="">{t('bugReports.allStatuses')}</option>
                  {statusOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
                <button onClick={loadReports} className="btn-secondary text-xs">
                  <i className="fa-solid fa-rotate-right" /> {t('bugReports.refresh')}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-muted-color">
                <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('bugReports.loading')}
              </div>
            ) : sortedReports.length === 0 ? (
              <div className="rounded-2xl px-4 py-10 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                {t('bugReports.empty')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {tableHeaders.map(([key, label]) => (
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
                    {sortedReports.map((report) => {
                      const status = STATUS_META[report.status] ?? STATUS_META.open
                      const severity = SEVERITY_META[report.severity] ?? SEVERITY_META.medium

                      return (
                        <tr
                          key={report.id}
                          className="table-row cursor-pointer"
                          onClick={() => setSelectedId(report.id)}
                          style={selectedReport?.id === report.id ? { background: 'rgba(13,148,136,0.05)' } : undefined}
                        >
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-base-color">{report.subject}</div>
                            <div className="text-[11px] text-muted-color mt-1">{report.page_url || t('bugReports.pageUnknown')}</div>
                          </td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{areaLabel(report.area)}</td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{report.reporter?.name || t('bugReports.reporterUnknown')}</td>
                          <td className="py-3 pr-4">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                              {t(status.labelKey)}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs font-semibold" style={{ color: severity.color }}>{t(severity.labelKey)}</td>
                          <td className="py-3 text-secondary-color text-xs">{formatDateTime(report.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selectedReport && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-clipboard-check text-teal-500" />
              <h2 className="text-sm font-semibold text-base-color">{t('bugReports.detailTitle')}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <div className="text-lg font-semibold text-base-color">{selectedReport.subject}</div>
                <div className="text-sm text-secondary-color mt-2">{selectedReport.description}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-xs text-muted-color">{t('bugReports.affectedPage')}</div>
                  <div className="text-sm text-base-color mt-1 break-all">{selectedReport.page_url || t('bugReports.pageUnknown')}</div>
                </div>
                <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-xs text-muted-color">{t('bugReports.browser')}</div>
                  <div className="text-sm text-base-color mt-1 break-all">{selectedReport.browser || t('bugReports.valueUnknown')}</div>
                </div>
              </div>

              {selectedReport.developer_reply && (
                <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(13,148,136,0.06)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.15)' }}>
                  <div className="text-xs text-muted-color">{t('bugReports.lastReply')}</div>
                  <div className="text-sm text-base-color mt-1">{selectedReport.developer_reply}</div>
                </div>
              )}

              {isPrivileged && (
                <div className="space-y-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t('bugReports.fields.status')}>
                      <select value={review.status} onChange={(event) => setReview((current) => ({ ...current, status: event.target.value }))}>
                        {statusOptions.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </FormField>

                    <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      {t('bugReports.lastHandledBy')}: {selectedReport.handler?.name || t('bugReports.handlerUnknown')}
                    </div>
                  </div>

                  <FormField label={t('bugReports.visibleReply')}>
                    <textarea
                      rows="4"
                      value={review.developer_reply}
                      onChange={(event) => setReview((current) => ({ ...current, developer_reply: event.target.value }))}
                      placeholder={t('bugReports.visibleReplyPlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('bugReports.internalNotes')}>
                    <textarea
                      rows="4"
                      value={review.internal_notes}
                      onChange={(event) => setReview((current) => ({ ...current, internal_notes: event.target.value }))}
                      placeholder={t('bugReports.internalNotesPlaceholder')}
                    />
                  </FormField>

                  <div className="flex justify-end">
                    <button onClick={saveReview} disabled={reviewSaving} className="btn-primary">
                      {reviewSaving ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> {t('bugReports.saving')}</>
                      ) : (
                        <><i className="fa-solid fa-floppy-disk" /> {t('bugReports.update')}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title={t('bugReports.formTitle')}>
        <div className="space-y-4">
          <FormField label={t('bugReports.fields.subject')} error={errors.subject?.[0]} required>
            <input
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder={t('bugReports.placeholders.subject')}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('bugReports.fields.area')} error={errors.area?.[0]} required>
              <select
                value={form.area}
                onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
              >
                {areaOptions.map((area) => (
                  <option key={area.value} value={area.value}>{area.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label={t('bugReports.fields.severity')} error={errors.severity?.[0]} required>
              <select
                value={form.severity}
                onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
              >
                {severityOptions.map((severity) => (
                  <option key={severity.key} value={severity.key}>{severity.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label={t('bugReports.fields.pageUrl')} error={errors.page_url?.[0]}>
            <input
              value={form.page_url}
              onChange={(event) => setForm((current) => ({ ...current, page_url: event.target.value }))}
              placeholder={t('bugReports.placeholders.pageUrl')}
            />
          </FormField>

          <FormField label={t('bugReports.fields.browser')} error={errors.browser?.[0]}>
            <input
              value={form.browser}
              onChange={(event) => setForm((current) => ({ ...current, browser: event.target.value }))}
              placeholder={t('bugReports.placeholders.browser')}
            />
          </FormField>

          <FormField label={t('bugReports.fields.description')} error={errors.description?.[0]} required>
            <textarea
              rows="6"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={t('bugReports.placeholders.description')}
            />
          </FormField>

          {submitFeedback?.tone === 'danger' && (
            <div className="rounded-2xl px-4 py-4 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)' }}>
              {submitFeedback.message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setComposeOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={submitReport} disabled={saving} className="btn-primary">
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin" /> {t('bugReports.send.sending')}</>
              ) : (
                <><i className="fa-solid fa-paper-plane" /> {t('bugReports.send.submit')}</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
