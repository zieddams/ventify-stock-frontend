import { ALL_DEPOTS_VALUE } from '../hooks/useDepots'

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
  return (
    <div
      className="rounded-2xl border border-theme px-3 py-2.5"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="text-sm font-medium text-base-color">
        {formatDepotLabel(depot) || 'Dépôt non défini'}
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
  label = 'Depot',
  allowAll = false,
  canSelectAll = false,
  allLabel = 'Tous les dépôts',
  disabled = false,
}) {
  const selectedDepot = depots.find((depot) => String(depot.id) === String(selectedValue)) ?? depots[0] ?? null
  const shouldRenderStatic = depots.length === 1

  if (shouldRenderStatic) {
    return (
      <div className="min-w-[220px]">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-color mb-1">
          {label}
        </label>
        <DepotSelectionInfo depot={selectedDepot} />
      </div>
    )
  }

  return (
    <div className="min-w-[220px]">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-color mb-1">
        {label}
      </label>
      <select
        value={selectedValue}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled || loading}
      >
        {allowAll && canSelectAll && (
          <option value={ALL_DEPOTS_VALUE}>{allLabel}</option>
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
