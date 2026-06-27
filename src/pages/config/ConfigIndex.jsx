import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import SystemTasksPanel from './SystemTasksPanel'
import {
  DOCUMENT_COMPANY_PROFILE_SETTING_KEY,
  DOCUMENT_INVOICE_PRINTING_SETTING_KEY,
  DOCUMENT_LAYOUT_SETTING_KEY,
  normalizeDocumentCompanyProfile,
  normalizeDocumentLayouts,
  normalizeInvoicePrintingSettings,
} from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import {
  DOCUMENT_DEFINITIONS,
  getDefaultDocumentFieldKeys,
  getDocumentDefinition,
} from '../../utils/documentDefinitions'
import { resolveDocumentLayout } from '../../utils/documents'
import { formatDateTime as formatLocaleDateTime } from '../../utils/format'
import { normalizePaymentMethodScopes } from '../../utils/paymentMethodScopes'

const MAP_SETTING_KEYS = [
  'map.provider',
  'map.google_maps_api_key',
  'map.google_map_type',
  'map.google_map_id',
  'map.custom_tile_url',
  'map.custom_tile_attribution',
]
const MAP_VISIBILITY_SETTING_KEYS = [
  'map.customer_geolocation_enabled',
  'map.terrain_tracking_enabled',
]

const SYSTEM_SETTING_KEYS = [
  'support.help_contact_label',
]

const DOCUMENT_SETTING_KEYS = [
  DOCUMENT_LAYOUT_SETTING_KEY,
  DOCUMENT_INVOICE_PRINTING_SETTING_KEY,
  DOCUMENT_COMPANY_PROFILE_SETTING_KEY,
]
const HIDDEN_CONFIG_SECTIONS = new Set(['map-provider', 'map-status'])

const EMPTY_FORM = {
  value: '',
  label: '',
  color: '',
  icon: '',
  description: '',
  scopes: [],
  active: true,
}

function getManagedTypes(t) {
  return [
    {
      key: 'category',
      module: 'catalog',
      title: t('configPage.managedTypes.category.title'),
      description: t('configPage.managedTypes.category.description'),
      emptyLabel: t('configPage.managedTypes.category.empty'),
    },
    {
      key: 'unit',
      module: 'catalog',
      title: t('configPage.managedTypes.unit.title'),
      description: t('configPage.managedTypes.unit.description'),
      emptyLabel: t('configPage.managedTypes.unit.empty'),
    },
    {
      key: 'payment_method',
      module: 'payments',
      title: t('configPage.managedTypes.paymentMethod.title'),
      description: t('configPage.managedTypes.paymentMethod.description'),
      emptyLabel: t('configPage.managedTypes.paymentMethod.empty'),
    },
    {
      key: 'expense_category',
      module: 'expenses',
      title: t('configPage.managedTypes.expenseCategory.title'),
      description: t('configPage.managedTypes.expenseCategory.description'),
      emptyLabel: t('configPage.managedTypes.expenseCategory.empty'),
    },
  ]
}

function getModules(t) {
  return [
    {
      key: 'catalog',
      label: t('configPage.modules.catalog.label'),
      icon: 'fa-solid fa-layer-group',
      description: t('configPage.modules.catalog.description'),
    },
    {
      key: 'payments',
      label: t('configPage.modules.payments.label'),
      icon: 'fa-solid fa-wallet',
      description: t('configPage.modules.payments.description'),
    },
    {
      key: 'expenses',
      label: t('configPage.modules.expenses.label'),
      icon: 'fa-solid fa-receipt',
      description: t('configPage.modules.expenses.description'),
    },
    {
      key: 'documents',
      label: t('configPage.modules.documents.label'),
      icon: 'fa-solid fa-print',
      description: t('configPage.modules.documents.description'),
    },
    {
      key: 'system',
      label: t('configPage.modules.system.label'),
      icon: 'fa-solid fa-server',
      description: t('configPage.modules.system.description'),
    },
  ]
}

function getSetupSections(t) {
  return [
    {
      key: 'categories',
      module: 'catalog',
      title: t('configPage.sections.categories.title'),
      description: t('configPage.sections.categories.description'),
      icon: 'fa-solid fa-tags',
    },
    {
      key: 'units',
      module: 'catalog',
      title: t('configPage.sections.units.title'),
      description: t('configPage.sections.units.description'),
      icon: 'fa-solid fa-ruler-combined',
    },
    {
      key: 'zones',
      module: 'catalog',
      title: t('configPage.sections.zones.title'),
      description: t('configPage.sections.zones.description'),
      icon: 'fa-solid fa-map-location-dot',
    },
    {
      key: 'payment-methods',
      module: 'payments',
      title: t('configPage.sections.paymentMethods.title'),
      description: t('configPage.sections.paymentMethods.description'),
      icon: 'fa-solid fa-wallet',
    },
    {
      key: 'expense-categories',
      module: 'expenses',
      title: t('configPage.sections.expenseCategories.title'),
      description: t('configPage.sections.expenseCategories.description'),
      icon: 'fa-solid fa-receipt',
    },
    {
      key: 'documents',
      module: 'documents',
      title: t('configPage.sections.documents.title'),
      description: t('configPage.sections.documents.description'),
      icon: 'fa-solid fa-print',
    },
    {
      key: 'terrain-visibility',
      module: 'system',
      title: t('configPage.sections.terrainVisibility.title'),
      description: t('configPage.sections.terrainVisibility.description'),
      icon: 'fa-solid fa-map-location-dot',
    },
    {
      key: 'system-support',
      module: 'system',
      title: t('configPage.sections.systemSupport.title'),
      description: t('configPage.sections.systemSupport.description'),
      icon: 'fa-solid fa-life-ring',
    },
    {
      key: 'users-access',
      module: 'system',
      title: t('configPage.sections.usersAccess.title'),
      description: t('configPage.sections.usersAccess.description'),
      icon: 'fa-solid fa-user-gear',
    },
    {
      key: 'background-tasks',
      module: 'system',
      title: t('configPage.sections.backgroundTasks.title'),
      description: t('configPage.sections.backgroundTasks.description'),
      icon: 'fa-solid fa-clock-rotate-left',
    },
    {
      key: 'system-status',
      module: 'system',
      title: t('configPage.sections.systemStatus.title'),
      description: t('configPage.sections.systemStatus.description'),
      icon: 'fa-solid fa-server',
    },
  ]
}

