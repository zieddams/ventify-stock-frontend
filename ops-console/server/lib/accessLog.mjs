import fs from 'node:fs/promises'

const ACCESS_LOG_PATTERN = /^(?<ip>\S+) \S+ \S+ \[(?<timestamp>[^\]]+)\] "(?<method>\S+) (?<path>\S+)(?: HTTP\/[0-9.]+)?" (?<status>\d{3}) \S+ "(?<referer>[^"]*)" "(?<userAgent>[^"]*)"$/

function parseTimestamp(value) {
  const normalized = value.replace(':', ' ')
  return new Date(normalized)
}

function createEmptySummary(label) {
  return {
    label,
    requestsLastHour: 0,
    errors4xxLastHour: 0,
    errors5xxLastHour: 0,
    statusCounts: {},
    topPaths: [],
    timeline: [],
    sampleSize: 0,
  }
}

export function parseAccessLogLine(line) {
  const match = ACCESS_LOG_PATTERN.exec(String(line ?? '').trim())

  if (!match?.groups) {
    return null
  }

  const path = match.groups.path.split('?')[0] || '/'

  return {
    ip: match.groups.ip,
    method: match.groups.method,
    path,
    status: Number(match.groups.status),
    timestamp: parseTimestamp(match.groups.timestamp),
    referer: match.groups.referer === '-' ? '' : match.groups.referer,
    userAgent: match.groups.userAgent,
  }
}

export function summarizeAccessLogText(text, options = {}) {
  const now = options.now ? new Date(options.now) : new Date()
  const windowMinutes = Number(options.windowMinutes ?? 60)
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-Number(options.maxLines ?? 4000))

  const summary = createEmptySummary(options.label ?? 'Traffic')
  const start = new Date(now.getTime() - windowMinutes * 60 * 1000)
  const bucketSizeMinutes = Number(options.bucketSizeMinutes ?? 10)
  const bucketCount = Math.max(1, Math.ceil(windowMinutes / bucketSizeMinutes))
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start.getTime() + index * bucketSizeMinutes * 60 * 1000)

    return {
      label: bucketStart.toISOString().slice(11, 16),
      count: 0,
    }
  })

  const pathCounts = {}

  for (const line of lines) {
    const parsed = parseAccessLogLine(line)

    if (!parsed || Number.isNaN(parsed.timestamp.getTime()) || parsed.timestamp < start || parsed.timestamp > now) {
      continue
    }

    summary.requestsLastHour += 1
    summary.sampleSize += 1
    summary.statusCounts[parsed.status] = (summary.statusCounts[parsed.status] ?? 0) + 1
    pathCounts[parsed.path] = (pathCounts[parsed.path] ?? 0) + 1

    if (parsed.status >= 500) {
      summary.errors5xxLastHour += 1
    } else if (parsed.status >= 400) {
      summary.errors4xxLastHour += 1
    }

    const diffMinutes = Math.max(0, Math.floor((parsed.timestamp.getTime() - start.getTime()) / 60000))
    const bucketIndex = Math.min(buckets.length - 1, Math.floor(diffMinutes / bucketSizeMinutes))
    buckets[bucketIndex].count += 1
  }

  summary.timeline = buckets
  summary.topPaths = Object.entries(pathCounts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }))

  return summary
}

export async function summarizeAccessLogFile(filePath, options = {}) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return summarizeAccessLogText(raw, options)
  } catch {
    return createEmptySummary(options.label ?? 'Traffic')
  }
}
