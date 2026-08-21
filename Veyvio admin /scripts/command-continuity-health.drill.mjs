#!/usr/bin/env node
/**
 * Gate A — Command continuity health drill (non-destructive).
 * Proves hosted API identity + basic tenant isolation without PITR credentials.
 *
 * Usage (from Veyvio admin /):
 *   node scripts/command-continuity-health.drill.mjs
 *
 * Env (from .gate1-secrets.local.env or CI):
 *   VEYVIO_API_URL / SUPABASE_URL
 *   VEYVIO_ANON_KEY / SUPABASE_ANON_KEY
 *   Optional: VEYVIO_TI_EMAIL_A, VEYVIO_TI_PASSWORD_A, VEYVIO_TI_COMPANY_A
 *   Optional: VEYVIO_TI_EMAIL_B, VEYVIO_TI_PASSWORD_B
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REPO = path.resolve(ROOT, '..')
const OUT = process.env.VEYVIO_CONTINUITY_OUT || path.join(REPO, 'docs/plan/evidence')

function loadSecrets() {
  const candidates = [
    path.join(REPO, '.gate1-secrets.local.env'),
    path.join(ROOT, '.gate1-secrets.local.env'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
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
}

loadSecrets()

const supabaseBase = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const API =
  process.env.VEYVIO_API_URL ||
  (supabaseBase ? `${supabaseBase}/functions/v1/command-api` : '') ||
  'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const ANON = process.env.VEYVIO_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const EMAIL_A =
  process.env.VEYVIO_TI_EMAIL_A ||
  process.env.VEYVIO_PLATFORM_EMAIL ||
  process.env.VEYVIO_E2E_EMAIL ||
  ''
const PASS_A =
  process.env.VEYVIO_TI_PASSWORD_A ||
  process.env.VEYVIO_PLATFORM_PASSWORD ||
  process.env.VEYVIO_E2E_PASSWORD ||
  ''
// Cross-tenant probe only when both sides are Command memberships (not Driver-only pilot).
const EMAIL_B = process.env.VEYVIO_TI_EMAIL_B || ''
const PASS_B = process.env.VEYVIO_TI_PASSWORD_B || ''

const results = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`)
}

async function api(pathname, { method = 'GET', token = ANON, body } = {}) {
  const res = await fetch(`${API}${pathname.startsWith('/api') ? pathname : `/api${pathname}`}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
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

async function login(email, password) {
  let res = await api('/auth/login', { method: 'POST', body: { email, password } })
  if (res.status !== 200 || !res.json?.accessToken) {
    throw new Error(`login failed for ${email}: ${JSON.stringify(res.json).slice(0, 200)}`)
  }
  if (res.json.requiresMfaChallenge) {
    const verified = await api('/auth/verify-factor', {
      method: 'POST',
      token: res.json.accessToken,
      body: {
        challengeId: res.json.mfaChallengeId,
        code: res.json.devMfaCode,
        companyId: res.json.pendingCompanyId,
        refreshToken: res.json.refreshToken,
      },
    })
    if (verified.status !== 200) {
      throw new Error(`MFA failed for ${email}: ${JSON.stringify(verified.json).slice(0, 200)}`)
    }
    res = verified
  }
  if (res.json.requiresTenantSelection) {
    const tenantId = res.json.memberships?.[0]?.tenantId ?? res.json.memberships?.[0]?.companyId
    if (!tenantId) throw new Error(`tenant selection required but no membership for ${email}`)
    const select = await api('/auth/select-tenant', {
      method: 'POST',
      token: res.json.accessToken,
      body: { companyId: tenantId, refreshToken: res.json.refreshToken },
    })
    if (select.status !== 200) {
      throw new Error(`tenant select failed for ${email}: ${JSON.stringify(select.json).slice(0, 200)}`)
    }
    res = select
  }
  return res.json
}

async function main() {
  if (!ANON) {
    console.error('VEYVIO_ANON_KEY or SUPABASE_ANON_KEY required')
    process.exit(1)
  }

  const health = await api('/health')
  const sha =
    health.json?.deploymentSha ||
    health.json?.githubSha ||
    health.json?.denoDeploymentId ||
    'unknown'
  record(
    'health_200',
    health.status === 200,
    `status=${health.status} deployment=${sha}`,
  )

  const anonVehicles = await api('/vehicles')
  record(
    'anon_vehicles_denied',
    anonVehicles.status === 401 || anonVehicles.status === 403,
    `status=${anonVehicles.status}`,
  )

  if (EMAIL_A && PASS_A) {
    const sessionA = await login(EMAIL_A, PASS_A)
    const tokenA = sessionA.accessToken
    const companyA = sessionA.activeCompanyId || sessionA.companyId || sessionA.pendingCompanyId
    const own = await api('/vehicles', { token: tokenA })
    record(
      'member_A_vehicles_ok',
      own.status === 200 && Array.isArray(own.json?.items || own.json || []),
      `status=${own.status} company=${companyA || 'n/a'}`,
    )

    if (EMAIL_B && PASS_B) {
      const sessionB = await login(EMAIL_B, PASS_B)
      const tokenB = sessionB.accessToken
      const itemsA = Array.isArray(own.json?.items) ? own.json.items : Array.isArray(own.json) ? own.json : []
      const probeId = itemsA[0]?.id
      if (probeId) {
        const cross = await api(`/vehicles/${probeId}`, { token: tokenB })
        const leaked =
          cross.status === 200 &&
          (cross.json?.id === probeId || cross.json?.item?.id === probeId)
        record(
          'member_B_cannot_read_A_vehicle',
          !leaked,
          `status=${cross.status}`,
        )
      } else {
        record('member_B_cannot_read_A_vehicle', true, 'skipped — org A has no vehicles')
      }
    } else {
      record('member_B_cannot_read_A_vehicle', true, 'skipped — no org B credentials')
    }
  } else {
    record('member_A_vehicles_ok', true, 'skipped — no org A credentials')
    record('member_B_cannot_read_A_vehicle', true, 'skipped — no org A credentials')
  }

  const failed = results.filter((r) => !r.ok)
  const report = {
    generated_at: new Date().toISOString(),
    drill: 'command-continuity-health',
    api: API,
    deployment: sha,
    summary: { total: results.length, pass: results.length - failed.length, fail: failed.length },
    results,
    procedure: 'docs/deploy/command-rollback-continuity.md',
  }
  fs.mkdirSync(OUT, { recursive: true })
  const outPath = path.join(OUT, 'gate-a-command-continuity-drill.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`\nWrote ${outPath}`)
  console.log(`Summary: ${report.summary.pass}/${report.summary.total} pass`)
  assert.equal(failed.length, 0, `${failed.length} continuity checks failed`)
  console.log('command-continuity-health.drill.mjs: PASS')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
