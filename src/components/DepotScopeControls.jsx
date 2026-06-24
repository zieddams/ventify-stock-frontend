import { ALL_DEPOTS_VALUE } from '../hooks/useDepots'
import { useI18n } from '../contexts/I18nContext'

export function formatDepotLabel(depot) {
  if (!depot) {
    return ''
  }

  return depot.code ? `${depot.name} (${depot.code})` : depot.name
}

export function DepotSelectionInfo({
  depot = null,
  hint = null,
}) {
  const { t } = useI18n()

  return (
    <div
      className="rounded-2xl border border-theme px-3 py-2.5"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="text-sm font-medium text-base-color">
        {formatDepotLabel(depot) || t('depot.notDefined')}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-color mt-1">
          {hint}
        </div>
      )}
    </div>
  )
}

export default function DepotScopeControls({
  depots = [],
  loading = false,
  selectedValue = '',
  onChange,
  label = '',
  allowAll = false,
  canSelectAll = false,
  allLabel = '',
  disabled = false,
}) {
  const { t } = useI18n()
  const selectedDepot = depots.find((depot) => String(depot.id) === String(selectedValue)) ?? depots[0] ?? null
  const shouldRenderStatic = depots.length === 1
  const resolvedLabel = label || t('depot.label')
  const resolvedAllLabel = allLabel || t('depot.all')

  if (shouldRenderStatic) {
    return (
      <div className="min-w-[220px]">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-color mb-1">
          {resolvedLabel}
        </label>
        <DepotSelectionInfo depot={selectedDepot} />
      </div>
    )
  }

  return (
    <div className="min-w-[220px]">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-color mb-1">
        {resolvedLabel}
      </label>
      <select
        value={selectedValue}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled || loading}
      >
        {allowAll && canSelectAll && (
          <option value={ALL_DEPOTS_VALUE}>{resolvedAllLabel}</option>
        )}
        {depots.map((depot) => (
          <option key={depot.id} value={String(depot.id)}>
            {formatDepotLabel(depot)}
          </option>
        ))}
      </select>
    </div>
  )
}
