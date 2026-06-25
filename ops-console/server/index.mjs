import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import axios from 'axios'
import si from 'systeminformation'
import { Octokit } from '@octokit/rest'
import { summarizeAccessLogFile } from './lib/accessLog.mjs'
import { formatShortSha, parseExpoConfig, parsePackageVersion, parseWebAppVersion } from './lib/versionParsers.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.resolve(projectRoot, 'dist')
const packageJson = JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'))

dotenv.config({ path: path.resolve(projectRoot, '.env.production') })
dotenv.config({ path: path.resolve(projectRoot, '.env') })

function parseRoleList(value, fallback = 'admin,developer') {
  return String(value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function hasRequiredRole(userRole, allowedRoles) {
  return allowedRoles.includes(String(userRole || '').trim())
}

const execFileAsync = promisify(execFile)
const PORT = Number(process.env.OPS_PORT || 3110)
const HOST = process.env.OPS_HOST || '127.0.0.1'
const PRODUCT_API_BASE = process.env.PRODUCT_API_BASE || 'https://irtiwaa.ziedtech.com/api/v1'
const PRODUCT_WEB_URL = process.env.PRODUCT_WEB_URL || 'https://irtiwaa.ziedtech.com/web-platform/'
const PRODUCT_API_PING_URL = process.env.PRODUCT_API_PING_URL || 'https://irtiwaa.ziedtech.com/api/v1/system/ping'
const PRODUCT_ACCESS_LOG = process.env.PRODUCT_ACCESS_LOG || '/var/log/nginx/access.log'
const OPS_ACCESS_LOG = process.env.OPS_ACCESS_LOG || '/var/log/nginx/ops.irtiwaa.access.log'
const OPS_PUBLIC_URL = process.env.OPS_PUBLIC_URL || 'https://ops.irtiwaa.ziedtech.com'
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'zieddams'
const MOBILE_RELEASES_URL = process.env.MOBILE_RELEASES_URL || 'https://github.com/zieddams/ventify-stock/releases'
const OPS_ALLOWED_ROLES = parseRoleList(process.env.OPS_ALLOWED_ROLES)
const OPS_DISPATCH_ROLES = parseRoleList(process.env.OPS_DISPATCH_ROLES || process.env.OPS_ALLOWED_ROLES)

const WORKFLOWS = [
  {
    key: 'ops',
    label: 'Ops console deploy',
    repo: 'ventify-stock-frontend',
    workflowId: 'manual-deploy-ops-console.yml',
    description: 'Build and deploy the standalone ops console.',
    allowedRoles: OPS_DISPATCH_ROLES,
    inputs: [
      { id: 'version_bump', type: 'choice', options: ['none', 'patch', 'minor', 'major'], defaultValue: 'none' },
    ],
  },
  {
    key: 'web',
    label: 'Web platform deploy',
    repo: 'ventify-stock-frontend',
    workflowId: 'manual-deploy.yml',
    description: 'Deploy the commercial web platform.',
    allowedRoles: OPS_DISPATCH_ROLES,
    inputs: [
      { id: 'version_bump', type: 'choice', options: ['none', 'patch', 'minor', 'major'], defaultValue: 'none' },
    ],
  },
  {
    key: 'api',
    label: 'API deploy',
    repo: 'ventify-stock-api',
    workflowId: 'manual-deploy.yml',
    description: 'Run PHPUnit then deploy the Laravel API.',
    allowedRoles: OPS_DISPATCH_ROLES,
    inputs: [
      { id: 'run_migrations', type: 'boolean', defaultValue: false },
    ],
  },
  {
    key: 'mobile',
    label: 'Mobile release prep',
    repo: 'ventify-stock',
    workflowId: 'manual-release.yml',
    description: 'Prepare the next mobile release package.',
    allowedRoles: OPS_DISPATCH_ROLES,
    inputs: [
      { id: 'version_bump', type: 'choice', options: ['none', 'patch', 'minor', 'major'], defaultValue: 'patch' },
      { id: 'version_code_increment', type: 'string', defaultValue: '1' },
    ],
  },
]

const productApi = axios.create({
  baseURL: PRODUCT_API_BASE,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({ auth: process.env.GITHUB_TOKEN })
  : null

function getToken(req) {
  const header = String(req.headers.authorization || '')
  if (!header.startsWith('Bearer ')) {
    return ''
  }

  return header.slice('Bearer '.length).trim()
}

async function productRequest(method, url, token, options = {}) {
  return productApi.request({
    method,
    url,
    data: options.data,
    params: options.params,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

function normalizeError(error) {
  if (error.response) {
    return {
      status: error.response.status,
      body: error.response.data,
    }
  }

  return {
    status: 500,
    body: {
      message: error.message || 'Unexpected server error',
    },
  }
}

function decodeGitHubFileContent(payload) {
  if (!payload || Array.isArray(payload) || payload.type !== 'file' || !payload.content) {
    return ''
  }

  try {
    return Buffer.from(String(payload.content).replace(/\n/g, ''), payload.encoding || 'base64').toString('utf8')
  } catch {
    return ''
  }
}

async function getUserFromToken(token) {
  const response = await productRequest('get', '/auth/me', token)
  const user = response.data

  if (!hasRequiredRole(user?.role, OPS_ALLOWED_ROLES)) {
    const roleError = new Error('This console is reserved to admin and developer roles.')
    roleError.response = {
      status: 403,
      data: {
        message: 'This console is reserved to admin and developer roles.',
      },
    }
    throw roleError
  }

  return user
}

function requireAuth(allowedRoles = OPS_ALLOWED_ROLES) {
  return async (req, res, next) => {
    try {
      const token = getToken(req)

      if (!token) {
        return res.status(401).json({ message: 'Missing access token.' })
      }

      const user = await getUserFromToken(token)

      if (!hasRequiredRole(user.role, allowedRoles)) {
        return res.status(403).json({ message: 'This action requires a higher role.' })
      }

      req.accessToken = token
      req.user = user
      return next()
    } catch (error) {
      const normalized = normalizeError(error)
      return res.status(normalized.status).json(normalized.body)
    }
  }
}

async function safeExec(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: 8_000,
      maxBuffer: 1024 * 1024,
    })

    return String(result.stdout || '').trim()
  } catch {
    return ''
  }
}

async function getPm2Processes() {
  const output = await safeExec('pm2', ['jlist'])

  if (!output) {
    return []
  }

  try {
    const payload = JSON.parse(output)
    return payload.map((process) => ({
      name: process.name,
      status: process.pm2_env?.status || 'unknown',
      cpu: Number(process.monit?.cpu || 0),
      memory: Number(process.monit?.memory || 0),
      uptime: Number(process.pm2_env?.pm_uptime || 0),
    }))
  } catch {
    return []
  }
}

async function getServiceState(name) {
  const output = await safeExec('systemctl', ['is-active', name])
  return output || 'unknown'
}

async function getInfrastructureOverview() {
  const [load, memory, disks, pm2Processes, nginxState, phpState, fail2banState] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    getPm2Processes(),
    getServiceState('nginx'),
    getServiceState('php8.5-fpm'),
    getServiceState('fail2ban'),
  ])

  const rootDisk = disks.find((disk) => disk.mount === '/') || disks[0] || null

  return {
    generatedAt: new Date().toISOString(),
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      uptimeMinutes: Math.round(os.uptime() / 60),
      cpuLoad: Number(load.currentLoad || 0),
      memoryUsed: Number(memory.active || 0),
      memoryTotal: Number(memory.total || 0),
      diskUsed: Number(rootDisk?.used || 0),
      diskTotal: Number(rootDisk?.size || 0),
    },
    services: [
      { name: 'nginx', status: nginxState },
      { name: 'php8.5-fpm', status: phpState },
      { name: 'fail2ban', status: fail2banState },
    ],
    processes: pm2Processes,
  }
}

async function getTrafficOverview() {
  const [product, ops] = await Promise.all([
    summarizeAccessLogFile(PRODUCT_ACCESS_LOG, { label: 'Irtiwaa platform' }),
    summarizeAccessLogFile(OPS_ACCESS_LOG, { label: 'Ops console' }),
  ])

  return {
    generatedAt: new Date().toISOString(),
    product,
    ops,
  }
}

function sanitizeInputs(workflow, payload = {}) {
  const next = {}

  for (const input of workflow.inputs) {
    const rawValue = payload[input.id]

    if (input.type === 'boolean') {
      next[input.id] = rawValue === true || rawValue === 'true' ? 'true' : 'false'
      continue
    }

    if (input.type === 'choice') {
      const choice = String(rawValue ?? input.defaultValue)
      next[input.id] = input.options.includes(choice) ? choice : input.defaultValue
      continue
    }

    next[input.id] = String(rawValue ?? input.defaultValue ?? '').trim()
  }

  return next
}

async function getRepoFileContent(repo, filePath, ref = 'main') {
  if (!octokit) {
    return ''
  }

  try {
    const response = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo,
      path: filePath,
      ref,
    })

    return decodeGitHubFileContent(response.data)
  } catch {
    return ''
  }
}

