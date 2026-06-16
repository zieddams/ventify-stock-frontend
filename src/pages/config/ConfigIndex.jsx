import { useEffect, useMemo, useState } from 'react'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import api from '../../services/api'

const MANAGED_TYPES = [
  {
    key: 'category',
    tab: 'catalog',
    title: 'Categories produits',
    description: 'References utilisees dans les fiches produit et les imports.',
    emptyLabel: 'Aucune categorie configuree.',
  },
  {
    key: 'unit',
    tab: 'catalog',
    title: 'Unites',
    description: 'Unites disponibles a la creation produit.',
    emptyLabel: 'Aucune unite configuree.',
  },
  {
    key: 'payment_method',
    tab: 'payments',
    title: 'Methodes de paiement',
    description: 'Le cash reste systeme et actif. Les virements bancaires peuvent etre ajustes ici.',
    emptyLabel: 'Aucune methode de paiement configuree.',
  },
  {
    key: 'expense_category',
    tab: 'expenses',
    title: 'Categories de depenses',
    description: 'Les depenses utilisent maintenant ce catalogue dynamique avec label, couleur et icone.',
    emptyLabel: 'Aucune categorie de depense configuree.',
  },
]

const TABS = [
  { key: 'catalog', label: 'Catalogues', icon: 'fa-solid fa-layer-group' },
  { key: 'payments', label: 'Paiements', icon: 'fa-solid fa-wallet' },
  { key: 'expenses', label: 'Depenses', icon: 'fa-solid fa-receipt' },
  { key: 'system', label: 'Systeme', icon: 'fa-solid fa-server' },
]

const EMPTY_FORM = {
  value: '',
  label: '',
  color: '',
  icon: '',
  description: '',
  active: true,
}

function slugifyValue(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function ItemBadge({ item }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {item.is_system && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>
          Systeme
        </span>
      )}
      {item.is_default && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
          Defaut
        </span>
      )}
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: item.active ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.16)', color: item.active ? '#059669' : '#64748b' }}>
        {item.active ? 'Actif' : 'Inactif'}
      </span>
    </div>
  )
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs text-muted-color w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-base-color ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value ?? '-'}</span>
    </div>
  )
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="card py-3 px-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a` }}>
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-sm font-bold text-base-color">{value}</div>
      </div>
    </div>
  )
}

