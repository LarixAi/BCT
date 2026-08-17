#!/usr/bin/env node
/**
 * Wave 3F hosted production verification gate.
 *
 * Run AFTER `supabase db push` applies 202608170001–004 on hosted.
 * Keeps FIX-P1-012 importers frozen until this gate is green.
 *
 * Required env (hosted):
 *   VEYVIO_ANON_KEY or VITE_SUPABASE_ANON_KEY
 *
 * Optional (strongly recommended for SQL posture checks):
 *   SUPABASE_DB_URL — postgres connection string for migration + FORCE RLS inventory
 *
 * Optional (Command API path):
 *   VEYVIO_API_URL, VEYVIO_PLATFORM_EMAIL, VEYVIO_PLATFORM_PASSWORD
 *   VEYVIO_ISOLATION_PASSWORD
 *
 * Usage:
 *   cd "Veyvio admin "
 *   VEYVIO_ANON_KEY=... SUPABASE_DB_URL=... npm run test:hosted-wave3f-verification
 */
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_ROOT = path.resolve(__dirname, '..')
const OUT_DIR = process.env.VYVIO_3FF_HOSTED_OUT || path.resolve(ADMIN_ROOT, '../docs/plan/evidence')

const DEFAULT_SUPABASE = 'https://qeckgqjrfbdyxchuncdt.supabase.co'
const DEFAULT_API = `${DEFAULT_SUPABASE}/functions/v1/command-api`