function getDocumentEntityGroups(t) {
  return [
    {
      key: 'customers',
      label: t('configPage.documentEntities.customers.label'),
      description: t('configPage.documentEntities.customers.description'),
      icon: 'fa-solid fa-users',
      definitionKeys: ['customers_list'],
    },
    {
      key: 'products',
      label: t('configPage.documentEntities.products.label'),
      description: t('configPage.documentEntities.products.description'),
      icon: 'fa-solid fa-box-open',
      definitionKeys: ['products_list'],
    },
    {
      key: 'invoices',
      label: t('configPage.documentEntities.invoices.label'),
      description: t('configPage.documentEntities.invoices.description'),
      icon: 'fa-solid fa-file-invoice',
      definitionKeys: ['invoices_list', 'invoice_item', 'invoice_detail'],
    },
    {
      key: 'expenses',
      label: t('configPage.documentEntities.expenses.label'),
      description: t('configPage.documentEntities.expenses.description'),
      icon: 'fa-solid fa-receipt',
      definitionKeys: ['expenses_list', 'expense_item', 'expenses_history_list'],
    },
    {
      key: 'route-sessions',
      label: t('configPage.documentEntities.routeSessions.label'),
      description: t('configPage.documentEntities.routeSessions.description'),
      icon: 'fa-solid fa-route',
      definitionKeys: ['route_sessions_list', 'route_session_item'],
    },
    {
      key: 'depot',
      label: t('configPage.documentEntities.depot.label'),
      description: t('configPage.documentEntities.depot.description'),
      icon: 'fa-solid fa-warehouse',
      definitionKeys: ['depot_stock_list', 'stock_movements_list', 'stock_movement_item'],
    },
    {
      key: 'inventory',
      label: t('configPage.documentEntities.inventory.label'),
      description: t('configPage.documentEntities.inventory.description'),
      icon: 'fa-solid fa-boxes-stacked',
      definitionKeys: ['inventory_history_list'],
    },
  ]
}

function getMapProviders(t) {
  return [
    {
      key: 'openstreetmap',
      label: t('configPage.mapProviders.openstreetmap.label'),
      description: t('configPage.mapProviders.openstreetmap.description'),
    },
    {
      key: 'carto_light',
      label: t('configPage.mapProviders.cartoLight.label'),
      description: t('configPage.mapProviders.cartoLight.description'),
    },
    {
      key: 'open_topo_map',
      label: t('configPage.mapProviders.openTopoMap.label'),
      description: t('configPage.mapProviders.openTopoMap.description'),
    },
    {
      key: 'esri_world_imagery',
      label: t('configPage.mapProviders.esriWorldImagery.label'),
      description: t('configPage.mapProviders.esriWorldImagery.description'),
    },
    {
      key: 'google_roadmap',
      label: t('configPage.mapProviders.googleRoadmap.label'),
      description: t('configPage.mapProviders.googleRoadmap.description'),
    },
    {
      key: 'google_satellite',
      label: t('configPage.mapProviders.googleSatellite.label'),
      description: t('configPage.mapProviders.googleSatellite.description'),
    },
    {
      key: 'custom',
      label: t('configPage.mapProviders.custom.label'),
      description: t('configPage.mapProviders.custom.description'),
    },
  ]
}

function getPaymentScopeOptions(t) {
  return [
    { value: 'customer', label: t('configPage.paymentScopes.customer') },
    { value: 'expense', label: t('configPage.paymentScopes.expense') },
    { value: 'all', label: t('configPage.paymentScopes.all') },
  ]
}

function slugifyValue(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function ItemBadge({ item, t, paymentScopeOptions }) {
  const paymentScopes = item.type === 'payment_method' ? normalizePaymentMethodScopes(item) : []

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {item.is_system && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>
          {t('configPage.badges.system')}
        </span>
      )}
      {item.is_default && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
          {t('configPage.badges.default')}
        </span>
      )}
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: item.active ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.16)', color: item.active ? '#059669' : '#64748b' }}>
        {item.active ? t('configPage.badges.active') : t('configPage.badges.inactive')}
      </span>
      {paymentScopes.map((scope) => (
        <span key={`${item.id}-${scope}`} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: '#7c3aed' }}>
          {paymentScopeOptions.find((option) => option.value === scope)?.label ?? scope}
        </span>
      ))}
    </div>
  )
}

