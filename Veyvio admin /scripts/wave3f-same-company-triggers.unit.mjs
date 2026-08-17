/**
 * FIX-P1-013 forge tests — service_role cross-company link attempts must fail at DB layer.
 * Run after backend:reset (local): node scripts/wave3f-same-company-triggers.unit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = process.env.VEYVIO_3FD_OUT || '/tmp/veyvio-3fd'
const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD || 'VeyvioIsolation1!'

const results = []
function record(row) {
  results.push(row)
  const mark = row.ok ? 'PASS' : 'FAIL'
  console.log(`${mark} [${row.phase}] ${row.name}: ${row.detail}`)
}

async function service(method, pathName, { body, prefer } = {}) {
  const headers = {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    Accept: 'application/json',
    Prefer: prefer || 'return=representation',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, json, text }
}

function expectCrossTenantRejected(status, text) {
  const hay = typeof text === 'string' ? text : JSON.stringify(text)
  return /cross-tenant link refused|"code":"23514"/i.test(hay)
}

async function ensureUser(email, label) {
  const create = await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Isolation', last_name: label },
    }),
  })
  const created = await create.json()
  if (create.ok && created.id) return created.id
  const listed = await fetch(`${API}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })
  const users = (await listed.json()).users || []
  const hit = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  if (!hit) throw new Error(`Could not create/find ${email}`)
  return hit.id
}

async function seedOrg(label, email, tradingName, depotCode, registration) {
  const userId = await ensureUser(email, label)
  await service('POST', '/rest/v1/users', {
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id: userId,
      email,
      first_name: 'Isolation',
      last_name: label,
      mfa_enabled: false,
    },
  }).catch(() => null)
  await fetch(`${API}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      email,
      first_name: 'Isolation',
      last_name: label,
      mfa_enabled: false,
    }),
  })

  let companyRows = await service(
    'GET',
    `/rest/v1/companies?trading_name=eq.${encodeURIComponent(tradingName)}&select=id`,
  )
  let companyId = companyRows.json?.[0]?.id
  if (!companyId) {
    const inserted = await service('POST', '/rest/v1/companies', {
      body: { legal_name: tradingName, trading_name: tradingName, status: 'active' },
    })
    companyId = inserted.json[0].id
  }

  let depots = await service(
    'GET',
    `/rest/v1/depots?company_id=eq.${companyId}&code=eq.${depotCode}&select=id`,
  )
  let depotId = depots.json?.[0]?.id
  if (!depotId) {
    const created = await service('POST', '/rest/v1/depots', {
      body: {
        company_id: companyId,
        code: depotCode,
        name: `${label} Depot`,
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    depotId = created.json[0].id
  }

  let vehicles = await service(
    'GET',
    `/rest/v1/vehicles?company_id=eq.${companyId}&registration=eq.${encodeURIComponent(registration)}&select=id`,
  )
  let vehicleId = vehicles.json?.[0]?.id
  if (!vehicleId) {
    const created = await service('POST', '/rest/v1/vehicles', {
      body: {
        company_id: companyId,
        fleet_number: `ISO-${label}1`,
        registration,
        make: 'Ford',
        model: 'Transit',
        year: 2022,
        vehicle_class: 'minibus',
        fuel_type: 'diesel',
        seat_capacity: 8,
        wheelchair_capacity: 0,
        primary_depot_id: depotId,
        operational_status: 'available',
        ownership_type: 'owned',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    vehicleId = created.json[0].id
  }

  const reg2 = `${registration}-ALT`
  let vehicle2Lookup = await service(
    'GET',
    `/rest/v1/vehicles?company_id=eq.${companyId}&registration=eq.${encodeURIComponent(reg2)}&select=id`,
  )
  let vehicle2Id = vehicle2Lookup.json?.[0]?.id
  if (!vehicle2Id) {
    const created = await service('POST', '/rest/v1/vehicles', {
      body: {
        company_id: companyId,
        fleet_number: `ISO-${label}2`,
        registration: reg2,
        make: 'Ford',
        model: 'Transit',
        year: 2022,
        vehicle_class: 'minibus',
        fuel_type: 'diesel',
        seat_capacity: 8,
        wheelchair_capacity: 0,
        primary_depot_id: depotId,
        operational_status: 'available',
        ownership_type: 'owned',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    vehicle2Id = created.json[0].id
  }

  let staffId
  const staffLookup = await service(
    'GET',
    `/rest/v1/staff_members?company_id=eq.${companyId}&employee_number=eq.${encodeURIComponent(`ISO-EMP-${label}`)}&select=id`,
  )
  if (staffLookup.json?.[0]?.id) {
    staffId = staffLookup.json[0].id
  } else {
    const staff = await service('POST', '/rest/v1/staff_members', {
      body: {
        company_id: companyId,
        first_name: 'Iso',
        last_name: label,
        employee_number: `ISO-EMP-${label}`,
        job_title: 'Driver',
        primary_depot_id: depotId,
        employment_status: 'active',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    staffId = staff.json[0].id
  }

  let drivers = await service(
    'GET',
    `/rest/v1/drivers?company_id=eq.${companyId}&driver_number=eq.${encodeURIComponent(`ISO-DRV-${label}`)}&select=id`,
  )
  let driverId = drivers.json?.[0]?.id
  if (!driverId) {
    const created = await service('POST', '/rest/v1/drivers', {
      body: {
        company_id: companyId,
        staff_id: staffId,
        driver_number: `ISO-DRV-${label}`,
        status: 'active',
        primary_depot_id: depotId,
        employment_type: 'employee',
        licence_country: 'GB',
        licence_expiry_date: '2030-01-01',
        vehicle_categories: ['D1'],
        start_date: '2024-01-01',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    driverId = created.json[0].id
  }

  const today = new Date().toISOString().slice(0, 10)
  let dutyLookup = await service(
    'GET',
    `/rest/v1/duties?company_id=eq.${companyId}&driver_id=eq.${driverId}&select=id&limit=1`,
  )
  let dutyId = dutyLookup.json?.[0]?.id
  if (!dutyId) {
    const duty = await service('POST', '/rest/v1/duties', {
      body: {
        company_id: companyId,
        driver_id: driverId,
        depot_id: depotId,
        vehicle_id: vehicleId,
        service_date: today,
        status: 'planned',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    dutyId = duty.json[0].id
  }

  let runLookup = await service(
    'GET',
    `/rest/v1/runs?company_id=eq.${companyId}&run_reference=eq.${encodeURIComponent(`ISO-RUN-${label}`)}&select=id`,
  )
  let runId = runLookup.json?.[0]?.id
  if (!runId) {
    const run = await service('POST', '/rest/v1/runs', {
      body: {
        company_id: companyId,
        run_reference: `ISO-RUN-${label}`,
        service_date: today,
        depot_id: depotId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        status: 'planned',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    runId = run.json[0].id
  }

  let tripLookup = await service(
    'GET',
    `/rest/v1/trips?company_id=eq.${companyId}&trip_reference=eq.${encodeURIComponent(`ISO-TRIP-${label}`)}&select=id`,
  )
  let tripId = tripLookup.json?.[0]?.id
  if (!tripId) {
    const trip = await service('POST', '/rest/v1/trips', {
      body: {
        company_id: companyId,
        trip_reference: `ISO-TRIP-${label}`,
        service_date: today,
        depot_id: depotId,
        status: 'planned',
        created_by: userId,
        updated_by: userId,
        source_app: 'COMMAND',
      },
    })
    tripId = trip.json[0].id
  }

  return {
    label,
    userId,
    companyId,
    depotId,
    vehicleId,
    vehicle2Id,
    staffId,
    driverId,
    dutyId,
    runId,
    tripId,
  }
}

async function expectForgeRejected(name, op) {
  const r = await op()
  const ok = expectCrossTenantRejected(r.status, r.text)
  record({
    phase: 'forge',
    name,
    ok,
    detail: `status=${r.status} body=${(r.text || '').slice(0, 160)}`,
  })
  return ok
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  record({
    phase: 'meta',
    name: 'authority_note',
    ok: true,
    detail: 'Structural forge uses service_role; cross-company INSERT/UPDATE must fail with 23514',
  })

  const orgA = await seedOrg('A', 'isolation-a@veyvio.test', 'Isolation Transport A Ltd', 'ISO-A', 'ISO1 AAA')
  const orgB = await seedOrg('B', 'isolation-b@veyvio.test', 'Isolation Transport B Ltd', 'ISO-B', 'ISO2 BBB')
  record({
    phase: 'setup',
    name: 'seed_orgs',
    ok: Boolean(orgA.companyId && orgB.companyId && orgA.dutyId && orgB.driverId),
    detail: `A=${orgA.companyId} B=${orgB.companyId}`,
  })

  const today = new Date().toISOString().slice(0, 10)

  await expectForgeRejected('forge_duties_cross_company_driver', () =>
    service('POST', '/rest/v1/duties', {
      body: {
        company_id: orgA.companyId,
        driver_id: orgB.driverId,
        depot_id: orgA.depotId,
        service_date: today,
        status: 'planned',
        source_app: 'COMMAND',
      },
    }),
  )

  await expectForgeRejected('forge_defects_cross_company_vehicle', () =>
    service('POST', '/rest/v1/defects', {
      body: {
        company_id: orgA.companyId,
        vehicle_id: orgB.vehicleId,
        defect_reference: `FORGE-DEF-${Date.now()}`,
        description: 'forge probe',
        source_app: 'COMMAND',
      },
    }),
  )

  await expectForgeRejected('forge_drivers_cross_company_depot', () =>
    service('POST', '/rest/v1/drivers', {
      body: {
        company_id: orgA.companyId,
        driver_number: `FORGE-DRV-${Date.now()}`,
        primary_depot_id: orgB.depotId,
        status: 'active',
        source_app: 'COMMAND',
      },
    }),
  )

  await expectForgeRejected('forge_runs_cross_company_driver', () =>
    service('POST', '/rest/v1/runs', {
      body: {
        company_id: orgA.companyId,
        run_reference: `FORGE-RUN-${Date.now()}`,
        service_date: today,
        driver_id: orgB.driverId,
        status: 'planned',
        source_app: 'COMMAND',
      },
    }),
  )

  await expectForgeRejected('forge_trip_assignments_cross_company_trip', () =>
    service('POST', '/rest/v1/trip_assignments', {
      body: {
        company_id: orgA.companyId,
        trip_id: orgB.tripId,
        driver_id: orgA.driverId,
        status: 'active',
        source_app: 'COMMAND',
      },
    }),
  )

  await expectForgeRejected('forge_duty_live_positions_cross_company_duty', () =>
    service('POST', '/rest/v1/duty_live_positions', {
      body: {
        company_id: orgA.companyId,
        duty_id: orgB.dutyId,
        driver_id: orgA.driverId,
        latitude: 51.5,
        longitude: -0.1,
        recorded_at: new Date().toISOString(),
        source_app: 'DRIVER',
      },
    }),
  )

  await expectForgeRejected('forge_vehicle_swap_cross_company_vehicle', () =>
    service('POST', '/rest/v1/vehicle_swap_requests', {
      body: {
        company_id: orgA.companyId,
        duty_id: orgA.dutyId,
        driver_id: orgA.driverId,
        current_vehicle_id: orgA.vehicleId,
        requested_vehicle_id: orgB.vehicleId,
        reason: 'forge probe',
      },
    }),
  )

  await expectForgeRejected('forge_fuel_records_cross_company_vehicle', () =>
    service('POST', '/rest/v1/fuel_records', {
      body: {
        company_id: orgA.companyId,
        vehicle_id: orgB.vehicleId,
        litres: 10,
        fuel_type: 'diesel',
        client_id: `forge-fuel-${Date.now()}`,
      },
    }),
  )

  await expectForgeRejected('forge_duty_runs_cross_company', () =>
    service('POST', '/rest/v1/duty_runs', {
      body: {
        duty_id: orgA.dutyId,
        run_id: orgB.runId,
        sequence: 99,
      },
    }),
  )

  await expectForgeRejected('forge_run_trips_cross_company', () =>
    service('POST', '/rest/v1/run_trips', {
      body: {
        run_id: orgA.runId,
        trip_id: orgB.tripId,
        sequence: 99,
      },
    }),
  )

  {
    const okDuty = await service('PATCH', `/rest/v1/duties?id=eq.${orgA.dutyId}`, {
      body: { vehicle_id: orgA.vehicle2Id },
    })
    record({
      phase: 'control',
      name: 'same_company_duty_update_allowed',
      ok: okDuty.status >= 200 && okDuty.status < 300,
      detail: `status=${okDuty.status}`,
    })
  }

  const failed = results.filter((r) => !r.ok)
  const report = {
    generated_at: new Date().toISOString(),
    fix: 'FIX-P1-013',
    api: API,
    summary: {
      total: results.length,
      pass: results.filter((r) => r.ok).length,
      fail: failed.length,
    },
    results,
    failures: failed,
  }
  const outPath = path.join(OUT_DIR, 'same-company-triggers.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log(`Summary: ${report.summary.pass}/${report.summary.total} pass; ${report.summary.fail} fail`)
  if (failed.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
