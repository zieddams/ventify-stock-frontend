import { describe, expect, it } from 'vitest'
import {
  DATE_SELECTOR_DEFAULTS,
  DATE_SELECTOR_VARIANTS,
  RANGE_PAYLOAD_SEPARATOR,
  formatDateSelectorValue,
  getTodayDateSelectorValue,
  normalizeDateSelectorValue,
  toDateSelectorFlatpickrValue,
  toDateSelectorPayload,
} from './dateSelectorPreview'

describe('dateSelectorPreview helpers', () => {
  it('keeps valid date values and falls back invalid ones', () => {
    expect(normalizeDateSelectorValue('date', '2026-07-14')).toBe('2026-07-14')
    expect(normalizeDateSelectorValue('date', 'bad-value')).toBe(DATE_SELECTOR_DEFAULTS.date)
  })

  it('normalizes datetime payloads and respects empty mode when requested', () => {
    expect(normalizeDateSelectorValue('datetime', '2026-07-14 09:45')).toBe('2026-07-14 09:45')
    expect(normalizeDateSelectorValue('datetime', '', { allowEmpty: true })).toBe('')
  })

  it('normalizes range payloads and keeps a partial selection valid', () => {
    expect(normalizeDateSelectorValue('range', '2026-07-14')).toBe('2026-07-14')
    expect(normalizeDateSelectorValue('range', `2026-07-14${RANGE_PAYLOAD_SEPARATOR}2026-07-20`))
      .toBe(`2026-07-14${RANGE_PAYLOAD_SEPARATOR}2026-07-20`)
  })

  it('builds today values for date, datetime and range modes', () => {
    const sample = new Date(2026, 10, 9, 8, 30, 0)

    expect(getTodayDateSelectorValue('date', sample)).toBe('2026-11-09')
    expect(getTodayDateSelectorValue('datetime', sample)).toBe('2026-11-09 08:30')
    expect(getTodayDateSelectorValue('range', sample)).toBe(`2026-11-09${RANGE_PAYLOAD_SEPARATOR}2026-11-15`)
  })

  it('formats date mode into french locked output', () => {
    const result = formatDateSelectorValue('date', '2026-06-26')

    expect(result.isEmpty).toBe(false)
    expect(result.display).toBe('26/06/2026')
    expect(result.context.toLowerCase()).toContain('juin')
  })

  it('formats datetime mode into french locked output with time', () => {
    const result = formatDateSelectorValue('datetime', '2026-06-26 08:30')

    expect(result.isEmpty).toBe(false)
    expect(result.display).toContain('26/06/2026')
    expect(result.display).toContain('08:30')
    expect(result.context.toLowerCase()).toContain('juin')
  })

  it('formats range mode into a readable fr summary', () => {
    const result = formatDateSelectorValue('range', `2026-06-20${RANGE_PAYLOAD_SEPARATOR}2026-06-26`)

    expect(result.isEmpty).toBe(false)
    expect(result.display).toBe('20/06/2026 -> 26/06/2026')
    expect(result.context.toLowerCase()).toContain('juin')
  })

  it('converts selected Date objects back to payload strings', () => {
    const sample = new Date(2026, 5, 26, 8, 30, 0)
    const sampleEnd = new Date(2026, 5, 30, 8, 30, 0)

    expect(toDateSelectorPayload('date', sample)).toBe('2026-06-26')
    expect(toDateSelectorPayload('datetime', sample)).toBe('2026-06-26 08:30')
    expect(toDateSelectorPayload('range', [sample, sampleEnd])).toBe(`2026-06-26${RANGE_PAYLOAD_SEPARATOR}2026-06-30`)
  })

  it('returns flatpickr-ready values for the three field types', () => {
    expect(toDateSelectorFlatpickrValue('date', '2026-06-26')).toBeInstanceOf(Date)
    expect(toDateSelectorFlatpickrValue('datetime', '2026-06-26 08:30')).toBeInstanceOf(Date)
    expect(toDateSelectorFlatpickrValue('range', `2026-06-20${RANGE_PAYLOAD_SEPARATOR}2026-06-26`)).toHaveLength(2)
  })

  it('keeps glass inline first, marks dock rail as favorite, and exposes 6 total candidates', () => {
    expect(DATE_SELECTOR_VARIANTS).toHaveLength(6)
    expect(DATE_SELECTOR_VARIANTS[0]?.key).toBe('glass')
    expect(DATE_SELECTOR_VARIANTS[0]?.accepted).toBe(true)
    expect(DATE_SELECTOR_VARIANTS.find((item) => item.key === 'dock')?.favorite).toBe(true)
    expect(DATE_SELECTOR_VARIANTS.find((item) => item.key === 'sage')?.library).toBe('flatpickr')
    expect(DATE_SELECTOR_VARIANTS.filter((item) => item.library === 'react-datepicker')).toHaveLength(4)
    expect(DATE_SELECTOR_VARIANTS.filter((item) => item.library === 'flatpickr')).toHaveLength(2)
  })
})