function InfoRow({ label, value, mono = false }) {
  const { t } = useI18n()

  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs text-muted-color w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-base-color ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value ?? t('common.notAvailable')}</span>
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

function ModuleHubCard({ module, onOpen }) {
  return (
    <div
      className="rounded-[24px] border px-5 py-5 h-full"
      style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="min-w-0">
        <div className="text-base font-semibold text-base-color">{module.label}</div>
        <div className="text-sm text-secondary-color mt-1">{module.description}</div>
      </div>

      <div className="mt-5 divide-y" style={{ borderColor: 'var(--border)' }}>
        {module.sections.map((section) => (
          <button
            key={section.key}
            onClick={() => onOpen(section.key)}
            className="w-full flex items-start gap-3 py-3 text-left transition-colors hover:bg-surface-2 first:pt-0 last:pb-0"
          >
            <span className="w-5 pt-0.5 flex-shrink-0 text-center" style={{ color: '#0d9488' }}>
              <i className={`${section.icon} text-sm`} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-base-color">{section.title}</span>
              <span className="block text-xs text-muted-color mt-0.5">{section.description}</span>
            </span>
            <span className="pt-0.5 flex-shrink-0 text-muted-color">
              <i className="fa-solid fa-chevron-right text-xs" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ConfigSection({ config, items, onAdd, onEdit, onToggle, onDelete, t, paymentScopeOptions }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-base-color">{config.title}</h2>
          <p className="text-xs text-muted-color mt-1">{config.description}</p>
        </div>
        <button onClick={() => onAdd(config.key)} className="btn-primary text-xs">
          <i className="fa-solid fa-plus" /> {t('configPage.actions.add')}
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
                  <ItemBadge item={item} t={t} paymentScopeOptions={paymentScopeOptions} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {!item.is_system && (
                  <button onClick={() => onToggle(config.key, item)} className="btn-secondary text-xs">
                    <i className={`fa-solid ${item.active ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    {item.active ? t('configPage.actions.deactivate') : t('configPage.actions.activate')}
                  </button>
                )}
                <button onClick={() => onEdit(config.key, item)} className="btn-secondary text-xs">
                  <i className="fa-solid fa-pen" /> {t('common.edit')}
                </button>
                {item.can_delete && (
                  <button onClick={() => onDelete(config.key, item)} className="btn-danger text-xs">
                    <i className="fa-solid fa-trash-can" /> {t('common.delete')}
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
  t,
}) {
  const selectedCount = selectedFieldKeys.length

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-base-color">{definition.label}</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.10)', color: '#2563eb' }}>
              {definition.scope === 'item' ? t('configPage.documents.scopeItem') : t('configPage.documents.scopeList')}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
              {t('configPage.documents.activeFields', { count: selectedCount, total: definition.fields.length })}
            </span>
          </div>
          <p className="text-xs text-muted-color mt-1">{definition.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={orientation} onChange={(event) => onOrientationChange(definition, event.target.value)} className="text-xs">
            <option value="portrait">{t('configPage.documents.orientations.portrait')}</option>
            <option value="landscape">{t('configPage.documents.orientations.landscape')}</option>
          </select>
          <button onClick={() => onReset(definition)} className="btn-secondary text-xs">
            <i className="fa-solid fa-rotate-left" /> {t('configPage.documents.reset')}
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
                <div className="text-xs text-muted-color mt-0.5">{item.description || t('configPage.documents.fieldFallback')}</div>
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
  const { t } = useI18n()
  const { sectionKey: routeSectionKey } = useParams()
  const { user, isDeveloper, refreshUser } = useAuth()
  const { selectedDepot } = useDepots({
    allowAll: false,
    storageKey: 'app-depot-scope',
  })
  const managedTypes = getManagedTypes(t)
  const modules = getModules(t)
  const setupSections = getSetupSections(t)
  const documentEntityGroups = getDocumentEntityGroups(t)
  const mapProviders = getMapProviders(t)
  const paymentScopeOptions = getPaymentScopeOptions(t)
  const [documentEntityKey, setDocumentEntityKey] = useState(documentEntityGroups[0].key)
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
  const configCompanyId = isDeveloper()
    ? (selectedDepot?.company_id ?? selectedDepot?.company?.id ?? user?.company_id ?? null)
    : (user?.company_id ?? null)

  const loadConfig = async () => {
    setLoading(true)

    try {
      const types = managedTypes.map((item) => item.key).join(',')
      const [configResponse, settingsResponse] = await Promise.all([
        api.get('/config', {
          params: {
            types,
            all: 1,
            ...(configCompanyId ? { company_id: configCompanyId } : {}),
          },
        }),
        api.get('/settings', {
          params: {
            ...(configCompanyId ? { company_id: configCompanyId } : {}),
          },
        }),
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
      setTaskLoadError(error.response?.data?.message || t('configPage.backgroundTasks.loadError'))
    } finally {
      setTaskLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
    loadSystemInfo()
    loadBackgroundTasks()
  }, [configCompanyId])

  const summary = useMemo(() => ({
    category: itemsByType.category?.length ?? 0,
    unit: itemsByType.unit?.length ?? 0,
    payment_method: itemsByType.payment_method?.length ?? 0,
    expense_category: itemsByType.expense_category?.length ?? 0,
  }), [itemsByType])
  const visibleSetupSections = useMemo(
    () => setupSections.filter((item) => !HIDDEN_CONFIG_SECTIONS.has(item.key)),
    [setupSections]
  )
  const setupSection = routeSectionKey ? visibleSetupSections.find((item) => item.key === routeSectionKey) ?? null : null
  const setupSectionsByModule = useMemo(() => (
    modules.map((module) => ({
      ...module,
      sections: visibleSetupSections.filter((section) => section.module === module.key),
    }))
  ), [modules, visibleSetupSections])
  const documentLayouts = normalizeDocumentLayouts(settingsByKey[DOCUMENT_LAYOUT_SETTING_KEY]?.value)
  const invoicePrintingSettings = normalizeInvoicePrintingSettings(
    settingsByKey[DOCUMENT_INVOICE_PRINTING_SETTING_KEY]?.value,
  )
  const documentCompanyProfile = normalizeDocumentCompanyProfile(
    settingsByKey[DOCUMENT_COMPANY_PROFILE_SETTING_KEY]?.value,
  )
  const activeDocumentEntity = documentEntityGroups.find((item) => item.key === documentEntityKey) ?? documentEntityGroups[0]
  const documentDefinitions = useMemo(() => (
    activeDocumentEntity.definitionKeys
      .map((key) => getDocumentDefinition(key))
      .filter(Boolean)
  ), [activeDocumentEntity])

  const settingValue = (key, fallback = '') => String(settingsByKey[key]?.value ?? fallback)
  const settingBooleanValue = (key, fallback = false) => {
    const rawValue = settingsByKey[key]?.value

    if (typeof rawValue === 'boolean') {
      return rawValue
    }

    if (typeof rawValue === 'number') {
      return rawValue === 1
    }

    if (typeof rawValue === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(rawValue.trim().toLowerCase())
    }

    return fallback
  }

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
        ...(configCompanyId ? { company_id: configCompanyId } : {}),
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
      await refreshUser?.()
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
      setTaskNotice(response.data?.message || t('configPage.backgroundTasks.runSuccess'))
    } catch (error) {
      setTaskActionError(error.response?.data?.message || t('configPage.backgroundTasks.runError'))

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

  const updateInvoicePrintingSettings = (patch) => {
    updateSetting(DOCUMENT_INVOICE_PRINTING_SETTING_KEY, {
      ...invoicePrintingSettings,
      ...patch,
    })
  }

  const updateDocumentCompanyProfile = (patch) => {
    updateSetting(DOCUMENT_COMPANY_PROFILE_SETTING_KEY, {
      ...documentCompanyProfile,
      ...patch,
    })
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
      scopes: type === 'payment_method' ? normalizePaymentMethodScopes(item) : [],
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
        ...(configCompanyId ? { company_id: configCompanyId } : {}),
        type: modalType,
        value,
        label: label || value,
        color: form.color.trim() || null,
        icon: form.icon.trim() || null,
        description: form.description.trim() || null,
        scopes: modalType === 'payment_method' ? form.scopes : undefined,
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
      scopes: item.scopes,
      active: !item.active,
    })
    await loadConfig()
  }

  const deleteItem = async (_type, item) => {
    if (!confirm(t('configPage.actions.deactivateConfirm', { name: item.display_label || item.label || item.value }))) {
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

  const currentTypeConfig = managedTypes.find((item) => item.key === modalType)
  const isSystemItem = editing?.is_system === true
  const currentProvider = settingValue('map.provider', 'openstreetmap')
  const mapExperienceEnabled = settingBooleanValue('map.terrain_tracking_enabled')
    || settingBooleanValue('map.customer_geolocation_enabled')
  const categoryConfig = managedTypes.find((item) => item.key === 'category')
  const unitConfig = managedTypes.find((item) => item.key === 'unit')
  const paymentMethodConfig = managedTypes.find((item) => item.key === 'payment_method')
  const expenseCategoryConfig = managedTypes.find((item) => item.key === 'expense_category')
  const detailSections = setupSection
    ? setupSectionsByModule.find((module) => module.key === setupSection.module)?.sections ?? []
    : []

  if (setupSection?.key === 'documents') {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('configPage.documents.title')}
          subtitle={t('configPage.documents.subtitle')}
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate('/config')} className="btn-secondary text-xs">
                <i className="fa-solid fa-arrow-left" /> {t('configPage.hub.backToHub')}
              </button>
              <button
                onClick={() => saveSettings(DOCUMENT_SETTING_KEYS, 'documents')}
                disabled={savingSettings === 'documents'}
                className="btn-primary text-xs"
              >
                {savingSettings === 'documents'
                  ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                  : <><i className="fa-solid fa-floppy-disk" /> {t('common.save')}</>
                }
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label={t('configPage.documents.summary.categories')} value={summary.category} color="#0d9488" icon="fa-solid fa-boxes-stacked" />
          <SummaryCard label={t('configPage.documents.summary.units')} value={summary.unit} color="#3b82f6" icon="fa-solid fa-ruler-combined" />
          <SummaryCard label={t('configPage.documents.summary.paymentMethods')} value={summary.payment_method} color="#8b5cf6" icon="fa-solid fa-wallet" />
          <SummaryCard label={t('configPage.documents.summary.documents')} value={DOCUMENT_DEFINITIONS.length} color="#f59e0b" icon="fa-solid fa-print" />
        </div>

        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <i className="fa-solid fa-file-invoice mt-0.5" style={{ color: '#2563eb' }} />
            <div>
              <div className="text-sm font-semibold text-base-color">{t('configPage.documents.invoiceProfileTitle')}</div>
              <div className="text-xs text-muted-color mt-1">
                {t('configPage.documents.invoiceProfileDescription')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('configPage.documents.invoiceProfileFields.headerStyle')}>
              <select
                value={invoicePrintingSettings.header_style}
                onChange={(event) => updateInvoicePrintingSettings({ header_style: event.target.value })}
              >
                <option value="logo_and_name">{t('configPage.documents.invoiceProfileValues.logoAndName')}</option>
                <option value="name_only">{t('configPage.documents.invoiceProfileValues.nameOnly')}</option>
              </select>
            </FormField>

            <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-color mb-2">
                {t('configPage.documents.invoiceProfileFields.visibility')}
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-base-color">
                  <input
                    type="checkbox"
                    checked={invoicePrintingSettings.show_tax_breakdown}
                    onChange={(event) => updateInvoicePrintingSettings({ show_tax_breakdown: event.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  {t('configPage.documents.invoiceProfileValues.showTaxBreakdown')}
                </label>
                <label className="flex items-center gap-3 text-sm text-base-color">
                  <input
                    type="checkbox"
                    checked={invoicePrintingSettings.show_depot_details}
                    onChange={(event) => updateInvoicePrintingSettings({ show_depot_details: event.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  {t('configPage.documents.invoiceProfileValues.showDepotDetails')}
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label={t('configPage.documents.invoiceProfileFields.headerNote')}>
              <textarea
                rows="4"
                value={invoicePrintingSettings.header_note}
                onChange={(event) => updateInvoicePrintingSettings({ header_note: event.target.value })}
                placeholder={t('configPage.documents.invoiceProfilePlaceholders.headerNote')}
              />
            </FormField>

            <FormField label={t('configPage.documents.invoiceProfileFields.footerNote')}>
              <textarea
                rows="4"
                value={invoicePrintingSettings.footer_note}
                onChange={(event) => updateInvoicePrintingSettings({ footer_note: event.target.value })}
                placeholder={t('configPage.documents.invoiceProfilePlaceholders.footerNote')}
              />
            </FormField>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <i className="fa-solid fa-building mt-0.5" style={{ color: '#0d9488' }} />
            <div>
              <div className="text-sm font-semibold text-base-color">{t('configPage.documents.companyProfileTitle')}</div>
              <div className="text-xs text-muted-color mt-1">
                {t('configPage.documents.companyProfileDescription')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('configPage.documents.companyProfileFields.legalName')}>
              <input
                value={documentCompanyProfile.legal_name}
                onChange={(event) => updateDocumentCompanyProfile({ legal_name: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.legalName')}
              />
            </FormField>

            <FormField label={t('configPage.documents.companyProfileFields.siret')}>
              <input
                value={documentCompanyProfile.siret}
                onChange={(event) => updateDocumentCompanyProfile({ siret: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.siret')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label={t('configPage.documents.companyProfileFields.taxId')}>
              <input
                value={documentCompanyProfile.tax_id}
                onChange={(event) => updateDocumentCompanyProfile({ tax_id: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.taxId')}
              />
            </FormField>

            <FormField label={t('configPage.documents.companyProfileFields.phone')}>
              <input
                value={documentCompanyProfile.phone}
                onChange={(event) => updateDocumentCompanyProfile({ phone: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.phone')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label={t('configPage.documents.companyProfileFields.email')}>
              <input
                value={documentCompanyProfile.email}
                onChange={(event) => updateDocumentCompanyProfile({ email: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.email')}
              />
            </FormField>

            <FormField label={t('configPage.documents.companyProfileFields.address')}>
              <input
                value={documentCompanyProfile.address}
                onChange={(event) => updateDocumentCompanyProfile({ address: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.address')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label={t('configPage.documents.companyProfileFields.adminName')}>
              <input
                value={documentCompanyProfile.admin_name}
                onChange={(event) => updateDocumentCompanyProfile({ admin_name: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.adminName')}
              />
            </FormField>

            <FormField label={t('configPage.documents.companyProfileFields.adminEmail')}>
              <input
                value={documentCompanyProfile.admin_email}
                onChange={(event) => updateDocumentCompanyProfile({ admin_email: event.target.value })}
                placeholder={t('configPage.documents.companyProfilePlaceholders.adminEmail')}
              />
            </FormField>
          </div>

          <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
            {t('configPage.documents.companyProfileNotice')}
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <i className="fa-solid fa-diagram-project mt-0.5" style={{ color: '#0d9488' }} />
            <div>
              <div className="text-sm font-semibold text-base-color">{t('configPage.documents.entityChoiceTitle')}</div>
              <div className="text-xs text-muted-color mt-1">
                {t('configPage.documents.entityChoiceDescription')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {documentEntityGroups.map((item) => (
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
                <div className="text-xs text-muted-color mt-2">{t('configPage.documents.modelsCount', { count: item.definitionKeys.length })}</div>
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
              t={t}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {setupSection ? (
        <PageHeader
          title={setupSection.title}
          subtitle={setupSection.description}
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate('/config')} className="btn-secondary text-xs">
                <i className="fa-solid fa-arrow-left" /> {t('configPage.hub.backToHub')}
              </button>
              <PageExportActions title={setupSection.title} />
            </div>
          )}
        />
      ) : (
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-xl font-semibold text-base-color">{t('configPage.hub.title')}</h1>
            <p className="text-sm text-secondary-color mt-1">
              {t('configPage.hub.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/notifications-center" className="btn-secondary text-xs">
              <i className="fa-solid fa-bell" /> {t('configPage.hub.notificationsCenter')}
            </Link>
            <Link to="/bug-reports" className="btn-secondary text-xs">
              <i className="fa-solid fa-bug" /> {t('configPage.hub.support')}
            </Link>
          </div>
        </div>
      )}

      {!setupSection ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {setupSectionsByModule.map((module) => (
            <ModuleHubCard
              key={module.key}
              module={module}
              onOpen={(key) => navigate(`/config/${key}`)}
            />
          ))}
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
              t={t}
              paymentScopeOptions={paymentScopeOptions}
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
              t={t}
              paymentScopeOptions={paymentScopeOptions}
            />
          )}

          {setupSection?.key === 'zones' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-map-location-dot mt-0.5" style={{ color: '#0d9488' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">{t('configPage.zones.overviewTitle')}</div>
                    <div className="text-sm text-secondary-color mt-1">
                      {t('configPage.zones.overviewDescription')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-base-color">{t('configPage.zones.openTitle')}</h2>
                    <p className="text-xs text-muted-color mt-1">
                      {t('configPage.zones.openDescription')}
                    </p>
                  </div>
                  <Link to="/zones" className="btn-secondary text-xs flex-shrink-0">
                    <i className="fa-solid fa-arrow-up-right-from-square" /> {t('configPage.zones.openAction')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {setupSection?.key === 'payment-methods' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-info mt-0.5" style={{ color: '#2563eb' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">{t('configPage.paymentMethods.infoTitle')}</div>
                    <div className="text-sm text-secondary-color mt-1">
                      {t('configPage.paymentMethods.infoDescription')}
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
                t={t}
                paymentScopeOptions={paymentScopeOptions}
              />
            </div>
          )}

          {setupSection?.key === 'expense-categories' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-sparkles mt-0.5" style={{ color: '#8b5cf6' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">{t('configPage.expenseCategories.infoTitle')}</div>
                    <div className="text-sm text-secondary-color mt-1">
                      {t('configPage.expenseCategories.infoDescription')}
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
                t={t}
                paymentScopeOptions={paymentScopeOptions}
              />
            </div>
          )}

          {setupSection?.key === 'map-provider' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-base-color">{t('configPage.mapProvider.title')}</h2>
                    <p className="text-xs text-muted-color mt-1">{t('configPage.mapProvider.description')}</p>
                  </div>
                  <button
                    onClick={() => saveSettings(MAP_SETTING_KEYS, 'map')}
                    disabled={savingSettings === 'map'}
                    className="btn-primary text-xs"
                  >
                    {savingSettings === 'map'
                      ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                      : <><i className="fa-solid fa-floppy-disk" /> {t('common.save')}</>
                    }
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mapProviders.map((provider) => (
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
                  <FormField label={t('configPage.mapProvider.fields.googleApiKey')}>
                    <input
                      value={settingValue('map.google_maps_api_key')}
                      onChange={(event) => updateSetting('map.google_maps_api_key', event.target.value)}
                      placeholder="AIza..."
                    />
                  </FormField>

                  <FormField label={t('configPage.mapProvider.fields.googleMapId')}>
                    <input
                      value={settingValue('map.google_map_id')}
                      onChange={(event) => updateSetting('map.google_map_id', event.target.value)}
                      placeholder={t('configPage.mapProvider.placeholders.googleMapId')}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormField label={t('configPage.mapProvider.fields.googleMapType')}>
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

                  <FormField label={t('configPage.mapProvider.fields.customTileUrl')}>
                    <input
                      value={settingValue('map.custom_tile_url')}
                      onChange={(event) => updateSetting('map.custom_tile_url', event.target.value)}
                      placeholder="https://{s}.example.com/{z}/{x}/{y}.png"
                    />
                  </FormField>
                </div>

                <FormField label={t('configPage.mapProvider.fields.customTileAttribution')}>
                  <textarea
                    rows="3"
                    value={settingValue('map.custom_tile_attribution')}
                    onChange={(event) => updateSetting('map.custom_tile_attribution', event.target.value)}
                    placeholder={t('configPage.mapProvider.placeholders.customTileAttribution')}
                  />
                </FormField>

                <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  {t('configPage.mapProvider.note')}
                </div>
              </div>
            </div>
          )}

          {setupSection?.key === 'terrain-visibility' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-base-color">{t('configPage.terrainVisibility.title')}</h2>
                    <p className="text-xs text-muted-color mt-1">
                      {t('configPage.terrainVisibility.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => saveSettings(MAP_VISIBILITY_SETTING_KEYS, 'map-visibility')}
                    disabled={savingSettings === 'map-visibility'}
                    className="btn-primary text-xs"
                  >
                    {savingSettings === 'map-visibility'
                      ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                      : <><i className="fa-solid fa-floppy-disk" /> {t('common.save')}</>
                    }
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      updateSetting('map.customer_geolocation_enabled', true)
                      updateSetting('map.terrain_tracking_enabled', true)
                    }}
                    className="rounded-2xl px-4 py-4 text-left transition-all"
                    style={mapExperienceEnabled
                      ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
                      : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                  >
                    <div className="text-sm font-semibold text-base-color">{t('configPage.terrainVisibility.enableTitle')}</div>
                    <div className="text-xs text-secondary-color mt-1">
                      {t('configPage.terrainVisibility.enableDescription')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateSetting('map.customer_geolocation_enabled', false)
                      updateSetting('map.terrain_tracking_enabled', false)
                    }}
                    className="rounded-2xl px-4 py-4 text-left transition-all"
                    style={!mapExperienceEnabled
                      ? { background: 'rgba(100,116,139,0.12)', boxShadow: 'inset 0 0 0 1px rgba(100,116,139,0.18)' }
                      : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                  >
                    <div className="text-sm font-semibold text-base-color">{t('configPage.terrainVisibility.disableTitle')}</div>
                    <div className="text-xs text-secondary-color mt-1">
                      {t('configPage.terrainVisibility.disableDescription')}
                    </div>
                  </button>
                </div>

                <div className="rounded-2xl px-4 py-3 mt-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-color mb-1">{t('configPage.terrainVisibility.currentStateLabel')}</div>
                  <div className="text-sm font-medium text-base-color">
                    {mapExperienceEnabled ? t('configPage.terrainVisibility.currentStateActive') : t('configPage.terrainVisibility.currentStateHidden')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {setupSection?.key === 'map-status' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <i className="fa-solid fa-bolt text-amber-500" />
                  <h2 className="text-sm font-semibold text-base-color">{t('configPage.mapStatus.shortcuts')}</h2>
                </div>
                <div className="space-y-2">
                  {mapExperienceEnabled ? (
                    <Link to="/map" className="btn-secondary text-xs w-full justify-center">
                      <i className="fa-solid fa-map-location-dot" /> {t('configPage.mapStatus.openMap')}
                    </Link>
                  ) : (
                    <div
                      className="rounded-xl px-3 py-2 text-xs text-secondary-color"
                      style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                    >
                      {t('configPage.mapStatus.enableFirst')}
                    </div>
                  )}
                  <Link to="/notifications-center" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-bell" /> {t('configPage.mapStatus.notifications')}
                  </Link>
                  <Link to="/help" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-circle-question" /> {t('configPage.mapStatus.documentation')}
                  </Link>
                </div>
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold text-base-color mb-3">{t('configPage.mapStatus.currentTitle')}</h2>
                <InfoRow label={t('configPage.mapStatus.providerActive')} value={mapProviders.find((item) => item.key === currentProvider)?.label || currentProvider} />
                <InfoRow label={t('configPage.mapStatus.googleKey')} value={settingValue('map.google_maps_api_key') ? t('configPage.mapStatus.configured') : t('configPage.mapStatus.missing')} />
                <InfoRow label={t('configPage.mapStatus.googleMapType')} value={settingValue('map.google_map_type', 'roadmap')} />
                <InfoRow label={t('configPage.mapStatus.customMode')} value={settingValue('map.custom_tile_url') ? t('configPage.mapStatus.configured') : t('configPage.mapStatus.inactive')} />
              </div>
            </div>
          )}

          {setupSection?.key === 'system-support' && (
            <div className="card">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-base-color">{t('configPage.systemSupport.title')}</h2>
                  <p className="text-xs text-muted-color mt-1">{t('configPage.systemSupport.description')}</p>
                </div>
                <button
                  onClick={() => saveSettings(SYSTEM_SETTING_KEYS, 'system')}
                  disabled={savingSettings === 'system'}
                  className="btn-primary text-xs"
                >
                  {savingSettings === 'system'
                    ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</>
                    : <><i className="fa-solid fa-floppy-disk" /> {t('common.save')}</>
                  }
                </button>
              </div>

              <div className="space-y-4">
                <FormField label={t('configPage.systemSupport.helpContactLabel')}>
                  <input
                    value={settingValue('support.help_contact_label', t('configPage.systemSupport.helpContactPlaceholder'))}
                    onChange={(event) => updateSetting('support.help_contact_label', event.target.value)}
                    placeholder={t('configPage.systemSupport.helpContactPlaceholder')}
                  />
                </FormField>

                <div className="rounded-2xl px-4 py-4 text-sm text-secondary-color" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  {t('configPage.systemSupport.infoNotice')}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to="/bug-reports" className="btn-secondary text-xs">
                    <i className="fa-solid fa-bug" /> {t('configPage.systemSupport.openSupport')}
                  </Link>
                  <Link to="/notifications-center" className="btn-secondary text-xs">
                    <i className="fa-solid fa-bell" /> {t('configPage.systemSupport.notifications')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {setupSection?.key === 'users-access' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-user-gear mt-0.5" style={{ color: '#8b5cf6' }} />
                  <div>
                    <div className="text-sm font-semibold text-base-color">{t('configPage.usersAccess.title')}</div>
                    <div className="text-sm text-secondary-color mt-1">
                      {t('configPage.usersAccess.description')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-base-color">{t('configPage.usersAccess.openTitle')}</h2>
                    <p className="text-xs text-muted-color mt-1">
                      {t('configPage.usersAccess.openDescription')}
                    </p>
                  </div>
                  <Link to="/users" className="btn-secondary text-xs flex-shrink-0">
                    <i className="fa-solid fa-arrow-up-right-from-square" /> {t('configPage.usersAccess.openAction')}
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
                  {t('configPage.systemStatus.title')}
                </h2>
                <button onClick={loadSystemInfo} className="btn-secondary text-xs">
                  <i className="fa-solid fa-rotate-right" /> {t('common.reload')}
                </button>
              </div>

              {systemLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-color">
                  <i className="fa-solid fa-spinner fa-spin mr-2" /> {t('common.loadingFull')}
                </div>
              ) : systemInfo ? (
                <>
                  <InfoRow label={t('configPage.systemStatus.labels.frontend')} value={`${window.location.origin}/web-platform`} mono />
                  <InfoRow label={t('configPage.systemStatus.labels.api')} value={`${window.location.origin}/api/v1`} mono />
                  <InfoRow label={t('configPage.systemStatus.labels.laravel')} value={`v${systemInfo.laravel}`} />
                  <InfoRow label={t('configPage.systemStatus.labels.php')} value={`v${systemInfo.php}`} />
                  <InfoRow label={t('configPage.systemStatus.labels.environment')} value={systemInfo.env} />
                  <InfoRow label={t('configPage.systemStatus.labels.timezone')} value={systemInfo.timezone} />
                  <InfoRow label={t('configPage.systemStatus.labels.dbDriver')} value={systemInfo.db_driver} />
                  <InfoRow label={t('configPage.systemStatus.labels.queue')} value={systemInfo.queue} />
                  <InfoRow label={t('configPage.systemStatus.labels.mailHost')} value={systemInfo.mail_host} mono />
                  <InfoRow label={t('configPage.systemStatus.labels.mailFrom')} value={systemInfo.mail_from} mono />
                  <div className="pt-2 text-xs text-muted-color">
                    {t('configPage.systemStatus.checkedAt', { value: formatLocaleDateTime(systemInfo.timestamp) })}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-theme px-4 py-8 text-center text-sm text-muted-color">
                  {t('configPage.systemStatus.loadError')}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <Modal
        open={!!modalType}
        onClose={closeModal}
        title={editing
          ? t('configPage.modal.editTitle', { title: currentTypeConfig?.title ?? '' })
          : t('configPage.modal.createTitle', { title: currentTypeConfig?.title ?? '' })}
        size="md"
      >
        <div className="space-y-4">
          <FormField label={t('configPage.modal.fields.displayName')} error={errors.label?.[0]} required>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder={t('configPage.modal.placeholders.displayName')} />
          </FormField>

          <FormField label={t('configPage.modal.fields.code')} error={errors.value?.[0]}>
            <input
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              placeholder={form.label ? slugifyValue(form.label) : t('configPage.modal.placeholders.code')}
              disabled={isSystemItem}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('configPage.modal.fields.color')} error={errors.color?.[0]}>
              <input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} placeholder={t('configPage.modal.placeholders.color')} />
            </FormField>
            <FormField label={t('configPage.modal.fields.icon')} error={errors.icon?.[0]}>
              <input value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} placeholder={t('configPage.modal.placeholders.icon')} />
            </FormField>
          </div>

          <FormField label={t('configPage.modal.fields.description')} error={errors.description?.[0]}>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder={t('configPage.modal.placeholders.description')} />
          </FormField>

          {modalType === 'payment_method' && (
            <FormField label={t('configPage.modal.fields.paymentScopes')} error={errors.scopes?.[0]}>
              <div className="grid grid-cols-1 gap-2">
                {paymentScopeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="rounded-xl px-3 py-3 border flex items-center gap-3 cursor-pointer"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                  >
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(option.value)}
                      disabled={isSystemItem && option.value !== 'all'}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        scopes: event.target.checked
                          ? Array.from(new Set([...current.scopes, option.value]))
                          : current.scopes.filter((scope) => scope !== option.value),
                      }))}
                      style={{ width: 16, height: 16 }}
                    />
                    <span className="text-sm text-base-color">{option.label}</span>
                  </label>
                ))}
              </div>
            </FormField>
          )}

          {!isSystemItem && (
            <label className="flex items-center gap-2 text-sm text-base-color">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              {t('configPage.badges.active')}
            </label>
          )}

          <div className="rounded-xl border border-theme px-3 py-3 text-xs text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            {t('configPage.modal.autoStyleHint')}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={closeModal} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={saveItem} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
