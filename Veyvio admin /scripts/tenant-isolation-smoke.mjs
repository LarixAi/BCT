/**
 * Release-blocking tenant isolation checks for Command API + storage.
 *
 * Run:
 *   VEYVIO_ANON_KEY=... npm run test:tenant-isolation
 *
 * Optional:
 *   VEYVIO_API_URL=...
 *   VEYVIO_SUPABASE_URL=...
 *   VEYVIO_ISOLATION_PASSWORD=...
 *   VEYVIO_PLATFORM_EMAIL=admin@veyvio.test
 *   VEYVIO_PLATFORM_PASSWORD=...
 */
import assert from 'node:assert/strict'

const API = process.env.VEYVIO_API_URL ?? 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const SUPABASE =
  process.env.VEYVIO_SUPABASE_URL ?? API.replace(/\/functions\/v1\/command-api\/?$/, '')
const ANON = process.env.VEYVIO_ANON_KEY ?? ''
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const ISOLATION_PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD ?? 'VeyvioIsolation1!'

async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ email, password, rememberMe: false }),
  })
  const body = await res.json().catch(() => ({}))
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(body)}`)
  if (body.requiresMfaChallenge && body.devMfaCode && body.mfaChallengeId) {
    const confirm = await fetch(`${API}/api/auth/login/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
      },
      body: JSON.stringify({
        challengeId: body.mfaChallengeId,
        code: body.devMfaCode,
        companyId: body.pendingCompanyId,
      }),
    })
    const confirmed = await confirm.json()
    assert.equal(confirm.status, 200, `MFA confirm failed for ${email}`)
    return confirmed
  }
  return body
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, json }
}

function assertDenied(status, label) {
  assert.ok(
    status === 404 || status === 403 || status === 409,
    `expected 404/403/409 for ${label}, got ${status}`,
  )
}

async function listStoragePrefix(token, companyId) {
  const res = await fetch(`${SUPABASE}/storage/v1/object/list/driver-documents`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: `${companyId}/`, limit: 20 }),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

