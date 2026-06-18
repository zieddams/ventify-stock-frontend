import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const ISSUE_AREAS = [
  'dashboard',
  'customers',
  'products',
  'invoices',
  'payments',
  'map',
  'camions',
  'routes',
  'inventory',
  'config',
  'notifications',
  'mobile-sync',
  'other',
]

const STATUS_META = {
  open: { label: 'Ouvert', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  in_progress: { label: 'En cours', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  resolved: { label: 'Resolue', color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
  closed: { label: 'Fermee', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

const SEVERITY_META = {
  low: { label: 'Faible', color: '#64748b' },
  medium: { label: 'Moyenne', color: '#3b82f6' },
  high: { label: 'Haute', color: '#f59e0b' },
  critical: { label: 'Critique', color: '#ef4444' },
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

function formatDateTime(value) {
  if (!value) return 'Non renseigne'
  return new Date(value).toLocaleString('fr-FR')
}

export default function BugReportsIndex() {
  const { user } = useAuth()
  const location = useLocation()
  const isPrivileged = ['admin', 'developer'].includes(user?.role)

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitFeedback, setSubmitFeedback] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(() => emptyForm(window.location.href))
  const [selectedId, setSelectedId] = useState(null)
  const [review, setReview] = useState({
    status: 'open',
    developer_reply: '',
    internal_notes: '',
  })

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

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId]
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
      setSubmitFeedback({
        tone: 'success',
        message: 'Signalement enregistre. Le ticket est bien cree dans la plateforme.',
      })
      await loadReports()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
      setSubmitFeedback({
        tone: 'danger',
        message: error.response?.data?.message || 'Le signalement n a pas pu etre envoye pour le moment.',
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support & bugs"
        subtitle={isPrivileged
          ? 'Collecte, tri et suivi des incidents web, API, mobile et terrain.'
          : 'Signalez un probleme avec suffisamment de contexte pour accelere la correction.'}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr,1.05fr] gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-bug text-rose-500" />
            <h2 className="text-sm font-semibold text-base-color">Nouveau signalement</h2>
          </div>

          <div className="space-y-4">
            <FormField label="Sujet" error={errors.subject?.[0]} required>
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Exemple: la carte ne charge plus les positions"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Zone" error={errors.area?.[0]} required>
                <select
                  value={form.area}
                  onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
                >
                  {ISSUE_AREAS.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Severite" error={errors.severity?.[0]} required>
                <select
                  value={form.severity}
                  onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                >
                  {Object.entries(SEVERITY_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Page concernee" error={errors.page_url?.[0]}>
              <input
                value={form.page_url}
                onChange={(event) => setForm((current) => ({ ...current, page_url: event.target.value }))}
                placeholder="https://..."
              />
            </FormField>

            <FormField label="Navigateur / appareil" error={errors.browser?.[0]}>
              <input
                value={form.browser}
                onChange={(event) => setForm((current) => ({ ...current, browser: event.target.value }))}
                placeholder="Chrome, Firefox, Android..."
              />
            </FormField>

            <FormField label="Description detaillee" error={errors.description?.[0]} required>
              <textarea
                rows="6"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Que faisiez-vous ? Quel resultat attendiez-vous ? Quel message d erreur ou comportement avez-vous observe ?"
              />
            </FormField>

            <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              Le signalement sera enregistre dans la plateforme, remontera au centre developpement et enverra un email au canal support configure.
            </div>

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

            <div className="flex justify-end">
              <button onClick={submitReport} disabled={saving} className="btn-primary">
                {saving ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Envoi...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane" /> Envoyer le signalement</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-life-ring text-sky-500" />
                <h2 className="text-sm font-semibold text-base-color">
                  {isPrivileged ? 'File de traitement' : 'Mes signalements'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="max-w-[180px]">
                  <option value="">Tous les statuts</option>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
                <button onClick={loadReports} className="btn-secondary text-xs">
                  <i className="fa-solid fa-rotate-right" /> Actualiser
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-muted-color">
                <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl px-4 py-10 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                Aucun signalement pour le moment.
              </div>
            ) : (
              <div className="space-y-3 max-h-[24rem] overflow-y-auto pr-1">
                {reports.map((report) => {
                  const status = STATUS_META[report.status] ?? STATUS_META.open
                  const severity = SEVERITY_META[report.severity] ?? SEVERITY_META.medium

                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedId(report.id)}
                      className="w-full text-left rounded-2xl px-4 py-4 transition-all"
                      style={selectedReport?.id === report.id
                        ? { background: 'rgba(13,148,136,0.08)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
                        : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-base-color truncate">{report.subject}</div>
                          <div className="text-xs text-muted-color mt-1">
                            {report.area} · {report.reporter?.name || 'Utilisateur'}
                          </div>
                          <div className="text-xs text-muted-color mt-1">{formatDateTime(report.created_at)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: severity.color }}>
                            {severity.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedReport && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <i className="fa-solid fa-clipboard-check text-teal-500" />
                <h2 className="text-sm font-semibold text-base-color">Detail du signalement</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-lg font-semibold text-base-color">{selectedReport.subject}</div>
                  <div className="text-sm text-secondary-color mt-2">{selectedReport.description}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-xs text-muted-color">Page concernee</div>
                    <div className="text-sm text-base-color mt-1 break-all">{selectedReport.page_url || 'Non renseignee'}</div>
                  </div>
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-xs text-muted-color">Navigateur</div>
                    <div className="text-sm text-base-color mt-1 break-all">{selectedReport.browser || 'Non renseigne'}</div>
                  </div>
                </div>

                {selectedReport.developer_reply && (
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(13,148,136,0.06)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.15)' }}>
                    <div className="text-xs text-muted-color">Derniere reponse developpement</div>
                    <div className="text-sm text-base-color mt-1">{selectedReport.developer_reply}</div>
                  </div>
                )}

                {isPrivileged && (
                  <div className="space-y-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Statut">
                        <select value={review.status} onChange={(event) => setReview((current) => ({ ...current, status: event.target.value }))}>
                          {Object.entries(STATUS_META).map(([key, meta]) => (
                            <option key={key} value={key}>{meta.label}</option>
                          ))}
                        </select>
                      </FormField>

                      <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        Dernier traitement par : {selectedReport.handler?.name || 'Pas encore assigne'}
                      </div>
                    </div>

                    <FormField label="Reponse visible utilisateur">
                      <textarea
                        rows="4"
                        value={review.developer_reply}
                        onChange={(event) => setReview((current) => ({ ...current, developer_reply: event.target.value }))}
                        placeholder="Expliquez la cause ou l etat de la correction..."
                      />
                    </FormField>

                    <FormField label="Notes internes">
                      <textarea
                        rows="4"
                        value={review.internal_notes}
                        onChange={(event) => setReview((current) => ({ ...current, internal_notes: event.target.value }))}
                        placeholder="Infos techniques, plan d action, reference commit..."
                      />
                    </FormField>

                    <div className="flex justify-end">
                      <button onClick={saveReview} disabled={reviewSaving} className="btn-primary">
                        {reviewSaving ? (
                          <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                        ) : (
                          <><i className="fa-solid fa-floppy-disk" /> Mettre a jour</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
