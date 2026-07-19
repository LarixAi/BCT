#!/usr/bin/env node
/**
 * Full Command e2e smoke against hosted command-api.
 * Usage:
 *   VEYVIO_ANON_KEY=... node scripts/e2e-command-smoke.mjs
 */
import assert from 'node:assert/strict'

const API = process.env.VEYVIO_API_URL ?? 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const ANON = process.env.VEYVIO_ANON_KEY ?? ''
const stamp = Date.now()

function headers(token = ANON) {
  return {
    'Content-Type': 'application/json',
    apikey: ANON,
    Authorization: `Bearer ${token}`,
  }
}

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: headers(token ?? ANON),
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
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.json)}`)
  assert.ok(res.json.accessToken, 'missing access token')
  if (res.json.requiresMfaChallenge) {
    const verified = await req('/auth/verify-factor', {
      method: 'POST',
      token: res.json.accessToken,
      body: {
        challengeId: res.json.mfaChallengeId,
        code: res.json.devMfaCode,
        companyId: res.json.pendingCompanyId,
        refreshToken: res.json.refreshToken,
      },
    })
    assert.equal(verified.status, 200, `MFA verify failed for ${email}: ${JSON.stringify(verified.json)}`)
    res = verified
  }
  return res.json
}

async function main() {
  if (!ANON) {
    console.error('VEYVIO_ANON_KEY is required')
    process.exit(1)
  }

  console.log('1) health')
  const health = await req('/health')
  assert.equal(health.status, 200)
  assert.equal(health.json.status, 'ok')

  console.log('2) login seeded admin')
  const admin = await login('admin@veyvio.test', 'VeyvioCommand1!')
  const adminToken = admin.accessToken
  assert.ok(adminToken)
  assert.ok(admin.user?.activeTenantId)

  console.log('3) enable MFA if needed')
  if (!admin.user?.mfaEnabled) {
    const mfa = await req('/auth/mfa/enable', { method: 'POST', body: {}, token: adminToken })
    assert.equal(mfa.status, 200, JSON.stringify(mfa.json))
  }

  console.log('4) operational reads')
  for (const path of [
    '/dashboard',
    '/drivers/profiles',
    '/vehicles/profiles',
    '/bookings',
    '/duties',
    '/depots',
    '/settings/invitations',
    '/defects/hub',
    '/incidents/hub',
    '/maintenance/hub',
    '/settings/data-retention',
    '/settings/support-access',
    '/settings/data-export',
  ]) {
    const res = await req(path, { token: adminToken })
    assert.ok(res.status === 200, `${path} -> ${res.status} ${JSON.stringify(res.json)}`)
  }

  console.log('4b) JIT support grant + export')
  const grant = await req('/settings/support-access', {
    method: 'POST',
    token: adminToken,
    body: { reason: `e2e support ${stamp}`, ticketReference: `E2E-${stamp}`, durationMinutes: 30 },
  })
  assert.equal(grant.status, 201, JSON.stringify(grant.json))
  const exportJob = await req('/settings/data-export', {
    method: 'POST',
    token: adminToken,
    body: { exportType: 'company_full' },
  })
  assert.equal(exportJob.status, 201, JSON.stringify(exportJob.json))
  assert.ok(exportJob.json.id)

  console.log('5) tenant isolation (foreign id)')
  const foreign = await req('/vehicles/00000000-0000-4000-8000-000000000099/profile', { token: adminToken })
  assert.ok([403, 404].includes(foreign.status), `expected 403/404 got ${foreign.status}`)

  console.log('6) create invitation')
  const inviteEmail = `dispatcher.${stamp}@example.com`
  const invite = await req('/settings/invitations', {
    method: 'POST',
    token: adminToken,
    body: { email: inviteEmail, roleName: 'dispatcher', appType: 'COMMAND' },
  })
  assert.equal(invite.status, 201, JSON.stringify(invite.json))
  assert.ok(invite.json.devInvitationToken)

  console.log('7) accept invitation')
  const accepted = await req('/auth/accept-invitation', {
    method: 'POST',
    body: {
      token: invite.json.devInvitationToken,
      firstName: 'Dana',
      lastName: 'Dispatch',
      password: 'InvitePassw0rd!!',
    },
  })
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json))

  console.log('8) login invitee')
  const invitee = await login(inviteEmail, 'InvitePassw0rd!!')
  assert.equal(invitee.user.activeTenantId, admin.user.activeTenantId)

  console.log('9) company signup journey')
  const ownerEmail = `owner.${stamp}@example.com`
  const signup = await req('/auth/signup', {
    method: 'POST',
    body: {
      email: ownerEmail,
      firstName: 'Pat',
      lastName: 'Owner',
      companyName: `Greenway ${stamp}`,
      country: 'GB',
      password: 'OwnerPassw0rd!!',
      termsAccepted: true,
      privacyAccepted: true,
    },
  })
  assert.equal(signup.status, 200, JSON.stringify(signup.json))
  assert.ok(signup.json.devVerificationToken)

  const verified = await req('/auth/verify-email', {
    method: 'POST',
    body: { token: signup.json.devVerificationToken },
  })
  assert.equal(verified.status, 200, JSON.stringify(verified.json))

  const ownerLogin = await login(ownerEmail, 'OwnerPassw0rd!!')
  const ownerToken = ownerLogin.accessToken
  assert.ok(ownerLogin.user.activeTenantId)
  assert.notEqual(ownerLogin.user.activeTenantId, admin.user.activeTenantId)

  const verifyCompany = await req('/auth/company-verification', {
    method: 'POST',
    token: ownerToken,
    body: {
      legalName: `Greenway Transport ${stamp}`,
      tradingName: `Greenway ${stamp}`,
      companiesHouseNumber: '12345678',
      transportManagerName: 'Pat Owner',
      estimatedFleetSize: 12,
      estimatedUserCount: 8,
    },
  })
  assert.equal(verifyCompany.status, 200, JSON.stringify(verifyCompany.json))

  const contracts = await req('/auth/accept-contracts', { method: 'POST', token: ownerToken, body: {} })
  assert.equal(contracts.status, 200, JSON.stringify(contracts.json))

  const setup = await req('/auth/setup-complete', {
    method: 'POST',
    token: ownerToken,
    body: { timezone: 'Europe/London', depotName: 'Main Yard', depotCode: 'MAIN' },
  })
  assert.equal(setup.status, 200, JSON.stringify(setup.json))

  const mfa = await req('/auth/mfa/enable', { method: 'POST', token: ownerToken, body: {} })
  assert.equal(mfa.status, 200, JSON.stringify(mfa.json))
  assert.ok(mfa.json.recoveryCodes?.length)

  console.log('10) isolation across companies')
  const ownerVehicles = await req('/vehicles/profiles', { token: ownerToken })
  assert.equal(ownerVehicles.status, 200)
  assert.equal(ownerVehicles.json.length, 0, 'new company should have no seeded fleet')

  const adminVehicles = await req('/vehicles/profiles', { token: adminToken })
  assert.ok(adminVehicles.json.length > 0, 'admin company should keep seeded fleet')

  console.log('11) password reset')
  const forgot = await req('/auth/forgot-password', {
    method: 'POST',
    body: { email: inviteEmail },
  })
  assert.equal(forgot.status, 200)
  assert.ok(forgot.json.devResetToken)
  const reset = await req('/auth/reset-password', {
    method: 'POST',
    body: { token: forgot.json.devResetToken, password: 'InvitePassw0rd22!!' },
  })
  assert.equal(reset.status, 200, JSON.stringify(reset.json))
  await login(inviteEmail, 'InvitePassw0rd22!!')

  console.log('\nE2E PASS')
}

main().catch((error) => {
  console.error('\nE2E FAIL')
  console.error(error)
  process.exit(1)
})