function summarizeWorkflowRun(run) {
  if (!run) {
    return null
  }

  return {
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    branch: run.head_branch,
    headSha: run.head_sha,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  }
}

async function getLatestSuccessfulWorkflowRun(repo, workflowId) {
  if (!octokit) {
    return null
  }

  try {
    const response = await octokit.actions.listWorkflowRuns({
      owner: GITHUB_OWNER,
      repo,
      workflow_id: workflowId,
      per_page: 20,
    })

    const successfulRun = (response.data.workflow_runs || []).find((run) => run.conclusion === 'success')
    return summarizeWorkflowRun(successfulRun)
  } catch {
    return null
  }
}

async function getLatestRelease(repo) {
  if (!octokit) {
    return null
  }

  try {
    const response = await octokit.repos.getLatestRelease({
      owner: GITHUB_OWNER,
      repo,
    })

    return {
      tagName: response.data.tag_name,
      name: response.data.name,
      htmlUrl: response.data.html_url,
      targetCommitish: response.data.target_commitish,
      publishedAt: response.data.published_at,
      assets: (response.data.assets || []).map((asset) => ({
        id: asset.id,
        name: asset.name,
        size: asset.size,
        updatedAt: asset.updated_at,
        downloadUrl: asset.browser_download_url,
      })),
    }
  } catch {
    return null
  }
}

