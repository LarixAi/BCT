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

const DEFAULT_API = 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const DEFAULT_SUPABASE = 'https://qeckgqjrfbdyxchuncdt.supabase.co'

function normalizeApiUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return DEFAULT_API
  if (value.startsWith('/')) return `${DEFAULT_SUPABASE}${value}`.replace(/\/$/, '')
  return value.replace(/\/$/, '')
}

function normalizeSupabaseUrl(apiUrl, explicit) {
  const direct = String(explicit ?? '').trim()
  if (direct) return direct.replace(/\/$/, '')
  const derived = apiUrl.replace(/\/functions\/v1\/command-api\/?$/, '')
  if (derived && derived !== apiUrl) return derived
  return DEFAULT_SUPABASE
}

const API = normalizeApiUrl(process.env.VEYVIO_API_URL ?? process.env.VITE_API_URL)
const SUPABASE = normalizeSupabaseUrl(API, process.env.VEYVIO_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)
const ANON = String(process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const ISOLATION_PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD ?? 'VeyvioIsolation1!'

async function login(email, password, options = {}) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ email, password }),
  })
  let body = await res.json().catch(() => ({}))
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
    body = await confirm.json()
    assert.equal(confirm.status, 200, `MFA confirm failed for ${email}`)
  }

  if (body.requiresTenantSelection && !options.skipTenantSelection) {
    const tenantId = body.memberships?.[0]?.tenantId ?? body.memberships?.[0]?.companyId
    assert.ok(tenantId, `tenant selection required but no membership for ${email}`)
    const select = await fetch(`${API}/api/auth/select-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON,
        Authorization: `Bearer ${body.accessToken}`,
      },
      body: JSON.stringify({ companyId: tenantId, refreshToken: body.refreshToken }),
    })
    body = await select.json()
    assert.equal(select.status, 200, `tenant select failed for ${email}: ${JSON.stringify(body)}`)
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

async function driverLogin(email, password) {
  const res = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json().catch(() => ({}))
  assert.equal(res.status, 200, `driver login failed for ${email}: ${JSON.stringify(body)}`)
  return body.access_token
}

async function driverApi(method, path, token, body) {
  const res = await fetch(`${API}/${path}`, {
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
    status === 404 || status === 403 || status === 409 || status === 400,
    `expected 404/403/409/400 for ${label}, got ${status}`,
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

  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD, { skipTenantSelection: true })
  assert.ok(platform.accessToken, 'platform token missing')

  const seed = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seed.status), `seed-isolation failed: ${seed.status} ${JSON.stringify(seed.json)}`)
  const orgs = seed.json?.orgs ?? []
  assert.equal(orgs.length, 2, 'expected Org A and Org B fixtures')

  const orgA = orgs.find((o) => o.label === 'A')
  const orgB = orgs.find((o) => o.label === 'B')
  assert.ok(orgA?.vehicleId && orgA?.driverId && orgA?.dutyId, 'Org A fixture incomplete')
  assert.ok(orgB?.vehicleId && orgB?.driverId && orgB?.dutyId, 'Org B fixture incomplete')

  // The hosted seeder is authoritative for its reserved fixture password.
  // Local defaults may differ from the deployed secret.
  const sessionA = await login(orgA.email, orgA.password ?? ISOLATION_PASSWORD)
  const sessionB = await login(orgB.email, orgB.password ?? ISOLATION_PASSWORD)
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

  // Part F §1 — application scope: Command-only login cannot use Driver API
  const driverBootstrap = await api('GET', '/driver/bootstrap', platform.accessToken)
  assertDenied(driverBootstrap.status, 'command user on driver/bootstrap')
  const driverCode = driverBootstrap.json?.code ?? driverBootstrap.json?.error ?? ''
  assert.ok(
    driverCode === 'application_scope_forbidden' || driverCode === 'driver_account_missing',
    `expected scope or driver account denial, got ${JSON.stringify(driverBootstrap.json)}`,
  )

  // Command staff may still reach yard/hub (COMMAND or YARD scope)
  const yardHub = await api('GET', '/yard/hub', sessionA.accessToken)
  assert.equal(yardHub.status, 200, `command admin should reach yard/hub, got ${yardHub.status}`)

  const yardHubB = await api('GET', '/yard/hub', sessionB.accessToken)
  assert.equal(yardHubB.status, 200, `Org B yard hub failed: ${yardHubB.status}`)
  const yardHubBText = JSON.stringify(yardHubB.json ?? {})
  assert.ok(
    !yardHubBText.includes(orgA.vehicleRegistration),
    'Org B yard hub must not include Org A vehicle registration',
  )
  assert.ok(!yardHubBText.includes(orgA.vehicleId), 'Org B yard hub must not include Org A vehicle id')

  const yardCompanyMismatch = await api('POST', '/yard/mutations', sessionB.accessToken, {
    type: 'vehicle.move',
    companyId: orgA.companyId,
    payload: {
      vehicleId: orgB.vehicleId,
      destinationBay: 'P01',
      reason: 'isolation probe',
    },
  })
  assert.equal(yardCompanyMismatch.status, 403, 'yard mutation company mismatch')
  assert.equal(yardCompanyMismatch.json?.code, 'company_mismatch', 'expected company_mismatch code')

  const foreignTaskCreate = await api('POST', '/yard/mutations', sessionB.accessToken, {
    type: 'task.create',
    payload: {
      vehicleId: orgA.vehicleId,
      taskType: 'inspect_damage',
      title: 'Cross-tenant probe',
      instructions: 'must not create',
    },
  })
  assert.ok(
    [403, 404].includes(foreignTaskCreate.status),
    `foreign task.create expected 403/404, got ${foreignTaskCreate.status}`,
  )

  // F-06 — dispatch hard gates (requires seed-isolation driver accounts + lifecycle gates deployed)
  if (orgA.vorVehicleId && orgB.dutyId) {
    const crossVorAssign = await api('POST', `/duties/${orgB.dutyId}/assign`, sessionB.accessToken, {
      vehicleId: orgA.vorVehicleId,
    })
    assertDenied(crossVorAssign.status, 'cross-tenant VOR assign')
  }

  if (orgB.vorVehicleId && orgB.dutyId) {
    const vorAssignOwn = await api('POST', `/duties/${orgB.dutyId}/assign`, sessionB.accessToken, {
      vehicleId: orgB.vorVehicleId,
    })
    assert.equal(vorAssignOwn.status, 409, `VOR assign should be blocked, got ${vorAssignOwn.status}`)
    assert.equal(vorAssignOwn.json?.code, 'assignment_blocked', 'expected assignment_blocked for VOR vehicle')
  }

  if (orgA.publishedDutyId) {
    const driverToken = await driverLogin(
      orgA.email,
      orgA.password ?? ISOLATION_PASSWORD,
    )
    const driverBootstrap = await driverApi('GET', 'driver/bootstrap', driverToken)
    assert.equal(driverBootstrap.status, 200, `driver bootstrap failed: ${driverBootstrap.status}`)

    const signOnWithoutAck = await driverApi(
      'POST',
      `driver/duties/${orgA.publishedDutyId}/sign-on`,
      driverToken,
      { deviceId: 'isolation-smoke' },
    )
    assert.equal(signOnWithoutAck.status, 409, 'sign-on without acknowledgement must be blocked')
    assert.equal(
      signOnWithoutAck.json?.code,
      'acknowledgement_required',
      `expected acknowledgement_required, got ${JSON.stringify(signOnWithoutAck.json)}`,
    )

    const crossVehicleDefect = await driverApi('POST', 'driver/defects', driverToken, {
      vehicleId: orgB.vehicleId,
      description: 'Cross-tenant vehicle probe defect',
      severity: 'minor',
    })
    assert.ok(
      [403, 404].includes(crossVehicleDefect.status),
      `driver defect on foreign vehicle expected 403/404, got ${crossVehicleDefect.status}`,
    )
    const defectCode = crossVehicleDefect.json?.code ?? ''
    assert.ok(
      ['vehicle_not_assigned', 'not_found', 'company_mismatch'].includes(defectCode) ||
        crossVehicleDefect.status === 404,
      `expected vehicle_not_assigned or not_found, got ${JSON.stringify(crossVehicleDefect.json)}`,
    )

    const driverJourneyAckList = await driverApi(
      'GET',
      'driver/journey-sequence-acknowledgements',
      driverToken,
    )
    assert.equal(
      driverJourneyAckList.status,
      200,
      `driver journey-sequence acknowledgements list failed: ${driverJourneyAckList.status}`,
    )
    assert.ok(
      Array.isArray(driverJourneyAckList.json?.acknowledgements),
      'driver journey-sequence acknowledgements payload must be an array',
    )

    const foreignJourneyAckAdvance = await driverApi(
      'POST',
      `driver/journey-sequence-acknowledgements/${encodeURIComponent(`duty-trip-${orgB.dutyId ?? '00000000-0000-4000-8000-000000000099'}`)}/advance`,
      driverToken,
      { status: 'acknowledged' },
    )
    assertDenied(foreignJourneyAckAdvance.status, 'driver advance foreign journey-sequence acknowledgement')

    const crossVehicleAdBlue = await driverApi('POST', 'driver/adblue-refill', driverToken, {
      vehicleId: orgB.vehicleId,
      mileage: 10000,
      amountLitres: 5,
      fillType: 'top_up',
    })
    assert.ok(
      [403, 404].includes(crossVehicleAdBlue.status),
      `driver AdBlue on foreign vehicle expected 403/404, got ${crossVehicleAdBlue.status}`,
    )
    const adBlueCode = crossVehicleAdBlue.json?.code ?? ''
    assert.ok(
      ['vehicle_not_assigned', 'not_found', 'company_mismatch'].includes(adBlueCode) ||
        crossVehicleAdBlue.status === 404,
      `expected vehicle_not_assigned or not_found for AdBlue, got ${JSON.stringify(crossVehicleAdBlue.json)}`,
    )

    const crossVehicleParked = await driverApi('POST', 'driver/vehicle-parked', driverToken, {
      vehicleId: orgB.vehicleId,
      depotId: orgA.depotId ?? orgB.depotId,
      locationType: 'BAY',
      bayNumber: 1,
      keysReturned: true,
    })
    assert.ok(
      [403, 404].includes(crossVehicleParked.status),
      `driver vehicle-parked on foreign vehicle expected 403/404, got ${crossVehicleParked.status}`,
    )
    const parkedCode = crossVehicleParked.json?.code ?? ''
    assert.ok(
      ['vehicle_not_assigned', 'not_found', 'company_mismatch'].includes(parkedCode) ||
        crossVehicleParked.status === 404,
      `expected vehicle_not_assigned or not_found for vehicle-parked, got ${JSON.stringify(crossVehicleParked.json)}`,
    )
  }

  // F-18 / TD-010 — job execution, duty closeout, vehicle swap are company-scoped
  if (orgA.publishedDutyId) {
    const driverTokenA = await driverLogin(
      orgA.email,
      orgA.password ?? ISOLATION_PASSWORD,
    )
    const probeJobId = `isolation-exec-${orgA.companyId.slice(0, 8)}`
    const execClientId = `isolation-exec-${Date.now()}`

    const recordExec = await driverApi('POST', 'driver/jobs/execution', driverTokenA, {
      jobId: probeJobId,
      eventType: 'job_accepted',
      dutyId: orgA.publishedDutyId,
      clientId: execClientId,
    })
    assert.ok(
      [200, 201].includes(recordExec.status),
      `driver job execution record failed: ${recordExec.status} ${JSON.stringify(recordExec.json)}`,
    )

    const adminExecA = await api('GET', `/jobs/${probeJobId}/execution`, sessionA.accessToken)
    assert.equal(adminExecA.status, 200, `Org A job execution read failed: ${adminExecA.status}`)
    const eventsA = adminExecA.json?.events ?? []
    assert.ok(eventsA.length >= 1, 'Org A should see its own job execution events')

    const adminExecB = await api('GET', `/jobs/${probeJobId}/execution`, sessionB.accessToken)
    assert.equal(adminExecB.status, 200, `Org B job execution read failed: ${adminExecB.status}`)
    const eventsB = adminExecB.json?.events ?? []
    assert.equal(eventsB.length, 0, 'Org B must not see Org A job execution events')

    const crossCloseout = await driverApi('POST', 'driver/duty-closeout', driverTokenA, {
      dutyId: orgB.dutyId,
      jobId: probeJobId,
      payload: { notes: 'Cross-tenant closeout probe' },
      clientId: `isolation-closeout-cross-${Date.now()}`,
    })
    // Handler maps HttpError → 400 today; deny-by-default either way.
    assert.ok(
      [400, 403, 404].includes(crossCloseout.status),
      `cross-tenant duty closeout expected 400/403/404, got ${crossCloseout.status}`,
    )
    const closeoutDenied =
      crossCloseout.status !== 400 ||
      /not assigned|forbidden|not found|duty_not_assigned/i.test(
        `${crossCloseout.json?.code ?? ''} ${crossCloseout.json?.message ?? ''}`,
      )
    assert.ok(closeoutDenied, `cross-tenant closeout must not succeed: ${JSON.stringify(crossCloseout.json)}`)

    const crossSwapVehicle = await driverApi('POST', 'driver/vehicle-swap-requests', driverTokenA, {
      dutyId: orgA.publishedDutyId,
      currentVehicleId: orgA.vehicleId,
      requestedVehicleId: orgB.vehicleId,
      reason: 'Cross-tenant vehicle swap probe',
      clientId: `isolation-swap-cross-${Date.now()}`,
    })
    assert.ok(
      [400, 403, 404].includes(crossSwapVehicle.status),
      `cross-tenant vehicle swap expected 400/403/404, got ${crossSwapVehicle.status}`,
    )

    const swapListB = await api('GET', '/vehicle-swap-requests', sessionB.accessToken)
    assert.equal(swapListB.status, 200, `Org B swap list failed: ${swapListB.status}`)
    const swapPayload = JSON.stringify(swapListB.json ?? [])
    assert.ok(!swapPayload.includes(orgA.vehicleId), 'Org B swap list must not include Org A vehicle id')
    assert.ok(!swapPayload.includes(orgA.driverId), 'Org B swap list must not include Org A driver id')

    const foreignSwapId = '00000000-0000-4000-8000-000000000098'
    const crossSwapApprove = await api('POST', `/vehicle-swap-requests/${foreignSwapId}/approve`, sessionB.accessToken, {
      notes: 'Cross-tenant approve probe',
    })
    assertDenied(crossSwapApprove.status, 'cross-tenant vehicle swap approve')

    const crossJourneyReorder = await api(
      'POST',
      `/operational-trips/${encodeURIComponent(`duty-trip-${orgA.dutyId}`)}/journey-sequence/reorder`,
      sessionB.accessToken,
      {
        orderedPickupJobIds: [
          'duty-stop-00000000-0000-4000-8000-000000000001-stop-pickup-00000000-0000-4000-8000-000000000002',
        ],
        reason: 'operational_optimisation',
        dutyId: orgA.dutyId,
        actorName: 'Isolation probe',
      },
    )
    assertDenied(crossJourneyReorder.status, 'cross-tenant journey-sequence reorder')

    const crossJourneyMove = await api(
      'POST',
      `/operational-trips/${encodeURIComponent(`duty-trip-${orgA.dutyId}`)}/journey-sequence/move`,
      sessionB.accessToken,
      {
        jobIds: [
          'duty-stop-00000000-0000-4000-8000-000000000001-stop-pickup-00000000-0000-4000-8000-000000000002',
        ],
        action: 'leave_unassigned',
        dutyId: orgA.dutyId,
        actorName: 'Isolation probe',
      },
    )
    assertDenied(crossJourneyMove.status, 'cross-tenant journey-sequence move')

    const crossJourneyAck = await api(
      'POST',
      `/operational-trips/${encodeURIComponent(`duty-trip-${orgA.dutyId}`)}/journey-sequence/acknowledgement`,
      sessionB.accessToken,
      { status: 'acknowledged' },
    )
    assertDenied(crossJourneyAck.status, 'cross-tenant journey-sequence acknowledgement')

    const crossDriverJourneyAckList = await api(
      'GET',
      '/driver/journey-sequence-acknowledgements',
      sessionB.accessToken,
    )
    assertDenied(crossDriverJourneyAckList.status, 'command user on driver journey-sequence acknowledgements')

    const crossDriverJourneyAckAdvance = await api(
      'POST',
      `/driver/journey-sequence-acknowledgements/${encodeURIComponent(`duty-trip-${orgA.dutyId}`)}/advance`,
      sessionB.accessToken,
      { status: 'acknowledged' },
    )
    assertDenied(crossDriverJourneyAckAdvance.status, 'cross-tenant driver journey-sequence acknowledgement advance')
  }

  console.log('tenant-isolation: ok')
  console.log(
    JSON.stringify(
      {
        orgA: {
          companyId: orgA.companyId,
          vehicleId: orgA.vehicleId,
          driverId: orgA.driverId,
          dutyId: orgA.dutyId,
          publishedDutyId: orgA.publishedDutyId ?? null,
          vorVehicleId: orgA.vorVehicleId ?? null,
          defectId: orgA.defectId ?? null,
        },
        orgB: {
          companyId: orgB.companyId,
          vehicleId: orgB.vehicleId,
          driverId: orgB.driverId,
          dutyId: orgB.dutyId,
          vorVehicleId: orgB.vorVehicleId ?? null,
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
