import { describe, expect, it } from 'vitest'
import { parseAccessLogLine, summarizeAccessLogText } from './accessLog.mjs'

describe('access log parser', () => {
  it('parses a combined nginx access log line', () => {
    const line = '102.152.211.168 - - [24/Jun/2026:13:11:19 +0000] "GET /api/v1/stats HTTP/2.0" 200 5042 "https://irtiwaa.ziedtech.com/web-platform/developer-tools" "Mozilla/5.0"'
    const parsed = parseAccessLogLine(line)

    expect(parsed).toMatchObject({
      ip: '102.152.211.168',
      method: 'GET',
      path: '/api/v1/stats',
      status: 200,
    })
  })

  it('summarizes recent traffic into buckets and top paths', () => {
    const text = [
      '10.0.0.1 - - [24/Jun/2026:13:00:00 +0000] "GET /api/v1/stats HTTP/2.0" 200 1 "-" "UA"',
      '10.0.0.2 - - [24/Jun/2026:13:08:00 +0000] "GET /api/v1/stats HTTP/2.0" 500 1 "-" "UA"',
      '10.0.0.3 - - [24/Jun/2026:13:24:00 +0000] "GET /web-platform/ HTTP/2.0" 404 1 "-" "UA"',
    ].join('\n')

    const summary = summarizeAccessLogText(text, {
      now: '2026-06-24T13:30:00.000Z',
      windowMinutes: 60,
      bucketSizeMinutes: 10,
    })

    expect(summary.requestsLastHour).toBe(3)
    expect(summary.errors5xxLastHour).toBe(1)
    expect(summary.errors4xxLastHour).toBe(1)
    expect(summary.topPaths[0]).toEqual({ path: '/api/v1/stats', count: 2 })
    expect(summary.timeline).toHaveLength(6)
  })
})
