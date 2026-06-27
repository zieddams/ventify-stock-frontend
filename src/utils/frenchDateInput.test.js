import { describe, expect, it } from 'vitest'

import {
  formatFrenchDateInputPayload,
  formatFrenchDateRangePayload,
  getFrenchDateInputDisplayFormat,
  getFrenchDateInputPlaceholder,
  getFrenchDateRangePlaceholder,
  normalizeFrenchDateInputType,
  parseFrenchDateRangeValue,
  parseFrenchDateInputValue,
  shouldUseDockRailDateInputs,
  usesMonthPicker,
  usesTimeInput,
} from './frenchDateInput'

describe('frenchDateInput helpers', () => {
  it('normalizes supported input types into the shared picker model', () => {
    expect(normalizeFrenchDateInputType('date')).toBe('date')
    expect(normalizeFrenchDateInputType('month')).toBe('month')
    expect(normalizeFrenchDateInputType('datetime')).toBe('datetime-local')
    expect(normalizeFrenchDateInputType('datetime-local')).toBe('datetime-local')
    expect(normalizeFrenchDateInputType('unexpected')).toBe('date')
  })

  it('parses and serializes date payloads without changing the expected value contract', () => {
    const selected = parseFrenchDateInputValue('date', '2026-06-26')

    expect(selected).toBeInstanceOf(Date)
    expect(formatFrenchDateInputPayload('date', selected)).toBe('2026-06-26')
  })

  it('parses and serializes month payloads against the first day of the chosen month', () => {
    const selected = parseFrenchDateInputValue('month', '2026-11')

    expect(selected).toBeInstanceOf(Date)
    expect(selected.getFullYear()).toBe(2026)
    expect(selected.getMonth()).toBe(10)
    expect(selected.getDate()).toBe(1)
    expect(formatFrenchDateInputPayload('month', selected)).toBe('2026-11')
  })

  it('parses and serializes datetime payloads with five-minute precision preserved', () => {
    const selected = parseFrenchDateInputValue('datetime-local', '2026-06-26T09:45')

    expect(selected).toBeInstanceOf(Date)
    expect(selected.getHours()).toBe(9)
    expect(selected.getMinutes()).toBe(45)
    expect(formatFrenchDateInputPayload('datetime-local', selected)).toBe('2026-06-26T09:45')
  })

  it('rejects invalid payloads instead of leaking broken values into the picker', () => {
    expect(parseFrenchDateInputValue('date', 'bad-value')).toBeNull()
    expect(parseFrenchDateInputValue('date', '2026-02-31')).toBeNull()
    expect(parseFrenchDateInputValue('month', '2026-13')).toBeNull()
    expect(parseFrenchDateInputValue('datetime-local', '2026-06-26 09:45')).toBeNull()
    expect(parseFrenchDateInputValue('datetime-local', '2026-02-31T09:45')).toBeNull()
    expect(formatFrenchDateInputPayload('date', null)).toBe('')
  })

  it('parses and serializes range payloads for the shared Dock Rail range field', () => {
    const [startDate, endDate] = parseFrenchDateRangeValue('2026-06-17', '2026-06-26')

    expect(startDate).toBeInstanceOf(Date)
    expect(endDate).toBeInstanceOf(Date)
    expect(formatFrenchDateRangePayload([startDate, endDate])).toEqual({
      from: '2026-06-17',
      to: '2026-06-26',
    })
    expect(formatFrenchDateRangePayload(null)).toEqual({
      from: '',
      to: '',
    })
    expect(getFrenchDateRangePlaceholder()).toBe('jj/mm/aaaa au jj/mm/aaaa')
  })

  it('exposes the Dock Rail display metadata for date, month, and datetime fields', () => {
    expect(getFrenchDateInputDisplayFormat('date')).toBe('dd/MM/yyyy')
    expect(getFrenchDateInputDisplayFormat('month')).toBe('MMMM yyyy')
    expect(getFrenchDateInputDisplayFormat('datetime-local')).toBe('dd/MM/yyyy HH:mm')

    expect(getFrenchDateInputPlaceholder('date')).toBe('jj/mm/aaaa')
    expect(getFrenchDateInputPlaceholder('month')).toBe('mois / annee')
    expect(getFrenchDateInputPlaceholder('datetime-local')).toBe('jj/mm/aaaa hh:mm')

    expect(usesMonthPicker('month')).toBe(true)
    expect(usesMonthPicker('date')).toBe(false)
    expect(usesTimeInput('datetime-local')).toBe(true)
    expect(usesTimeInput('date')).toBe(false)
  })

  it('keeps Dock Rail on dev hosts but disables it on the live production hostname', () => {
    expect(shouldUseDockRailDateInputs('dev.irtiwaa.ziedtech.com')).toBe(true)
    expect(shouldUseDockRailDateInputs('localhost')).toBe(true)
    expect(shouldUseDockRailDateInputs('irtiwaa.ziedtech.com')).toBe(false)
  })
})
