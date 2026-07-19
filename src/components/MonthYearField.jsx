import { useMemo } from 'react'

// <input type="month"> isn't implemented in Firefox (it silently falls back
// to a plain text box requiring hand-typed "YYYY-MM", no picker at all) - two
// plain <select> elements work identically in every browser, matching the
// month <select> already used on SalaryRunsIndex.jsx.
function parseValue(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '')
  return match ? { year: match[1], month: match[2] } : { year: '', month: '' }
}

export default function MonthYearField({ value, onChange, yearsBack = 3, yearsForward = 1 }) {
  const { year, month } = parseValue(value)
  const currentYear = new Date().getFullYear()

  const years = useMemo(() => {
    const list = []
    for (let y = currentYear + yearsForward; y >= currentYear - yearsBack; y -= 1) {
      list.push(String(y))
    }
    return list
  }, [currentYear, yearsBack, yearsForward])

  const emit = (nextYear, nextMonth) => {
    onChange(nextYear && nextMonth ? `${nextYear}-${nextMonth}` : '')
  }

  return (
    <div className="flex gap-2">
      <select value={month} onChange={(event) => emit(year || String(currentYear), event.target.value)}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select value={year} onChange={(event) => emit(event.target.value, month || '01')}>
        <option value="">--</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
