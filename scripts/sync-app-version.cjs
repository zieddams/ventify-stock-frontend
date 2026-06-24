const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const appMetaPath = path.join(projectRoot, 'src', 'config', 'appMeta.js')

function buildUpdatedAppMetaContent(content, version) {
  return content.replace(
    /export const APP_VERSION = '[^']*'/,
    `export const APP_VERSION = '${version}'`,
  )
}

function syncAppVersionFile({
  packagePath = packageJsonPath,
  targetPath = appMetaPath,
} = {}) {
  if (!fs.existsSync(targetPath)) {
    return {
      updated: false,
      version: null,
      message: '[sync-app-version] src/config/appMeta.js not found, skipping.',
    }
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const version = String(packageJson.version || '').trim()

  if (!version) {
    throw new Error('[sync-app-version] Missing version in package.json.')
  }

  const content = fs.readFileSync(targetPath, 'utf8')
  const updatedContent = buildUpdatedAppMetaContent(content, version)

  if (updatedContent === content) {
    return {
      updated: false,
      version,
      message: `[sync-app-version] appMeta already matches ${version}.`,
    }
  }

  fs.writeFileSync(targetPath, updatedContent)

  return {
    updated: true,
    version,
    message: `[sync-app-version] Updated appMeta to ${version}.`,
  }
}

if (require.main === module) {
  const result = syncAppVersionFile()
  console.log(result.message)
}

module.exports = {
  buildUpdatedAppMetaContent,
  syncAppVersionFile,
}
