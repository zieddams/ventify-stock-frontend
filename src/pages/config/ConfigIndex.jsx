import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import api from '../../services/api'

const MANAGED_TYPES = [
  {
    key: 'category',
    module: 'catalog',
    title: 'Categories produits',
    description: 'References utilisees dans les fiches produit et les imports.',
    emptyLabel: 'Aucune categorie configuree.',
  },
  {
    key: 'unit',
    module: 'catalog',
    title: 'Unites',
    description: 'Unites disponibles a la creation produit.',
    emptyLabel: 'Aucune unite configuree.',
  },
  {
    key: 'payment_method',
    module: 'payments',
    title: 'Methodes de paiement',
    description: 'Le cash reste systeme et actif. Les virements et autres methodes restent configurables.',
    emptyLabel: 'Aucune methode de paiement configuree.',
  },
  {
    key: 'expense_category',
    module: 'expenses',
    title: 'Categories de depenses',
    description: 'Catalogue dynamique pour les motifs, labels, icones et couleurs de depense.',
    emptyLabel: 'Aucune categorie de depense configuree.',
  },
]

const MODULES = [
  {
    key: 'catalog',
    label: 'Catalogues',
    icon: 'fa-solid fa-layer-group',
    description: 'Produits, categories et unites',
  },
  {
    key: 'payments',
    label: 'Paiements',
    icon: 'fa-solid fa-wallet',
    description: 'Cash systeme et autres moyens',
  },
  {
    key: 'expenses',
    label: 'Depenses',
    icon: 'fa-solid fa-receipt',
    description: 'Motifs dynamiques et gouvernorats',
  },
  {
    key: 'map',
    label: 'Carte & integr.',
    icon: 'fa-solid fa-map-location-dot',
    description: 'Providers, Google Maps et tuiles',
  },
  {
    key: 'system',
    label: 'Systeme',
    icon: 'fa-solid fa-server',
    description: 'Support, URLs et etat applicatif',
  },
]

const MAP_PROVIDERS = [
  {
    key: 'openstreetmap',
    label: 'OpenStreetMap',
    description: 'Base gratuite et stable pour le suivi clients et terrain.',
  },
  {
    key: 'carto_light',
    label: 'Carto Positron',
    description: 'Lecture plus nette des etiquettes et du relief urbain.',
  },
  {
    key: 'open_topo_map',
    label: 'OpenTopoMap',
    description: 'Fond gratuit avec relief utile pour la lecture terrain et les zones hors ville.',
  },
  {
    key: 'esri_world_imagery',
    label: 'Esri Imagerie',
    description: 'Imagerie satellite utile pour le contexte terrain.',
  },
  {
    key: 'google_roadmap',
    label: 'Google Roadmap',
    description: 'Necessite une cle Google Maps JavaScript API.',
  },
  {
    key: 'google_satellite',
    label: 'Google Satellite',
    description: 'Necessite une cle Google Maps JavaScript API et le mode satellite.',
  },
  {
    key: 'custom',
    label: 'Tuiles personnalisees',
    description: 'Mode expert pour un provider Leaflet externe.',
  },
]

const MAP_SETTING_KEYS = [
  'map.provider',
  'map.google_maps_api_key',
  'map.google_map_type',
  'map.google_map_id',
  'map.custom_tile_url',
  'map.custom_tile_attribution',
]

