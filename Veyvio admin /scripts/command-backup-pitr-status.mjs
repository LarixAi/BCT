#!/usr/bin/env node
/**
 * Gate A — non-destructive backup / PITR status probe via Management API.
 * Does not trigger restore and does not purchase add-ons.
 *
 * Usage (from Veyvio admin /):
 *   node scripts/command-backup-pitr-status.mjs
 *   npm run test:backup-pitr-status
 *
 * Requires SUPABASE_ACCESS_TOKEN (Admin .env).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REPO = path.resolve(ROOT, '..')
const OUT = process.env.VEYVIO_CONTINUITY_OUT || path.join(REPO, 'docs/plan/evidence')

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(path.join(ROOT, '.env'))
loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(REPO, '.gate1-secrets.local.env'))

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ''
const REF =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.VEYVIO_SUPABASE_PROJECT_REF ||
  'qeckgqjrfbdyxchuncdt'

async function mgmt(pathname) {
  const res = await fetch(`https://api.supabase.com/v1${pathname}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json, text }
}

async function main() {
  if (!TOKEN) {
    console.error('SUPABASE_ACCESS_TOKEN required')
    process.exit(1)
  }

  const project = await mgmt(`/projects/${REF}`)
  assert.equal(project.status, 200, `project lookup failed: ${project.text.slice(0, 200)}`)

  const orgId = project.json?.organization_id
  const org = orgId ? await mgmt(`/organizations/${orgId}`) : { status: 0, json: null }

  const backups = await mgmt(`/projects/${REF}/database/backups`)
  assert.equal(backups.status, 200, `backups lookup failed: ${backups.text.slice(0, 200)}`)

  const addons = await mgmt(`/projects/${REF}/billing/addons`)
  const selected = Array.isArray(addons.json?.selected_addons) ? addons.json.selected_addons : []
  const available = Array.isArray(addons.json?.available_addons) ? addons.json.available_addons : []
  const pitrCatalog = available.find((a) => a?.type === 'pitr')
  const pitrSelected = selected.find((a) => a?.type === 'pitr' || /pitr/i.test(JSON.stringify(a)))

  const pitrEnabled = backups.json?.pitr_enabled === true
  const walgEnabled = backups.json?.walg_enabled === true
  const backupRows = Array.isArray(backups.json?.backups) ? backups.json.backups : []
  const orgPlan = org.json?.plan ?? null
  const dailyBackupsOk = backupRows.length > 0

  let verdict = 'BACKUP_STATUS_UNCLEAR'
  if (orgPlan === 'free' || (!dailyBackupsOk && !pitrEnabled)) {
    verdict = 'FREE_OR_NO_SCHEDULED_BACKUPS_PITR_OFF'
  } else if (pitrEnabled || pitrSelected) {
    verdict = 'PITR_ENABLED'
  } else if (dailyBackupsOk) {
    verdict = 'DAILY_BACKUPS_OK_PITR_OFF'
  }

  const report = {
    generated_at: new Date().toISOString(),
    drill: 'command-backup-pitr-status',
    project_ref: REF,
    project_status: project.json?.status ?? null,
    project_region: project.json?.region ?? null,
    organization_id: orgId ?? null,
    organization_plan: orgPlan,
    backups_http_status: backups.status,
    pitr_enabled: pitrEnabled,
    walg_enabled: walgEnabled,
    scheduled_backup_count: backupRows.length,
    physical_backup_data: backups.json?.physical_backup_data ?? null,
    selected_addons: selected,
    pitr_addon_selected: Boolean(pitrSelected),
    pitr_variants_available: (pitrCatalog?.variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
    })),
    enablement_notes: [
      'PITR requires paid org plan (Pro/Team/Enterprise), typically Small+ compute, then PITR add-on.',
      'This probe never purchases add-ons. To enable later: Dashboard → Database → Backups → PITR, or Management API PATCH /v1/projects/{ref}/billing/addons.',
      'Do not run restore-pitr against production without a staging restore rehearsal.',
    ],
    daily_backups_ok: dailyBackupsOk,
    gate_a_backup_ready: Boolean(pitrEnabled || (dailyBackupsOk && orgPlan && orgPlan !== 'free')),
    verdict,
  }

  fs.mkdirSync(OUT, { recursive: true })
  const outPath = path.join(OUT, 'gate-a-backup-pitr-status.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log(`Verdict: ${report.verdict}`)
  console.log(`gate_a_backup_ready: ${report.gate_a_backup_ready}`)
  console.log('command-backup-pitr-status.mjs: PASS (probe executed; does not claim PITR ON)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
