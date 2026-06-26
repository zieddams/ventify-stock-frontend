import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  FIXED_DATE_TIME_LOCALE,
  setRuntimeLocale,
} from '../i18n/locales'
import { formatDate, formatDateTime, formatTime } from './format'

const SAMPLE_DATE = '2026-06-26T14:05:00.000Z'

describe('format date helpers', () => {
  beforeEach(() => {
    setRuntimeLocale('ar-TN')
  })

  afterEach(() => {
    setRuntimeLocale(DEFAULT_LOCALE)
  })

  it('keeps calendar dates in forced French formatting even in Arabic mode', () => {
    expect(formatDate(SAMPLE_DATE)).toBe(new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(SAMPLE_DATE)))
  })

  it('keeps date-time and time outputs in forced French formatting even in Arabic mode', () => {
    expect(formatDateTime(SAMPLE_DATE)).toBe(new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(SAMPLE_DATE)))

    expect(formatTime(SAMPLE_DATE)).toBe(new Intl.DateTimeFormat(FIXED_DATE_TIME_LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(SAMPLE_DATE)))
  })
})