async function getVersionOverview(token) {
  const [opsDeploy, webDeploy, apiDeploy, mobilePrepare, mobileRelease, developerTools] = await Promise.all([
    getLatestSuccessfulWorkflowRun('ventify-stock-frontend', 'manual-deploy-ops-console.yml'),
    getLatestSuccessfulWorkflowRun('ventify-stock-frontend', 'manual-deploy.yml'),
    getLatestSuccessfulWorkflowRun('ventify-stock-api', 'manual-deploy.yml'),
    getLatestSuccessfulWorkflowRun('ventify-stock', 'manual-release.yml'),
    getLatestRelease('ventify-stock'),
    productRequest('get', '/developer-tools', token).then((response) => response.data).catch(() => null),
  ])

  const [opsPackageSource, webMetaSource, mobilePackageSource, mobileExpoSource] = await Promise.all([
    getRepoFileContent('ventify-stock-frontend', 'ops-console/package.json', opsDeploy?.headSha || opsDeploy?.branch || 'main'),
    getRepoFileContent('ventify-stock-frontend', 'src/config/appMeta.js', webDeploy?.headSha || webDeploy?.branch || 'main'),
    getRepoFileContent('ventify-stock', 'package.json', mobilePrepare?.headSha || mobilePrepare?.branch || mobileRelease?.targetCommitish || 'main'),
    getRepoFileContent('ventify-stock', 'app.config.js', mobilePrepare?.headSha || mobilePrepare?.branch || mobileRelease?.targetCommitish || 'main'),
  ])

  const opsVersion = parsePackageVersion(opsPackageSource) || packageJson.version
  const webVersion = parseWebAppVersion(webMetaSource)
  const mobilePackageVersion = parsePackageVersion(mobilePackageSource)
  const mobileExpoVersion = parseExpoConfig(mobileExpoSource)
  const system = developerTools?.system ?? null

  return {
    generatedAt: new Date().toISOString(),
    surfaces: [
      {
        key: 'ops',
        label: 'Ops console',
        environment: 'Standalone production control plane',
        url: OPS_PUBLIC_URL,
        version: opsVersion || packageJson.version,
        sourceVersion: opsVersion || packageJson.version,
        runtimeLabel: `Node ${process.version.replace(/^v/, '')}`,
        buildLabel: opsDeploy?.headSha ? `Deploy ${formatShortSha(opsDeploy.headSha)}` : '',
        deployment: opsDeploy,
      },
      {
        key: 'web',
        label: 'Web platform',
        environment: 'Business-facing production frontend',
        url: PRODUCT_WEB_URL,
        version: webVersion || '',
        sourceVersion: webVersion || '',
        runtimeLabel: system?.frontend_url ? 'Public frontend live' : 'Awaiting frontend metadata',
        buildLabel: webDeploy?.headSha ? `Deploy ${formatShortSha(webDeploy.headSha)}` : '',
        deployment: webDeploy,
      },
      {
        key: 'api',
        label: 'API',
        environment: 'Laravel production backend',
        url: PRODUCT_API_PING_URL,
        version: apiDeploy?.headSha ? formatShortSha(apiDeploy.headSha) : '',
        sourceVersion: apiDeploy?.headSha ? formatShortSha(apiDeploy.headSha) : '',
        runtimeLabel: [system?.laravel ? `Laravel ${system.laravel}` : '', system?.php ? `PHP ${system.php}` : '']
          .filter(Boolean)
          .join(' · '),
        buildLabel: system?.db_ok ? 'Database reachable' : 'Database check required',
        deployment: apiDeploy,
      },
      {
        key: 'mobile',
        label: 'Mobile',
        environment: 'Public release and prepared candidate',
        url: mobileRelease?.htmlUrl || MOBILE_RELEASES_URL,
        version: mobileRelease?.tagName || (mobilePackageVersion ? `v${mobilePackageVersion}` : ''),
        sourceVersion: mobilePackageVersion || mobileExpoVersion.version || '',
        publicVersion: mobileRelease?.tagName || '',
        candidateVersion: mobilePackageVersion || mobileExpoVersion.version || '',
        candidateBuild: mobileExpoVersion.versionCode || '',
        runtimeLabel: mobilePrepare
          ? `Prepared v${mobilePackageVersion || mobileExpoVersion.version || 'n/a'} · code ${mobileExpoVersion.versionCode || 'n/a'}`
          : 'No validated release-prep run yet',
        buildLabel: mobileRelease?.publishedAt ? `Published ${mobileRelease.publishedAt}` : '',
        deployment: mobilePrepare,
        release: mobileRelease,
      },
    ],
  }
}

