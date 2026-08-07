/**
 * Hosted Phase 4 proof using reserved @veyvio.test fixtures only.
 * No customer company or live Executive record is touched.
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

const API = String(
  process.env.VEYVIO_API_URL ??
    process.env.VITE_API_URL ??
    'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api',
).replace(/\/$/u, '')
const SUPABASE = String(
  process.env.VEYVIO_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    'https://qeckgqjrfbdyxchuncdt.supabase.co',
).replace(/\/$/u, '')
const ANON = String(
  process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
).trim()
const SERVICE_ROLE = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VEYVIO_SERVICE_ROLE_KEY ?? '',
).trim()
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const ACCOUNT_PASSWORD = process.env.VEYVIO_ACCOUNT_E2E_PASSWORD ?? 'VeyvioAccounts1!'
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function headers(token, json = false) {
  return {
    apikey: ANON,
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

async function api(method, path, token, body) {
  const response = await fetch(`${API}/api${path}`, {
    method,
    headers: headers(token, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

function base32Decode(secret) {
  const cleaned = String(secret).replace(/=+$/u, '').toUpperCase()
  let bits = 0
  let value = 0
  const out = []
  for (const char of cleaned) {
    const idx = BASE32.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function totpCode(secret, at = Date.now()) {
  const counter = Math.floor(at / 1000 / 30)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter & 0xffffffff, 4)
  const digest = createHmac('sha1', base32Decode(secret)).update(buf).digest()
  const offset = digest[digest.length - 1] & 0xf
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

async function fetchTotpSecret(userId) {
  if (!SERVICE_ROLE || !userId) return null
  const response = await fetch(
    `${SUPABASE}/rest/v1/user_mfa_methods?select=totp_secret&user_id=eq.${encodeURIComponent(userId)}&method_type=eq.authenticator_app&disabled_at=is.null&order=enabled_at.desc&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    },
  )
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows[0]?.totp_secret ? String(rows[0].totp_secret) : null
}

async function fetchUserIdByEmail(email) {
  if (!SERVICE_ROLE) return null
  const response = await fetch(
    `${SUPABASE}/rest/v1/users?select=id&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    },
  )
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null
}

async function login(email, password) {
  let result = await api('POST', '/auth/login', ANON, { email, password })
  assert.equal(result.status, 200, `login failed for reserved test identity ${email}`)
  if (result.payload?.requiresMfaChallenge) {
    const userId = result.payload?.user?.id ?? (await fetchUserIdByEmail(email))
    const secret = await fetchTotpSecret(userId)
    const code = result.payload.devMfaCode || (secret ? totpCode(secret) : '')
    assert.ok(code, `MFA code unavailable for reserved identity ${email}`)
    result = await api('POST', '/auth/login/confirm', ANON, {
      challengeId: result.payload.mfaChallengeId,
      code,
      companyId: result.payload.pendingCompanyId,
    })
    assert.equal(result.status, 200, `MFA confirm failed for ${email}`)
  }
  if (result.payload?.requiresTenantSelection) {
    const companyId =
      result.payload.memberships?.[0]?.companyId ??
      result.payload.memberships?.[0]?.tenantId
    assert.ok(companyId, `company selection missing for ${email}`)
    result = await api('POST', '/auth/select-company', result.payload.accessToken, {
      companyId,
      refreshToken: result.payload.refreshToken,
    })
    assert.equal(result.status, 200, `company selection failed for ${email}`)
  }
  assert.ok(result.payload?.accessToken, `access token missing for ${email}`)
  return result.payload
}

async function directAccessRegistry(token, companyId) {
  const response = await fetch(
    `${SUPABASE}/rest/v1/membership_application_access?select=id&company_id=eq.${encodeURIComponent(companyId)}`,
    { headers: headers(token) },
  )
  const payload = await response.json().catch(() => null)
  return { status: response.status, payload }
}

async function main() {
  assert.ok(ANON, 'VEYVIO_ANON_KEY or VITE_SUPABASE_ANON_KEY is required')

  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
  const seeded = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seeded.status), 'reserved isolation fixtures could not be prepared')

  const orgA = seeded.payload?.orgs?.find((org) => org.label === 'A')
  const orgB = seeded.payload?.orgs?.find((org) => org.label === 'B')
  assert.ok(orgA?.email && orgA?.password && orgA?.companyId && orgA?.depotId)
  assert.ok(orgB?.email && orgB?.password && orgB?.companyId && orgB?.depotId)

  const ownerA = await login(orgA.email, orgA.password)
  const ownerB = await login(orgB.email, orgB.password)

  const allowedA = await api(
    'GET',
    '/executive/authorisation?action=executive.dashboard.read',
    ownerA.accessToken,
  )
  assert.equal(allowedA.status, 200)
  assert.equal(allowedA.payload.allowed, true)
  assert.equal(allowedA.payload.companyId, orgA.companyId)

  const allowedB = await api(
    'GET',
    '/executive/authorisation?action=executive.dashboard.read',
    ownerB.accessToken,
  )
  assert.equal(allowedB.status, 200)
  assert.equal(allowedB.payload.companyId, orgB.companyId)

  const forgedScope = await api(
    'GET',
    `/executive/authorisation?action=executive.dashboard.read&companyId=${orgB.companyId}&branchId=${orgB.depotId}`,
    ownerA.accessToken,
  )
  assert.equal(forgedScope.status, 200)
  assert.equal(forgedScope.payload.companyId, orgA.companyId)
  assert.doesNotMatch(JSON.stringify(forgedScope.payload), new RegExp(orgB.companyId, 'u'))
  assert.doesNotMatch(JSON.stringify(forgedScope.payload), new RegExp(orgB.depotId, 'u'))

  assert.equal(
    (
      await api(
        'GET',
        '/executive/authorisation?action=executive.accounts.manage',
        ownerA.accessToken,
      )
    ).status,
    200,
  )

  // Owner may hold chief_executive after Phase 5 fixtures; board.read can be allowed.
  // Unknown actions and safety-stop override must still fail closed.
  for (const action of ['not.registered', 'executive.safety_stop.override']) {
    const denied = await api(
      'GET',
      `/executive/authorisation?action=${encodeURIComponent(action)}`,
      ownerA.accessToken,
    )
    assert.equal(denied.status, 403, `${action} must be denied`)
  }

  // Page endpoints always re-check action RBAC (including without gateway session).
  for (const page of ['overview', 'company', 'budget', 'policies']) {
    const allowed = await api('GET', `/executive/pages/${page}`, ownerA.accessToken)
    assert.equal(allowed.status, 200, `page ${page} must be allowed for Isolation A owner`)
    assert.doesNotMatch(JSON.stringify(allowed.payload), new RegExp(orgB.companyId, 'u'))
  }

  for (const email of [
    'account-command@veyvio.test',
    'account-finance-only@veyvio.test',
    'account-hr@veyvio.test',
    'account-yard@veyvio.test',
  ]) {
    const session = await login(email, ACCOUNT_PASSWORD)
    const denied = await api(
      'GET',
      '/executive/authorisation?action=executive.dashboard.read',
      session.accessToken,
    )
    assert.equal(denied.status, 403, `${email} must not enter Executive`)
    const pageDenied = await api('GET', '/executive/pages/overview', session.accessToken)
    assert.equal(pageDenied.status, 403, `${email} must not read Executive pages`)
    assert.doesNotMatch(JSON.stringify(pageDenied.payload), new RegExp(orgB.companyId, 'u'))
  }

  // Support grant on A must not disclose Company B identifiers through Executive.
  if (SERVICE_ROLE) {
    const financeUserId = await fetchUserIdByEmail('account-finance-only@veyvio.test')
    if (financeUserId) {
      await fetch(`${SUPABASE}/rest/v1/privileged_access_grants`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          company_id: orgA.companyId,
          grantee_user_id: financeUserId,
          granted_by: ownerA.user?.id ?? null,
          reason: 'Phase 4 support non-inference fixture',
          access_level: 'read_only',
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        }),
      })
      const supportSession = await login('account-finance-only@veyvio.test', ACCOUNT_PASSWORD)
      const supportDenied = await api(
        'GET',
        '/executive/authorisation?action=executive.dashboard.read',
        supportSession.accessToken,
      )
      assert.equal(supportDenied.status, 403)
      assert.doesNotMatch(JSON.stringify(supportDenied.payload), new RegExp(orgB.companyId, 'u'))
    }
  }

  // These fixture owners have password-only or AAL1 Supabase tokens for Data API.
  // The narrowed Data API policy must disclose no application-grant rows at AAL1.
  const direct = await directAccessRegistry(ownerA.accessToken, orgA.companyId)
  assert.equal(direct.status, 200)
  assert.deepEqual(direct.payload, [])

  for (const table of [
    'executive_policies',
    'executive_sensitive_action_requests',
    'executive_sensitive_action_approvals',
    'executive_annual_budgets',
    'executive_sensitive_execution_outcomes',
    'executive_security_settings',
  ]) {
    const select = table === 'executive_security_settings' ? 'company_id' : 'id'
    const response = await fetch(
      `${SUPABASE}/rest/v1/${table}?select=${select}&company_id=eq.${encodeURIComponent(orgA.companyId)}`,
      { headers: headers(ownerA.accessToken) },
    )
    const payload = await response.json().catch(() => null)
    assert.equal(response.status, 200, `${table} direct read status`)
    assert.deepEqual(payload, [], `${table} must stay empty for AAL1 direct reads`)
  }

  console.log('executive-authorisation.e2e: ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
