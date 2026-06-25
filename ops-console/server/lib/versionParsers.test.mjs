import { describe, expect, it } from 'vitest'
import { formatShortSha, parseExpoConfig, parsePackageVersion, parseWebAppVersion } from './versionParsers.mjs'

describe('versionParsers', () => {
  it('reads package versions from package.json payloads', () => {
    expect(parsePackageVersion(JSON.stringify({ version: '1.3.21' }))).toBe('1.3.21')
    expect(parsePackageVersion('not-json')).toBe('')
  })

  it('reads the web platform version from appMeta source', () => {
    expect(parseWebAppVersion("export const APP_VERSION = '2.11.18'")).toBe('2.11.18')
    expect(parseWebAppVersion('export const APP_NAME = "Gestion de vente"')).toBe('')
  })

  it('reads expo version and android versionCode from app config source', () => {
    expect(parseExpoConfig("module.exports = { version: '1.3.21', android: { versionCode: 28 } }")).toEqual({
      version: '1.3.21',
      versionCode: '28',
    })
  })

  it('shortens commit hashes safely', () => {
    expect(formatShortSha('faab37d915bc64')).toBe('faab37d')
    expect(formatShortSha('')).toBe('')
  })
})
