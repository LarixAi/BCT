#!/usr/bin/env node
/**
 * Gate 1 BCT operator readiness — live checks before physical pilot day.
 * Does not require pilot driver credentials (use gate1-pilot-exit-smoke for driver flow).
 *
 * Usage:
 *   VEYVIO_ANON_KEY=... npm run gate1:bct-readiness
 */
import assert from 'node:assert/strict'
import { bearerHeaders, resolveCommandApiEnv } from './lib/command-api-env.mjs'

const { api: API, anon: ANON } = resolveCommandApiEnv()
const EMAIL = process.env.VEYVIO_BCT_ADMIN_EMAIL ?? process.env.VEYVIO_YARD_EMAIL ?? 'admin@veyvio.test'
const PASSWORD = process.env.VEYVIO_BCT_ADMIN_PASSWORD ?? process.env.VEYVIO_YARD_PASSWORD ?? 'VeyvioCommand1!'
const BCT_NAME_HINT = process.env.VEYVIO_BCT_COMPANY_HINT ?? 'Brent'
const BCT_COMPANY_ID = process.env.VEYVIO_BCT_COMPANY_ID?.trim() || null

function membershipName(row) {
  return String(row?.tenantName ?? row?.companyName ?? '')
}

function isBctCompanyName(name) {
  const value = String(name ?? '')
  return value.includes(BCT_NAME_HINT) || value.includes('BCT')
}

