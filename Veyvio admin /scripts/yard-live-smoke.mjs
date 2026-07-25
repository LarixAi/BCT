#!/usr/bin/env node
/**
 * Live Yard API smoke — post-deploy verification.
 * Usage: VEYVIO_ANON_KEY=... node scripts/yard-live-smoke.mjs [email] [password]
 */
import assert from 'node:assert/strict'
import { bearerHeaders, resolveCommandApiEnv } from './lib/command-api-env.mjs'

const { api: API, anon: ANON } = resolveCommandApiEnv()
const EMAIL = process.argv[2] ?? process.env.VEYVIO_YARD_EMAIL ?? 'admin@veyvio.test'
const PASSWORD = process.argv[3] ?? process.env.VEYVIO_YARD_PASSWORD ?? 'VeyvioCommand1!'
const BCT_NAME_HINT = process.env.VEYVIO_BCT_COMPANY_HINT ?? 'Brent'

function pickBctMembership(memberships = []) {
  return (
    memberships.find((row) => {
      const name = String(row.tenantName ?? row.companyName ?? '')
      return name.includes(BCT_NAME_HINT) || name.includes('BCT')
    }) ?? memberships[0]
  )
}

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: bearerHeaders(ANON, token ?? ANON),
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

async function login(email, password) {
  let res = await req('/auth/login', { method: 'POST', body: { email, password } })
  if (res.status !== 200) return res

  if (res.json?.requiresMfaChallenge) {
    if (!res.json.devMfaCode) {
      return {
        status: 401,
        json: {
          code: 'mfa_required',
          message:
            'Password accepted — complete MFA in the Yard app. For automated smoke, set VEYVIO_ACCESS_TOKEN from a signed-in session.',
        },
      }
    }
    const bct = pickBctMembership(res.json.memberships ?? [])
    const companyId =
      bct?.tenantId ??
      bct?.companyId ??
      res.json.pendingCompanyId ??
      res.json.memberships?.[0]?.tenantId ??
      res.json.memberships?.[0]?.companyId
    res = await req('/auth/login/confirm', {
      method: 'POST',
      body: {
        challengeId: res.json.mfaChallengeId,
        code: res.json.devMfaCode,
        companyId,
      },
    })
    if (res.status !== 200) return res
  }

  if (res.json?.requiresTenantSelection) {
    const bct = pickBctMembership(res.json.memberships ?? [])
    const tenantId = bct?.tenantId ?? bct?.companyId
    if (!tenantId) {
      return { status: 400, json: { message: 'Tenant selection required but no memberships returned' } }
    }
    res = await req('/auth/select-tenant', {
      method: 'POST',
      token: res.json.accessToken,
      body: { companyId: tenantId, refreshToken: res.json.refreshToken },
    })
  } else {
    const me = await req('/auth/me', { token: res.json.accessToken })
    const companyName = String(me.json?.tenantName ?? me.json?.companyName ?? '')
    const onBct = companyName.includes(BCT_NAME_HINT) || companyName.includes('BCT')
    if (me.status === 200 && !onBct && res.json.memberships?.length) {
      const bct = pickBctMembership(res.json.memberships)
      const tenantId = bct?.tenantId ?? bct?.companyId
      if (tenantId) {
        res = await req('/auth/select-tenant', {
          method: 'POST',
          token: res.json.accessToken,
          body: { companyId: tenantId, refreshToken: res.json.refreshToken },
        })
      }
    }
  }

  return res
}

