/**
 * Hosted Phase 5 perimeter proof using reserved @veyvio.test fixtures only.
 * It deliberately does not create or approve a real sensitive-action request.
 */
import assert from 'node:assert/strict'

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
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const ACCOUNT_PASSWORD = process.env.VEYVIO_ACCOUNT_E2E_PASSWORD ?? 'VeyvioAccounts1!'

function headers(token, json = false, sessionId = '') {
  return {
    apikey: ANON,
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(sessionId ? { 'X-Veyvio-Session-Id': sessionId } : {}),
  }
}

async function api(method, path, token, body, sessionId = '') {
  const response = await fetch(`${API}/api${path}`, {
    method,
    headers: headers(token, body !== undefined, sessionId),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

async function login(email, password) {
  let result = await api('POST', '/auth/login', ANON, { email, password })
  assert.equal(result.status, 200, `login failed for reserved test identity ${email}`)
  assert.equal(Boolean(result.payload?.requiresMfaChallenge), false)
  if (result.payload?.requiresTenantSelection) {
    const companyId =
      result.payload.memberships?.[0]?.companyId ??
      result.payload.memberships?.[0]?.tenantId
    assert.ok(companyId)
    result = await api('POST', '/auth/select-company', result.payload.accessToken, {
      companyId,
      refreshToken: result.payload.refreshToken,
    })
    assert.equal(result.status, 200)
  }
  assert.ok(result.payload?.accessToken)
  return result.payload
}

async function directTable(token, table, companyId) {
  const response = await fetch(
    `${SUPABASE}/rest/v1/${table}?select=id&company_id=eq.${encodeURIComponent(companyId)}`,
    { headers: headers(token) },
  )
  return {
    status: response.status,
    payload: await response.json().catch(() => null),
  }
}

async function main() {
  assert.ok(ANON, 'VEYVIO_ANON_KEY or VITE_SUPABASE_ANON_KEY is required')

  const unauthenticated = await fetch(
    `${API}/api/executive/sensitive-actions`,
  )
  assert.equal(unauthenticated.status, 401)

  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
  const seeded = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seeded.status))
  const orgA = seeded.payload?.orgs?.find((org) => org.label === 'A')
  assert.ok(orgA?.email && orgA?.password && orgA?.companyId)

  const owner = await login(orgA.email, orgA.password)
  const listWithoutVerifiedSession = await api(
    'GET',
    '/executive/sensitive-actions',
    owner.accessToken,
  )
  assert.equal(listWithoutVerifiedSession.status, 403)
  assert.equal(
    listWithoutVerifiedSession.payload?.code,
    'executive_step_up_required',
  )

  const forgedSession = await api(
    'GET',
    '/executive/sensitive-actions',
    owner.accessToken,
    undefined,
    '00000000-0000-4000-8000-000000000099',
  )
  assert.equal(forgedSession.status, 401)
  assert.equal(forgedSession.payload?.code, 'executive_session_revoked')

  const proposalWithoutVerifiedSession = await api(
    'POST',
    '/executive/sensitive-actions',
    owner.accessToken,
    {
      actionType: 'annual_budget_approval',
      targetType: 'annual_budget',
      reason: 'Reserved fixture must not create a proposal without fresh MFA.',
      evidenceReferences: ['fixture://phase5/no-write'],
      beforeSnapshot: {},
      proposedSnapshot: { approved: true },
    },
  )
  assert.equal(proposalWithoutVerifiedSession.status, 403)
  assert.equal(
    proposalWithoutVerifiedSession.payload?.code,
    'executive_step_up_required',
  )

  const financeOnly = await login(
    'account-finance-only@veyvio.test',
    ACCOUNT_PASSWORD,
  )
  const financeDenied = await api(
    'GET',
    '/executive/sensitive-actions',
    financeOnly.accessToken,
    undefined,
    '00000000-0000-4000-8000-000000000099',
  )
  assert.equal(financeDenied.status, 403)

  for (const table of [
    'executive_sensitive_action_requests',
    'executive_sensitive_action_approvals',
  ]) {
    const direct = await directTable(owner.accessToken, table, orgA.companyId)
    assert.equal(direct.status, 200)
    assert.deepEqual(direct.payload, [])
  }

  console.log('executive-sensitive-actions.e2e: perimeter controls ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
