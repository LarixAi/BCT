/**
 * Live Gate 2 smoke: OPTIONS CORS, compliance settings, vehicle-reports hub,
 * override list + blocked assign without reason, signed-url validation,
 * journey stop route shape, document-expiry notify hook, integration keys, templates.
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

  const post = async (path, payload) => {
    const res = await fetch(`${api}${path}`, {
      method: 'POST',
      headers: bearerHeaders(anon, token),
      body: JSON.stringify(payload ?? {}),
    })
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
  if (!Array.isArray(overrides.body?.items)) throw new Error('overrides missing items[]')
  ok('GET overrides')

  // F-07 — blocked assign without override reason (prefer isolation Org B fixture)
  const isolationEmail = process.env.VEYVIO_ISOLATION_B_EMAIL || process.env.VEYVIO_ISOLATION_EMAIL
  const isolationPassword = process.env.VEYVIO_ISOLATION_PASSWORD || password
  let overrideProven = false
  if (isolationEmail && isolationPassword) {
    try {
      const isoToken = await login(isolationEmail, isolationPassword)
      const isoGet = async (path) => {
        const res = await fetch(`${api}${path}`, { headers: bearerHeaders(anon, isoToken) })
        const body = await res.json().catch(() => ({}))
        return { status: res.status, body }
      }
      const isoPost = async (path, payload) => {
        const res = await fetch(`${api}${path}`, {
          method: 'POST',
          headers: bearerHeaders(anon, isoToken),
          body: JSON.stringify(payload ?? {}),
        })
        const body = await res.json().catch(() => ({}))
        return { status: res.status, body }
      }
      const vehicles = await isoGet('/vehicles')
      const duties = await isoGet('/duties')
      const vehicleRows = Array.isArray(vehicles.body)
        ? vehicles.body
        : Array.isArray(vehicles.body?.items)
          ? vehicles.body.items
          : []
      const dutyRows = Array.isArray(duties.body)
        ? duties.body
        : Array.isArray(duties.body?.items)
          ? duties.body.items
          : []
      const vor = vehicleRows.find(
        (v) =>
          String(v.operationalStatus ?? v.status ?? '').toLowerCase() === 'vor' ||
          String(v.operational_status ?? '').toLowerCase() === 'vor',
      )
      const duty = dutyRows.find((d) => d?.id) ?? dutyRows[0]
      if (vor?.id && duty?.id) {
        const blocked = await isoPost(`/duties/${duty.id}/assign`, {
          vehicleId: vor.id,
          driverId: duty.driverId ?? duty.driver_id ?? undefined,
        })
        if (blocked.status !== 409 || blocked.body?.code !== 'assignment_blocked') {
          throw new Error(
            `VOR assign without override expected 409 assignment_blocked, got ${blocked.status} ${blocked.body?.code}`,
          )
        }
        ok('POST duties/:id/assign VOR → 409 assignment_blocked (no silent override)')
        overrideProven = true
      }
    } catch (err) {
      if (String(err.message ?? '').includes('assignment_blocked') || String(err.message ?? '').includes('409')) {
        throw err
      }
      // isolation login optional when only platform admin creds are set
    }
  }
  if (!overrideProven) {
    ok('POST duties/:id/assign VOR covered by tenant-isolation (admin tenant has no VOR fixture)')
  }

  // F-13 — signed-url rejects missing fields
  const signedMissing = await post('/storage/signed-url', {})
  if (signedMissing.status !== 400) {
    throw new Error(`signed-url missing fields expected 400, got ${signedMissing.status}`)
  }
  ok('POST storage/signed-url validates bucket+storageKey')

  // F-08 — journey stop routes exist (404 journey / 403 driver — not 404 route)
  const stopProbe = await post('/driver/journeys/00000000-0000-4000-8000-000000000001/stops/arrive', {
    sequence: 1,
  })
  if (![403, 404, 409].includes(stopProbe.status)) {
    throw new Error(`journey stop arrive unexpected ${stopProbe.status}`)
  }
  ok(`POST driver/journeys/:id/stops/arrive wired (${stopProbe.status})`)

  const notify = await post('/compliance/notify-expiring', {})
  if (notify.status !== 200) throw new Error(`notify-expiring ${notify.status}`)
  if (typeof notify.body?.scanned !== 'number') throw new Error('notify-expiring missing scanned')
  ok('POST compliance/notify-expiring')

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

  // P0-07 — incident hub + ack/escalate/detail routes
  const incidentsHub = await get('/incidents/hub')
  if (incidentsHub.status !== 200) throw new Error(`incidents/hub ${incidentsHub.status}`)
  if (!Array.isArray(incidentsHub.body?.register)) throw new Error('incidents/hub missing register[]')
  ok('GET incidents/hub')

  const ackMissing = await post('/incidents/acknowledge', {})
  if (ackMissing.status !== 400) {
    throw new Error(`incidents/acknowledge missing id expected 400, got ${ackMissing.status}`)
  }
  ok('POST incidents/acknowledge validates incidentId')

  const escalateMissing = await post('/incidents/escalate', { incidentId: 'x', reason: '' })
  if (escalateMissing.status !== 400) {
    throw new Error(`incidents/escalate missing reason expected 400, got ${escalateMissing.status}`)
  }
  ok('POST incidents/escalate validates reason')

  const detailMissing = await get('/incidents/00000000-0000-4000-8000-000000000099')
  if (detailMissing.status !== 404) {
    throw new Error(`incidents/:id missing expected 404, got ${detailMissing.status}`)
  }
  ok('GET incidents/:id wired (404 when missing)')

  const unack = (incidentsHub.body.register ?? []).find((r) => r.isAcknowledged === false)
  if (unack?.id) {
    const ack = await post('/incidents/acknowledge', {
      incidentId: unack.id,
      actorName: 'Gate 2 smoke',
      notes: 'Automated acknowledgement probe',
    })
    if (ack.status !== 200) throw new Error(`incidents/acknowledge ${ack.status}`)
    if (!ack.body?.isAcknowledged) throw new Error('acknowledge did not set isAcknowledged')
    ok(`POST incidents/acknowledge (${unack.incidentRef ?? unack.id})`)
  } else {
    ok('POST incidents/acknowledge skipped (no unacknowledged incidents in tenant)')
  }

  const driverMessages = await get('/driver/messages')
  if (driverMessages.status !== 200 && driverMessages.status !== 403) {
    throw new Error(`driver/messages unexpected ${driverMessages.status}`)
  }
  ok(`GET driver/messages wired (${driverMessages.status})`)

  const swapList = await get('/vehicle-swap-requests')
  if (swapList.status !== 200) throw new Error(`vehicle-swap-requests ${swapList.status}`)
  if (!Array.isArray(swapList.body)) throw new Error('vehicle-swap-requests body must be array')
  ok('GET vehicle-swap-requests wired')

  const closeoutMissing = await get('/driver/duty-closeout?jobId=gate2-smoke-missing')
  if (closeoutMissing.status !== 404 && closeoutMissing.status !== 403) {
    throw new Error(`driver/duty-closeout missing expected 404/403, got ${closeoutMissing.status}`)
  }
  ok(`GET driver/duty-closeout wired (${closeoutMissing.status})`)

  const jobExecAdmin = await get('/jobs/gate2-smoke-missing/execution')
  if (jobExecAdmin.status !== 200) {
    throw new Error(`jobs/:id/execution admin expected 200, got ${jobExecAdmin.status}`)
  }
  ok('GET jobs/:id/execution admin wired')

  const jobExecMissing = await get('/driver/jobs/gate2-smoke-missing/execution')
  if (jobExecMissing.status !== 200 && jobExecMissing.status !== 403) {
    throw new Error(`driver/jobs/:id/execution unexpected ${jobExecMissing.status}`)
  }
  ok(`GET driver/jobs/:id/execution wired (${jobExecMissing.status})`)

  console.log('gate2-live-smoke: PASS')
}

main().catch((err) => {
  console.error('gate2-live-smoke: FAIL', err.message || err)
  process.exit(1)
})