async function main() {
  if (!ANON) {
    console.error('VEYVIO_ANON_KEY required')
    process.exit(1)
  }

  console.log('1) yard/mutations route exists (unauthenticated)')
  const routeProbe = await req('/yard/mutations', {
    method: 'POST',
    body: { type: 'task.update', payload: { taskId: 'x' } },
  })
  assert.notEqual(routeProbe.status, 404, 'yard/mutations must not 404')
  assert.ok([401, 403, 409].includes(routeProbe.status), `expected auth error, got ${routeProbe.status}`)

  console.log(`2) login ${EMAIL}`)
  let token
  let companyId
  if (process.env.VEYVIO_ACCESS_TOKEN) {
    token = process.env.VEYVIO_ACCESS_TOKEN
    const meProbe = await req('/auth/me', { token })
    assert.equal(meProbe.status, 200, `token invalid: ${JSON.stringify(meProbe.json)}`)
    companyId = meProbe.json.activeCompanyId ?? meProbe.json.activeTenantId
    console.log('   (using VEYVIO_ACCESS_TOKEN — skipped password login)')
  } else {
    const session = await login(EMAIL, PASSWORD)
    assert.equal(session.status, 200, `login failed: ${JSON.stringify(session.json)}`)
    token = session.json.accessToken
    const user = session.json.user ?? {}
    companyId = user.activeCompanyId ?? user.activeTenantId
    assert.ok(token && companyId, 'missing token or company')
  }

  console.log('3) auth/me — enabledModules includes yard')
  const me = await req('/auth/me', { token })
  assert.equal(me.status, 200, JSON.stringify(me.json))
  const modules = me.json.enabledModules ?? []
  assert.ok(modules.includes('yard'), `yard module missing: ${JSON.stringify(modules)}`)

  console.log('4) GET yard/hub')
  const hub = await req('/yard/hub', { token })
  assert.equal(hub.status, 200, `hub failed: ${JSON.stringify(hub.json)}`)
  assert.ok(Array.isArray(hub.json.vehicles), 'hub.vehicles missing')
  const vehicleId = hub.json.vehicles[0]?.vehicleId
  assert.ok(vehicleId, 'no vehicles in hub to test move')

  console.log('5) POST yard/mutations — local task id ack')
  const localTask = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'task.update',
      companyId,
      payload: { taskId: 'task_local_smoke', action: 'complete' },
    },
  })
  assert.equal(localTask.status, 200, JSON.stringify(localTask.json))
  assert.equal(localTask.json.skipped, true)

  console.log('6) POST yard/mutations — equipment.assign (TD-009)')
  const equip = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'equipment.assign',
      companyId,
      localOperationId: `smoke_equip_${Date.now()}`,
      payload: { vehicleId, itemId: 'smoke-item', label: 'Smoke kit' },
    },
  })
  assert.equal(equip.status, 200, JSON.stringify(equip.json))
  assert.ok(equip.json.serverId)

  console.log('6b) POST yard/mutations — unsupported type returns 501')
  const unknown = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'fleet.reindex',
      companyId,
      payload: { vehicleId },
    },
  })
  assert.equal(unknown.status, 501, JSON.stringify(unknown.json))
  assert.equal(unknown.json.code, 'mutation_not_supported')

  console.log('6c) POST yard/mutations — plan.acknowledge (TD-009)')
  const planAck = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'plan.acknowledge',
      companyId,
      payload: {
        planId: `plan_smoke_${Date.now()}`,
        operationalDate: new Date().toISOString().slice(0, 10),
        version: 1,
      },
    },
  })
  assert.equal(planAck.status, 200, JSON.stringify(planAck.json))
  assert.ok(planAck.json.serverId)

  console.log('7) POST yard/mutations — company mismatch rejected')
  const mismatch = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'equipment.assign',
      companyId: '00000000-0000-4000-8000-000000000099',
      payload: { vehicleId },
    },
  })
  assert.equal(mismatch.status, 403, `expected 403, got ${mismatch.status} ${JSON.stringify(mismatch.json)}`)

  console.log('8) POST yard/mutations — vehicle.move')
  const move = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'vehicle.move',
      companyId,
      payload: {
        vehicleId,
        toBayId: 'I01',
        fromBayId: 'P01',
        zone: 'Inspection',
        reason: 'yard-live-smoke',
      },
    },
  })
  assert.equal(move.status, 200, `move failed: ${JSON.stringify(move.json)}`)

  console.log('9) POST yard/mutations — check.complete')
  const check = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'check.complete',
      companyId,
      payload: {
        checkId: `c_smoke_${Date.now()}`,
        vehicleId,
        checkType: 'yard-spot',
        startedAt: new Date().toISOString(),
        passed: true,
        safetyOutcome: 'ready',
        sections: [{ sectionId: 'smoke', title: 'Smoke', outcome: 'passed' }],
      },
    },
  })
  assert.equal(check.status, 200, `check failed: ${JSON.stringify(check.json)}`)
  assert.ok(check.json.serverId)

  console.log('10) hub vehicleChecks after check')
  const hub2 = await req('/yard/hub', { token })
  assert.equal(hub2.status, 200)
  const checks = hub2.json.vehicleChecks ?? []
  assert.ok(checks.length > 0, 'vehicleChecks should include recent yard check')
  assert.ok(
    checks.some((c) => c.vehicleId === vehicleId),
    'vehicleChecks missing vehicleId on hub item',
  )

  console.log('11) POST yard/mutations — inspection.start handler deployed')
  const inspectionProbe = await req('/yard/mutations', {
    method: 'POST',
    token,
    body: {
      type: 'inspection.start',
      companyId,
      payload: {
        vehicleId,
        inspectionId: `insp_smoke_${Date.now()}`,
        inspectionType: 'weekly-bodywork',
        startedAt: new Date().toISOString(),
      },
    },
  })
  assert.notEqual(
    inspectionProbe.status,
    501,
    `inspection.start not deployed: ${JSON.stringify(inspectionProbe.json)}`,
  )
  assert.ok(
    [200, 400, 404, 500].includes(inspectionProbe.status),
    `unexpected inspection.start status ${inspectionProbe.status}`,
  )
  if (inspectionProbe.status === 200) {
    assert.ok(inspectionProbe.json.serverId, 'inspection.start should return serverId when tables exist')
  }

  console.log('yard-live-smoke: PASS')
  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        companyId,
        tenantStatus: me.json.tenantStatus,
        planCode: me.json.planCode,
        vehicleCount: hub.json.vehicles.length,
        vehicleChecks: checks.length,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error('yard-live-smoke: FAIL')
  console.error(err)
  process.exit(1)
})
