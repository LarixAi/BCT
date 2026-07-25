#!/usr/bin/env node
/**
 * Gate 1 device exit — live API coverage for pilot checklist rows that do not
 * require a physical handset (airplane mode / native push remain manual).
 *
 * Complements Playwright mobile viewport smoke when the UI shell is reachable.
 *
 * Usage:
 *   node scripts/gate1-device-exit-api.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveCommandApiEnv } from '../../Veyvio admin /scripts/lib/command-api-env.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const driverRoot = join(scriptDir, '..')
const repoRoot = join(driverRoot, '..')

function loadEnvFile(path, { overwrite = false } = {}) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (overwrite || !process.env[key]) process.env[key] = value
  }
}

loadEnvFile(join(repoRoot, 'Veyvio admin ', '.env'))
loadEnvFile(join(repoRoot, '.gate1-secrets.local.env'), { overwrite: true })

const { api, supabase, anon } = resolveCommandApiEnv()
const email = process.env.VEYVIO_PILOT_EMAIL
const password = process.env.VEYVIO_PILOT_PASSWORD

const checks = []

function pass(name, detail = '') {
  checks.push({ name, ok: true, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  checks.push({ name, ok: false, detail })
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log('Gate 1 device exit — live API pilot path (Android/iOS shared backend)\n')

  if (!anon || !email || !password) {
    fail('Credentials', 'set VEYVIO_ANON_KEY + VEYVIO_PILOT_EMAIL + VEYVIO_PILOT_PASSWORD')
    process.exit(1)
  }

  const signIn = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!signIn.ok) {
    fail('Pilot login', `HTTP ${signIn.status}`)
    process.exit(1)
  }
  const session = await signIn.json()
  const token = session.access_token
  pass('1 Login + company session', email)

  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: anon,
    'Content-Type': 'application/json',
  }

  const bootstrapRes = await fetch(`${api}/driver/bootstrap`, { headers })
  if (!bootstrapRes.ok) {
    fail('2 Bootstrap / sync truth', `HTTP ${bootstrapRes.status}`)
  } else {
    const bootstrap = await bootstrapRes.json()
    const company =
      bootstrap.operator?.companyName ??
      bootstrap.operator?.tradingName ??
      bootstrap.company?.name ??
      ''
    if (/brent|bct|community transport/i.test(String(company))) {
      pass('2 BCT company on bootstrap', company)
    } else {
      fail('2 BCT company on bootstrap', `got ${company || '(empty)'}`)
    }

    const duties = bootstrap.duties ?? []
    pass('4 Published duty surface', `${duties.length} duty(ies)`)

    const vehicleId =
      duties[0]?.vehicle?.id ??
      bootstrap.legacy?.homeSummary?.vehicleAssignment?.vehicleId ??
      null

    if (vehicleId) {
      const readiness = await fetch(`${api}/driver/vehicle-readiness?vehicleId=${vehicleId}`, { headers })
      if (readiness.ok) pass('8 Vehicle readiness (AdBlue/timeline prep)', vehicleId)
      else fail('8 Vehicle readiness', `HTTP ${readiness.status}`)

      const timeline = await fetch(`${api}/driver/vehicle-timeline?vehicleId=${vehicleId}`, { headers })
      if (timeline.ok) pass('8 Vehicle timeline', vehicleId)
      else fail('8 Vehicle timeline', `HTTP ${timeline.status}`)
    } else {
      fail('8 Vehicle readiness', 'no vehicle on bootstrap')
    }

    const unsigned = duties.find((d) => !d.actualSignOnAt && !d.actual_sign_on_at)
    if (unsigned?.id) {
      const blocked = await fetch(`${api}/driver/duties/${unsigned.id}/sign-on`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ deviceId: 'gate1-device-exit-api' }),
      })
      const body = await blocked.json().catch(() => ({}))
      if (blocked.status === 409 && ['acknowledgement_required', 'dispatch_blocked'].includes(body.code)) {
        pass('5 Sign-on gate (server reason)', body.code)
      } else {
        fail('5 Sign-on gate', `${blocked.status} ${JSON.stringify(body)}`)
      }
    } else {
      pass('5 Sign-on gate', 'no unsigned duty — skipped')
    }
  }

  const notifications = await fetch(`${api}/notifications`, { headers })
  if (notifications.ok) {
    const rows = await notifications.json()
    pass('9 Notifications endpoint', `${Array.isArray(rows) ? rows.length : 0} item(s)`)
  } else {
    fail('9 Notifications endpoint', `HTTP ${notifications.status}`)
  }

  const me = await fetch(`${api}/auth/me`, { headers })
  if (me.ok) {
    const profile = await me.json()
    const companyId = profile.activeCompanyId ?? profile.companyId ?? profile.membership?.companyId
    if (companyId) pass('10 Active company scoped session', companyId)
    else fail('10 Active company scoped session', 'missing company id')
  } else {
    fail('10 Active company scoped session', `HTTP ${me.status}`)
  }

  const failed = checks.filter((c) => !c.ok)
  console.log(`\nGate 1 device exit API: ${checks.length - failed.length}/${checks.length} passed`)
  console.log('Manual on physical Android + iOS: airplane mode walkaround (row 3), handback/parking (row 7), native push tap.')
  if (failed.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
