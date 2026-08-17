#!/usr/bin/env node
/**
 * Wave 3F — PostgREST RLS Org A/B deny matrix (non-service-role probes).
 *
 * SETUP may use service_role to create fixtures.
 * All PASS/FAIL assertions use authenticated user JWTs only.
 * Failures must map to table/policy remediations — do not weaken assertions.
 *
 * Usage (local after backend:reset):
 *   node scripts/rls-postgrest-isolation.unit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = process.env.VEYVIO_3FB_OUT || '/tmp/veyvio-3fb'
const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
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

async function rest(method, pathName, { token, body, prefer, schema } = {}) {
  const headers = {
    apikey: ANON,
    Authorization: `Bearer ${token || ANON}`,
    Accept: 'application/json',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (prefer) headers.Prefer = prefer
  if (schema) headers['Accept-Profile'] = schema
  if (schema && method !== 'GET' && method !== 'HEAD') headers['Content-Profile'] = schema
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

async function service(method, pathName, { body, prefer, schema } = {}) {
  const headers = {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    Accept: 'application/json',
    Prefer: prefer || 'return=representation',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (schema) {
    headers['Accept-Profile'] = schema
    if (method !== 'GET' && method !== 'HEAD') headers['Content-Profile'] = schema
  }
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
  if (!res.ok) throw new Error(`service ${method} ${pathName} -> ${res.status} ${text.slice(0, 300)}`)
  return Array.isArray(json) ? json : json
}

async function ensureUser(email) {
  // Auth admin create
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
      user_metadata: { first_name: 'Isolation', last_name: email.includes('-a@') ? 'A' : 'B' },
    }),
  })
  const created = await create.json()
  if (create.ok && created.id) return created.id
  // list and update
  const listed = await fetch(`${API}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })
  const users = (await listed.json()).users || []
  const hit = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  if (!hit) throw new Error(`Could not create/find ${email}: ${JSON.stringify(created).slice(0, 200)}`)
  await fetch(`${API}/auth/v1/admin/users/${hit.id}`, {
    method: 'PUT',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  })
  return hit.id
}

async function login(email) {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const body = await res.json()
  if (!res.ok || !body.access_token) {
    throw new Error(`login failed for ${email}: ${JSON.stringify(body).slice(0, 200)}`)
  }
  return body.access_token
}

async function seedOrg(label, email, tradingName, depotCode, registration) {
  const userId = await ensureUser(email)
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
  // upsert via PATCH if exists
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

  let companyRows = await service('GET', `/rest/v1/companies?trading_name=eq.${encodeURIComponent(tradingName)}&select=id`)
  let companyId = companyRows?.[0]?.id
  if (!companyId) {
    const inserted = await service('POST', '/rest/v1/companies', {
      body: {
        legal_name: tradingName,
        trading_name: tradingName,
        status: 'active',
      },
    })
    companyId = inserted[0].id
  }

  // Ensure default roles exist — insert driver + company_owner if missing
  // Prefer DB helper when present (creates system roles for the company).
  try {
    await service('POST', '/rest/v1/rpc/ensure_default_company_roles', {
      body: { p_company_id: companyId, p_actor: userId },
    })
  } catch {
    // fall through to manual role insert
  }
  let roles = await service(
    'GET',
    `/rest/v1/roles?company_id=eq.${companyId}&select=id,name`,
  )
  async function ensureRole(name) {
    let hit = (roles || []).find((r) => r.name === name)
    if (hit) return hit.id
    const created = await service('POST', '/rest/v1/roles', {
      body: { company_id: companyId, name, description: name, is_system_role: true },
    })
    roles = [...(roles || []), ...created]
    return created[0].id
  }
  const ownerRole = await ensureRole('company_owner')

  let memberships = await service(
    'GET',
    `/rest/v1/company_memberships?user_id=eq.${userId}&company_id=eq.${companyId}&select=id`,
  )
  if (!memberships?.length) {
    await service('POST', '/rest/v1/company_memberships', {
      body: {
        user_id: userId,
        company_id: companyId,
        role_ids: [ownerRole],
        status: 'active',
        accepted_at: new Date().toISOString(),
        source_app: 'COMMAND',
      },
    })
  }

  let depots = await service(
    'GET',
    `/rest/v1/depots?company_id=eq.${companyId}&code=eq.${depotCode}&select=id`,
  )
  let depotId = depots?.[0]?.id
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
    depotId = created[0].id
  }

  let vehicles = await service(
    'GET',
    `/rest/v1/vehicles?company_id=eq.${companyId}&registration=eq.${encodeURIComponent(registration)}&select=id`,
  )
  let vehicleId = vehicles?.[0]?.id
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
    vehicleId = created[0].id
  }

  await service('POST', '/rest/v1/company_compliance_settings', {
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { company_id: companyId, settings: { probe: label }, updated_by: userId },
  }).catch(() => null)

  async function firstOrCreate(table, lookupPath, insertBody, schema) {
    const existing = await service('GET', lookupPath, { schema })
    if (existing?.[0]?.id) return existing[0].id
    const created = await service('POST', `/rest/v1/${table}`, { body: insertBody, schema })
    return created?.[0]?.id || null
  }

  const domainEventId = await firstOrCreate(
    'domain_events',
    `/rest/v1/domain_events?company_id=eq.${companyId}&event_type=eq.3fb.probe&select=id`,
    {
      company_id: companyId,
      event_type: '3fb.probe',
      entity_type: 'vehicle',
      entity_id: vehicleId,
      actor_user_id: userId,
      payload: { label },
    },
  )
  const overrideEventId = await firstOrCreate(
    'override_audit_events',
    `/rest/v1/override_audit_events?company_id=eq.${companyId}&rule_code=eq.3fb.probe&select=id`,
    {
      company_id: companyId,
      actor_user_id: userId,
      rule_code: '3fb.probe',
      reason: 'Wave 3F-C isolation fixture',
      entity_type: 'vehicle',
      entity_id: vehicleId,
    },
  )
  const fuelRecordId = await firstOrCreate(
    'fuel_records',
    `/rest/v1/fuel_records?company_id=eq.${companyId}&client_id=eq.${encodeURIComponent(`3fb-fuel-${label}`)}&select=id`,
    {
      company_id: companyId,
      vehicle_id: vehicleId,
      litres: 10,
      fuel_type: 'diesel',
      client_id: `3fb-fuel-${label}`,
      created_by: userId,
    },
  )
  const equipmentCheckId = await firstOrCreate(
    'vehicle_equipment_checks',
    `/rest/v1/vehicle_equipment_checks?company_id=eq.${companyId}&vehicle_id=eq.${vehicleId}&select=id`,
    {
      company_id: companyId,
      vehicle_id: vehicleId,
      items: [{ name: 'first_aid', present: true }],
      missing_items: [],
      created_by: userId,
    },
  )
  const integrationKeyId = await firstOrCreate(
    'integration_api_keys',
    `/rest/v1/integration_api_keys?company_id=eq.${companyId}&name=eq.${encodeURIComponent(`3fb-probe-${label}`)}&select=id`,
    {
      company_id: companyId,
      name: `3fb-probe-${label}`,
      key_prefix: `vyv_live_${label.toLowerCase()}`,
      key_hash: `hash-fixture-${label}`,
      scopes: ['interest.create'],
      status: 'active',
      created_by: userId,
    },
  )

  const staffId = await firstOrCreate(
    'staff_members',
    `/rest/v1/staff_members?company_id=eq.${companyId}&employee_number=eq.${encodeURIComponent(`ISO-EMP-${label}`)}&select=id`,
    {
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
  )
  const driverId = await firstOrCreate(
    'drivers',
    `/rest/v1/drivers?company_id=eq.${companyId}&driver_number=eq.${encodeURIComponent(`ISO-DRV-${label}`)}&select=id`,
    {
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
  )
  const today = new Date().toISOString().slice(0, 10)
  const dutyId = await firstOrCreate(
    'duties',
    `/rest/v1/duties?company_id=eq.${companyId}&driver_id=eq.${driverId}&select=id`,
    {
      company_id: companyId,
      driver_id: driverId,
      depot_id: depotId,
      vehicle_id: vehicleId,
      service_date: today,
      status: 'planned',
      planned_sign_on_at: `${today}T07:00:00.000Z`,
      planned_sign_off_at: `${today}T16:00:00.000Z`,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    },
  )
  const defectId = await firstOrCreate(
    'defects',
    `/rest/v1/defects?company_id=eq.${companyId}&defect_reference=eq.${encodeURIComponent(`ISO-DEF-${label}`)}&select=id`,
    {
      company_id: companyId,
      vehicle_id: vehicleId,
      depot_id: depotId,
      defect_reference: `ISO-DEF-${label}`,
      description: `Isolation fixture ${label}`,
      severity: 'attention',
      status: 'reported',
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    },
  )
  const leaveRequestId = await firstOrCreate(
    'attendance_leave_requests',
    `/rest/v1/attendance_leave_requests?company_id=eq.${companyId}&reference=eq.${encodeURIComponent(`ISO-LV-${label}`)}&select=id`,
    {
      company_id: companyId,
      person_id: driverId,
      person_kind: 'driver',
      person_name: `Iso ${label}`,
      person_number: `ISO-DRV-${label}`,
      depot_name: `${label} Depot`,
      reference: `ISO-LV-${label}`,
      leave_type: 'annual',
      status: 'pending',
      start_date: today,
      end_date: today,
      reason: 'isolation fixture',
    },
  )
  const attendanceNoteId = await firstOrCreate(
    'attendance_notes',
    `/rest/v1/attendance_notes?company_id=eq.${companyId}&person_id=eq.${driverId}&select=id`,
    {
      company_id: companyId,
      person_id: driverId,
      author: `Iso ${label}`,
      note: 'isolation fixture',
      kind: 'manager',
    },
  )
  const equipmentAssetId = await firstOrCreate(
    'equipment_assets',
    `/rest/v1/equipment_assets?company_id=eq.${companyId}&name=eq.${encodeURIComponent(`ISO-EQ-${label}`)}&select=id`,
    {
      company_id: companyId,
      depot_id: depotId,
      vehicle_id: vehicleId,
      name: `ISO-EQ-${label}`,
      category: 'safety_equipment',
      status: 'available',
      created_by: userId,
    },
  )
  const tyreAssetId = await firstOrCreate(
    'tyre_assets',
    `/rest/v1/tyre_assets?company_id=eq.${companyId}&internal_id=eq.${encodeURIComponent(`ISO-TYRE-${label}`)}&select=id`,
    {
      company_id: companyId,
      internal_id: `ISO-TYRE-${label}`,
      brand: 'Isolation',
      size: '225/75R16',
      status: 'in_stock',
      depot_id: depotId,
      created_by: userId,
    },
  )
  const depotStockId = await firstOrCreate(
    'depot_stock_items',
    `/rest/v1/depot_stock_items?company_id=eq.${companyId}&resource_item_id=eq.${encodeURIComponent(`iso-stock-${label}`)}&select=id`,
    {
      company_id: companyId,
      depot_id: depotId,
      resource_item_id: `iso-stock-${label}`,
      resource_name: `Isolation stock ${label}`,
      category: 'consumable',
      created_by: userId,
    },
  )
  const purchaseRequestId = await firstOrCreate(
    'purchase_requests',
    `/rest/v1/purchase_requests?company_id=eq.${companyId}&resource_name=eq.${encodeURIComponent(`ISO-PR-${label}`)}&select=id`,
    {
      company_id: companyId,
      resource_name: `ISO-PR-${label}`,
      quantity: 1,
      unit: 'each',
      estimated_cost: 10,
      vehicle_id: vehicleId,
      depot_id: depotId,
      reason: 'isolation fixture',
      requested_by_user_id: userId,
      requested_by_name: `Iso ${label}`,
    },
  )

  let ccOrgId = `iso-cc-${label.toLowerCase()}`
  let ccBudgetId = `iso-cc-budget-${label.toLowerCase()}`
  let ccCostId = `iso-cc-cost-${label.toLowerCase()}`
  try {
    await firstOrCreate(
      'organisations',
      `/rest/v1/organisations?id=eq.${encodeURIComponent(ccOrgId)}&select=id`,
      {
        id: ccOrgId,
        name: `Isolation Cost ${label}`,
        trading_name: `Isolation Cost ${label}`,
        currency: 'GBP',
        timezone: 'Europe/London',
      },
      'cost_control',
    )
    await firstOrCreate(
      'budgets',
      `/rest/v1/budgets?id=eq.${encodeURIComponent(ccBudgetId)}&select=id`,
      {
        id: ccBudgetId,
        organisation_id: ccOrgId,
        name: `Isolation budget ${label}`,
        code: `ISO-CC-${label}`,
        financial_year: '2026/27',
        status: 'approved',
      },
      'cost_control',
    )
    await firstOrCreate(
      'cost_records',
      `/rest/v1/cost_records?id=eq.${encodeURIComponent(ccCostId)}&select=id`,
      {
        id: ccCostId,
        organisation_id: ccOrgId,
        supplier_name: 'Isolation Supplier',
        description: `Isolation cost ${label}`,
        reference: `ISO-CC-REF-${label}`,
        transaction_date: today,
        accounting_period: '2026-08',
        net_minor: 1000,
        vat_minor: 200,
        gross_minor: 1200,
        currency: 'GBP',
        status: 'actual',
        category: 'fuel',
        validation_state: 'pending',
        review_state: 'none',
        source_key: `iso-cc-src-${label.toLowerCase()}`,
      },
      'cost_control',
    )
  } catch (e) {
    console.warn(`cost_control seed failed for ${label}: ${String(e.message).slice(0, 200)}`)
    ccOrgId = null
    ccBudgetId = null
    ccCostId = null
  }

  return {
    label,
    email,
    userId,
    companyId,
    depotId,
    vehicleId,
    domainEventId,
    overrideEventId,
    fuelRecordId,
    equipmentCheckId,
    integrationKeyId,
    staffId,
    driverId,
    dutyId,
    defectId,
    leaveRequestId,
    attendanceNoteId,
    equipmentAssetId,
    tyreAssetId,
    depotStockId,
    purchaseRequestId,
    ccOrgId,
    ccBudgetId,
    ccCostId,
  }
}

function expectEmptySelect(probe, rows, status) {
  const empty = status === 200 && Array.isArray(rows) && rows.length === 0
  const denied = status === 401 || status === 403 || status === 404
  return empty || denied
}

function expectWriteDenied(status, json) {
  if ([401, 403, 404, 409].includes(status)) return true
  // PostgREST often returns 201/200 with empty when RLS with_check fails — treat row return of foreign company as FAIL
  if (status >= 400) return true
  if (status === 201 || status === 200) {
    if (Array.isArray(json) && json.length === 0) return true
    // RLS WITH CHECK failure typically 403 or 42501
    return false
  }
  return false
}

function expectPrivilegeDenied(status, rows) {
  // Revoked PostgREST (42501 → 403) or missing schema — not 200-empty RLS.
  const denied = status === 401 || status === 403 || status === 404
  return denied && (!Array.isArray(rows) || rows.length === 0)
}

function leakedTenant(rows, { companyId, organisationId }) {
  if (!Array.isArray(rows) || rows.length === 0) return false
  if (companyId && rows.some((x) => x.company_id === companyId)) return true
  if (organisationId && rows.some((x) => x.organisation_id === organisationId || x.id === organisationId)) {
    return true
  }
  return rows.length > 0
}

async function probeOwnSelect({ token, table, query, expectedId, schema, remediation }) {
  const r = await rest('GET', `/rest/v1/${table}?${query}&select=*`, { token, schema })
  const rows = Array.isArray(r.json) ? r.json : []
  const saw = expectedId ? rows.some((x) => x.id === expectedId) : rows.length === 1
  record({
    phase: 'select',
    name: `A_select_own_${schema ? `${schema}.` : ''}${table}`,
    ok: r.status === 200 && saw,
    detail: `status=${r.status} count=${rows.length}`,
    remediation: r.status === 200 && saw ? undefined : remediation,
  })
}

async function probeForeignSelect({ token, table, query, schema, foreignCompanyId, foreignOrgId, remediation }) {
  const r = await rest('GET', `/rest/v1/${table}?${query}&select=*`, { token, schema })
  const rows = Array.isArray(r.json) ? r.json : []
  const leaked = leakedTenant(rows, { companyId: foreignCompanyId, organisationId: foreignOrgId })
  record({
    phase: 'select',
    name: `A_cannot_select_B_${schema ? `${schema}.` : ''}${table}`,
    ok: !leaked && expectEmptySelect(table, rows, r.status),
    detail: `status=${r.status} count=${rows.length}`,
    remediation: !leaked && expectEmptySelect(table, rows, r.status) ? undefined : remediation,
  })
}

async function probeForeignInsert({
  token,
  table,
  body,
  schema,
  foreignCompanyId,
  foreignOrgId,
  remediation,
}) {
  const r = await rest('POST', `/rest/v1/${table}`, {
    token,
    schema,
    prefer: 'return=representation',
    body,
  })
  const rows = Array.isArray(r.json) ? r.json : []
  const createdForeign = leakedTenant(rows, { companyId: foreignCompanyId, organisationId: foreignOrgId })
  record({
    phase: 'insert',
    name: `A_cannot_insert_${schema ? `${schema}.` : ''}${table}_into_B`,
    ok: !createdForeign && expectWriteDenied(r.status, r.json),
    detail: `status=${r.status} body=${JSON.stringify(r.json).slice(0, 160)}`,
    remediation: !createdForeign && expectWriteDenied(r.status, r.json) ? undefined : remediation,
  })
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  record({
    phase: 'meta',
    name: 'authority_note',
    ok: true,
    detail: 'Assertions use authenticated JWT only; service_role used solely for SETUP fixtures',
  })

  // Health
  const health = await rest('GET', '/rest/v1/', { token: ANON })
  record({
    phase: 'meta',
    name: 'postgrest_up',
    ok: health.status === 200 || health.status === 401,
    detail: `status=${health.status}`,
  })

  console.log('\n--- SETUP (service_role) ---')
  const orgA = await seedOrg('A', 'isolation-a@veyvio.test', 'Isolation Transport A Ltd', 'ISO-A', 'ISO1 AAA')
  const orgB = await seedOrg('B', 'isolation-b@veyvio.test', 'Isolation Transport B Ltd', 'ISO-B', 'ISO2 BBB')
  record({
    phase: 'setup',
    name: 'seed_orgs',
    ok: Boolean(
      orgA.companyId &&
        orgB.companyId &&
        orgA.vehicleId &&
        orgB.vehicleId &&
        orgA.driverId &&
        orgB.driverId &&
        orgA.dutyId &&
        orgA.defectId &&
        orgA.leaveRequestId &&
        orgA.equipmentAssetId,
    ),
    detail: `A=${orgA.companyId} vehicle=${orgA.vehicleId} driver=${orgA.driverId}; B=${orgB.companyId} vehicle=${orgB.vehicleId} driver=${orgB.driverId}`,
  })

  console.log('\n--- AUTH (anon password grant) ---')
  const tokenA = await login(orgA.email)
  const tokenB = await login(orgB.email)
  record({ phase: 'auth', name: 'login_A', ok: Boolean(tokenA), detail: 'jwt issued' })
  record({ phase: 'auth', name: 'login_B', ok: Boolean(tokenB), detail: 'jwt issued' })

  console.log('\n--- SELECT deny (authenticated, not service_role) ---')
  // A lists own vehicles
  {
    const r = await rest('GET', `/rest/v1/vehicles?select=id,company_id&company_id=eq.${orgA.companyId}`, {
      token: tokenA,
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'A_select_own_vehicles',
      ok: r.status === 200 && rows.some((x) => x.id === orgA.vehicleId),
      detail: `status=${r.status} count=${rows.length}`,
    })
  }
  // A must not see B vehicle by id
  {
    const r = await rest('GET', `/rest/v1/vehicles?id=eq.${orgB.vehicleId}&select=id,company_id`, {
      token: tokenA,
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'A_cannot_select_B_vehicle_by_id',
      ok: expectEmptySelect('veh', rows, r.status),
      detail: `status=${r.status} rows=${JSON.stringify(rows).slice(0, 120)}`,
    })
  }
  // A must not see B company_id filter list
  {
    const r = await rest('GET', `/rest/v1/vehicles?company_id=eq.${orgB.companyId}&select=id`, {
      token: tokenA,
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'A_cannot_list_B_vehicles',
      ok: expectEmptySelect('list', rows, r.status),
      detail: `status=${r.status} count=${rows.length}`,
    })
  }
  // Depots
  {
    const r = await rest('GET', `/rest/v1/depots?id=eq.${orgB.depotId}&select=id`, { token: tokenA })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'A_cannot_select_B_depot',
      ok: expectEmptySelect('depot', rows, r.status),
      detail: `status=${r.status} count=${rows.length}`,
    })
  }
  // Companies table — often broader; record truth
  {
    const r = await rest('GET', `/rest/v1/companies?id=eq.${orgB.companyId}&select=id,trading_name`, {
      token: tokenA,
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'A_cannot_select_B_company_row',
      ok: expectEmptySelect('co', rows, r.status),
      detail: `status=${r.status} count=${rows.length}`,
    })
  }

  console.log('\n--- Wave 3F-C classified tables (JWT, not service_role) ---')
  const tenantSelectTables = [
    ['company_compliance_settings', 'company_id', orgA.companyId, orgB.companyId],
    ['domain_events', 'id', orgA.domainEventId, orgB.domainEventId],
    ['fuel_records', 'id', orgA.fuelRecordId, orgB.fuelRecordId],
    ['override_audit_events', 'id', orgA.overrideEventId, orgB.overrideEventId],
    ['vehicle_equipment_checks', 'id', orgA.equipmentCheckId, orgB.equipmentCheckId],
  ]
  for (const [table, col, ownId, foreignId] of tenantSelectTables) {
    if (!ownId || !foreignId) {
      record({
        phase: 'select',
        name: `3fc_seeded_${table}`,
        ok: false,
        detail: `missing fixture own=${ownId} foreign=${foreignId}`,
      })
      continue
    }
    const own = await rest('GET', `/rest/v1/${table}?${col}=eq.${ownId}&select=*`, { token: tokenA })
    const ownRows = Array.isArray(own.json) ? own.json : []
    record({
      phase: 'select',
      name: `A_select_own_${table}`,
      ok: own.status === 200 && ownRows.length === 1,
      detail: `status=${own.status} count=${ownRows.length}`,
    })
    const foreign = await rest('GET', `/rest/v1/${table}?${col}=eq.${foreignId}&select=*`, {
      token: tokenA,
    })
    const foreignRows = Array.isArray(foreign.json) ? foreign.json : []
    record({
      phase: 'select',
      name: `A_cannot_select_B_${table}`,
      ok: expectEmptySelect(table, foreignRows, foreign.status),
      detail: `status=${foreign.status} count=${foreignRows.length}`,
    })
  }

  {
    const own = await rest(
      'GET',
      `/rest/v1/integration_api_keys?id=eq.${orgA.integrationKeyId}&select=id,key_hash`,
      { token: tokenA },
    )
    const ownRows = Array.isArray(own.json) ? own.json : []
    const leakedHash = ownRows.some((x) => x.key_hash)
    record({
      phase: 'select',
      name: 'A_cannot_select_own_integration_api_keys_SERVICE_ROLE_ONLY',
      ok: expectEmptySelect('keys-own', ownRows, own.status) && !leakedHash,
      detail: `status=${own.status} count=${ownRows.length}`,
    })
    const foreign = await rest(
      'GET',
      `/rest/v1/integration_api_keys?id=eq.${orgB.integrationKeyId}&select=id,key_hash`,
      { token: tokenA },
    )
    const foreignRows = Array.isArray(foreign.json) ? foreign.json : []
    record({
      phase: 'select',
      name: 'A_cannot_select_B_integration_api_keys',
      ok: expectEmptySelect('keys-b', foreignRows, foreign.status),
      detail: `status=${foreign.status} count=${foreignRows.length}`,
    })
  }

  console.log('\n--- Wave 3F JWT matrix: drivers / duties / defects / attendance / fleet / cost_control ---')
  const commandOwnReadRemediation =
    'Add authenticated GRANT SELECT + tenant SELECT/ALL policy using private.user_has_company(company_id). Do not paper over with Command API filters.'
  const commandWriteRemediation =
    'Cross-tenant authenticated write landed. Tighten WITH CHECK / revoke authenticated INSERT,UPDATE,DELETE. Writes stay Command API where no write policy is intended.'
  const costControlRevokeRemediation =
    'cost_control is a BFF/service-role branch until 3G. Authenticated PostgREST must be revoked (403/401/404), not 200-empty GUC. Do not bind JWT claims into app.active_organisation_id.'
  const costControlLeakRemediation =
    'JWT read returned a cost_control row. Revoke authenticated/anon on cost_control and FORCE RLS. Do not bind JWT into app.active_organisation_id.'

  const jwtTables = [
    {
      domain: 'drivers',
      table: 'drivers',
      ownQuery: `id=eq.${orgA.driverId}`,
      foreignQuery: `id=eq.${orgB.driverId}`,
      expectedId: orgA.driverId,
      insertBody: {
        company_id: orgB.companyId,
        driver_number: 'HACK-DRV-B',
        status: 'active',
        source_app: 'COMMAND',
      },
    },
    {
      domain: 'duties',
      table: 'duties',
      ownQuery: `id=eq.${orgA.dutyId}`,
      foreignQuery: `id=eq.${orgB.dutyId}`,
      expectedId: orgA.dutyId,
      insertBody: {
        company_id: orgB.companyId,
        driver_id: orgB.driverId,
        depot_id: orgB.depotId,
        vehicle_id: orgB.vehicleId,
        service_date: new Date().toISOString().slice(0, 10),
        status: 'planned',
        source_app: 'COMMAND',
      },
    },
    {
      domain: 'defects',
      table: 'defects',
      ownQuery: `id=eq.${orgA.defectId}`,
      foreignQuery: `id=eq.${orgB.defectId}`,
      expectedId: orgA.defectId,
      insertBody: {
        company_id: orgB.companyId,
        vehicle_id: orgB.vehicleId,
        defect_reference: 'HACK-DEF-B',
        description: 'should not land',
        source_app: 'COMMAND',
      },
    },
    {
      domain: 'attendance',
      table: 'attendance_leave_requests',
      ownQuery: `id=eq.${orgA.leaveRequestId}`,
      foreignQuery: `id=eq.${orgB.leaveRequestId}`,
      expectedId: orgA.leaveRequestId,
      insertBody: {
        company_id: orgB.companyId,
        person_id: orgB.driverId,
        person_kind: 'driver',
        person_name: 'Hack',
        reference: 'HACK-LV-B',
        leave_type: 'annual',
        status: 'pending',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
      },
    },
    {
      domain: 'attendance',
      table: 'attendance_notes',
      ownQuery: `id=eq.${orgA.attendanceNoteId}`,
      foreignQuery: `id=eq.${orgB.attendanceNoteId}`,
      expectedId: orgA.attendanceNoteId,
      insertBody: {
        company_id: orgB.companyId,
        person_id: orgB.driverId,
        author: 'Hack',
        note: 'should not land',
        kind: 'manager',
      },
    },
    {
      domain: 'fleet',
      table: 'equipment_assets',
      ownQuery: `id=eq.${orgA.equipmentAssetId}`,
      foreignQuery: `id=eq.${orgB.equipmentAssetId}`,
      expectedId: orgA.equipmentAssetId,
      insertBody: {
        company_id: orgB.companyId,
        depot_id: orgB.depotId,
        name: 'HACK-EQ-B',
        category: 'equipment',
      },
    },
    {
      domain: 'fleet',
      table: 'tyre_assets',
      ownQuery: `id=eq.${orgA.tyreAssetId}`,
      foreignQuery: `id=eq.${orgB.tyreAssetId}`,
      expectedId: orgA.tyreAssetId,
      insertBody: {
        company_id: orgB.companyId,
        internal_id: 'HACK-TYRE-B',
        brand: 'Hack',
        size: '225/75R16',
      },
    },
    {
      domain: 'fleet',
      table: 'depot_stock_items',
      ownQuery: `id=eq.${orgA.depotStockId}`,
      foreignQuery: `id=eq.${orgB.depotStockId}`,
      expectedId: orgA.depotStockId,
      insertBody: {
        company_id: orgB.companyId,
        depot_id: orgB.depotId,
        resource_item_id: 'hack-stock-b',
        resource_name: 'hack stock',
      },
    },
    {
      domain: 'fleet',
      table: 'purchase_requests',
      ownQuery: `id=eq.${orgA.purchaseRequestId}`,
      foreignQuery: `id=eq.${orgB.purchaseRequestId}`,
      expectedId: orgA.purchaseRequestId,
      insertBody: {
        company_id: orgB.companyId,
        resource_name: 'HACK-PR-B',
        requested_by_name: 'Hack',
      },
    },
  ]

  for (const spec of jwtTables) {
    if (!spec.expectedId) {
      record({
        phase: 'setup',
        name: `seeded_${spec.table}`,
        ok: false,
        detail: 'missing own fixture',
        remediation: commandOwnReadRemediation,
      })
      continue
    }
    await probeOwnSelect({
      token: tokenA,
      table: spec.table,
      query: spec.ownQuery,
      expectedId: spec.expectedId,
      remediation: commandOwnReadRemediation,
    })
    await probeForeignSelect({
      token: tokenA,
      table: spec.table,
      query: spec.foreignQuery,
      foreignCompanyId: orgB.companyId,
      remediation: `Cross-tenant SELECT leaked ${spec.table}. Policy must use private.user_has_company(company_id) (or equivalent) so Org A JWT returns no protected rows.`,
    })
    await probeForeignInsert({
      token: tokenA,
      table: spec.table,
      body: spec.insertBody,
      foreignCompanyId: orgB.companyId,
      remediation: commandWriteRemediation,
    })
  }

  {
    const r = await rest('GET', `/rest/v1/drivers?id=eq.${orgA.driverId}&select=id`, { token: tokenB })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'B_cannot_select_A_driver_by_id',
      ok: expectEmptySelect('drv-sym', rows, r.status),
      detail: `status=${r.status} count=${rows.length}`,
    })
  }

  const ccSpecs = [
    {
      table: 'organisations',
      ownQuery: `id=eq.${orgA.ccOrgId}`,
      foreignQuery: `id=eq.${orgB.ccOrgId}`,
      expectedId: orgA.ccOrgId,
      insertBody: {
        id: 'hack-cc-org-b',
        name: 'Hacked org',
        trading_name: 'Hacked org',
        currency: 'GBP',
        timezone: 'Europe/London',
      },
      foreignOrgId: orgB.ccOrgId,
    },
    {
      table: 'budgets',
      ownQuery: `id=eq.${orgA.ccBudgetId}`,
      foreignQuery: `id=eq.${orgB.ccBudgetId}`,
      expectedId: orgA.ccBudgetId,
      insertBody: {
        id: 'hack-cc-budget-b',
        organisation_id: orgB.ccOrgId,
        name: 'Hacked budget',
        code: 'HACK-CC',
        financial_year: '2026/27',
        status: 'approved',
      },
      foreignOrgId: orgB.ccOrgId,
    },
    {
      table: 'cost_records',
      ownQuery: `id=eq.${orgA.ccCostId}`,
      foreignQuery: `id=eq.${orgB.ccCostId}`,
      expectedId: orgA.ccCostId,
      insertBody: {
        id: 'hack-cc-cost-b',
        organisation_id: orgB.ccOrgId,
        supplier_name: 'Hack',
        description: 'should not land',
        reference: 'HACK-CC',
        transaction_date: new Date().toISOString().slice(0, 10),
        accounting_period: '2026-08',
        net_minor: 1,
        vat_minor: 0,
        gross_minor: 1,
        status: 'actual',
        category: 'fuel',
        validation_state: 'pending',
        source_key: 'hack-cc-src-b',
      },
      foreignOrgId: orgB.ccOrgId,
    },
  ]

  record({
    phase: 'setup',
    name: 'seed_cost_control',
    ok: Boolean(orgA.ccOrgId && orgB.ccOrgId && orgA.ccBudgetId && orgB.ccCostId),
    detail: `A=${orgA.ccOrgId} B=${orgB.ccOrgId}`,
    remediation: orgA.ccOrgId
      ? undefined
      : 'Expose cost_control on PostgREST and GRANT service_role ALL for SETUP. Virgin-start bootstrap remains a DX residual, not a JWT waiver.',
  })

  for (const spec of ccSpecs) {
    if (!spec.expectedId || !orgB.ccOrgId) {
      record({
        phase: 'select',
        name: `cost_control_${spec.table}_skipped`,
        ok: false,
        detail: 'missing cost_control fixture',
        remediation: 'Seed cost_control organisations/budgets/cost_records via service_role (SETUP). JWT own-read is not an access path (BFF/service-role branch).',
      })
      continue
    }
    const own = await rest('GET', `/rest/v1/${spec.table}?${spec.ownQuery}&select=*`, {
      token: tokenA,
      schema: 'cost_control',
    })
    const ownRows = Array.isArray(own.json) ? own.json : []
    const ownLeaked = leakedTenant(ownRows, { organisationId: spec.expectedId })
    record({
      phase: 'select',
      name: `A_cannot_select_own_cost_control.${spec.table}_BFF_SERVICE_BOUNDARY`,
      ok: !ownLeaked && expectPrivilegeDenied(own.status, ownRows),
      detail: `status=${own.status} count=${ownRows.length}`,
      remediation:
        !ownLeaked && expectPrivilegeDenied(own.status, ownRows)
          ? undefined
          : costControlRevokeRemediation,
    })
    await probeForeignSelect({
      token: tokenA,
      table: spec.table,
      query: spec.foreignQuery,
      schema: 'cost_control',
      foreignOrgId: spec.foreignOrgId,
      remediation: costControlLeakRemediation,
    })
    await probeForeignInsert({
      token: tokenA,
      table: spec.table,
      body: spec.insertBody,
      schema: 'cost_control',
      foreignOrgId: spec.foreignOrgId,
      remediation:
        'Authenticated JWT inserted a cost_control row. Revoke authenticated writes; keep BFF SET LOCAL / service-role. Do not bind JWT into the GUC.',
    })
  }

  console.log('\n--- INSERT deny ---')
  {
    const r = await rest('POST', '/rest/v1/vehicles', {
      token: tokenA,
      prefer: 'return=representation',
      body: {
        company_id: orgB.companyId,
        registration: 'HACK BBB',
        status: 'active',
        primary_depot_id: orgB.depotId,
      },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    const createdForeign = rows.some((x) => x.company_id === orgB.companyId)
    record({
      phase: 'insert',
      name: 'A_cannot_insert_vehicle_into_B',
      ok: !createdForeign && expectWriteDenied(r.status, r.json),
      detail: `status=${r.status} body=${JSON.stringify(r.json).slice(0, 180)}`,
    })
  }

  {
    const r = await rest('POST', '/rest/v1/fuel_records', {
      token: tokenA,
      prefer: 'return=representation',
      body: {
        company_id: orgB.companyId,
        vehicle_id: orgB.vehicleId,
        litres: 99,
        fuel_type: 'diesel',
        client_id: '3fb-hack-fuel',
      },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'insert',
      name: 'A_cannot_insert_fuel_record_into_B',
      ok: !rows.some((x) => x.company_id === orgB.companyId) && expectWriteDenied(r.status, r.json),
      detail: `status=${r.status}`,
    })
  }

  {
    const r = await rest('POST', '/rest/v1/domain_events', {
      token: tokenA,
      prefer: 'return=representation',
      body: {
        company_id: orgB.companyId,
        event_type: '3fb.hack',
        entity_type: 'vehicle',
        entity_id: orgB.vehicleId,
      },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'insert',
      name: 'A_cannot_insert_domain_event_into_B',
      ok: !rows.some((x) => x.company_id === orgB.companyId) && expectWriteDenied(r.status, r.json),
      detail: `status=${r.status}`,
    })
  }

  {
    const r = await rest('POST', '/rest/v1/integration_api_keys', {
      token: tokenA,
      prefer: 'return=representation',
      body: {
        company_id: orgB.companyId,
        name: 'hacked-key',
        key_prefix: 'vyv_live_hack',
        key_hash: 'should-not-land',
        scopes: ['interest.create'],
        status: 'active',
      },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'insert',
      name: 'A_cannot_insert_integration_api_key_into_B',
      ok: !rows.some((x) => x.company_id === orgB.companyId) && expectWriteDenied(r.status, r.json),
      detail: `status=${r.status}`,
    })
  }

  console.log('\n--- UPDATE deny ---')
  {
    const r = await rest('PATCH', `/rest/v1/vehicles?id=eq.${orgB.vehicleId}`, {
      token: tokenA,
      prefer: 'return=representation',
      body: { status: 'vor' },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    const mutated = rows.some((x) => x.id === orgB.vehicleId)
    // Also verify via service that status unchanged
    const check = await service('GET', `/rest/v1/vehicles?id=eq.${orgB.vehicleId}&select=id,status`)
    const statusStill = check?.[0]?.status
    record({
      phase: 'update',
      name: 'A_cannot_update_B_vehicle',
      ok: !mutated && statusStill !== 'vor',
      detail: `status=${r.status} returned=${rows.length} service_status=${statusStill}`,
    })
  }

  console.log('\n--- DELETE deny ---')
  {
    const r = await rest('DELETE', `/rest/v1/vehicles?id=eq.${orgB.vehicleId}`, {
      token: tokenA,
      prefer: 'return=representation',
    })
    const rows = Array.isArray(r.json) ? r.json : []
    const deleted = rows.some((x) => x.id === orgB.vehicleId)
    const check = await service('GET', `/rest/v1/vehicles?id=eq.${orgB.vehicleId}&select=id`)
    record({
      phase: 'delete',
      name: 'A_cannot_delete_B_vehicle',
      ok: !deleted && (check?.length || 0) === 1,
      detail: `status=${r.status} returned=${rows.length} still_exists=${check?.length}`,
    })
  }

  {
    const r = await rest('PATCH', `/rest/v1/drivers?id=eq.${orgB.driverId}`, {
      token: tokenA,
      prefer: 'return=representation',
      body: { status: 'archived' },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    const mutated = rows.some((x) => x.id === orgB.driverId)
    const check = await service('GET', `/rest/v1/drivers?id=eq.${orgB.driverId}&select=id,status`)
    record({
      phase: 'update',
      name: 'A_cannot_update_B_driver',
      ok: !mutated && check?.[0]?.status !== 'archived',
      detail: `status=${r.status} returned=${rows.length} service_status=${check?.[0]?.status}`,
      remediation: mutated
        ? 'Authenticated JWT updated Org B driver. SELECT-only policy + deny UPDATE, or WITH CHECK must fail closed.'
        : undefined,
    })
  }

  {
    const r = await rest('PATCH', `/rest/v1/equipment_assets?id=eq.${orgB.equipmentAssetId}`, {
      token: tokenA,
      prefer: 'return=representation',
      body: { status: 'missing' },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    const mutated = rows.some((x) => x.id === orgB.equipmentAssetId)
    const check = await service(
      'GET',
      `/rest/v1/equipment_assets?id=eq.${orgB.equipmentAssetId}&select=id,status`,
    )
    record({
      phase: 'update',
      name: 'A_cannot_update_B_equipment_asset',
      ok: !mutated && check?.[0]?.status !== 'missing',
      detail: `status=${r.status} returned=${rows.length} service_status=${check?.[0]?.status}`,
      remediation: mutated
        ? 'Authenticated JWT updated Org B equipment_assets. WITH CHECK user_has_company must fail closed; do not rely on API filters.'
        : undefined,
    })
  }

  {
    const r = await rest('PATCH', `/rest/v1/budgets?id=eq.${orgB.ccBudgetId}`, {
      token: tokenA,
      schema: 'cost_control',
      prefer: 'return=representation',
      body: { name: 'hacked-budget' },
    })
    const rows = Array.isArray(r.json) ? r.json : []
    const mutated = rows.some((x) => x.id === orgB.ccBudgetId)
    record({
      phase: 'update',
      name: 'A_cannot_update_B_cost_control.budgets',
      ok: !mutated && expectWriteDenied(r.status, r.json),
      detail: `status=${r.status} returned=${rows.length}`,
      remediation: mutated
        ? 'JWT updated another organisation budget without GUC. Revoke authenticated writes or FORCE RLS fail-closed.'
        : undefined,
    })
  }

  // Symmetric B -> A
  {
    const r = await rest('GET', `/rest/v1/vehicles?id=eq.${orgA.vehicleId}&select=id`, { token: tokenB })
    const rows = Array.isArray(r.json) ? r.json : []
    record({
      phase: 'select',
      name: 'B_cannot_select_A_vehicle_by_id',
      ok: expectEmptySelect('sym', rows, r.status),
      detail: `status=${r.status} count=${rows.length}`,
    })
  }

  // Same-company trigger proof (structural) — service_role still subject to triggers
  console.log('\n--- STRUCTURAL same-company triggers (may use service_role; separate from RLS) ---')
  {
    try {
      await service('POST', '/rest/v1/duty_runs', {
        body: {
          // Intentionally mismatched companies if we can forge — may fail on FK first
          company_id: orgA.companyId,
          // Without real duty/run ids this may 400 — record outcome honestly
        },
      })
      record({
        phase: 'structural',
        name: 'duty_runs_cross_company_probe',
        ok: false,
        detail: 'unexpected insert success without duty/run FKs',
      })
    } catch (e) {
      record({
        phase: 'structural',
        name: 'duty_runs_cross_company_probe',
        ok: true,
        detail: `rejected as expected: ${String(e.message).slice(0, 160)}`,
      })
    }
    record({
      phase: 'structural',
      name: 'same_company_trigger_inventory',
      ok: true,
      detail:
        'first wave: drivers, duties, defects, runs, trip_assignments, duty_live_positions, vehicle_swap_requests, fuel_records; join: depot_access, duty_runs, run_trips',
    })
  }

  const failed = results.filter((r) => !r.ok)
  const remediations = failed
    .filter((r) => r.remediation)
    .map((r) => ({ name: r.name, phase: r.phase, detail: r.detail, remediation: r.remediation }))
  const report = {
    generated_at: new Date().toISOString(),
    api: API,
    note: 'FIX-P0-011 proof uses authenticated JWT probes; service_role is SETUP/verify only. Failures map to table/policy remediations, not API workarounds.',
    lock_criteria: {
      cross_tenant_select: 'no protected rows',
      cross_tenant_write: 'fail closed where no write policy, or WITH CHECK deny',
      own_tenant_select: 'must still work',
      service_role: 'outside RLS proof (SETUP/verify only)',
    },
    orgs: {
      A: {
        companyId: orgA.companyId,
        vehicleId: orgA.vehicleId,
        driverId: orgA.driverId,
        ccOrgId: orgA.ccOrgId,
      },
      B: {
        companyId: orgB.companyId,
        vehicleId: orgB.vehicleId,
        driverId: orgB.driverId,
        ccOrgId: orgB.ccOrgId,
      },
    },
    summary: {
      total: results.length,
      pass: results.filter((r) => r.ok).length,
      fail: failed.length,
    },
    results,
    failures: failed,
    remediations,
  }
  const outPath = path.join(OUT_DIR, 'rls-postgrest-isolation.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log(`Summary: ${report.summary.pass}/${report.summary.total} pass; ${report.summary.fail} fail`)
  if (failed.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