async function getWorkflowRuns() {
  if (!octokit) {
    return WORKFLOWS.map((workflow) => ({
      ...workflow,
      runs: [],
      integrationReady: false,
      integrationMessage: 'GitHub token not configured on the VPS runtime.',
    }))
  }

  const runs = await Promise.all(WORKFLOWS.map(async (workflow) => {
    try {
      const response = await octokit.actions.listWorkflowRuns({
        owner: GITHUB_OWNER,
        repo: workflow.repo,
        workflow_id: workflow.workflowId,
        per_page: 5,
      })

      return {
        ...workflow,
        integrationReady: true,
        integrationMessage: '',
        runs: (response.data.workflow_runs || []).map((run) => summarizeWorkflowRun(run)),
      }
    } catch (error) {
      return {
        ...workflow,
        integrationReady: false,
        integrationMessage: error.message || 'Unable to read workflow runs.',
        runs: [],
      }
    }
  }))

  return runs
}

const app = express()

app.disable('x-powered-by')
app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Irtiwaa Ops Console',
    version: packageJson.version,
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  })
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const response = await productApi.post('/auth/login', {
      email: String(req.body?.email || '').trim(),
      password: String(req.body?.password || ''),
    })
    const token = response.data?.token
    const user = response.data?.user

    if (!token || !user) {
      return res.status(502).json({ message: 'Product API returned an incomplete login payload.' })
    }

    if (!OPS_ALLOWED_ROLES.includes(String(user.role || '').trim())) {
      await productRequest('post', '/auth/logout', token).catch(() => null)
      return res.status(403).json({ message: 'This console is reserved to admin and developer roles.' })
    }

    return res.json({ token, user })
  } catch (error) {
    const normalized = normalizeError(error)
    return res.status(normalized.status).json(normalized.body)
  }
})

app.get('/api/auth/me', requireAuth(), async (req, res) => {
  res.json(req.user)
})

app.post('/api/auth/logout', requireAuth(), async (req, res) => {
  try {
    await productRequest('post', '/auth/logout', req.accessToken)
  } catch {
    // Ignore logout propagation failures and always clear the local session.
  }

  res.json({ ok: true })
})

