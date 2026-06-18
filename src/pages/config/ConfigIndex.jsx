import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import SystemTasksPanel from './SystemTasksPanel'
import { DOCUMENT_LAYOUT_SETTING_KEY, normalizeDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import {
  DOCUMENT_DEFINITIONS,
  getDefaultDocumentFieldKeys,
  getDocumentDefinition,
} from '../../utils/documentDefinitions'
import { resolveDocumentLayout } from '../../utils/documents'

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
    description: 'Produits, categories, unites et structure metier du depot.',
  },
  {
    key: 'payments',
    label: 'Paiements',
    icon: 'fa-solid fa-wallet',
    description: 'Cash systeme, virements et moyens de reglement utiles a Irtiwaa.',
  },
  {
    key: 'expenses',
    label: 'Depenses',
    icon: 'fa-solid fa-receipt',
    description: 'Motifs dynamiques, libelles finance et pilotage depenses.',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: 'fa-solid fa-print',
    description: 'PDF, impression, champs visibles et modele de sortie.',
  },
  {
    key: 'system',
    label: 'Systeme',
    icon: 'fa-solid fa-server',
    description: 'Support, notifications, taches de fond et etat applicatif.',
  },
]

const SETUP_SECTIONS = [
  {
    key: 'categories',
    module: 'catalog',
    title: 'Categories produits',
    description: 'Liste dynamique des categories visibles a la creation et a l import produit.',
    icon: 'fa-solid fa-tags',
  },
  {
    key: 'units',
    module: 'catalog',
    title: 'Unites',
    description: 'Unites disponibles pour les produits, impressions et exports.',
    icon: 'fa-solid fa-ruler-combined',
  },
  {
    key: 'payment-methods',
    module: 'payments',
    title: 'Methodes de paiement',
    description: 'Cash systeme, virements, banques et autres moyens utilises sur les factures.',
    icon: 'fa-solid fa-wallet',
  },
  {
    key: 'expense-categories',
    module: 'expenses',
    title: 'Categories de depenses',
    description: 'Motifs dynamiques avec libelle, couleur, icone et activation.',
    icon: 'fa-solid fa-receipt',
  },
  {
    key: 'documents',
    module: 'documents',
    title: 'Documents PDF & impression',
    description: 'Choix des champs et orientations par entite document.',
    icon: 'fa-solid fa-print',
  },
  {
    key: 'system-support',
    module: 'system',
    title: 'Support & circulation',
    description: 'Adresse de signalement bug et contact d aide interne.',
    icon: 'fa-solid fa-life-ring',
  },
  {
    key: 'background-tasks',
    module: 'system',
    title: 'Taches de fond',
    description: 'Planification, historique et declenchement manuel des routines backend.',
    icon: 'fa-solid fa-clock-rotate-left',
  },
  {
    key: 'system-status',
    module: 'system',
    title: 'Etat systeme',
    description: 'Informations d environnement, PHP, Laravel, queue et mail.',
    icon: 'fa-solid fa-server',
  },
]

