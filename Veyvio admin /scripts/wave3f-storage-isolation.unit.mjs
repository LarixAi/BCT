#!/usr/bin/env node
/**
 * Wave 3F-E — Storage tenant isolation (authenticated JWT matrix).
 *
 * SETUP uses service_role to seed org fixtures and upload probe objects.
 * All PASS/FAIL assertions use authenticated user JWTs except the structural
 * signed-URL fetch probe (service creates URL; unauthenticated fetch must work).
 *
 * Usage (local after backend:reset):
 *   node scripts/wave3f-storage-isolation.unit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = process.env.VYVIO_3FE_OUT || '/tmp/veyvio-3fe'
const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD || 'VeyvioIsolation1!'

const TENANT_BUCKETS = [
  'driver-documents',
  'defect-photos',
  'incident-evidence',
  'lost-property-photos',
  'vehicle-documents',
]
const SERVICE_ONLY_BUCKETS = ['executive-documents']
const PROBE_FILE = 'wave3f-storage-probe.txt'

const results = []
function record(row) {
  results.push(row)
  const mark = row.ok ? 'PASS' : 'FAIL'
  console.log(`${mark} [${row.phase}] ${row.name}: ${row.detail}`)
}

function encodePath(objectPath) {
  return objectPath.split('/').map(encodeURIComponent).join('/')
}

function expectDenied(status) {
  return status === 403 || status === 401 || status === 404 || status === 400
}

function expectEmptyList(json) {
  if (!Array.isArray(json)) return true
  return json.length === 0
}

async function serviceRest(method, pathName, { body, prefer, contentType } = {}) {
  const headers = {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    Accept: 'application/json',
    Prefer: prefer || 'return=representation',
  }
  if (body !== undefined && !(body instanceof Uint8Array)) {
    headers['Content-Type'] = 'application/json'
  } else if (contentType) {
    headers['Content-Type'] = contentType
  }
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers,
    body:
      body instanceof Uint8Array
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
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
  let userId = create.ok && created.id ? created.id : null
  if (!userId) {
    const listed = await fetch(`${API}/auth/v1/admin/users?page=1&per_page=200`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    })
    const users = (await listed.json()).users || []
    const hit = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
    if (!hit) throw new Error(`Could not create/find ${email}`)
    userId = hit.id
  }
  // Always re-assert password so forge/storage suites share durable credentials.
  const reset = await fetch(`${API}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Isolation', last_name: label },
    }),
  })
  if (!reset.ok) {
    const text = await reset.text()
    throw new Error(`password reset failed for ${email}: ${text.slice(0, 200)}`)
  }
  return userId
}

async function seedOrg(label, email, tradingName) {
  const userId = await ensureUser(email, label)
  await serviceRest('POST', '/rest/v1/users', {
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

  let companyRows = await serviceRest(
    'GET',
    `/rest/v1/companies?trading_name=eq.${encodeURIComponent(tradingName)}&select=id`,
  )
  let companyId = companyRows.json?.[0]?.id
  if (!companyId) {
    const inserted = await serviceRest('POST', '/rest/v1/companies', {
      body: { legal_name: tradingName, trading_name: tradingName, status: 'active' },
    })
    companyId = inserted.json?.[0]?.id
  }
  if (!companyId) throw new Error(`Could not seed company for ${label}`)

  try {
    await serviceRest('POST', '/rest/v1/rpc/ensure_default_company_roles', {
      body: { p_company_id: companyId, p_actor: userId },
    })
  } catch {
    // fall through
  }
  let roles = await serviceRest('GET', `/rest/v1/roles?company_id=eq.${companyId}&select=id,name`)
  let ownerRole = (roles.json || []).find((r) => r.name === 'company_owner')?.id
  if (!ownerRole) {
    const created = await serviceRest('POST', '/rest/v1/roles', {
      body: {
        company_id: companyId,
        name: 'company_owner',
        description: 'company_owner',
        is_system_role: true,
      },
    })
    ownerRole = created.json?.[0]?.id
  }

  const memberships = await serviceRest(
    'GET',
    `/rest/v1/company_memberships?user_id=eq.${userId}&company_id=eq.${companyId}&select=id`,
  )
  if (!memberships.json?.length) {
    await serviceRest('POST', '/rest/v1/company_memberships', {
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

  return { label, email, userId, companyId }
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

async function serviceUpload(bucket, objectPath, bytes, contentType = 'text/plain') {
  const res = await fetch(`${API}/storage/v1/object/${bucket}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
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

async function jwtUpload(token, bucket, objectPath, bytes, contentType = 'text/plain') {
  const res = await fetch(`${API}/storage/v1/object/${bucket}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: bytes,
  })
  return { status: res.status, text: await res.text() }
}

async function jwtDelete(token, bucket, objectPath) {
  const res = await fetch(`${API}/storage/v1/object/${bucket}/${encodePath(objectPath)}`, {
    method: 'DELETE',
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  })
  return { status: res.status, text: await res.text() }
}

async function jwtDownload(token, bucket, objectPath) {
  const res = await fetch(`${API}/storage/v1/object/${bucket}/${encodePath(objectPath)}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  })
  return { status: res.status, text: await res.text() }
}

async function jwtList(token, bucket, prefix) {
  const res = await fetch(`${API}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit: 50 }),
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

async function jwtSign(token, bucket, objectPath) {
  const res = await fetch(`${API}/storage/v1/object/sign/${bucket}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 300 }),
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

async function serviceSign(bucket, objectPath) {
  const res = await fetch(`${API}/storage/v1/object/sign/${bucket}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 300 }),
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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  record({
    phase: 'meta',
    name: 'authority_note',
    ok: true,
    detail:
      'JWT probes for tenant isolation; service_role for fixture upload + structural signed-URL creation only',
  })

  const orgA = await seedOrg('A', 'isolation-a@veyvio.test', 'Isolation Transport A Ltd')
  const orgB = await seedOrg('B', 'isolation-b@veyvio.test', 'Isolation Transport B Ltd')
  record({
    phase: 'setup',
    name: 'seed_orgs',
    ok: Boolean(orgA.companyId && orgB.companyId),
    detail: `A=${orgA.companyId} B=${orgB.companyId}`,
  })

  const tokenA = await login(orgA.email)
  const tokenB = await login(orgB.email)
  record({ phase: 'auth', name: 'login_A', ok: Boolean(tokenA), detail: 'jwt issued' })
  record({ phase: 'auth', name: 'login_B', ok: Boolean(tokenB), detail: 'jwt issued' })

  const probeContentA = new TextEncoder().encode(`wave3f-storage-A-${orgA.companyId}`)
  const probeContentB = new TextEncoder().encode(`wave3f-storage-B-${orgB.companyId}`)
  const pdfProbe = new TextEncoder().encode('%PDF-1.4 wave3f-storage-probe')

  console.log('\n--- Tenant buckets (company-prefixed SELECT; authenticated writes denied) ---')
  for (const bucket of TENANT_BUCKETS) {
    const pathA = `${orgA.companyId}/${PROBE_FILE}`
    const pathB = `${orgB.companyId}/${PROBE_FILE}`

    const upA = await serviceUpload(bucket, pathA, probeContentA, bucket === 'driver-documents' ? 'application/pdf' : 'text/plain')
    record({
      phase: 'setup',
      name: `${bucket}_service_upload_A`,
      ok: [200, 201].includes(upA.status),
      detail: `status=${upA.status}`,
    })
    const upB = await serviceUpload(bucket, pathB, probeContentB, bucket === 'driver-documents' ? 'application/pdf' : 'text/plain')
    record({
      phase: 'setup',
      name: `${bucket}_service_upload_B`,
      ok: [200, 201].includes(upB.status),
      detail: `status=${upB.status}`,
    })

    const own = await jwtDownload(tokenA, bucket, pathA)
    record({
      phase: 'select',
      name: `${bucket}_A_select_own_object`,
      ok: own.status === 200 && own.text.includes('wave3f-storage-A'),
      detail: `status=${own.status}`,
    })

    const cross = await jwtDownload(tokenA, bucket, pathB)
    record({
      phase: 'select',
      name: `${bucket}_A_cannot_select_B_object`,
      ok: expectDenied(cross.status),
      detail: `status=${cross.status}`,
    })

    const crossB = await jwtDownload(tokenB, bucket, pathA)
    record({
      phase: 'select',
      name: `${bucket}_B_cannot_select_A_object`,
      ok: expectDenied(crossB.status),
      detail: `status=${crossB.status}`,
    })

    const listOwn = await jwtList(tokenA, bucket, `${orgA.companyId}/`)
    const ownNames = Array.isArray(listOwn.json)
      ? listOwn.json.map((r) => String(r.name ?? ''))
      : []
    record({
      phase: 'select',
      name: `${bucket}_A_list_own_prefix`,
      ok: listOwn.status === 200 && ownNames.some((n) => n.includes(PROBE_FILE.replace('.txt', '')) || n === PROBE_FILE),
      detail: `status=${listOwn.status} names=${JSON.stringify(ownNames).slice(0, 120)}`,
    })

    const listForeign = await jwtList(tokenA, bucket, `${orgB.companyId}/`)
    record({
      phase: 'select',
      name: `${bucket}_A_cannot_list_B_prefix`,
      ok: [200, 403, 400].includes(listForeign.status) && expectEmptyList(listForeign.json),
      detail: `status=${listForeign.status} count=${Array.isArray(listForeign.json) ? listForeign.json.length : 'n/a'}`,
    })

    const uploadDenied = await jwtUpload(tokenA, bucket, pathA, probeContentA)
    record({
      phase: 'insert',
      name: `${bucket}_A_cannot_upload`,
      ok: expectDenied(uploadDenied.status),
      detail: `status=${uploadDenied.status}`,
    })

    const deleteDenied = await jwtDelete(tokenA, bucket, pathA)
    record({
      phase: 'delete',
      name: `${bucket}_A_cannot_delete`,
      ok: expectDenied(deleteDenied.status),
      detail: `status=${deleteDenied.status}`,
    })

    const signCross = await jwtSign(tokenA, bucket, pathB)
    record({
      phase: 'sign',
      name: `${bucket}_A_cannot_sign_B_path`,
      ok: expectDenied(signCross.status) || !signCross.json?.signedURL,
      detail: `status=${signCross.status}`,
    })

    const signOwn = await jwtSign(tokenA, bucket, pathA)
    const ownSignedUrl = signOwn.json?.signedURL || signOwn.json?.signedUrl
    let ownSignedFetch = 0
    if (ownSignedUrl) {
      const absolute = ownSignedUrl.startsWith('http')
        ? ownSignedUrl
        : `${API}/storage/v1${ownSignedUrl}`
      ownSignedFetch = (await fetch(absolute)).status
    }
    record({
      phase: 'sign',
      name: `${bucket}_A_sign_own_path_rls_gated`,
      ok:
        (expectDenied(signOwn.status) && !ownSignedUrl) ||
        (signOwn.status === 200 && ownSignedFetch === 200),
      detail: `sign=${signOwn.status} fetch=${ownSignedFetch} (cross-tenant sign is stop-ship)`,
    })
  }

  console.log('\n--- Path prefix variants (org/{companyId}/…) ---')
  {
    const bucket = 'defect-photos'
    const orgPathA = `org/${orgA.companyId}/${PROBE_FILE}`
    const up = await serviceUpload(bucket, orgPathA, probeContentA)
    record({
      phase: 'path',
      name: 'org_prefix_service_upload_A',
      ok: [200, 201].includes(up.status),
      detail: `status=${up.status}`,
    })
    const own = await jwtDownload(tokenA, bucket, orgPathA)
    record({
      phase: 'path',
      name: 'org_prefix_A_select_own',
      ok: own.status === 200,
      detail: `status=${own.status}`,
    })
    const cross = await jwtDownload(tokenA, bucket, `org/${orgB.companyId}/${PROBE_FILE}`)
    record({
      phase: 'path',
      name: 'org_prefix_A_cannot_select_B',
      ok: expectDenied(cross.status),
      detail: `status=${cross.status}`,
    })
  }

  console.log('\n--- Structural signed URL (service creates; unauthenticated fetch) ---')
  {
    const bucket = 'defect-photos'
    const pathA = `${orgA.companyId}/${PROBE_FILE}`
    const signed = await serviceSign(bucket, pathA)
    const rel = signed.json?.signedURL || signed.json?.signedUrl
    const url = rel ? (rel.startsWith('http') ? rel : `${API}/storage/v1${rel}`) : null
    let fetchStatus = 0
    let fetchBody = ''
    if (url) {
      const fetched = await fetch(url)
      fetchStatus = fetched.status
      fetchBody = await fetched.text()
    }
    record({
      phase: 'structural',
      name: 'service_signed_url_fetch_without_jwt',
      ok: signed.status === 200 && Boolean(url) && fetchStatus === 200 && fetchBody.includes('wave3f-storage-A'),
      detail: `sign=${signed.status} fetch=${fetchStatus}`,
    })
  }

  console.log('\n--- Service-role-only buckets (no authenticated PostgREST/storage path) ---')
  for (const bucket of SERVICE_ONLY_BUCKETS) {
    const pathA = `${orgA.companyId}/${PROBE_FILE}`
    const up = await serviceUpload(bucket, pathA, pdfProbe, 'application/pdf')
    record({
      phase: 'setup',
      name: `${bucket}_service_upload_A`,
      ok: [200, 201].includes(up.status),
      detail: `status=${up.status}`,
    })
    const read = await jwtDownload(tokenA, bucket, pathA)
    record({
      phase: 'select',
      name: `${bucket}_A_cannot_select_via_jwt`,
      ok: expectDenied(read.status),
      detail: `status=${read.status} (service/BFF boundary)`,
    })
    const list = await jwtList(tokenA, bucket, `${orgA.companyId}/`)
    record({
      phase: 'select',
      name: `${bucket}_A_cannot_list_via_jwt`,
      ok: expectDenied(list.status) || expectEmptyList(list.json),
      detail: `status=${list.status}`,
    })
  }

  const fail = results.filter((r) => !r.ok)
  const summary = {
    generated_at: new Date().toISOString(),
    fix: 'Wave-3F-E-storage-isolation',
    api: API,
    buckets: { tenant: TENANT_BUCKETS, service_only: SERVICE_ONLY_BUCKETS },
    summary: { total: results.length, pass: results.length - fail.length, fail: fail.length },
    results,
  }
  const outPath = path.join(OUT_DIR, 'wave-3fe-storage-isolation.json')
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log(`Summary: ${summary.summary.pass}/${summary.summary.total} pass; ${fail.length} fail`)
  if (fail.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
