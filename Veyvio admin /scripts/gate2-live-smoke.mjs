/**
 * Live Gate 2 smoke: OPTIONS CORS, compliance settings, vehicle-reports hub,
 * override list, integration keys list, notification templates.
 */
import { resolveCommandApiEnv, bearerHeaders } from './lib/command-api-env.mjs'

const { api, anon } = resolveCommandApiEnv()

async function login(email, password) {
  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: bearerHeaders(anon),
    body: JSON.stringify({ email, password, rememberMe: true }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`login ${res.status}: ${JSON.stringify(body)}`)
  return body.accessToken
}

function ok(label) {
  console.log(`✓ ${label}`)
}

async function main() {
  // CORS preflight (regression from Failed to fetch)
  const opt = await fetch(`${api}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://veyvio-admin.pages.dev',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type,apikey',
    },
  })
  if (opt.status !== 200) throw new Error(`OPTIONS ${opt.status}`)
  ok('OPTIONS CORS preflight')

  const email = process.env.VEYVIO_PLATFORM_EMAIL || process.env.VEYVIO_ADMIN_EMAIL || 'admin@veyvio.test'
  const password =
    process.env.VEYVIO_PLATFORM_PASSWORD ||
    process.env.VEYVIO_ADMIN_PASSWORD ||
    process.env.VEYVIO_ISOLATION_PASSWORD
  if (!password) throw new Error('Set admin/platform password in env or .gate1-secrets.local.env')

  const token = await login(email, password)
  ok(`login ${email}`)

  const get = async (path) => {
    const res = await fetch(`${api}${path}`, { headers: bearerHeaders(anon, token) })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    return { status: res.status, body }
  }

  const settings = await get('/compliance/automation-settings')
  if (settings.status !== 200) throw new Error(`automation-settings ${settings.status}`)
  if (settings.body?.blockExpiredCpc !== true && settings.body?.blockExpiredCpc !== false) {
    throw new Error('automation-settings missing blockExpiredCpc')
  }
  ok('GET compliance/automation-settings')

  const hub = await get('/vehicle-reports/hub')
  if (hub.status !== 200) throw new Error(`vehicle-reports/hub ${hub.status}`)
  ok('GET vehicle-reports/hub')

  const overrides = await get('/overrides')
  if (overrides.status !== 200) throw new Error(`overrides ${overrides.status}`)
  ok('GET overrides')

  const keys = await get('/settings/integration-keys')
  if (keys.status !== 200) throw new Error(`integration-keys ${keys.status}`)
  ok('GET settings/integration-keys')

  const templates = await get('/notifications/templates?audience=yard')
  if (templates.status !== 200 || !Array.isArray(templates.body?.items)) {
    throw new Error(`notification templates ${templates.status}`)
  }
  ok('GET notifications/templates')

  const reports = await get('/reports/summary')
  if (reports.status !== 200) throw new Error(`reports/summary ${reports.status}`)
  if (!reports.body?.driverTelemetry) throw new Error('reports missing driverTelemetry')
  ok('GET reports/summary (telemetry)')

  console.log('gate2-live-smoke: PASS')
}

main().catch((err) => {
  console.error('gate2-live-smoke: FAIL', err.message || err)
  process.exit(1)
})
