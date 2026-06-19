import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
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
  resolved: { label: 'Résolue', color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
  closed: { label: 'Fermée', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
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
  if (!value) return 'Non renseigné'
  return new Date(value).toLocaleString('fr-FR')
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
    [selectedId, sortedReports]
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
        message: 'Signalement enregistré. Le ticket a bien été créé dans la plateforme.',
      })
      await loadReports()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
      setSubmitFeedback({
        tone: 'danger',
        message: error.response?.data?.message || "Le signalement n'a pas pu être envoyé pour le moment.",
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
        title="Support et signalements"
        subtitle={isPrivileged
          ? 'Collecte, tri et suivi des incidents web, API, mobile et terrain.'
          : 'Signalez un problème avec suffisamment de contexte pour accélérer la correction.'}
        action={(
          <button onClick={() => setComposeOpen(true)} className="btn-primary">
            <i className="fa-solid fa-plus" /> Nouveau signalement
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
            Le signalement sera enregistre dans la plateforme, remontera au centre developpement et enverra un email au canal support configure.
          </div>

          <div className="card" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
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
            ) : sortedReports.length === 0 ? (
              <div className="rounded-2xl px-4 py-10 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                Aucun signalement pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[
                        ['subject', 'Sujet'],
                        ['area', 'Zone'],
                        ['reporter', 'Auteur'],
                        ['status', 'Statut'],
                        ['severity', 'Sévérité'],
                        ['created_at', 'Créé le'],
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
                            <div className="text-[11px] text-muted-color mt-1">{report.page_url || 'Page non renseignée'}</div>
                          </td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{report.area}</td>
                          <td className="py-3 pr-4 text-secondary-color text-xs">{report.reporter?.name || 'Utilisateur'}</td>
                          <td className="py-3 pr-4">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs font-semibold" style={{ color: severity.color }}>{severity.label}</td>
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
                <h2 className="text-sm font-semibold text-base-color">Détail du signalement</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-lg font-semibold text-base-color">{selectedReport.subject}</div>
                  <div className="text-sm text-secondary-color mt-2">{selectedReport.description}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-xs text-muted-color">Page concernée</div>
                    <div className="text-sm text-base-color mt-1 break-all">{selectedReport.page_url || 'Non renseignée'}</div>
                  </div>
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-xs text-muted-color">Navigateur</div>
                    <div className="text-sm text-base-color mt-1 break-all">{selectedReport.browser || 'Non renseigné'}</div>
                  </div>
                </div>

                {selectedReport.developer_reply && (
                  <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(13,148,136,0.06)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.15)' }}>
                    <div className="text-xs text-muted-color">Dernière réponse développement</div>
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
                        Dernier traitement par : {selectedReport.handler?.name || 'Pas encore attribué'}
                      </div>
                    </div>

                    <FormField label="Réponse visible pour l’utilisateur">
                      <textarea
                        rows="4"
                        value={review.developer_reply}
                        onChange={(event) => setReview((current) => ({ ...current, developer_reply: event.target.value }))}
                        placeholder="Expliquez la cause ou l’état de la correction..."
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
                          <><i className="fa-solid fa-floppy-disk" /> Mettre à jour</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="Nouveau signalement">
        <div className="space-y-4">
          <FormField label="Sujet" error={errors.subject?.[0]} required>
            <input
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Exemple : la carte ne charge plus les positions"
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

            <FormField label="Sévérité" error={errors.severity?.[0]} required>
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

          <FormField label="Description détaillée" error={errors.description?.[0]} required>
            <textarea
              rows="6"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Que faisiez-vous ? Quel résultat attendiez-vous ? Quel message d’erreur ou comportement avez-vous observé ?"
            />
          </FormField>

          {submitFeedback?.tone === 'danger' && (
            <div className="rounded-2xl px-4 py-4 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#b91c1c', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.16)' }}>
              {submitFeedback.message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setComposeOpen(false)} className="btn-secondary">Annuler</button>
            <button onClick={submitReport} disabled={saving} className="btn-primary">
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Envoi en cours...</>
              ) : (
                <><i className="fa-solid fa-paper-plane" /> Envoyer le signalement</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
