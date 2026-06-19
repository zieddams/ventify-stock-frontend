import { ALL_DEPOTS_VALUE } from '../hooks/useDepots'

function depotLabel(depot) {
  if (!depot) {
    return ''
  }

  return depot.code ? `${depot.name} (${depot.code})` : depot.name
}

export default function DepotScopeControls({
  depots = [],
  loading = false,
  selectedValue = '',
  onChange,
  label = 'Depot',
  allowAll = false,
  canSelectAll = false,
  allLabel = 'Tous les depots',
  disabled = false,
}) {
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
            {depotLabel(depot)}
          </option>
        ))}
      </select>
    </div>
  )
}
