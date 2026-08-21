/**
 * Hosted two-person annual-budget approval proof.
 * Reserved @veyvio.test identities only — Isolation A owner proposes,
 * account-executive@veyvio.test (director) independently approves.
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
const ISOLATION_PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD ?? 'VeyvioIsolation1!'
const ACCOUNT_PASSWORD = process.env.VEYVIO_ACCOUNT_E2E_PASSWORD ?? 'VeyvioAccounts1!'
const DIRECTOR_EMAIL = 'account-executive@veyvio.test'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

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
  if (!userId || !SERVICE_ROLE) return null
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
    `${SUPABASE}/rest/v1/users?select=id,email&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
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

async function warmMfaSecret(email, secrets) {
  const key = email.toLowerCase()
  if (secrets.has(key)) return secrets.get(key)
  const userId = await fetchUserIdByEmail(key)
  const secret = await fetchTotpSecret(userId)
  if (secret) secrets.set(key, secret)
  return secret
}

async function ensureCompanyOwnerRole(companyId, userId) {
  assert.ok(SERVICE_ROLE, 'service role required to assign company_owner')
  const roleRes = await fetch(
    `${SUPABASE}/rest/v1/roles?select=id,name&company_id=eq.${encodeURIComponent(companyId)}&name=in.(company_owner,company_administrator)`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    },
  )
  const roles = await roleRes.json().catch(() => [])
  const ownerRole = (Array.isArray(roles) ? roles : []).find((row) => row.name === 'company_owner')
  assert.ok(ownerRole?.id, 'company_owner role missing on Isolation A')
  const membershipRes = await fetch(
    `${SUPABASE}/rest/v1/company_memberships?select=id,role_ids&company_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    },
  )
  const memberships = await membershipRes.json().catch(() => [])
  const membership = Array.isArray(memberships) ? memberships[0] : null
  assert.ok(membership?.id, 'Isolation A membership missing')
  const roleIds = Array.from(
    new Set([...(membership.role_ids ?? []).map(String), String(ownerRole.id)]),
  )
  const patch = await fetch(
    `${SUPABASE}/rest/v1/company_memberships?id=eq.${encodeURIComponent(membership.id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ role_ids: roleIds }),
    },
  )
  assert.ok(patch.ok, `failed to assign company_owner on Isolation A (${patch.status})`)
}

async function login(email, password, { forceExecutive = false, secrets = new Map() } = {}) {
  await warmMfaSecret(email, secrets)
  let result = await api('POST', '/auth/login', ANON, {
    email,
    password,
    ...(forceExecutive ? { appType: 'EXECUTIVE' } : {}),
  })
  assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.payload)}`)

  if (result.payload?.requiresMfaChallenge) {
    const secret = secrets.get(email.toLowerCase())
    const code = result.payload.devMfaCode || (secret ? totpCode(secret) : '')
    assert.ok(result.payload.mfaChallengeId, `MFA challenge id missing for ${email}`)
    assert.ok(code, `MFA code unavailable for ${email}`)
    result = await api('POST', '/auth/login/confirm', ANON, {
      challengeId: result.payload.mfaChallengeId,
      code,
      companyId: result.payload.pendingCompanyId,
    })
    assert.equal(
      result.status,
      200,
      `MFA confirm failed for ${email}: ${JSON.stringify(result.payload)}`,
    )
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
    assert.equal(
      result.status,
      200,
      `company selection failed for ${email}: ${JSON.stringify(result.payload)}`,
    )
  }

  assert.ok(result.payload?.accessToken, `access token missing for ${email}`)
  result.payload.email = email
  return result.payload
}

async function ensureMfa(session, secrets) {
  const email = String(session.email ?? session.user?.email ?? '').toLowerCase()
  const userId = session.user?.id
  const begin = await api('POST', '/auth/mfa/enable', session.accessToken, {})
  if (begin.status === 400 && /already enabled/i.test(String(begin.payload?.message ?? ''))) {
    const secret = await fetchTotpSecret(userId)
    assert.ok(secret, `MFA is enabled for ${email || userId} but the authenticator secret is unavailable`)
    secrets.set(email, secret)
    return { alreadyEnabled: true }
  }
  assert.equal(begin.status, 200, `MFA begin failed: ${JSON.stringify(begin.payload)}`)
  assert.ok(begin.payload?.secret, 'TOTP secret missing')
  const code = totpCode(begin.payload.secret)
  const confirm = await api('POST', '/auth/mfa/enable', session.accessToken, { code })
  assert.equal(confirm.status, 200, `MFA confirm failed: ${JSON.stringify(confirm.payload)}`)
  assert.ok(confirm.payload?.recoveryCodes?.length >= 8)
  secrets.set(email, String(begin.payload.secret))
  return {
    alreadyEnabled: false,
    secret: begin.payload.secret,
    recoveryCodes: confirm.payload.recoveryCodes,
  }
}

async function executiveSession(email, password, secrets) {
  const session = await login(email, password, { forceExecutive: true, secrets })
  assert.ok(session.veyvioSession?.id, `Executive session proof missing for ${email}`)
  assert.equal(session.veyvioSession.assuranceLevel, 'aal2')
  assert.equal(session.veyvioSession.authStrength, 'password_mfa')
  return session
}

async function inviteDirector(ownerToken, secrets) {
  try {
    return await login(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, { secrets })
  } catch {
    // Fall through and invite when the reserved director does not yet exist.
  }

  const created = await api('POST', '/settings/invitations', ownerToken, {
    email: DIRECTOR_EMAIL,
    appType: 'EXECUTIVE',
    roleName: 'director',
    firstName: 'Account',
    lastName: 'Executive',
  })
  assert.equal(created.status, 201, `director invite failed: ${JSON.stringify(created.payload)}`)
  const token =
    created.payload?.invitationToken ?? created.payload?.devInvitationToken
  assert.ok(token, 'invitation token missing')
  const accepted = await api('POST', '/auth/accept-invitation', ANON, {
    token,
    password: ACCOUNT_PASSWORD,
    firstName: 'Account',
    lastName: 'Executive',
  })
  assert.equal(
    accepted.status,
    200,
    `director accept failed: ${JSON.stringify(accepted.payload)}`,
  )
  return login(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, { secrets })
}

async function main() {
  assert.ok(ANON, 'VEYVIO_ANON_KEY or VITE_SUPABASE_ANON_KEY is required')
  assert.ok(SERVICE_ROLE, 'SUPABASE_SERVICE_ROLE_KEY is required for reserved MFA recovery')

  const secrets = new Map()
  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD, { secrets })
  const seeded = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seeded.status), 'isolation seed failed')
  const orgA = seeded.payload?.orgs?.find((org) => org.label === 'A')
  assert.ok(orgA?.email && orgA?.companyId)

  const ownerBootstrap = await login(
    orgA.email,
    orgA.password ?? ISOLATION_PASSWORD,
    { secrets },
  )
  await ensureMfa(ownerBootstrap, secrets)
  await ensureCompanyOwnerRole(orgA.companyId, ownerBootstrap.user.id)
  const directorBootstrap = await inviteDirector(ownerBootstrap.accessToken, secrets)
  await ensureMfa(directorBootstrap, secrets)

  const proposer = await executiveSession(
    orgA.email,
    orgA.password ?? ISOLATION_PASSWORD,
    secrets,
  )
  const reviewer = await executiveSession(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, secrets)

  const year = '2026/27'
  const stamp = Date.now().toString(36).toUpperCase()
  const proposalBody = {
    financialYear: year,
    title: `Isolation A annual budget ${stamp}`,
    budgetCode: `ISO-A-${stamp}`.slice(0, 40),
    financeBudgetReference: `fixture://annual-budget/${stamp}`,
    currency: 'GBP',
    totalIncomeMinor: 1_250_000_00,
    contingencyMinor: 25_000_00,
    lineItems: [
      {
        code: 'WAGES',
        label: 'Driver and staff wages',
        category: 'People',
        amountMinor: 700_000_00,
        costCentreId: null,
      },
      {
        code: 'FLEET',
        label: 'Fuel and maintenance',
        category: 'Fleet',
        amountMinor: 400_000_00,
        costCentreId: null,
      },
      {
        code: 'OVERHEAD',
        label: 'Premises and overhead',
        category: 'Operating',
        amountMinor: 125_000_00,
        costCentreId: null,
      },
    ],
    reason: 'Hosted two-person annual budget approval proof for Isolation A.',
    evidenceReferences: [`fixture://annual-budget/${stamp}/pack.pdf`],
  }

  const proposed = await api(
    'POST',
    '/executive/annual-budgets/proposals',
    proposer.accessToken,
    proposalBody,
    proposer.veyvioSession.id,
  )
  assert.equal(
    proposed.status,
    201,
    `proposal failed: ${JSON.stringify(proposed.payload)}`,
  )
  const requestId =
    proposed.payload?.proposal?.requestId ?? proposed.payload?.requestId
  assert.ok(requestId, 'proposal request id missing')
  assert.ok(
    Number(proposed.payload?.reviewerCount ?? 0) >= 1,
    'independent reviewer was not notified',
  )

  const selfApprove = await api(
    'POST',
    `/executive/annual-budgets/proposals/${encodeURIComponent(requestId)}/decision`,
    proposer.accessToken,
    { decision: 'approved', reason: 'Proposer must not self-approve this budget.' },
    proposer.veyvioSession.id,
  )
  assert.equal(selfApprove.status, 403)
  assert.match(
    String(selfApprove.payload?.code ?? selfApprove.payload?.message ?? ''),
    /self|separation|independent|proposer|permission_denied/i,
  )

  const approved = await api(
    'POST',
    `/executive/annual-budgets/proposals/${encodeURIComponent(requestId)}/decision`,
    reviewer.accessToken,
    {
      decision: 'approved',
      reason: 'Independent director approval for Isolation A annual budget proof.',
    },
    reviewer.veyvioSession.id,
  )
  assert.equal(
    approved.status,
    200,
    `independent approval failed: ${JSON.stringify(approved.payload)}`,
  )
  assert.equal(approved.payload?.executionState, 'executed')
  assert.ok(
    approved.payload?.request?.status === 'approved' ||
      approved.payload?.status === 'approved' ||
      approved.payload?.request,
    'approved request missing from decision payload',
  )

  const page = await api(
    'GET',
    '/executive/pages/budget',
    reviewer.accessToken,
    undefined,
    reviewer.veyvioSession.id,
  )
  assert.equal(page.status, 200, `budget page failed: ${JSON.stringify(page.payload)}`)
  const approvedBudgets = page.payload?.approvedBudgets ?? []
  assert.ok(
    approvedBudgets.some(
      (row) =>
        String(row.budgetCode ?? '').includes(stamp) ||
        String(row.title ?? '').includes(stamp),
    ),
    'activated annual budget not visible in Executive budget page',
  )

  console.log('executive-annual-budget.e2e: PASS')
  console.log('  ✓ MFA aal2 sessions for proposer and independent director')
  console.log('  ✓ Annual budget proposal recorded with evidence')
  console.log('  ✓ Proposer self-approval blocked')
  console.log('  ✓ Independent director approval executed and activated budget')
  console.log(`  ✓ requestId=${requestId}`)
}

main().catch((error) => {
  console.error('executive-annual-budget.e2e: FAIL')
  console.error(error)
  process.exit(1)
})
