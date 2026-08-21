#!/usr/bin/env node
/**
 * FIX-P1-048 — fresh-DB gate: reset migrations, audit inventory, JWT + structural proofs.
 * Storage isolation is intentionally excluded (separate proof slice).
 *
 * Usage (from Veyvio admin /):
 *   node scripts/fresh-db-gate.mjs
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_ROOT = path.resolve(__dirname, '..')
const CONFIG_PATH = path.join(ADMIN_ROOT, 'supabase/config.toml')
const EVIDENCE_DIR = path.resolve(ADMIN_ROOT, '../docs/plan/evidence')

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ADMIN_ROOT, shell: true, ...opts })
}

function supabaseBin() {
  // Prefer PATH (CI setup-cli), then local package binary, then npx.
  try {
    execSync('command -v supabase', { stdio: 'ignore', shell: true })
    return 'supabase'
  } catch {
    // fall through
  }
  const local = path.join(ADMIN_ROOT, 'node_modules', '.bin', 'supabase')
  if (fs.existsSync(local)) return `"${local}"`
  return 'npx supabase'
}

function patchConfigRemoveCostControl() {
  const original = fs.readFileSync(CONFIG_PATH, 'utf8')
  const patched = original
    .replace(
      /schemas = \["public", "graphql_public", "cost_control"\]/,
      'schemas = ["public", "graphql_public"]',
    )
    .replace(
      /extra_search_path = \["public", "extensions", "cost_control"\]/,
      'extra_search_path = ["public", "extensions"]',
    )
  fs.writeFileSync(CONFIG_PATH, patched)
  return original
}

function projectId() {
  const config = fs.readFileSync(CONFIG_PATH, 'utf8')
  const hit = config.match(/project_id\s*=\s*"([^"]+)"/)
  if (!hit) throw new Error('Could not read project_id from supabase/config.toml')
  return hit[1]
}

function dbContainer() {
  return `supabase_db_${projectId()}`
}

function exportTenantAuditCsv() {
  const outPath = path.join(EVIDENCE_DIR, 'wave-3fb-tenant-table-audit.csv')
  const sqlPath = path.join(ADMIN_ROOT, 'scripts/sql/tenant-table-audit.sql')
  const result = execSync(`docker exec -i ${dbContainer()} psql -U postgres --csv`, {
    cwd: ADMIN_ROOT,
    encoding: 'utf8',
    input: fs.readFileSync(sqlPath, 'utf8'),
    maxBuffer: 10 * 1024 * 1024,
  })
  fs.writeFileSync(outPath, result)
}
function assertInventory() {
  const csvPath = path.join(EVIDENCE_DIR, 'wave-3fb-tenant-table-audit.csv')
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Missing inventory CSV at ${csvPath}`)
  }
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n')
  const rows = lines.slice(1)
  const isTrue = (v) => v === 't' || v === 'true'
  const tenantRows = rows.filter((line) => {
    const cols = line.split(',')
    return isTrue(cols[4]) || isTrue(cols[5]) || cols[0] === 'cost_control'
  })
  const zeroPolicy = tenantRows.filter((line) => line.split(',')[6] === '0')
  const publicNotForced = rows.filter((line) => {
    const [schema, , rls, forced] = line.split(',')
    return schema === 'public' && isTrue(rls) && !isTrue(forced)
  })
  const ccNotForced = rows.filter((line) => {
    const [schema, , rls, forced] = line.split(',')
    return schema === 'cost_control' && isTrue(rls) && !isTrue(forced)
  })
  if (zeroPolicy.length) {
    throw new Error(`Tenant tables with zero policies: ${zeroPolicy.length}`)
  }
  if (publicNotForced.length) {
    throw new Error(`public RLS tables not FORCE: ${publicNotForced.length}`)
  }
  if (ccNotForced.length) {
    throw new Error(`cost_control tables not FORCE: ${ccNotForced.length}`)
  }
  console.log(
    `Inventory OK: ${tenantRows.length} tenant rows audited; zero-policy=0; public FORCE complete; cost_control FORCE complete`,
  )
}

async function main() {
  const env = {
    ...process.env,
    VYVIO_3FB_OUT: EVIDENCE_DIR,
    VYVIO_3FD_OUT: EVIDENCE_DIR,
  }

  let restoredConfig = null
  const sb = supabaseBin()
  try {
    restoredConfig = patchConfigRemoveCostControl()
    run(`${sb} start`)
    run(`${sb} db reset`)
  } finally {
    if (restoredConfig) {
      fs.writeFileSync(CONFIG_PATH, restoredConfig)
    }
  }

  run(`${sb} stop`)
  run(`${sb} start`)

  exportTenantAuditCsv()
  assertInventory()

  run('node scripts/wave3f-same-company-triggers-static.unit.mjs', { env })
  run('node scripts/wave3f-same-company-triggers.unit.mjs', { env })
  run('node scripts/rls-postgrest-isolation.unit.mjs', { env })

  const summary = {
    generated_at: new Date().toISOString(),
    fix: 'FIX-P1-048',
    status: 'PASS',
    steps: [
      'supabase start (cost_control schema excluded until reset)',
      'supabase db reset',
      'supabase restart with cost_control exposed',
      'tenant-table-audit.sql',
      'wave3f-same-company-triggers (static + forge including PR-03 P0 wave 2)',
      'rls-postgrest-isolation JWT matrix',
    ],
    storage: 'explicit separate slice — not in this gate',
    hosted_migrations: 'through 202608210001 (PR-03 P0 wave 2)',
  }
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'wave-3f-fresh-db-gate.json'), JSON.stringify(summary, null, 2))
  console.log('\nFIX-P1-048 fresh-DB gate: PASS')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
