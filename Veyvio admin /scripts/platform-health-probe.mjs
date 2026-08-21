#!/usr/bin/env node
/**
 * Gate A / PROD-8 — composite platform health probe (non-destructive).
 *   npm run test:platform-health
 *
 * Exit 0 when command-api /health is 200. Backup/PITR probe runs when
 * SUPABASE_ACCESS_TOKEN is set; otherwise recorded as skipped (CI may lack it).
 * Verdict PLATFORM_HEALTH_OK_BACKUP_NOT_READY is still a probe PASS.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REPO = path.resolve(ROOT, '..')
const OUT = path.join(REPO, 'docs/plan/evidence/gate-a-platform-health.json')

export function buildPlatformHealthVerdict(input) {
  const commandOk = input.commandStatus === 200
  if (!commandOk) return 'PLATFORM_HEALTH_DEGRADED'
  if (input.pitrSkipped) return 'PLATFORM_HEALTH_OK_PITR_SKIPPED'
  if (input.pitrExit !== 0) return 'PLATFORM_HEALTH_DEGRADED'
  if (input.gateABackupReady) return 'PLATFORM_HEALTH_OK_BACKUP_READY'
  return 'PLATFORM_HEALTH_OK_BACKUP_NOT_READY'
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 200) }
  }
  return { status: res.status, json }
}

async function main() {
  loadEnvFile(path.join(ROOT, '.env'))
  loadEnvFile(path.join(REPO, '.gate1-secrets.local.env'))

  const API =
    process.env.VEYVIO_API_URL ||
    process.env.VITE_API_URL ||
    'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
  const YARD_HEALTH = process.env.VEYVIO_YARD_HEALTH_URL || process.env.YARD_HEALTH_URL || ''

  const command = await fetchJson(`${API.replace(/\/$/, '')}/health`)
  assert.equal(command.status, 200, `command-api health ${command.status}`)

  let yard = null
  if (YARD_HEALTH) {
    yard = await fetchJson(YARD_HEALTH)
  }

  const hasPitrToken = Boolean(process.env.SUPABASE_ACCESS_TOKEN)
  let pitr = { status: 0 }
  let pitrReport = null
  let pitrSkipped = false
  if (!hasPitrToken) {
    pitrSkipped = true
  } else {
    pitr = spawnSync(process.execPath, [path.join(__dirname, 'command-backup-pitr-status.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    })
    const pitrJsonPath = path.join(REPO, 'docs/plan/evidence/gate-a-backup-pitr-status.json')
    pitrReport = fs.existsSync(pitrJsonPath)
      ? JSON.parse(fs.readFileSync(pitrJsonPath, 'utf8'))
      : null
  }

  const verdict = buildPlatformHealthVerdict({
    commandStatus: command.status,
    pitrSkipped,
    pitrExit: pitr.status ?? 1,
    gateABackupReady: Boolean(pitrReport?.gate_a_backup_ready),
  })

  const report = {
    generated_at: new Date().toISOString(),
    drill: 'platform-health-probe',
    command_api: {
      url: `${API.replace(/\/$/, '')}/health`,
      status: command.status,
      deploymentSha: command.json?.deploymentSha ?? null,
      denoDeploymentId: command.json?.denoDeploymentId ?? null,
      database: command.json?.database ?? null,
    },
    yard_health: yard
      ? { url: YARD_HEALTH, status: yard.status, body: yard.json }
      : { skipped: true, reason: 'VEYVIO_YARD_HEALTH_URL unset' },
    backup_pitr: pitrSkipped
      ? { skipped: true, reason: 'SUPABASE_ACCESS_TOKEN unset' }
      : {
          probe_exit: pitr.status,
          verdict: pitrReport?.verdict ?? null,
          gate_a_backup_ready: pitrReport?.gate_a_backup_ready ?? null,
          organization_plan: pitrReport?.organization_plan ?? null,
        },
    verdict,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${OUT}`)
  assert.equal(command.status, 200)
  if (!pitrSkipped) assert.equal(pitr.status, 0, 'backup/pitr probe must execute when token set')
  assert.notEqual(verdict, 'PLATFORM_HEALTH_DEGRADED')
  console.log('platform-health-probe.mjs: PASS')
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
