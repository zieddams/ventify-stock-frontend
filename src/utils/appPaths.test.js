import { describe, expect, it } from 'vitest'

import { appPathFromBase, normalizeBasePath, resolveAppBasePath } from './appPaths'

describe('appPaths', () => {
  it('normalizes configured base paths', () => {
    expect(normalizeBasePath(' /web-platform/ ')).toBe('/web-platform')
    expect(resolveAppBasePath('reports')).toBe('/reports')
    expect(resolveAppBasePath('/')).toBe('/')
  })

  it('builds child routes without duplicate slashes', () => {
    expect(appPathFromBase('/web-platform/', '/dashboard')).toBe('/web-platform/dashboard')
    expect(appPathFromBase('/web-platform', 'reports')).toBe('/web-platform/reports')
    expect(appPathFromBase('/', '/login')).toBe('/login')
    expect(appPathFromBase('/web-platform', '/')).toBe('/web-platform')
  })
})
