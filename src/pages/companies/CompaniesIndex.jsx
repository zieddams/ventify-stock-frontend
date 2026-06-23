import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import irtiwaaLogo from '../../assets/irtiwaa-logo.png'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'

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

function formatDateTime(value) {
  if (!value) {
    return 'Non disponible'
  }

  return new Date(value).toLocaleString('fr-FR')
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

function CompanyCard({ company, selected, onOpen }) {
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
          {company.is_default && <MetricPill label="Défaut" value="Oui" tone="success" />}
          {!company.active && <MetricPill label="Statut" value="Inactive" tone="warning" />}
        </div>
      </div>

      {company.note && (
        <div className="text-xs text-secondary-color mt-3 line-clamp-2">{company.note}</div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        {[
          { label: 'Dépôts', value: company.depots_count },
          { label: 'Camions', value: `${company.camions_count}/${company.max_camions}` },
          { label: 'Utilisateurs', value: company.users_count },
          { label: 'Audits', value: company.audits_count },
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

function ActivityList({ title, emptyLabel, items, renderItem }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-base-color">{title}</h2>
        <span className="text-xs text-muted-color">{items.length} élément(s)</span>
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
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted-color">{label}</span>
      <span className="font-medium text-base-color text-right">{value || '-'}</span>
    </div>
  )
}

export default function CompaniesIndex() {
  const { companyId: companyIdParam } = useParams()
  const navigate = useNavigate()
  const { setSelectedValue: setAppDepotScope } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
  })

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

  const activeCompanyId = companyIdParam ? Number(companyIdParam) : null

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
      setCompanyError(error.response?.data?.message || 'Impossible de charger les sociétés.')
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
      setActionError(error.response?.data?.message || 'Impossible de charger le détail de la société.')
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
  const companyPreviewImage = logoPreviewUrl
    || detail?.company?.logo_url
    || ((detail?.company?.slug === 'el-irtiwaa' || detail?.company?.is_default) ? irtiwaaLogo : '')

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
        setNotice('Société créée.')
        await loadCompanies(created?.id ?? null)
        if (created?.id) {
          await loadCompanyDetail(created.id)
        }
      } else if (selectedCompany?.id) {
        const response = await api.put(`/companies/${selectedCompany.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setNotice('Société mise à jour.')
        await loadCompanies(selectedCompany.id)
        await loadCompanyDetail(response.data?.id ?? selectedCompany.id)
      }
    } catch (error) {
      const fieldMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .filter(Boolean)
        .join(' ')
      setActionError(fieldMessage || error.response?.data?.message || 'Impossible d’enregistrer la société.')
    } finally {
      setSaving(false)
    }
  }

  const runFreshInstall = async () => {
    if (!selectedCompany?.id) {
      return
    }

    if (freshConfirmation.trim() !== 'FRESH INSTALL') {
      setActionError('Tapez exactement FRESH INSTALL pour confirmer la réinitialisation.')
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
      setNotice('Fresh install exécuté pour cette société.')
      await loadCompanies(selectedCompany.id)
      await loadCompanyDetail(selectedCompany.id)
    } catch (error) {
      setActionError(error.response?.data?.message || 'Le fresh install a échoué.')
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
      setNotice('Workspace de test préparé.')
      await loadCompanies(selectedCompany.id)
      await loadCompanyDetail(selectedCompany.id)
    } catch (error) {
      setActionError(error.response?.data?.message || 'Impossible de préparer ce workspace.')
    } finally {
      setBootstrapping(false)
    }
  }

  const openCompanyContext = (path) => {
    const targetDepot = detail?.depots?.find((entry) => entry.is_default) ?? detail?.depots?.[0] ?? null

    if (targetDepot?.id) {
      setAppDepotScope(String(targetDepot.id))
    }

    navigate(path)
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
        title="Sociétés"
        subtitle="Workspace développeur pour piloter les tenants, les audits, les imports et la remise à zéro par société."
        action={(
          <div className="flex flex-wrap gap-2">
            <button onClick={startCreate} className="btn-secondary text-xs">
              <i className="fa-solid fa-plus" /> Nouvelle société
            </button>
            <Link to="/developer-tools" className="btn-secondary text-xs">
              <i className="fa-solid fa-code" /> Outils développeur
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
            />
          ))}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-base-color">
                  {creating ? 'Nouvelle société' : (selectedCompany?.name ?? 'Fiche société')}
                </h2>
                <p className="text-xs text-muted-color mt-1">
                  Logo, limites flotte, flags d’exploitation et accès vers la configuration ou les données.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!creating && selectedCompany?.id && (
                  <>
                    <button onClick={() => openCompanyContext('/config')} className="btn-secondary text-xs">
                      <i className="fa-solid fa-sliders" /> Configurer
                    </button>
                    <button onClick={() => openCompanyContext('/data-tools')} className="btn-secondary text-xs">
                      <i className="fa-solid fa-file-arrow-up" /> Données
                    </button>
                  </>
                )}
                <button onClick={saveCompany} disabled={saving} className="btn-primary text-xs">
                  {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : <><i className="fa-solid fa-floppy-disk" /> Sauver</>}
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="rounded-2xl px-4 py-10 text-center text-sm text-muted-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement du détail...
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nom" required>
                      <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Irtiwaa" />
                    </FormField>

                    <FormField label="Slug">
                      <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="irtiwaa" />
                    </FormField>
                  </div>

                  <FormField label="Note">
                    <textarea rows="3" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Contexte métier, remarques internes, cible de ce tenant..." />
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Camions maximum">
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={form.max_camions}
                        onChange={(event) => setForm((current) => ({ ...current, max_camions: event.target.value }))}
                      />
                    </FormField>

                    <FormField label="Logo">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                      ['active', 'Société active'],
                      ['is_default', 'Société par défaut'],
                      ['fresh_install_enabled', 'Fresh install autorisé'],
                      ['background_tasks_enabled', 'Tâches de fond autorisées'],
                    ].map(([key, label]) => (
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

                  {!creating && detail?.company?.logo_url && (
                    <label className="rounded-2xl px-4 py-3 text-sm text-base-color cursor-pointer flex items-center gap-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <input
                        type="checkbox"
                        checked={form.remove_logo}
                        onChange={(event) => setForm((current) => ({ ...current, remove_logo: event.target.checked }))}
                      />
                      Retirer le logo actuel
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">Aperçu</div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                        {companyPreviewImage ? (
                          <img src={companyPreviewImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <i className="fa-solid fa-image text-slate-400 text-xl" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-base-color">{form.name || 'Nouvelle société'}</div>
                        <div className="text-xs text-muted-color mt-1">{form.slug || 'slug-à-définir'}</div>
                      </div>
                    </div>

                    {!creating && detail?.company && (
                      <div className="space-y-2 mt-4">
                        <MetricPill label="Utilisateurs" value={detail.company.users_count} />
                        <MetricPill label="Dépôts" value={detail.company.depots_count} />
                        <MetricPill label="Camions" value={`${detail.company.camions_count}/${detail.company.max_camions}`} />
                        <MetricPill label="Transferts" value={detail.company.transfer_logs_count} />
                      </div>
                    )}
                  </div>

                  {!creating && detail?.company && (
                    <div className="rounded-[24px] px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="text-xs font-semibold text-muted-color uppercase tracking-[0.18em] mb-3">Pilotage sociétaire</div>
                      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        <DetailRow label="Créée" value={formatDateTime(detail.company.created_at)} />
                        <DetailRow label="Mise à jour" value={formatDateTime(detail.company.updated_at)} />
                        <DetailRow label="Settings" value={`${detail.company.settings_count ?? 0} clé(s)`} />
                        <DetailRow label="Fresh install" value={detail.company.fresh_install_enabled ? 'Autorisé' : 'Bloqué'} />
                        <DetailRow label="Tâches de fond" value={detail.company.background_tasks_enabled ? 'Activées' : 'Bloquées'} />
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
                      <div className="text-sm font-semibold" style={{ color: '#c2410c' }}>Fresh install sociétaire</div>
                      <div className="text-xs mt-2" style={{ color: '#9a3412' }}>
                        Cette action purge l’opérationnel de la société, conserve les structures cœur et régénère dépôt principal + camions.
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="rounded-2xl px-3 py-3 text-center" style={{ background: '#ffffffb8' }}>
                          <div className="text-[11px] text-muted-color">Suppr.</div>
                          <div className="text-sm font-bold text-base-color">{Object.values(detail.company.fresh_install_preview.delete ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)}</div>
                        </div>
                        <div className="rounded-2xl px-3 py-3 text-center" style={{ background: '#ffffffb8' }}>
                          <div className="text-[11px] text-muted-color">Reset</div>
                          <div className="text-sm font-bold text-base-color">{Object.values(detail.company.fresh_install_preview.reset ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)}</div>
                        </div>
                        <div className="rounded-2xl px-3 py-3 text-center" style={{ background: '#ffffffb8' }}>
                          <div className="text-[11px] text-muted-color">Conserve</div>
                          <div className="text-sm font-bold text-base-color">{Object.values(detail.company.fresh_install_preview.keep ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)}</div>
                        </div>
                      </div>
                      <input
                        className="mt-4"
                        value={freshConfirmation}
                        onChange={(event) => setFreshConfirmation(event.target.value)}
                        placeholder="FRESH INSTALL"
                      />
                      <button onClick={runFreshInstall} disabled={runningFreshInstall} className="btn-danger text-xs mt-3 w-full justify-center">
                        {runningFreshInstall ? <><i className="fa-solid fa-spinner fa-spin" /> Exécution...</> : <><i className="fa-solid fa-power-off" /> Lancer le fresh install</>}
                      </button>
                    </div>
                  )}

                  {!creating && (
                    <div className="rounded-[24px] px-4 py-4" style={{ background: 'rgba(59,130,246,0.08)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.16)' }}>
                      <div className="text-sm font-semibold text-base-color">Workspace de test</div>
                      <div className="text-xs text-secondary-color mt-2">
                        Crée ou confirme un dépôt, deux camions, un comptable, deux commerciaux, des clients de test et un stock dépôt minimal.
                      </div>
                      <button onClick={bootstrapWorkspace} disabled={bootstrapping} className="btn-primary text-xs mt-3 w-full justify-center">
                        {bootstrapping ? <><i className="fa-solid fa-spinner fa-spin" /> Préparation...</> : <><i className="fa-solid fa-wand-magic-sparkles" /> Préparer l’espace de test</>}
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
                  title="Audit sociétaire"
                  emptyLabel="Aucune trace d’audit pour cette société."
                  items={detail.recent_audits ?? []}
                  renderItem={(item) => (
                    <div key={`audit-${item.id}`} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-base-color">{item.message}</div>
                          <div className="text-xs text-muted-color mt-1">{item.action}</div>
                        </div>
                        <div className="text-right text-[11px] text-muted-color">
                          <div>{item.actor_name || 'Système'}</div>
                          <div className="mt-1">{formatDateTime(item.created_at)}</div>
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
                  title="Historique import / export"
                  emptyLabel="Aucun transfert de données pour cette société."
                  items={detail.recent_transfers ?? []}
                  renderItem={(item) => (
                    <div key={`transfer-${item.id}`} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-base-color">{item.entity_label}</div>
                          <div className="text-xs text-muted-color mt-1">{item.direction === 'import' ? 'Import' : 'Export'} - {item.source}</div>
                        </div>
                        <div className="text-right text-[11px] text-muted-color">
                          <div>{item.created_by || 'Système'}</div>
                          <div className="mt-1">{formatDateTime(item.created_at)}</div>
                        </div>
                      </div>
                      {item.file_name && <div className="text-xs font-mono text-secondary-color mt-3">{item.file_name}</div>}
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="card">
                  <h2 className="text-sm font-semibold text-base-color mb-4">Dépôts</h2>
                  <div className="space-y-2">
                    {(detail.depots ?? []).map((entry) => (
                      <div key={`depot-${entry.id}`} className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                          {entry.is_default && <MetricPill label="Défaut" value="Oui" tone="success" />}
                          {!entry.active && <MetricPill label="Statut" value="Inactive" tone="warning" />}
                        </div>
                        <div className="text-xs text-muted-color mt-1">{entry.code || 'Code non défini'}</div>
                        <div className="text-[11px] text-secondary-color mt-2">Créé le {formatDateTime(entry.created_at)}</div>
                        <div className="text-[11px] text-secondary-color mt-1">Mis à jour le {formatDateTime(entry.updated_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-sm font-semibold text-base-color mb-4">Camions</h2>
                  <div className="space-y-2">
                    {(detail.camions ?? []).map((entry) => (
                      <div key={`camion-${entry.id}`} className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                          {!entry.active && <MetricPill label="Statut" value="Inactive" tone="warning" />}
                        </div>
                        <div className="text-xs text-muted-color mt-1">{entry.plate || 'Sans plaque'} - {entry.operational_status}</div>
                        <div className="text-[11px] text-secondary-color mt-2">Créé le {formatDateTime(entry.created_at)}</div>
                        <div className="text-[11px] text-secondary-color mt-1">Mis à jour le {formatDateTime(entry.updated_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-sm font-semibold text-base-color mb-4">Utilisateurs</h2>
                  <div className="space-y-2">
                    {(detail.users ?? []).map((entry) => (
                      <div key={`user-${entry.id}`} className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                        <div className="text-xs text-muted-color mt-1">{entry.role} - {entry.email}</div>
                        <div className="text-xs text-secondary-color mt-2">{entry.depot?.name || 'Dépôt à confirmer'}</div>
                        <div className="text-[11px] text-secondary-color mt-2">Créé le {formatDateTime(entry.created_at)}</div>
                        <div className="text-[11px] text-secondary-color mt-1">Mis à jour le {formatDateTime(entry.updated_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {bootstrapResult?.credentials?.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-sm font-semibold text-base-color">Identifiants créés pendant la préparation</h2>
                    <span className="text-xs text-muted-color">{bootstrapResult.credentials.length} compte(s)</span>
                  </div>
                  <div className="space-y-3">
                    {bootstrapResult.credentials.map((entry) => (
                      <div key={entry.email} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="text-sm font-semibold text-base-color">{entry.name}</div>
                        <div className="text-xs text-muted-color mt-1">{entry.role} - {entry.email}</div>
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
