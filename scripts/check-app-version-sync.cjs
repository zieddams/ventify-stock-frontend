const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const appMetaPath = path.join(projectRoot, 'src', 'config', 'appMeta.js')

const { buildUpdatedAppMetaContent } = require('./sync-app-version.cjs')

if (!fs.existsSync(appMetaPath)) {
  console.log('[check-app-version] src/config/appMeta.js not found, skipping.')
  process.exit(0)
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const version = String(packageJson.version || '').trim()

if (!version) {
  throw new Error('[check-app-version] Missing version in package.json.')
}

const content = fs.readFileSync(appMetaPath, 'utf8')
const expectedContent = buildUpdatedAppMetaContent(content, version)

if (content !== expectedContent) {
  console.error(`[check-app-version] src/config/appMeta.js is out of sync. Expected ${version}. Run npm run sync:app-version.`)
  process.exit(1)
}

console.log(`[check-app-version] src/config/appMeta.js matches ${version}.`)
