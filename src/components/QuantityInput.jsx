/**
 * QuantityInput — reusable stepper input
 * Props: value, onChange, min, max, step, unit, disabled, size ('sm'|'md')
 */
export default function QuantityInput({
  value = 0,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  unit = '',
  disabled = false,
  size = 'md',
}) {
  const num  = parseFloat(value) || 0
  const dec  = step < 1 ? 3 : 0

  const dec_  = (v) => {
    const next = parseFloat((v - step).toFixed(3))
    if (next >= min) onChange(next)
  }
  const inc = (v) => {
    const next = parseFloat((v + step).toFixed(3))
    if (next <= max) onChange(next)
  }

  const sz = size === 'sm'
    ? { btn: 'w-7 h-7 text-xs', input: 'w-16 text-xs h-7', wrap: 'gap-1' }
    : { btn: 'w-9 h-9 text-sm', input: 'w-20 text-sm  h-9', wrap: 'gap-1.5' }

  return (
    <div className={`flex items-center ${sz.wrap}`}>
      <button
        type="button"
        disabled={disabled || num <= min}
        onClick={() => dec_(num)}
        className={`${sz.btn} flex items-center justify-center rounded-lg border border-theme bg-surface-2 text-muted-color hover:bg-app hover:text-base-color transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <i className="fa-solid fa-minus" style={{ fontSize: '0.65rem' }} />
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`${sz.input} text-center font-mono font-semibold !w-auto flex-shrink-0`}
        style={{ padding: '0 0.25rem' }}
      />

      <button
        type="button"
        disabled={disabled || num >= max}
        onClick={() => inc(num)}
        className={`${sz.btn} flex items-center justify-center rounded-lg border border-theme bg-surface-2 text-muted-color hover:bg-app hover:text-base-color transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <i className="fa-solid fa-plus" style={{ fontSize: '0.65rem' }} />
      </button>

      {unit && <span className="text-xs text-muted-color ml-1">{unit}</span>}
    </div>
  )
}