app.get('/api/meta', requireAuth(), async (req, res) => {
  res.json({
    generatedAt: new Date().toISOString(),
    consoleVersion: packageJson.version,
    allowedRoles: OPS_ALLOWED_ROLES,
    dispatchRoles: OPS_DISPATCH_ROLES,
    canDispatch: hasRequiredRole(req.user.role, OPS_DISPATCH_ROLES),
    productApiBase: PRODUCT_API_BASE,
    workflows: WORKFLOWS.map((workflow) => ({
      key: workflow.key,
      label: workflow.label,
      repo: workflow.repo,
      workflowId: workflow.workflowId,
      description: workflow.description,
      allowedRoles: workflow.allowedRoles,
      inputs: workflow.inputs,
    })),
  })
})

app.get('/api/app/overview', requireAuth(), async (req, res) => {
  try {
    const [systemStatus, developerTools, stats, sessions, terrain, bugReports] = await Promise.all([
      productRequest('get', '/system/public-status', req.accessToken),
      productRequest('get', '/developer-tools', req.accessToken),
      productRequest('get', '/stats', req.accessToken),
      productRequest('get', '/sessions', req.accessToken),
      productRequest('get', '/monitor/terrain', req.accessToken),
      productRequest('get', '/bug-reports', req.accessToken),
    ])

    res.json({
      generatedAt: new Date().toISOString(),
      systemStatus: systemStatus.data ?? {},
      developerTools: developerTools.data ?? {},
      stats: stats.data ?? {},
      sessions: Array.isArray(sessions.data) ? sessions.data : [],
      terrain: terrain.data ?? { stats: {}, reps: [] },
      bugReports: Array.isArray(bugReports.data) ? bugReports.data : [],
      user: req.user,
    })
  } catch (error) {
    const normalized = normalizeError(error)
    res.status(normalized.status).json(normalized.body)
  }
})

app.get('/api/infrastructure/overview', requireAuth(), async (req, res) => {
  try {
    res.json(await getInfrastructureOverview())
  } catch (error) {
    const normalized = normalizeError(error)
    res.status(normalized.status).json(normalized.body)
  }
})

app.get('/api/traffic/overview', requireAuth(), async (req, res) => {
  try {
    res.json(await getTrafficOverview())
  } catch (error) {
    const normalized = normalizeError(error)
    res.status(normalized.status).json(normalized.body)
  }
})

app.get('/api/workflows/overview', requireAuth(), async (req, res) => {
  try {
    const workflows = await getWorkflowRuns()

    res.json({
      generatedAt: new Date().toISOString(),
      canDispatch: hasRequiredRole(req.user.role, OPS_DISPATCH_ROLES),
      workflows,
    })
  } catch (error) {
    const normalized = normalizeError(error)
    res.status(normalized.status).json(normalized.body)
  }
})

app.get('/api/versions/overview', requireAuth(), async (req, res) => {
  try {
    res.json(await getVersionOverview(req.accessToken))
  } catch (error) {
    const normalized = normalizeError(error)
    res.status(normalized.status).json(normalized.body)
  }
})

app.post('/api/workflows/:workflowKey/dispatch', requireAuth(OPS_DISPATCH_ROLES), async (req, res) => {
  const workflow = WORKFLOWS.find((item) => item.key === req.params.workflowKey)

  if (!workflow) {
    return res.status(404).json({ message: 'Unknown workflow key.' })
  }

  if (!hasRequiredRole(req.user?.role, workflow.allowedRoles || OPS_DISPATCH_ROLES)) {
    return res.status(403).json({ message: 'This workflow is not available for your role.' })
  }

  if (!octokit) {
    return res.status(503).json({ message: 'GitHub token is not configured on the VPS runtime.' })
  }

  const ref = String(req.body?.ref || 'main').trim()

  if (!/^[A-Za-z0-9._/-]+$/.test(ref)) {
    return res.status(422).json({ message: 'Invalid git ref.' })
  }

  try {
    const inputs = sanitizeInputs(workflow, req.body)

    await octokit.actions.createWorkflowDispatch({
      owner: GITHUB_OWNER,
      repo: workflow.repo,
      workflow_id: workflow.workflowId,
      ref,
      inputs,
    })

    res.status(202).json({
      ok: true,
      workflowKey: workflow.key,
      ref,
      inputs,
      dispatchedAt: new Date().toISOString(),
    })
  } catch (error) {
    const normalized = normalizeError(error)
    res.status(normalized.status).json(normalized.body)
  }
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next()
    }

    return res.sendFile(path.resolve(distDir, 'index.html'))
  })
}

app.listen(PORT, HOST, () => {
  console.log(`Irtiwaa Ops Console listening on http://${HOST}:${PORT}`)
})