const SUPABASE = (process.env.VEYVIO_SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE).replace(/\/$/, '')
const API = (() => {
  const raw = process.env.VEYVIO_API_URL || process.env.VITE_API_URL || DEFAULT_API
  if (raw.startsWith('/')) return `${DEFAULT_SUPABASE}${raw}`.replace(/\/$/, '')
  return raw.replace(/\/$/, '')
})()
const ANON = String(process.env.VEYVIO_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const DB_URL = String(process.env.SUPABASE_DB_URL || process.env.VEYVIO_DB_URL || '').trim()
const ISOLATION_PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD || 'VeyvioIsolation1!'
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL || 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD || 'VeyvioCommand1!'

const REQUIRED_MIGRATION_VERSIONS = [
  '202608170001',
  '202608170002',
  '202608170003',
  '202608170004',
]

const results = []
function record(row) {
  results.push(row)
  const mark = row.ok ? 'PASS' : row.skipped ? 'SKIP' : 'FAIL'
  console.log(`${mark} [${row.phase}] ${row.name}: ${row.detail}`)
}

function psql(sql) {
  if (!DB_URL) throw new Error('SUPABASE_DB_URL not set')
  return execSync(`psql "${DB_URL}" -At -c ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  }).trim()
}

async function commandLogin(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json, accessToken: json.accessToken || json.access_token }
}

async function supabasePasswordLogin(email) {
  const res = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: ISOLATION_PASSWORD }),
  })
  const json = await res.json()
  return { status: res.status, json, token: json.access_token }
}

async function restGet(token, pathName, { schema } = {}) {
  const headers = { apikey: ANON, Authorization: `Bearer ${token}`, Accept: 'application/json' }
  if (schema) headers['Accept-Profile'] = schema
  const res = await fetch(`${SUPABASE}${pathName}`, { headers })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, json, text }
}

async function storageList(token, bucket, prefix) {
  const res = await fetch(`${SUPABASE}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, limit: 20 }),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

function expectDenied(status) {
  return status === 403 || status === 401 || status === 400 || status === 404
}

async function phaseMigrations() {
  if (DB_URL) {
    const rows = psql(
      `select version from supabase_migrations.schema_migrations where version like '20260817%' order by version;`,
    )
    const found = rows ? rows.split('\n').filter(Boolean) : []
    const missing = REQUIRED_MIGRATION_VERSIONS.filter((v) => !found.some((f) => f.startsWith(v)))
    record({
      phase: 'migrations',
      name: 'hosted_wave3f_migrations_applied',
      ok: missing.length === 0,
      detail: missing.length ? `missing ${missing.join(', ')}; found ${found.join(', ') || 'none'}` : found.join(', '),
    })
    return
  }
  const listed = spawnSync('npx', ['supabase', 'migration', 'list'], {
    cwd: ADMIN_ROOT,
    encoding: 'utf8',
  })
  if (listed.status !== 0) {
    record({
      phase: 'migrations',
      name: 'hosted_wave3f_migrations_applied',
      ok: false,
      skipped: true,
      detail: 'Set SUPABASE_DB_URL or link Supabase CLI (supabase link) for migration verification',
    })
    return
  }
  const missing = REQUIRED_MIGRATION_VERSIONS.filter((v) => !listed.stdout.includes(v))
  record({
    phase: 'migrations',
    name: 'hosted_wave3f_migrations_applied',
    ok: missing.length === 0,
    detail: missing.length ? `missing ${missing.join(', ')}` : 'all 202608170001–004 present (CLI list)',
  })
}

async function phaseSqlPosture() {
  if (!DB_URL) {
    record({
      phase: 'inventory',
      name: 'hosted_force_rls_and_zero_policy',
      ok: false,
      skipped: true,
      detail: 'Set SUPABASE_DB_URL for hosted FORCE RLS / zero-policy SQL check',
    })
    return
  }
  const publicNotForced = psql(`
    select count(*)::text from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and not c.relforcerowsecurity;
  `)
  const ccNotForced = psql(`
    select count(*)::text from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'cost_control' and c.relkind = 'r' and c.relrowsecurity and not c.relforcerowsecurity;
  `)
  const zeroPolicy = psql(`
    select count(*)::text from (
      select c.relname, coalesce(p.cnt,0) as policy_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join (
        select tablename, count(*) cnt from pg_policies where schemaname = 'public' group by tablename
      ) p on p.tablename = c.relname
      join information_schema.columns ic
        on ic.table_schema = n.nspname and ic.table_name = c.relname and ic.column_name = 'company_id'
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    ) x where policy_count = 0;
  `)
  record({
    phase: 'inventory',
    name: 'hosted_public_force_rls',
    ok: publicNotForced === '0',
    detail: `public not forced=${publicNotForced} (expect 0)`,
  })
  record({
    phase: 'inventory',
    name: 'hosted_cost_control_force_rls',
    ok: ccNotForced === '0',
    detail: `cost_control not forced=${ccNotForced} (expect 0)`,
  })
  record({
    phase: 'inventory',
    name: 'hosted_zero_policy_tenant_tables',
    ok: zeroPolicy === '0',
    detail: `zero-policy company_id tables=${zeroPolicy} (expect 0)`,
  })
}

async function phaseCommandApiSmoke() {
  if (!ANON) {
    record({
      phase: 'command_api',
      name: 'tenant_isolation_smoke',
      ok: false,
      skipped: true,
      detail: 'Set VEYVIO_ANON_KEY for hosted Command API isolation smoke',
    })
    return
  }
  const child = spawnSync('node', ['scripts/tenant-isolation-smoke.mjs'], {
    cwd: ADMIN_ROOT,
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  })
  record({
    phase: 'command_api',
    name: 'tenant_isolation_smoke',
    ok: child.status === 0,
    detail: child.status === 0 ? 'exit 0' : `exit ${child.status}`,
  })
}

async function phaseHostedPostgrest() {
  if (!ANON) {
    record({
      phase: 'postgrest',
      name: 'hosted_jwt_probes',
      ok: false,
      skipped: true,
      detail: 'VEYVIO_ANON_KEY required',
    })
    return
  }

  const platform = await commandLogin(PLATFORM_EMAIL, PLATFORM_PASSWORD)
  if (!platform.accessToken) {
    record({
      phase: 'postgrest',
      name: 'seed_isolation_fixtures',
      ok: false,
      detail: `platform login failed ${platform.status}`,
    })
    return
  }
  const seed = await fetch(`${API}/system/seed-isolation`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${platform.accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  const seedJson = await seed.json().catch(() => ({}))
  const orgs = seedJson?.orgs || []
  const orgA = orgs.find((o) => o.label === 'A')
  const orgB = orgs.find((o) => o.label === 'B')
  record({
    phase: 'postgrest',
    name: 'seed_isolation_fixtures',
    ok: seed.ok && orgA?.companyId && orgB?.vehicleId,
    detail: seed.ok ? `A=${orgA?.companyId} B vehicle=${orgB?.vehicleId}` : `seed failed ${seed.status}`,
  })
  if (!orgA?.companyId || !orgB?.vehicleId) return

  const loginA = await supabasePasswordLogin(orgA.email || 'isolation-a@veyvio.test')
  const loginB = await supabasePasswordLogin(orgB.email || 'isolation-b@veyvio.test')
  record({
    phase: 'postgrest',
    name: 'isolation_jwt_login',
    ok: Boolean(loginA.token && loginB.token),
    detail: `A=${loginA.status} B=${loginB.status}`,
  })
  if (!loginA.token || !loginB.token) return

  const own = await restGet(loginA.token, `/rest/v1/vehicles?id=eq.${orgA.vehicleId}&select=id`)
  record({
    phase: 'postgrest',
    name: 'A_select_own_vehicle',
    ok: own.status === 200 && Array.isArray(own.json) && own.json.length === 1,
    detail: `status=${own.status} count=${Array.isArray(own.json) ? own.json.length : 'n/a'}`,
  })

  const cross = await restGet(loginA.token, `/rest/v1/vehicles?id=eq.${orgB.vehicleId}&select=id`)
  record({
    phase: 'postgrest',
    name: 'A_cannot_select_B_vehicle',
    ok: cross.status === 200 && Array.isArray(cross.json) && cross.json.length === 0,
    detail: `status=${cross.status} count=${Array.isArray(cross.json) ? cross.json.length : 'n/a'}`,
  })

  const cc = await restGet(loginA.token, '/rest/v1/organisations?select=id&limit=1', { schema: 'cost_control' })
  record({
    phase: 'postgrest',
    name: 'A_cannot_select_cost_control_via_postgrest',
    ok: expectDenied(cc.status),
    detail: `status=${cc.status} (BFF/service boundary until 3G)`,
  })

  const write = await fetch(`${SUPABASE}/rest/v1/vehicles`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${loginA.token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      company_id: orgB.companyId,
      fleet_number: 'HOSTILE-PROBE',
      registration: 'HOSTILE1',
      make: 'Ford',
      model: 'Transit',
      year: 2020,
      vehicle_class: 'minibus',
      fuel_type: 'diesel',
      seat_capacity: 8,
      wheelchair_capacity: 0,
      operational_status: 'available',
      ownership_type: 'owned',
      status: 'active',
      source_app: 'COMMAND',
    }),
  })
  record({
    phase: 'postgrest',
    name: 'A_cannot_insert_into_B_company',
    ok: expectDenied(write.status),
    detail: `status=${write.status}`,
  })

  if (orgA.storageProbePath && orgA.companyId) {
    const listForeign = await storageList(loginB.token, 'driver-documents', `${orgA.companyId}/`)
    const names = Array.isArray(listForeign.json)
      ? listForeign.json.map((r) => String(r.name ?? ''))
      : []
    record({
      phase: 'storage',
      name: 'B_cannot_list_A_storage_prefix',
      ok: [200, 400, 403].includes(listForeign.status) && names.length === 0,
      detail: `status=${listForeign.status} names=${JSON.stringify(names).slice(0, 80)}`,
    })
    const listOwn = await storageList(loginA.token, 'driver-documents', `${orgA.companyId}/`)
    record({
      phase: 'storage',
      name: 'A_list_own_storage_prefix',
      ok: listOwn.status === 200,
      detail: `status=${listOwn.status}`,
    })
    const signCross = await fetch(
      `${SUPABASE}/storage/v1/object/sign/driver-documents/${encodeURIComponent(`${orgB.companyId}/isolation-probe`)}`,
      {
        method: 'POST',
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${loginA.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 120 }),
      },
    )
    record({
      phase: 'storage',
      name: 'A_cannot_sign_B_storage_path',
      ok: expectDenied(signCross.status),
      detail: `status=${signCross.status}`,
    })
  } else {
    record({
      phase: 'storage',
      name: 'hosted_storage_probes',
      ok: false,
      skipped: true,
      detail: 'seed-isolation did not return storageProbePath — extend seeder or run after probe upload',
    })
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  record({
    phase: 'meta',
    name: 'gate',
    ok: true,
    detail: 'Wave 3F hosted verification — run after db push; importers stay frozen until green',
  })

  await phaseMigrations()
  await phaseSqlPosture()
  await phaseHostedPostgrest()
  await phaseCommandApiSmoke()

  const failed = results.filter((r) => !r.ok && !r.skipped)
  const skipped = results.filter((r) => r.skipped)
  const summary = {
    generated_at: new Date().toISOString(),
    fix: 'Wave-3F-hosted-verification',
    target: SUPABASE,
    status: failed.length ? 'FAIL' : skipped.some((s) => s.phase === 'migrations' || s.phase === 'inventory') ? 'PARTIAL' : 'PASS',
    importers: 'FIX-P1-012 frozen until this gate is PASS without migration/inventory skips',
    summary: {
      total: results.length,
      pass: results.filter((r) => r.ok).length,
      fail: failed.length,
      skip: skipped.length,
    },
    results,
  }
  const outPath = path.join(OUT_DIR, 'wave-3ff-hosted-verification.json')
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log(
    `Summary: ${summary.summary.pass}/${summary.summary.total} pass; ${failed.length} fail; ${skipped.length} skip`,
  )
  if (failed.length) process.exit(1)
  if (skipped.length) {
    console.log('\nWarning: some checks skipped — provide SUPABASE_DB_URL for full posture proof before unfreezing importers.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