function ConfigSection({ config, items, onAdd, onEdit, onToggle, onDelete }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-base-color">{config.title}</h2>
          <p className="text-xs text-muted-color mt-1">{config.description}</p>
        </div>
        <button onClick={() => onAdd(config.key)} className="btn-primary text-xs">
          <i className="fa-solid fa-plus" /> Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-xl border border-theme px-4 py-8 text-center text-sm text-muted-color">
            {config.emptyLabel}
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color || '#64748b'}18` }}>
                    <i className={item.icon || 'fa-solid fa-tag'} style={{ color: item.color || '#64748b' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-base-color">{item.display_label || item.label || item.value}</div>
                    <div className="text-xs text-muted-color font-mono">{item.value}</div>
                  </div>
                </div>
                {item.description && <div className="text-xs text-secondary-color mt-2">{item.description}</div>}
                <div className="mt-2">
                  <ItemBadge item={item} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {!item.is_system && (
                  <button onClick={() => onToggle(config.key, item)} className="btn-secondary text-xs">
                    <i className={`fa-solid ${item.active ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    {item.active ? 'Desactiver' : 'Activer'}
                  </button>
                )}
                <button onClick={() => onEdit(config.key, item)} className="btn-secondary text-xs">
                  <i className="fa-solid fa-pen" /> Modifier
                </button>
                {item.can_delete && (
                  <button onClick={() => onDelete(config.key, item)} className="btn-danger text-xs">
                    <i className="fa-solid fa-trash-can" /> Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ConfigIndex() {
  const [tab, setTab] = useState('catalog')
  const [itemsByType, setItemsByType] = useState({})
  const [loading, setLoading] = useState(true)
  const [systemInfo, setSystemInfo] = useState(null)
  const [systemLoading, setSystemLoading] = useState(true)
  const [modalType, setModalType] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const loadConfig = async () => {
    setLoading(true)

    try {
      const types = MANAGED_TYPES.map((item) => item.key).join(',')
      const response = await api.get('/config', { params: { types, all: 1 } })
      setItemsByType(response.data ?? {})
    } finally {
      setLoading(false)
    }
  }

  const loadSystemInfo = async () => {
    setSystemLoading(true)

    try {
      const response = await api.get('/system/info')
      setSystemInfo(response.data)
    } catch {
      setSystemInfo(null)
    } finally {
      setSystemLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
    loadSystemInfo()
  }, [])

  const summary = useMemo(() => {
    return {
      category: itemsByType.category?.length ?? 0,
      unit: itemsByType.unit?.length ?? 0,
      payment_method: itemsByType.payment_method?.length ?? 0,
      expense_category: itemsByType.expense_category?.length ?? 0,
    }
  }, [itemsByType])

  const visibleSections = MANAGED_TYPES.filter((item) => item.tab === tab)

  const openCreate = (type) => {
    setModalType(type)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const openEdit = (type, item) => {
    setModalType(type)
    setEditing(item)
    setForm({
      value: item.value ?? '',
      label: item.label ?? item.display_label ?? '',
      color: item.color ?? '',
      icon: item.icon ?? '',
      description: item.description ?? '',
      active: item.active !== false,
    })
    setErrors({})
  }

  const closeModal = () => {
    setModalType(null)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const saveItem = async () => {
    if (!modalType) {
      return
    }

    setSaving(true)
    setErrors({})

    try {
      const label = form.label.trim()
      const value = (form.value.trim() || slugifyValue(label))

      const payload = {
        type: modalType,
        value,
        label: label || value,
        color: form.color.trim() || null,
        icon: form.icon.trim() || null,
        description: form.description.trim() || null,
        active: form.active,
      }

      if (editing) {
        await api.put(`/config/${editing.id}`, payload)
      } else {
        await api.post('/config', payload)
      }

      closeModal()
      await loadConfig()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const toggleItem = async (type, item) => {
    await api.put(`/config/${item.id}`, {
      type,
      value: item.value,
      label: item.label,
      color: item.color,
      icon: item.icon,
      description: item.description,
      active: !item.active,
    })
    await loadConfig()
  }

  const deleteItem = async (_type, item) => {
    if (!confirm(`Desactiver "${item.display_label || item.label || item.value}" ?`)) {
      return
    }

    await api.delete(`/config/${item.id}`)
    await loadConfig()
  }

  if (loading) {
    return <PageLoader />
  }

  const currentTypeConfig = MANAGED_TYPES.find((item) => item.key === modalType)
  const isSystemItem = editing?.is_system === true

  return (
    <div>
      <PageHeader
        title="Configuration"
        subtitle="Catalogue dynamique des references, paiements et depenses"
        action={<PageExportActions title="Configuration" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Categories produits" value={summary.category} color="#0d9488" icon="fa-solid fa-boxes-stacked" />
        <SummaryCard label="Unites" value={summary.unit} color="#3b82f6" icon="fa-solid fa-ruler-combined" />
        <SummaryCard label="Paiements" value={summary.payment_method} color="#8b5cf6" icon="fa-solid fa-wallet" />
        <SummaryCard label="Depenses" value={summary.expense_category} color="#f59e0b" icon="fa-solid fa-receipt" />
      </div>

      <div className="rounded-2xl border border-theme p-4 mb-6" style={{ background: 'rgba(59,130,246,0.04)' }}>
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-circle-info mt-0.5" style={{ color: '#2563eb' }} />
          <div>
            <div className="text-sm font-semibold text-base-color">Gouvernorats</div>
            <div className="text-sm text-secondary-color mt-1">
              Le referentiel gouvernorat reste configurable dans la base et l'API, mais l'edition a ete volontairement masquee ici pour garder l'ecran focalise sur les references metier.
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-theme">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === item.key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${item.icon} text-xs`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab !== 'system' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {visibleSections.map((section) => (
            <ConfigSection
              key={section.key}
              config={section}
              items={itemsByType[section.key] ?? []}
              onAdd={openCreate}
              onEdit={openEdit}
              onToggle={toggleItem}
              onDelete={deleteItem}
            />
          ))}
        </div>
      )}

      {tab === 'system' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
              <i className="fa-solid fa-link text-teal-500" />
              URLs et conventions
            </h2>
            <InfoRow label="Frontend" value={`${window.location.origin}/web-platform`} mono />
            <InfoRow label="API" value={`${window.location.origin}/api/v1`} mono />
            <InfoRow label="Import / Export" value={`${window.location.origin}/web-platform/data-tools`} mono />
            <InfoRow label="Cash systeme" value="Toujours actif, non supprimable, par defaut." />
            <InfoRow label="Virements" value="Deux virements bancaires peuvent etre actives/desactives dans l'onglet Paiements." />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                <i className="fa-solid fa-server text-teal-500" />
                Etat du systeme
              </h2>
              <button onClick={loadSystemInfo} className="btn-secondary text-xs">
                <i className="fa-solid fa-rotate-right" /> Actualiser
              </button>
            </div>

            {systemLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-color">
                <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
              </div>
            ) : systemInfo ? (
              <>
                <InfoRow label="Laravel" value={`v${systemInfo.laravel}`} />
                <InfoRow label="PHP" value={`v${systemInfo.php}`} />
                <InfoRow label="Environnement" value={systemInfo.env} />
                <InfoRow label="Timezone" value={systemInfo.timezone} />
                <InfoRow label="DB driver" value={systemInfo.db_driver} />
                <InfoRow label="Cache" value={systemInfo.cache} />
                <InfoRow label="Queue" value={systemInfo.queue} />
                <InfoRow label="App URL" value={systemInfo.app_url} mono />
                <InfoRow label="Web URL" value={systemInfo.frontend_url} mono />
                <InfoRow label="Web path" value={systemInfo.frontend_path} mono />
                <InfoRow label="Mail host" value={systemInfo.mail_host} mono />
                <InfoRow label="Mail from" value={systemInfo.mail_from} mono />
                <div className="pt-2 text-xs text-muted-color">
                  Interroge a : {new Date(systemInfo.timestamp).toLocaleString('fr-FR')}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-theme px-4 py-8 text-center text-sm text-muted-color">
                Impossible de charger les informations systeme.
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={!!modalType} onClose={closeModal} title={editing ? `Modifier - ${currentTypeConfig?.title ?? ''}` : `Ajouter - ${currentTypeConfig?.title ?? ''}`} size="md">
        <div className="space-y-4">
          <FormField label="Nom affiche" error={errors.label?.[0]} required>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Libelle visible dans l'application" />
          </FormField>

          <FormField label="Code technique" error={errors.value?.[0]}>
            <input
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              placeholder={form.label ? slugifyValue(form.label) : 'code_unique'}
              disabled={isSystemItem}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Couleur" error={errors.color?.[0]}>
              <input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} placeholder="#0d9488" />
            </FormField>
            <FormField label="Icone FontAwesome" error={errors.icon?.[0]}>
              <input value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} placeholder="fa-solid fa-wallet" />
            </FormField>
          </div>

          <FormField label="Description" error={errors.description?.[0]}>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Contexte ou aide interne..." />
          </FormField>

          {!isSystemItem && (
            <label className="flex items-center gap-2 text-sm text-base-color">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              Actif
            </label>
          )}

          <div className="rounded-xl border border-theme px-3 py-3 text-xs text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            Si la couleur ou l'icone restent vides, le backend attribuera automatiquement un style par defaut pour garder une interface propre.
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={closeModal} className="btn-secondary">Annuler</button>
            <button onClick={saveItem} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