async function main() {
  if (!ANON) {
    if (process.env.CI) {
      console.error('VEYVIO_ANON_KEY is required in CI for tenant isolation')
      process.exit(1)
    }
    console.log('Skip: set VEYVIO_ANON_KEY to run isolation tests against hosted API')
    return
  }

  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
  assert.ok(platform.accessToken, 'platform token missing')

  const seed = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seed.status), `seed-isolation failed: ${seed.status} ${JSON.stringify(seed.json)}`)
  const orgs = seed.json?.orgs ?? []
  assert.equal(orgs.length, 2, 'expected Org A and Org B fixtures')

  const orgA = orgs.find((o) => o.label === 'A')
  const orgB = orgs.find((o) => o.label === 'B')
  assert.ok(orgA?.vehicleId && orgA?.driverId && orgA?.dutyId, 'Org A fixture incomplete')
  assert.ok(orgB?.vehicleId && orgB?.driverId && orgB?.dutyId, 'Org B fixture incomplete')

  const sessionA = await login(orgA.email, ISOLATION_PASSWORD)
  const sessionB = await login(orgB.email, ISOLATION_PASSWORD)
  assert.ok(sessionA.accessToken && sessionB.accessToken)

  // Positive: each org can read its own vehicle
  const ownA = await api('GET', `/vehicles/${orgA.vehicleId}/profile`, sessionA.accessToken)
  assert.equal(ownA.status, 200, `Org A should read own vehicle, got ${ownA.status}`)
  const ownB = await api('GET', `/vehicles/${orgB.vehicleId}/profile`, sessionB.accessToken)
  assert.equal(ownB.status, 200, `Org B should read own vehicle, got ${ownB.status}`)

  // Cross-tenant reads
  const crossVehicle = await api('GET', `/vehicles/${orgA.vehicleId}/profile`, sessionB.accessToken)
  assertDenied(crossVehicle.status, 'cross-tenant vehicle')
  assert.ok(
    !crossVehicle.json || crossVehicle.json.registrationNumber !== orgA.vehicleRegistration,
    'cross-tenant vehicle must not leak payload',
  )

  const crossDriver = await api('GET', `/drivers/${orgA.driverId}/profile`, sessionB.accessToken)
  assertDenied(crossDriver.status, 'cross-tenant driver')

  const crossDuty = await api('GET', `/duties/${orgA.dutyId}`, sessionB.accessToken)
  assertDenied(crossDuty.status, 'cross-tenant duty')

  // List must not include foreign registration
  const listB = await api('GET', '/vehicles/profiles', sessionB.accessToken)
  assert.equal(listB.status, 200, `Org B vehicle list failed: ${listB.status}`)
  const listPayload = JSON.stringify(listB.json ?? {})
  assert.ok(!listPayload.includes(orgA.vehicleRegistration), 'Org B list must not include Org A registration')
  assert.ok(!listPayload.includes(orgA.vehicleId), 'Org B list must not include Org A vehicle id')

  // Assign / link: B cannot attach A vehicle to B duty; B cannot mutate A duty
  const crossAssignVehicle = await api('POST', `/duties/${orgB.dutyId}/assign`, sessionB.accessToken, {
    vehicleId: orgA.vehicleId,
  })
  assertDenied(crossAssignVehicle.status, 'cross-tenant vehicle assign')

  const crossAssignDuty = await api('POST', `/duties/${orgA.dutyId}/assign`, sessionB.accessToken, {
    vehicleId: orgB.vehicleId,
  })
  assertDenied(crossAssignDuty.status, 'cross-tenant duty assign')

  const crossCreate = await api('POST', '/duties', sessionB.accessToken, {
    driverId: orgA.driverId,
    vehicleId: orgB.vehicleId,
    serviceDate: new Date().toISOString().slice(0, 10),
  })
  assertDenied(crossCreate.status, 'cross-tenant duty create')

  // Defects / reports hubs — foreign ids must not appear
  if (orgA.defectId) {
    const hubB = await api('GET', '/defects/hub', sessionB.accessToken)
    assert.equal(hubB.status, 200, `defects hub failed: ${hubB.status}`)
    const hubText = JSON.stringify(hubB.json ?? {})
    assert.ok(!hubText.includes(orgA.defectId), 'Org B defects hub must not include Org A defect')
  }

  const reportsB = await api('GET', '/reports/summary', sessionB.accessToken)
  assert.ok([200, 403].includes(reportsB.status), `reports/summary unexpected ${reportsB.status}`)
  if (reportsB.status === 200) {
    const reportText = JSON.stringify(reportsB.json ?? {})
    assert.ok(!reportText.includes(orgA.vehicleRegistration), 'reports must not leak Org A registration')
    assert.ok(!reportText.includes(orgA.companyId), 'reports must not leak Org A company id')
  }

  // Storage: B cannot list/read Org A company prefix
  if (orgA.storageProbePath && orgA.companyId) {
    const listForeign = await listStoragePrefix(sessionB.accessToken, orgA.companyId)
    assert.ok([200, 400, 403].includes(listForeign.status), `storage list unexpected ${listForeign.status}`)
    const names = Array.isArray(listForeign.json)
      ? listForeign.json.map((row) => String(row.name ?? row.id ?? ''))
      : []
    assert.equal(names.length, 0, `Org B must not list Org A storage objects, got ${JSON.stringify(names)}`)

    const listOwn = await listStoragePrefix(sessionA.accessToken, orgA.companyId)
    assert.equal(listOwn.status, 200, `Org A storage list failed: ${listOwn.status}`)
    const ownNames = Array.isArray(listOwn.json)
      ? listOwn.json.map((row) => String(row.name ?? ''))
      : []
    assert.ok(
      ownNames.some((n) => n.includes('isolation-probe') || orgA.storageProbePath.endsWith(n)),
      `Org A should see isolation probe, got ${JSON.stringify(ownNames)}`,
    )
  }

  // Guaranteed foreign UUID
  const foreignId = '00000000-0000-4000-8000-000000000099'
  const foreign = await api('GET', `/vehicles/${foreignId}/profile`, sessionA.accessToken)
  assertDenied(foreign.status, 'foreign vehicle')

  const unauth = await api('GET', '/vehicles/profiles', ANON)
  assert.ok([401, 403, 409].includes(unauth.status), 'unauthenticated list must fail')

  console.log('tenant-isolation: ok')
  console.log(
    JSON.stringify(
      {
        orgA: {
          companyId: orgA.companyId,
          vehicleId: orgA.vehicleId,
          driverId: orgA.driverId,
          dutyId: orgA.dutyId,
          defectId: orgA.defectId ?? null,
        },
        orgB: {
          companyId: orgB.companyId,
          vehicleId: orgB.vehicleId,
          driverId: orgB.driverId,
          dutyId: orgB.dutyId,
        },
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
