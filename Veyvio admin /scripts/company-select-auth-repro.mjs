#!/usr/bin/env node
/**
 * Reproduces the Command company-select auth bug:
 * - MFA + multiple companies returns tokens
 * - If access_token is not stored, /auth/memberships fails with anon bearer
 *
 * Usage (from Veyvio admin /):
 *   VEYVIO_ANON_KEY=... node scripts/company-select-auth-repro.mjs email password
 */
import assert from 'node:assert/strict'

const API = process.env.VEYVIO_API_URL ?? 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const ANON = process.env.VEYVIO_ANON_KEY ?? ''
const EMAIL = process.argv[2]
const PASSWORD = process.argv[3]

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
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function main() {
  if (!ANON || !EMAIL || !PASSWORD) {
    console.error('Usage: VEYVIO_ANON_KEY=... node scripts/company-select-auth-repro.mjs <email> <password>')
    process.exit(1)
  }

  console.log('1) Login')
  const login = await req('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  console.log('   status', login.status, login.json.requiresMfaChallenge ? '(MFA required)' : '')

  let accessToken = login.json.accessToken
  let refreshToken = login.json.refreshToken

  if (login.json.requiresMfaChallenge) {
    assert.ok(login.json.devMfaCode, 'MFA required but no devMfaCode in this environment')
    console.log('2) MFA confirm')
    const mfa = await req('/auth/login/confirm', {
      method: 'POST',
      body: {
        challengeId: login.json.mfaChallengeId,
        code: login.json.devMfaCode,
      },
    })
    console.log('   status', mfa.status, 'requiresTenantSelection', mfa.json.requiresTenantSelection)
    accessToken = mfa.json.accessToken
    refreshToken = mfa.json.refreshToken
  }

  assert.ok(refreshToken, 'No refresh token returned — cannot continue')
  console.log('3) memberships with ANON bearer (simulates missing access_token bug)')
  const anonMemberships = await req('/auth/memberships', { token: ANON })
  console.log('   status', anonMemberships.status, 'message', anonMemberships.json.message)

  if (accessToken) {
    console.log('4) memberships with user access token (expected 200)')
    const authed = await req('/auth/memberships', { token: accessToken })
    console.log('   status', authed.status, 'count', authed.json.memberships?.length ?? 0)
  } else {
    console.log('4) SKIPPED — login/MFA did not return accessToken (this is the client bug)')
  }

  const tenantId = login.json.memberships?.[0]?.tenantId ?? login.json.memberships?.[0]?.companyId
  if (tenantId && refreshToken) {
    console.log('5) select-tenant with ANON bearer + refreshToken body')
    const select = await req('/auth/select-tenant', {
      method: 'POST',
      token: ANON,
      body: { tenantId, refreshToken },
    })
    console.log('   status', select.status, 'message', select.json.message ?? 'ok')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