const DOCUMENT_ENTITY_GROUPS = [
  {
    key: 'customers',
    label: 'Clients',
    description: 'Listes clients et affectation portefeuille.',
    icon: 'fa-solid fa-users',
    definitionKeys: ['customers_list'],
  },
  {
    key: 'products',
    label: 'Produits',
    description: 'Catalogue, prix et stocks minimums.',
    icon: 'fa-solid fa-box-open',
    definitionKeys: ['products_list'],
  },
  {
    key: 'invoices',
    label: 'Factures',
    description: 'Liste facture, piece simple et detail complet.',
    icon: 'fa-solid fa-file-invoice',
    definitionKeys: ['invoices_list', 'invoice_item', 'invoice_detail'],
  },
  {
    key: 'expenses',
    label: 'Depenses',
    description: 'Listes et fiches unitaires de depenses.',
    icon: 'fa-solid fa-receipt',
    definitionKeys: ['expenses_list', 'expense_item'],
  },
  {
    key: 'route-sessions',
    label: 'Sessions terrain',
    description: 'Sorties journee et fiches unitaires de session.',
    icon: 'fa-solid fa-route',
    definitionKeys: ['route_sessions_list', 'route_session_item'],
  },
  {
    key: 'depot',
    label: 'Depot & mouvements',
    description: 'Stocks depot et journal des mouvements.',
    icon: 'fa-solid fa-warehouse',
    definitionKeys: ['depot_stock_list', 'stock_movements_list', 'stock_movement_item'],
  },
  {
    key: 'inventory',
    label: 'Inventaire',
    description: 'Historique des ajustements et audits inventaire.',
    icon: 'fa-solid fa-boxes-stacked',
    definitionKeys: ['inventory_history_list'],
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

const DOCUMENT_SETTING_KEYS = [DOCUMENT_LAYOUT_SETTING_KEY]

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

function SetupSectionCard({ section, count, onClick }) {
  return (
    <button
      onClick={() => onClick(section.key)}
      className="w-full text-left rounded-2xl px-4 py-4 transition-all"
      style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
          <i className={section.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-base-color">{section.title}</div>
            {count != null && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.10)', color: '#2563eb' }}>
                {count}
              </span>
            )}
          </div>
          <div className="text-xs text-secondary-color mt-1">{section.description}</div>
        </div>
      </div>
    </button>
  )
}

function ModuleHubCard({ module, onOpen }) {
  const primarySection = module.sections[0] ?? null

  return (
    <div
      className="rounded-[28px] border px-5 py-5 transition-all"
      style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-[18px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
          >
            <i className={`${module.icon} text-lg`} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-base-color">{module.label}</div>
            <div className="text-sm text-secondary-color mt-1">{module.description}</div>
          </div>
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(59,130,246,0.10)', color: '#2563eb' }}
        >
          {module.sections.length} bloc{module.sections.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-5">
        {module.sections.map((section) => (
          <button
            key={section.key}
            onClick={() => onOpen(section.key)}
            className="w-full rounded-2xl px-4 py-3 text-left transition-all hover:-translate-y-[1px]"
            style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}>
                <i className={section.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-base-color">{section.title}</div>
                <div className="text-xs text-muted-color mt-0.5">{section.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {primarySection && (
        <div className="flex items-center justify-between gap-3 mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs text-muted-color">
            Ouvrir la configuration prioritaire de ce module.
          </div>
          <button onClick={() => onOpen(primarySection.key)} className="btn-secondary text-xs">
            <i className="fa-solid fa-arrow-right" /> Ouvrir
          </button>
        </div>
      )}
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

function DocumentTemplateCard({
  definition,
  selectedFieldKeys,
  orientation,
  onToggleField,
  onOrientationChange,
  onReset,
}) {
  const selectedCount = selectedFieldKeys.length

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-base-color">{definition.label}</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.10)', color: '#2563eb' }}>
              {definition.scope === 'item' ? 'Fiche unitaire' : 'Liste'}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
              {selectedCount}/{definition.fields.length} champs actifs
            </span>
          </div>
          <p className="text-xs text-muted-color mt-1">{definition.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={orientation} onChange={(event) => onOrientationChange(definition, event.target.value)} className="text-xs">
            <option value="portrait">Portrait</option>
            <option value="landscape">Paysage</option>
          </select>
          <button onClick={() => onReset(definition)} className="btn-secondary text-xs">
            <i className="fa-solid fa-rotate-left" /> Defaut
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {definition.fields.map((item) => {
          const checked = selectedFieldKeys.includes(item.key)
          const disabled = checked && selectedCount === 1

          return (
            <label
              key={item.key}
              className="rounded-2xl px-3 py-3 border flex items-start gap-3 cursor-pointer"
              style={{ background: checked ? 'rgba(13,148,136,0.06)' : 'var(--surface-2)', borderColor: checked ? 'rgba(13,148,136,0.18)' : 'var(--border)' }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggleField(definition, item.key)}
                style={{ width: 16, height: 16, marginTop: 2 }}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-base-color">{item.label}</div>
                <div className="text-xs text-muted-color mt-0.5">{item.description || 'Champ disponible dans le document.'}</div>
              </div>
            </label>
          )
        })}
      </div>

      {definition.alwaysVisibleNote && (
        <div className="rounded-2xl px-4 py-3 text-xs text-secondary-color mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
          {definition.alwaysVisibleNote}
        </div>
      )}
    </div>
  )
}

export default function ConfigIndex() {
  const navigate = useNavigate()
  const { sectionKey: routeSectionKey } = useParams()
  const [documentEntityKey, setDocumentEntityKey] = useState(DOCUMENT_ENTITY_GROUPS[0].key)
  const [itemsByType, setItemsByType] = useState({})
  const [settingsByKey, setSettingsByKey] = useState({})
  const [loading, setLoading] = useState(true)
  const [systemInfo, setSystemInfo] = useState(null)
  const [systemLoading, setSystemLoading] = useState(true)
  const [taskSnapshot, setTaskSnapshot] = useState({ generated_at: null, stats: {}, tasks: [], recent_runs: [] })
  const [taskLoading, setTaskLoading] = useState(true)
  const [taskLoadError, setTaskLoadError] = useState('')
  const [taskActionError, setTaskActionError] = useState('')
  const [runningTaskKey, setRunningTaskKey] = useState('')
  const [taskNotice, setTaskNotice] = useState('')
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

  const loadBackgroundTasks = async () => {
    setTaskLoading(true)
    setTaskLoadError('')

    try {
      const response = await api.get('/system/tasks', {
        params: { history_limit: 20 },
      })
      setTaskSnapshot(response.data ?? { generated_at: null, stats: {}, tasks: [], recent_runs: [] })
    } catch (error) {
      setTaskLoadError(error.response?.data?.message || 'Impossible de charger les taches de fond.')
    } finally {
      setTaskLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
    loadSystemInfo()
    loadBackgroundTasks()
  }, [])

  const summary = useMemo(() => ({
    category: itemsByType.category?.length ?? 0,
    unit: itemsByType.unit?.length ?? 0,
    payment_method: itemsByType.payment_method?.length ?? 0,
    expense_category: itemsByType.expense_category?.length ?? 0,
  }), [itemsByType])
  const setupSection = routeSectionKey ? SETUP_SECTIONS.find((item) => item.key === routeSectionKey) ?? null : null
  const setupSectionsByModule = useMemo(() => (
    MODULES.map((module) => ({
      ...module,
      sections: SETUP_SECTIONS.filter((section) => section.module === module.key),
    }))
  ), [])
  const documentLayouts = normalizeDocumentLayouts(settingsByKey[DOCUMENT_LAYOUT_SETTING_KEY]?.value)
  const activeDocumentEntity = DOCUMENT_ENTITY_GROUPS.find((item) => item.key === documentEntityKey) ?? DOCUMENT_ENTITY_GROUPS[0]
  const documentDefinitions = useMemo(() => (
    activeDocumentEntity.definitionKeys
      .map((key) => getDocumentDefinition(key))
      .filter(Boolean)
  ), [activeDocumentEntity])

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

  const runBackgroundTask = async (taskKey) => {
    setRunningTaskKey(taskKey)
    setTaskNotice('')
    setTaskActionError('')

    try {
      const response = await api.post(`/system/tasks/${taskKey}/run`)
      setTaskSnapshot(response.data?.snapshot ?? { generated_at: null, stats: {}, tasks: [], recent_runs: [] })
      setTaskNotice(response.data?.message || 'Tache executee avec succes.')
    } catch (error) {
      setTaskActionError(error.response?.data?.message || 'La tache a echoue.')

      if (error.response?.data?.snapshot) {
        setTaskSnapshot(error.response.data.snapshot)
      }
    } finally {
      setRunningTaskKey('')
    }
  }

  const updateDocumentLayouts = (nextLayouts) => {
    updateSetting(DOCUMENT_LAYOUT_SETTING_KEY, nextLayouts)
  }

  const updateDocumentLayout = (definition, nextValue) => {
    updateDocumentLayouts({
      ...documentLayouts,
      [definition.key]: nextValue,
    })
  }

  const toggleDocumentField = (definition, fieldKey) => {
    const currentLayout = resolveDocumentLayout(definition, documentLayouts)
    const selectedKeys = currentLayout.fieldKeys
    const enabledFieldKeys = selectedKeys.includes(fieldKey)
      ? selectedKeys.filter((item) => item !== fieldKey)
      : definition.fields
        .filter((item) => selectedKeys.includes(item.key) || item.key === fieldKey)
        .map((item) => item.key)
    const nextFieldKeys = enabledFieldKeys.length > 0 ? enabledFieldKeys : getDefaultDocumentFieldKeys(definition)

    updateDocumentLayout(definition, {
      ...(documentLayouts[definition.key] ?? {}),
      fields: nextFieldKeys,
      orientation: currentLayout.orientation,
    })
  }

  const changeDocumentOrientation = (definition, orientation) => {
    updateDocumentLayout(definition, {
      ...(documentLayouts[definition.key] ?? {}),
      fields: resolveDocumentLayout(definition, documentLayouts).fieldKeys,
      orientation,
    })
  }

  const resetDocumentLayout = (definition) => {
    const nextLayouts = { ...documentLayouts }
    delete nextLayouts[definition.key]
    updateDocumentLayouts(nextLayouts)
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

  if (routeSectionKey && !setupSection) {
    return <Navigate to="/config" replace />
  }

  const currentTypeConfig = MANAGED_TYPES.find((item) => item.key === modalType)
  const isSystemItem = editing?.is_system === true
  const currentProvider = settingValue('map.provider', 'openstreetmap')
  const categoryConfig = MANAGED_TYPES.find((item) => item.key === 'category')
  const unitConfig = MANAGED_TYPES.find((item) => item.key === 'unit')
  const paymentMethodConfig = MANAGED_TYPES.find((item) => item.key === 'payment_method')
  const expenseCategoryConfig = MANAGED_TYPES.find((item) => item.key === 'expense_category')
  const detailSections = setupSection
    ? setupSectionsByModule.find((module) => module.key === setupSection.module)?.sections ?? []
    : []
  const sectionCount = (key) => {
    if (key === 'categories') return summary.category
    if (key === 'units') return summary.unit
    if (key === 'payment-methods') return summary.payment_method
    if (key === 'expense-categories') return summary.expense_category
    if (key === 'documents') return DOCUMENT_DEFINITIONS.length
    if (key === 'background-tasks') return taskSnapshot.tasks?.length ?? 0
    return null
  }

  if (setupSection?.key === 'documents') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Documents PDF & impression"
          subtitle="Configuration par entite pour les listes, fiches unitaires et impressions reutilisables partout dans l application."
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate('/config')} className="btn-secondary text-xs">
                <i className="fa-solid fa-arrow-left" /> Retour au hub
              </button>
              <button
                onClick={() => saveSettings(DOCUMENT_SETTING_KEYS, 'documents')}
                disabled={savingSettings === 'documents'}
                className="btn-primary text-xs"
              >
                {savingSettings === 'documents'
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                  : <><i className="fa-solid fa-floppy-disk" /> Sauver</>
                }
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Categories produits" value={summary.category} color="#0d9488" icon="fa-solid fa-boxes-stacked" />
          <SummaryCard label="Unites" value={summary.unit} color="#3b82f6" icon="fa-solid fa-ruler-combined" />
          <SummaryCard label="Paiements" value={summary.payment_method} color="#8b5cf6" icon="fa-solid fa-wallet" />
          <SummaryCard label="Documents" value={DOCUMENT_DEFINITIONS.length} color="#f59e0b" icon="fa-solid fa-print" />
        </div>

        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <i className="fa-solid fa-diagram-project mt-0.5" style={{ color: '#0d9488' }} />
            <div>
              <div className="text-sm font-semibold text-base-color">Choix de l entite</div>
              <div className="text-xs text-muted-color mt-1">
                Selectionnez l entite metier, puis ajustez les champs visibles pour les listes et fiches qui lui appartiennent.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {DOCUMENT_ENTITY_GROUPS.map((item) => (
              <button
                key={item.key}
                onClick={() => setDocumentEntityKey(item.key)}
                className="rounded-2xl px-4 py-4 text-left transition-all"
                style={documentEntityKey === item.key
                  ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
                  : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <i className={item.icon} style={{ color: '#0d9488' }} />
                  <div className="text-sm font-semibold text-base-color">{item.label}</div>
                </div>
                <div className="text-xs text-secondary-color">{item.description}</div>
                <div className="text-xs text-muted-color mt-2">{item.definitionKeys.length} modele(s)</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
              <i className={activeDocumentEntity.icon} />
            </div>
            <div>
              <div className="text-sm font-semibold text-base-color">{activeDocumentEntity.label}</div>
              <div className="text-xs text-muted-color mt-1">{activeDocumentEntity.description}</div>
            </div>
          </div>
        </div>

        {documentDefinitions.map((definition) => {
          const resolvedLayout = resolveDocumentLayout(definition, documentLayouts)

          return (
            <DocumentTemplateCard
              key={definition.key}
              definition={definition}
              selectedFieldKeys={resolvedLayout.fieldKeys}
              orientation={resolvedLayout.orientation}
              onToggleField={toggleDocumentField}
              onOrientationChange={changeDocumentOrientation}
              onReset={resetDocumentLayout}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={setupSection ? setupSection.title : 'Configuration'}
        subtitle={setupSection
          ? setupSection.description
          : 'Hub de configuration pour le depot Irtiwaa: catalogues, paiements, documents, support et taches systeme.'}
        action={setupSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/config')} className="btn-secondary text-xs">
              <i className="fa-solid fa-arrow-left" /> Retour au hub
            </button>
            <PageExportActions title={setupSection.title} />
          </div>
        ) : <PageExportActions title="Configuration" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Categories produits" value={summary.category} color="#0d9488" icon="fa-solid fa-boxes-stacked" />
        <SummaryCard label="Unites" value={summary.unit} color="#3b82f6" icon="fa-solid fa-ruler-combined" />
        <SummaryCard label="Paiements" value={summary.payment_method} color="#8b5cf6" icon="fa-solid fa-wallet" />
        <SummaryCard label="Depenses" value={summary.expense_category} color="#f59e0b" icon="fa-solid fa-receipt" />
      </div>

      {!setupSection ? (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="max-w-3xl">
                <div className="text-sm font-semibold text-base-color">Pilotage central</div>
                <div className="text-sm text-secondary-color mt-1">
                  Cette page sert de hub. Chaque grand bloc ouvre une configuration cible, avec un rangement plus clair
                  pour les besoins du depot, du terrain, de la facturation et du support.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/notifications-center" className="btn-secondary text-xs">
                  <i className="fa-solid fa-bell" /> Centre notifications
                </Link>
                <Link to="/bug-reports" className="btn-secondary text-xs">
                  <i className="fa-solid fa-bug" /> Support
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {setupSectionsByModule.map((module) => (
              <ModuleHubCard
                key={module.key}
                module={module}
                onOpen={(key) => navigate(`/config/${key}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        <section className="space-y-6">
          {detailSections.length > 1 && (
            <div className="card">
              <div className="flex flex-wrap gap-2">
                {detailSections.map((section) => (
                  <Link
                    key={section.key}
                    to={`/config/${section.key}`}
                    className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
                    style={setupSection.key === section.key
                      ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)', color: '#0f766e' }
                      : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <i className={section.icon} />
                    <span>{section.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {setupSection?.key === 'categories' && (
            <ConfigSection
              config={categoryConfig}
              items={itemsByType.category ?? []}
              onAdd={openCreate}
              onEdit={openEdit}
              onToggle={toggleItem}
              onDelete={deleteItem}
            />
          )}

          {setupSection?.key === 'units' && (
            <ConfigSection
              config={unitConfig}
              items={itemsByType.unit ?? []}
              onAdd={openCreate}
              onEdit={openEdit}
              onToggle={toggleItem}
              onDelete={deleteItem}
            />
          )}

          {setupSection?.key === 'payment-methods' && (
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
                config={paymentMethodConfig}
                items={itemsByType.payment_method ?? []}
                onAdd={openCreate}
                onEdit={openEdit}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            </div>
          )}

          {setupSection?.key === 'expense-categories' && (
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

              <ConfigSection
                config={expenseCategoryConfig}
                items={itemsByType.expense_category ?? []}
                onAdd={openCreate}
                onEdit={openEdit}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            </div>
          )}

          {/* Legacy documents branch kept unreachable; the dedicated early-return above owns the entity-first document setup UI. */}
          {false && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-base-color">Documents PDF & impression</h2>
                    <p className="text-xs text-muted-color mt-1">
                      Choisissez les champs visibles par type de document. Les boutons PDF / imprimer des pages concernées
                      reutiliseront cette configuration sans recoder chaque mise en page.
                    </p>
                  </div>
                  <button
                    onClick={() => saveSettings(DOCUMENT_SETTING_KEYS, 'documents')}
                    disabled={savingSettings === 'documents'}
                    className="btn-primary text-xs"
                  >
                    {savingSettings === 'documents'
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
                      : <><i className="fa-solid fa-floppy-disk" /> Sauver</>
                    }
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {DOCUMENT_TEMPLATE_SECTIONS.map((item) => (
                    <div key={item.key} className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <i className={item.icon} style={{ color: '#0d9488' }} />
                        <div className="text-sm font-semibold text-base-color">{item.label}</div>
                      </div>
                      <div className="text-xs text-secondary-color mb-2">{item.description}</div>
                      <div className="text-xs text-muted-color">
                        {getDocumentDefinitionsBySection(item.key).length} modele(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {documentDefinitions.map((definition) => {
                const resolvedLayout = resolveDocumentLayout(definition, documentLayouts)

                return (
                  <DocumentTemplateCard
                    key={definition.key}
                    definition={definition}
                    selectedFieldKeys={resolvedLayout.fieldKeys}
                    orientation={resolvedLayout.orientation}
                    onToggleField={toggleDocumentField}
                    onOrientationChange={changeDocumentOrientation}
                    onReset={resetDocumentLayout}
                  />
                )
              })}
            </div>
          )}

          {setupSection?.key === 'map-provider' && (
            <div className="space-y-6">
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
            </div>
          )}

          {setupSection?.key === 'map-status' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
          )}

          {setupSection?.key === 'system-support' && (
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
          )}

          {setupSection?.key === 'background-tasks' && (
            <SystemTasksPanel
              snapshot={taskSnapshot}
              loading={taskLoading}
              error={taskLoadError}
              runningTaskKey={runningTaskKey}
              actionMessage={taskNotice}
              actionError={taskActionError}
              onRefresh={loadBackgroundTasks}
              onRunTask={runBackgroundTask}
            />
          )}

          {setupSection?.key === 'system-status' && (
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
          )}
        </section>
      )}

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