function pickBctMembership(memberships) {
  if (!Array.isArray(memberships) || memberships.length === 0) return null
  if (BCT_COMPANY_ID) {
    const byId = memberships.find(
      (row) => String(row.tenantId ?? row.companyId) === BCT_COMPANY_ID,
    )
    if (byId) return byId
  }
  return (
    memberships.find((row) => isBctCompanyName(membershipName(row))) ?? memberships[0]
  )
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: bearerHeaders(ANON, token),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

async function selectBctTenant(session, memberships = session.json?.memberships) {
  const bct = pickBctMembership(memberships ?? [])
  const tenantId =
    bct?.tenantId ??
    bct?.companyId ??
    BCT_COMPANY_ID
  if (!tenantId) {
    return {
      status: 400,
      json: {
        message:
          'BCT company not found in memberships — set VEYVIO_BCT_COMPANY_ID or link operator to BCT (migration 202607250004)',
      },
    }
  }
  return api('/auth/select-tenant', {
    method: 'POST',
    token: session.json.accessToken,
    body: { companyId: tenantId, refreshToken: session.json.refreshToken },
  })
}

async function ensureBctTenant(session) {
  let current = session
  const me = await api('/auth/me', { token: current.json.accessToken })
  if (me.status === 200 && isBctCompanyName(me.json.tenantName ?? me.json.companyName)) {
    return current
  }

  const selected = await selectBctTenant(current)
  if (selected.status !== 200) return selected
  return selected
}

async function login(email, password) {
  let res = await api('/auth/login', { method: 'POST', body: { email, password } })
  if (res.status !== 200) return res

  const loginMemberships = res.json?.memberships

  if (res.json?.requiresMfaChallenge && res.json.devMfaCode) {
    const bct = pickBctMembership(res.json.memberships ?? [])
    const companyId =
      bct?.tenantId ??
      bct?.companyId ??
      res.json.pendingCompanyId ??
      res.json.memberships?.[0]?.tenantId ??
      res.json.memberships?.[0]?.companyId
    res = await api('/auth/login/confirm', {
      method: 'POST',
      body: {
        challengeId: res.json.mfaChallengeId,
        code: res.json.devMfaCode,
        companyId,
      },
    })
    if (res.status !== 200) return res
    if (!res.json.memberships && loginMemberships) {
      res.json.memberships = loginMemberships
    }
  }

  if (res.json?.requiresTenantSelection) {
    const selected = await selectBctTenant(res)
    if (selected.status !== 200) return selected
    res = selected
  } else {
    res = await ensureBctTenant(res)
  }

  return res
}

async function main() {
  if (!ANON) {
    console.error('VEYVIO_ANON_KEY required (or VITE_SUPABASE_ANON_KEY in Admin .env)')
    process.exit(1)
  }

  console.log('1) Command API health')
  const health = await fetch(`${API}/health`, { headers: bearerHeaders(ANON) })
  assert.equal(health.status, 200, `health failed: ${health.status}`)

  console.log(`2) BCT operator login (${EMAIL})`)
  const session = await login(EMAIL, PASSWORD)
  assert.equal(session.status, 200, `login failed: ${JSON.stringify(session.json)}`)
  const token = session.json.accessToken
  assert.ok(token, 'access token missing')

  console.log('3) auth/me — tenant + yard module')
  const me = await api('/auth/me', { token })
  assert.equal(me.status, 200, `auth/me failed: ${JSON.stringify(me.json)}`)
  const companyName = String(me.json.companyName ?? me.json.tenantName ?? '')
  assert.ok(
    isBctCompanyName(companyName),
    `expected BCT company context, got ${companyName || JSON.stringify(me.json)} — link operator to BCT or set VEYVIO_BCT_ADMIN_EMAIL`,
  )
  const modules = me.json.enabledModules ?? me.json.modules ?? []
  const moduleList = Array.isArray(modules) ? modules.map(String) : []
  assert.ok(
    moduleList.some((m) => m.toLowerCase().includes('yard')) || me.json.role,
    'yard module or role should be available for operator',
  )

  const companyId = String(
    me.json.companyId ?? me.json.activeCompanyId ?? me.json.tenantId ?? me.json.activeTenantId ?? '',
  )
  assert.ok(companyId, 'companyId missing on auth/me')

  console.log('4) yard/hub — fleet + permissions')
  const hub = await api('/yard/hub', { token })
  assert.equal(hub.status, 200, `yard/hub failed: ${JSON.stringify(hub.json)}`)
  const vehicles = hub.json.vehicles ?? []
  assert.ok(vehicles.length > 0, 'BCT yard hub should list at least one vehicle')
  assert.ok(
    Array.isArray(hub.json.permissions) && hub.json.permissions.length > 0,
    'hub should return server permissions (TD-008)',
  )

  const vehicleId = vehicles[0]?.vehicleId ?? vehicles[0]?.id
  assert.ok(vehicleId, 'vehicle id missing on hub')

  console.log('5) yard/mutations — TD-009 plan.acknowledge')
  const planAck = await api('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'plan.acknowledge',
      companyId,
      payload: {
        planId: `bct_readiness_${Date.now()}`,
        operationalDate: new Date().toISOString().slice(0, 10),
        version: 1,
      },
    },
  })
  assert.equal(planAck.status, 200, `plan.acknowledge failed: ${JSON.stringify(planAck.json)}`)
  assert.ok(planAck.json.serverId, 'plan.acknowledge should return serverId')

  console.log('6) yard/mutations — body inspection handler deployed')
  const inspection = await api('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'inspection.start',
      companyId,
      payload: { vehicleId, inspectionType: 'routine' },
    },
  })
  assert.notEqual(inspection.status, 501, 'inspection.start must be deployed (not mutation_not_supported)')
  assert.ok([200, 400, 404].includes(inspection.status), `unexpected inspection.start: ${inspection.status}`)

  const pilotEmail = process.env.VEYVIO_PILOT_EMAIL
  const pilotPassword = process.env.VEYVIO_PILOT_PASSWORD
  if (pilotEmail && pilotPassword) {
    console.log(`7) pilot driver bootstrap (${pilotEmail})`)
    const { supabase } = resolveCommandApiEnv()
    const signIn = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: bearerHeaders(ANON),
      body: JSON.stringify({ email: pilotEmail, password: pilotPassword }),
    })
    assert.equal(signIn.status, 200, `pilot sign-in failed: ${signIn.status}`)
    const pilotSession = await signIn.json()
    const bootstrapRes = await fetch(`${API}/driver/bootstrap`, {
      headers: bearerHeaders(ANON, pilotSession.access_token),
    })
    assert.equal(bootstrapRes.status, 200, `pilot bootstrap failed: ${bootstrapRes.status}`)
    const bootstrap = await bootstrapRes.json()
    const duties = bootstrap.duties ?? []
    const publishedToday = duties.filter(
      (duty) => String(duty.publicationStatus ?? duty.publication_status) === 'published',
    )
    if (publishedToday.length === 0) {
      console.warn('   ⚠ No published duty on pilot bootstrap — publish a duty before pilot day')
    } else {
      console.log(`   ✓ ${publishedToday.length} published duty/duties on bootstrap`)
    }
  } else {
    console.log('7) pilot driver bootstrap — skipped (set VEYVIO_PILOT_EMAIL + VEYVIO_PILOT_PASSWORD)')
  }

  console.log('gate1-bct-readiness: ok')
  console.log(
    JSON.stringify(
      {
        companyId,
        companyName,
        vehicleCount: vehicles.length,
        hubPermissions: hub.json.permissions?.length ?? 0,
        operatorEmail: EMAIL,
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