const SYSTEM_SETTING_KEYS = [
  'support.bug_report_email',
  'support.help_contact_label',
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
      <span className="text-xs text-muted-color w-36 flex-shrink-0 pt-0.5">{label}</span>
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

function ModuleCard({ module, active, onClick, count }) {
  return (
    <button
      onClick={() => onClick(module.key)}
      className="w-full text-left rounded-2xl px-4 py-4 transition-all"
      style={active
        ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
        : { background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: active ? 'rgba(13,148,136,0.14)' : 'rgba(100,116,139,0.10)', color: active ? '#0d9488' : '#64748b' }}>
          <i className={module.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-base-color">{module.label}</div>
            {count != null && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.10)', color: '#2563eb' }}>
                {count}
              </span>
            )}
          </div>
          <div className="text-xs text-secondary-color mt-1">{module.description}</div>
        </div>
      </div>
    </button>
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
  const [moduleKey, setModuleKey] = useState('catalog')
  const [itemsByType, setItemsByType] = useState({})
  const [settingsByKey, setSettingsByKey] = useState({})
  const [loading, setLoading] = useState(true)
  const [systemInfo, setSystemInfo] = useState(null)
  const [systemLoading, setSystemLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState('')
  const [modalType, setModalType] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const loadConfig = async () => {
    setLoading(true)

    try {
      const types = MANAGED_TYPES.map((item) => item.key).join(',')
      const [configResponse, settingsResponse] = await Promise.all([
        api.get('/config', { params: { types, all: 1 } }),
        api.get('/settings'),
      ])

      setItemsByType(configResponse.data ?? {})
      setSettingsByKey(
        (settingsResponse.data ?? []).reduce((carry, item) => {
          carry[item.key] = item
          return carry
        }, {})
      )
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

  const summary = useMemo(() => ({
    category: itemsByType.category?.length ?? 0,
    unit: itemsByType.unit?.length ?? 0,
    payment_method: itemsByType.payment_method?.length ?? 0,
    expense_category: itemsByType.expense_category?.length ?? 0,
  }), [itemsByType])

  const visibleSections = MANAGED_TYPES.filter((item) => item.module === moduleKey)

  const settingValue = (key, fallback = '') => String(settingsByKey[key]?.value ?? fallback)

  const updateSetting = (key, value) => {
    setSettingsByKey((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? {}),
        key,
        value,
      },
    }))
  }

  const saveSettings = async (keys, scope) => {
    setSavingSettings(scope)

    try {
      const response = await api.put('/settings', {
        settings: keys.map((key) => ({
          key,
          value: settingsByKey[key]?.value ?? '',
        })),
      })

      setSettingsByKey(
        (response.data ?? []).reduce((carry, item) => {
          carry[item.key] = item
          return carry
        }, {})
      )
    } finally {
      setSavingSettings('')
    }
  }

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
    if (!modalType) return

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
  const currentProvider = settingValue('map.provider', 'openstreetmap')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration"
        subtitle="Modules dynamiques pour les catalogues, paiements, depenses, cartes, support et etat systeme."
        action={<PageExportActions title="Configuration" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Categories produits" value={summary.category} color="#0d9488" icon="fa-solid fa-boxes-stacked" />
        <SummaryCard label="Unites" value={summary.unit} color="#3b82f6" icon="fa-solid fa-ruler-combined" />
        <SummaryCard label="Paiements" value={summary.payment_method} color="#8b5cf6" icon="fa-solid fa-wallet" />
        <SummaryCard label="Depenses" value={summary.expense_category} color="#f59e0b" icon="fa-solid fa-receipt" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[290px,1fr] gap-6">
        <aside className="space-y-3">
          {MODULES.map((module) => (
            <ModuleCard
              key={module.key}
              module={module}
              active={moduleKey === module.key}
              onClick={setModuleKey}
              count={module.key === 'catalog'
                ? summary.category + summary.unit
                : module.key === 'payments'
                  ? summary.payment_method
                  : module.key === 'expenses'
                    ? summary.expense_category
                    : null}
            />
          ))}
        </aside>

        <section className="space-y-6">
          {moduleKey === 'catalog' && (
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

          {moduleKey === 'payments' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-info mt-0.5" style={{ color: '#2563eb' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">Cash verrouille par le systeme</div>
                    <div className="text-sm text-secondary-color mt-1">
                      Le mode cash reste actif, non supprimable et par defaut. Les autres moyens restent activables ou desactivables
                      selon le besoin metier et seront reutilises dans les pages facture, paiement et rapports.
                    </div>
                  </div>
                </div>
              </div>

              <ConfigSection
                config={MANAGED_TYPES.find((item) => item.key === 'payment_method')}
                items={itemsByType.payment_method ?? []}
                onAdd={openCreate}
                onEdit={openEdit}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            </div>
          )}

          {moduleKey === 'expenses' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-sparkles mt-0.5" style={{ color: '#8b5cf6' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">Motifs dynamiques</div>
                    <div className="text-sm text-secondary-color mt-1">
                      Les motifs de depense ne sont plus figes dans le code. Le backend genere une couleur et une icone
                      par defaut si elles ne sont pas precisees, pour garder un affichage propre sur le web et le mobile.
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-location-dot mt-0.5" style={{ color: '#0d9488' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">Gouvernorats</div>
                    <div className="text-sm text-secondary-color mt-1">
                      Le referentiel gouvernorat reste configurable dans la base et l API, mais son edition directe est
                      volontairement masquee ici pour eviter de surcharger l ecran principal de configuration.
                    </div>
                  </div>
                </div>
              </div>

              <ConfigSection
                config={MANAGED_TYPES.find((item) => item.key === 'expense_category')}
                items={itemsByType.expense_category ?? []}
                onAdd={openCreate}
                onEdit={openEdit}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            </div>
          )}

          {moduleKey === 'map' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
                <div className="card">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-base-color">Provider carte</h2>
                      <p className="text-xs text-muted-color mt-1">Choisissez le moteur principal pour la page carte & terrain.</p>
                    </div>
                    <button
                      onClick={() => saveSettings(MAP_SETTING_KEYS, 'map')}
                      disabled={savingSettings === 'map'}
                      className="btn-primary text-xs"
                    >
                      {savingSettings === 'map'
                        ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                        : <><i className="fa-solid fa-floppy-disk" /> Sauver</>
                      }
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MAP_PROVIDERS.map((provider) => (
                      <button
                        key={provider.key}
                        onClick={() => updateSetting('map.provider', provider.key)}
                        className="rounded-2xl px-4 py-4 text-left transition-all"
                        style={currentProvider === provider.key
                          ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
                          : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                      >
                        <div className="text-sm font-semibold text-base-color">{provider.label}</div>
                        <div className="text-xs text-secondary-color mt-1">{provider.description}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <FormField label="Cle Google Maps JS">
                      <input
                        value={settingValue('map.google_maps_api_key')}
                        onChange={(event) => updateSetting('map.google_maps_api_key', event.target.value)}
                        placeholder="AIza..."
                      />
                    </FormField>

                    <FormField label="Google Map ID">
                      <input
                        value={settingValue('map.google_map_id')}
                        onChange={(event) => updateSetting('map.google_map_id', event.target.value)}
                        placeholder="Map ID optionnel"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <FormField label="Type Google Maps">
                      <select
                        value={settingValue('map.google_map_type', 'roadmap')}
                        onChange={(event) => updateSetting('map.google_map_type', event.target.value)}
                      >
                        <option value="roadmap">roadmap</option>
                        <option value="satellite">satellite</option>
                        <option value="terrain">terrain</option>
                        <option value="hybrid">hybrid</option>
                      </select>
                    </FormField>

                    <FormField label="URL tuiles personnalisee">
                      <input
                        value={settingValue('map.custom_tile_url')}
                        onChange={(event) => updateSetting('map.custom_tile_url', event.target.value)}
                        placeholder="https://{s}.example.com/{z}/{x}/{y}.png"
                      />
                    </FormField>
                  </div>

                  <FormField label="Attribution tuiles personnalisee">
                    <textarea
                      rows="3"
                      value={settingValue('map.custom_tile_attribution')}
                      onChange={(event) => updateSetting('map.custom_tile_attribution', event.target.value)}
                      placeholder="Credits ou mentions legales du provider personnalise"
                    />
                  </FormField>

                  <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    Le fond de carte change le rendu visuel, pas la precision GPS: la position depend surtout des pings mobiles,
                    du signal et de l appareil. Google Maps demande une cle JavaScript correctement restreinte et un projet
                    de facturation actif, tandis que les providers libres restent disponibles pour limiter les couts.
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-bolt text-amber-500" />
                      <h2 className="text-sm font-semibold text-base-color">Raccourcis</h2>
                    </div>
                    <div className="space-y-2">
                      <Link to="/map" className="btn-secondary text-xs w-full justify-center">
                        <i className="fa-solid fa-map-location-dot" /> Ouvrir la carte
                      </Link>
                      <Link to="/notifications-center" className="btn-secondary text-xs w-full justify-center">
                        <i className="fa-solid fa-bell" /> Voir les notifications
                      </Link>
                      <Link to="/help" className="btn-secondary text-xs w-full justify-center">
                        <i className="fa-solid fa-circle-question" /> Documentation
                      </Link>
                    </div>
                  </div>

                  <div className="card">
                    <h2 className="text-sm font-semibold text-base-color mb-3">Etat actuel</h2>
                    <InfoRow label="Provider actif" value={MAP_PROVIDERS.find((item) => item.key === currentProvider)?.label || currentProvider} />
                    <InfoRow label="Google key" value={settingValue('map.google_maps_api_key') ? 'Configuree' : 'Absente'} />
                    <InfoRow label="Google map type" value={settingValue('map.google_map_type', 'roadmap')} />
                    <InfoRow label="Mode custom" value={settingValue('map.custom_tile_url') ? 'Configure' : 'Inactif'} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {moduleKey === 'system' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-base-color">Support & circulation</h2>
                    <p className="text-xs text-muted-color mt-1">Email de reception des bugs et contact interne d aide.</p>
                  </div>
                  <button
                    onClick={() => saveSettings(SYSTEM_SETTING_KEYS, 'system')}
                    disabled={savingSettings === 'system'}
                    className="btn-primary text-xs"
                  >
                    {savingSettings === 'system'
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                      : <><i className="fa-solid fa-floppy-disk" /> Sauver</>
                    }
                  </button>
                </div>

                <div className="space-y-4">
                  <FormField label="Email reception bugs">
                    <input
                      value={settingValue('support.bug_report_email', 'zieddamsp@gmail.com')}
                      onChange={(event) => updateSetting('support.bug_report_email', event.target.value)}
                      placeholder="zieddamsp@gmail.com"
                    />
                  </FormField>

                  <FormField label="Libelle contact aide">
                    <input
                      value={settingValue('support.help_contact_label', 'Equipe El Irtiwaa')}
                      onChange={(event) => updateSetting('support.help_contact_label', event.target.value)}
                      placeholder="Equipe El Irtiwaa"
                    />
                  </FormField>

                  <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    Le bouton de signalement de bug enverra un email vers cette adresse tout en enregistrant le ticket
                    dans la plateforme pour suivi developpement.
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to="/bug-reports" className="btn-secondary text-xs">
                      <i className="fa-solid fa-bug" /> Ouvrir le support
                    </Link>
                    <Link to="/notifications-center" className="btn-secondary text-xs">
                      <i className="fa-solid fa-bell" /> Notifications
                    </Link>
                  </div>
                </div>
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
                    <InfoRow label="Frontend" value={`${window.location.origin}/web-platform`} mono />
                    <InfoRow label="API" value={`${window.location.origin}/api/v1`} mono />
                    <InfoRow label="Laravel" value={`v${systemInfo.laravel}`} />
                    <InfoRow label="PHP" value={`v${systemInfo.php}`} />
                    <InfoRow label="Environnement" value={systemInfo.env} />
                    <InfoRow label="Timezone" value={systemInfo.timezone} />
                    <InfoRow label="DB driver" value={systemInfo.db_driver} />
                    <InfoRow label="Queue" value={systemInfo.queue} />
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
        </section>
      </div>

      <Modal
        open={!!modalType}
        onClose={closeModal}
        title={editing ? `Modifier - ${currentTypeConfig?.title ?? ''}` : `Ajouter - ${currentTypeConfig?.title ?? ''}`}
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Nom affiche" error={errors.label?.[0]} required>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Libelle visible dans l application" />
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
            Si la couleur ou l icone restent vides, le backend attribuera automatiquement un style par defaut pour garder une interface propre.
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
