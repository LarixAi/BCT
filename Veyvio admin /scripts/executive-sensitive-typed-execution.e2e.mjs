/**
 * Hosted Phase 5 typed-execution proof for the eight non-budget sensitive actions.
 * Isolation A company owner proposes; account-executive@veyvio.test independently approves.
 * Soft company closure is restored at the end so Isolation A remains usable.
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

async function serviceGet(path) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
  })
  return response.json().catch(() => [])
}

async function servicePost(table, body) {
  const response = await fetch(`${SUPABASE}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  assert.ok(response.ok, `service insert ${table} failed: ${response.status} ${JSON.stringify(payload)}`)
  return Array.isArray(payload) ? payload[0] : payload
}

async function servicePatch(path, body) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  assert.ok(response.ok, `service patch ${path} failed: ${response.status}`)
}

async function fetchTotpSecret(userId) {
  const rows = await serviceGet(
    `user_mfa_methods?select=totp_secret&user_id=eq.${encodeURIComponent(userId)}&method_type=eq.authenticator_app&disabled_at=is.null&order=enabled_at.desc&limit=1`,
  )
  return Array.isArray(rows) && rows[0]?.totp_secret ? String(rows[0].totp_secret) : null
}

async function fetchUserIdByEmail(email) {
  const rows = await serviceGet(
    `users?select=id,email&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
  )
  return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null
}

async function warmMfaSecret(email, secrets) {
  const key = email.toLowerCase()
  if (secrets.has(key)) return secrets.get(key)
  const secret = await fetchTotpSecret(await fetchUserIdByEmail(key))
  if (secret) secrets.set(key, secret)
  return secret
}

async function ensureCompanyOwnerRole(companyId, userId) {
  const roles = await serviceGet(
    `roles?select=id,name&company_id=eq.${encodeURIComponent(companyId)}&name=in.(company_owner,company_administrator)`,
  )
  const ownerRole = (Array.isArray(roles) ? roles : []).find((row) => row.name === 'company_owner')
  assert.ok(ownerRole?.id, 'company_owner role missing')
  const memberships = await serviceGet(
    `company_memberships?select=id,role_ids&company_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(userId)}`,
  )
  const membership = Array.isArray(memberships) ? memberships[0] : null
  assert.ok(membership?.id, 'membership missing')
  const roleIds = Array.from(new Set([...(membership.role_ids ?? []).map(String), String(ownerRole.id)]))
  await servicePatch(`company_memberships?id=eq.${encodeURIComponent(membership.id)}`, {
    role_ids: roleIds,
  })
  return membership.id
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
    assert.ok(code, `MFA code unavailable for ${email}`)
    result = await api('POST', '/auth/login/confirm', ANON, {
      challengeId: result.payload.mfaChallengeId,
      code,
      companyId: result.payload.pendingCompanyId,
    })
    assert.equal(result.status, 200, `MFA confirm failed for ${email}`)
  }
  if (result.payload?.requiresTenantSelection) {
    const companyId =
      result.payload.memberships?.[0]?.companyId ?? result.payload.memberships?.[0]?.tenantId
    result = await api('POST', '/auth/select-company', result.payload.accessToken, {
      companyId,
      refreshToken: result.payload.refreshToken,
    })
    assert.equal(result.status, 200)
  }
  assert.ok(result.payload?.accessToken)
  result.payload.email = email
  return result.payload
}

async function ensureMfa(session, secrets) {
  const email = String(session.email ?? '').toLowerCase()
  const begin = await api('POST', '/auth/mfa/enable', session.accessToken, {})
  if (begin.status === 400 && /already enabled/i.test(String(begin.payload?.message ?? ''))) {
    const secret = await fetchTotpSecret(session.user?.id)
    assert.ok(secret)
    secrets.set(email, secret)
    return
  }
  assert.equal(begin.status, 200, `MFA begin failed: ${JSON.stringify(begin.payload)}`)
  const confirm = await api('POST', '/auth/mfa/enable', session.accessToken, {
    code: totpCode(begin.payload.secret),
  })
  assert.equal(confirm.status, 200)
  secrets.set(email, String(begin.payload.secret))
}

async function executiveSession(email, password, secrets) {
  const session = await login(email, password, { forceExecutive: true, secrets })
  assert.ok(session.veyvioSession?.id)
  assert.equal(session.veyvioSession.assuranceLevel, 'aal2')
  return session
}

async function proposeAndApprove(proposer, reviewer, body) {
  const proposed = await api(
    'POST',
    '/executive/sensitive-actions',
    proposer.accessToken,
    body,
    proposer.veyvioSession.id,
  )
  assert.equal(
    proposed.status,
    201,
    `propose ${body.actionType} failed: ${JSON.stringify(proposed.payload)}`,
  )
  const requestId = proposed.payload?.request?.id
  assert.ok(requestId)

  const selfApprove = await api(
    'POST',
    `/executive/sensitive-actions/${encodeURIComponent(requestId)}/decision`,
    proposer.accessToken,
    { decision: 'approved', reason: 'Proposer must not self-approve.' },
    proposer.veyvioSession.id,
  )
  assert.equal(selfApprove.status, 403, `${body.actionType} self-approve must fail`)

  const approved = await api(
    'POST',
    `/executive/sensitive-actions/${encodeURIComponent(requestId)}/decision`,
    reviewer.accessToken,
    {
      decision: 'approved',
      reason: `Independent director approval for ${body.actionType}.`,
    },
    reviewer.veyvioSession.id,
  )
  assert.equal(
    approved.status,
    200,
    `approve ${body.actionType} failed: ${JSON.stringify(approved.payload)}`,
  )
  assert.equal(
    approved.payload?.executionState,
    'executed',
    `${body.actionType} must execute: ${JSON.stringify(approved.payload)}`,
  )
  return { requestId, approved }
}

async function main() {
  assert.ok(ANON)
  assert.ok(SERVICE_ROLE)

  const secrets = new Map()
  const stamp = Date.now().toString(36)
  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD, { secrets })
  const seeded = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seeded.status))
  const orgA = seeded.payload?.orgs?.find((org) => org.label === 'A')
  const orgB = seeded.payload?.orgs?.find((org) => org.label === 'B')
  assert.ok(orgA?.email && orgA?.companyId && orgB?.companyId)

  const ownerBootstrap = await login(orgA.email, orgA.password ?? ISOLATION_PASSWORD, { secrets })
  await ensureMfa(ownerBootstrap, secrets)
  const ownerMembershipId = await ensureCompanyOwnerRole(orgA.companyId, ownerBootstrap.user.id)

  try {
    await login(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, { secrets })
  } catch {
    const created = await api('POST', '/settings/invitations', ownerBootstrap.accessToken, {
      email: DIRECTOR_EMAIL,
      appType: 'EXECUTIVE',
      roleName: 'director',
      firstName: 'Account',
      lastName: 'Executive',
    })
    assert.equal(created.status, 201)
    const token = created.payload?.invitationToken ?? created.payload?.devInvitationToken
    await api('POST', '/auth/accept-invitation', ANON, {
      token,
      password: ACCOUNT_PASSWORD,
      firstName: 'Account',
      lastName: 'Executive',
    })
  }
  const directorBootstrap = await login(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, { secrets })
  await ensureMfa(directorBootstrap, secrets)

  const proposer = await executiveSession(
    orgA.email,
    orgA.password ?? ISOLATION_PASSWORD,
    secrets,
  )
  const reviewer = await executiveSession(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, secrets)

  const policy = await servicePost('executive_policies', {
    company_id: orgA.companyId,
    title: `Isolation A policy ${stamp}`,
    category: 'governance',
    status: 'draft',
    version_label: 'v1',
    summary: 'Typed execution fixture policy',
    body_text: 'Policy body for publication proof.',
    created_by: proposer.user.id,
    updated_by: proposer.user.id,
  })

  const results = []

  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'company_policy_publication',
      targetType: 'executive_policy',
      targetId: policy.id,
      reason: 'Publish the Isolation A governance policy through two-person approval.',
      evidenceReferences: [`fixture://policy/${stamp}`],
      beforeSnapshot: { status: 'draft', title: policy.title },
      proposedSnapshot: { status: 'approved' },
    }),
  )
  const published = await serviceGet(
    `executive_policies?select=id,status&id=eq.${encodeURIComponent(policy.id)}`,
  )
  assert.equal(published[0]?.status, 'approved')

  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'executive_administrator_change',
      targetType: 'membership_application_access',
      targetId: ownerMembershipId,
      reason: 'Confirm Isolation A owner Executive administrator access level.',
      evidenceReferences: [`fixture://admin/${stamp}`],
      beforeSnapshot: { membershipId: ownerMembershipId },
      proposedSnapshot: { membershipId: ownerMembershipId, accessLevel: 'admin' },
    }),
  )

  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'director_or_officer_change',
      targetType: 'company_membership',
      targetId: ownerMembershipId,
      reason: 'Add board_member duty for Isolation A owner through board approval.',
      evidenceReferences: [`fixture://directors/${stamp}`],
      beforeSnapshot: { membershipId: ownerMembershipId },
      proposedSnapshot: { membershipId: ownerMembershipId, roleNames: ['board_member'] },
    }),
  )

  // Restore owner roles to company_owner (+ company_administrator if present) so
  // later Phase 4 checks do not treat the owner as an independent board approver.
  {
    const roles = await serviceGet(
      `roles?select=id,name&company_id=eq.${encodeURIComponent(orgA.companyId)}&name=in.(company_owner,company_administrator)`,
    )
    const keep = (Array.isArray(roles) ? roles : []).map((row) => String(row.id))
    await servicePatch(`company_memberships?id=eq.${encodeURIComponent(ownerMembershipId)}`, {
      role_ids: keep,
    })
  }

  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'restricted_export',
      targetType: 'executive_export',
      targetId: null,
      reason: 'Authorise a restricted board pack export for Isolation A evidence.',
      evidenceReferences: [`fixture://export/${stamp}`],
      beforeSnapshot: { exportJobs: 0 },
      proposedSnapshot: { exportType: 'executive_restricted' },
    }),
  )

  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'bank_authority_change',
      targetType: 'executive_budget_mandate',
      targetId: null,
      reason: 'Activate a board-approved bank mandate for Isolation A.',
      evidenceReferences: [`fixture://bank/${stamp}`],
      beforeSnapshot: { mandates: 0 },
      proposedSnapshot: {
        title: `Isolation A mandate ${stamp}`,
        authorityRole: 'finance_director',
        limitAmountMinor: '5000000',
        currency: 'GBP',
        notes: 'Hosted typed execution proof',
      },
    }),
  )

  const supportGrantee = await fetchUserIdByEmail('account-finance-only@veyvio.test')
  assert.ok(supportGrantee, 'finance-only fixture missing for support grant')
  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'support_access_change',
      targetType: 'privileged_access_grant',
      targetId: null,
      reason: 'Grant time-boxed read-only support access for Isolation A diagnostics.',
      evidenceReferences: [`fixture://support/${stamp}`],
      beforeSnapshot: { grants: 0 },
      proposedSnapshot: {
        granteeUserId: supportGrantee,
        accessLevel: 'read_only',
        ticketReference: `EXEC-${stamp}`,
      },
    }),
  )

  results.push(
    await proposeAndApprove(proposer, reviewer, {
      actionType: 'security_settings_change',
      targetType: 'executive_security_settings',
      targetId: orgA.companyId,
      reason: 'Update Isolation A Executive security settings through two-person control.',
      evidenceReferences: [`fixture://security/${stamp}`],
      beforeSnapshot: { settings: {} },
      proposedSnapshot: {
        settings: {
          mfaRequired: true,
          retentionDays: 2555,
          stamp,
        },
      },
    }),
  )
  const settings = await serviceGet(
    `executive_security_settings?select=settings&company_id=eq.${encodeURIComponent(orgA.companyId)}`,
  )
  assert.equal(settings[0]?.settings?.stamp, stamp)

  // Fresh MFA step-up — the earlier actions can exhaust the 10-minute window.
  const proposerFresh = await executiveSession(
    orgA.email,
    orgA.password ?? ISOLATION_PASSWORD,
    secrets,
  )
  const reviewerFresh = await executiveSession(DIRECTOR_EMAIL, ACCOUNT_PASSWORD, secrets)

  results.push(
    await proposeAndApprove(proposerFresh, reviewerFresh, {
      actionType: 'company_closure_or_deletion',
      targetType: 'company',
      targetId: orgA.companyId,
      reason: 'Soft-close Isolation A to prove closure executes without hard deletion.',
      evidenceReferences: [`fixture://closure/${stamp}`],
      beforeSnapshot: { status: 'active' },
      proposedSnapshot: { status: 'archived', destructiveDeletion: false },
    }),
  )
  const closed = await serviceGet(
    `companies?select=id,status,archived_at&id=eq.${encodeURIComponent(orgA.companyId)}`,
  )
  assert.equal(closed[0]?.status, 'archived')

  // Restore Isolation A so later reserved fixtures remain usable.
  await servicePatch(`companies?id=eq.${encodeURIComponent(orgA.companyId)}`, {
    status: 'active',
    archived_at: null,
    archived_by: null,
  })

  // Phase 4 residuals: page RBAC, cross-company non-inference, AAL1 Data API deny.
  for (const page of ['overview', 'budget', 'policies', 'governance']) {
    const allowed = await api(
      'GET',
      `/executive/pages/${page}`,
      proposer.accessToken,
      undefined,
      proposer.veyvioSession.id,
    )
    assert.equal(allowed.status, 200, `page ${page} should allow owner`)
    assert.doesNotMatch(JSON.stringify(allowed.payload), new RegExp(orgB.companyId, 'u'))
  }

  const boardDeniedWithoutGateway = await api(
    'GET',
    '/executive/pages/governance?action=executive.board.read',
    (
      await login('account-finance-only@veyvio.test', ACCOUNT_PASSWORD, { secrets })
    ).accessToken,
  )
  assert.equal(boardDeniedWithoutGateway.status, 403)

  for (const table of [
    'executive_policies',
    'executive_sensitive_action_requests',
    'executive_sensitive_execution_outcomes',
    'executive_security_settings',
  ]) {
    const select = table === 'executive_security_settings' ? 'company_id' : 'id'
    const response = await fetch(
      `${SUPABASE}/rest/v1/${table}?select=${select}&company_id=eq.${encodeURIComponent(orgA.companyId)}`,
      { headers: headers(proposer.accessToken) },
    )
    const payload = await response.json().catch(() => null)
    assert.equal(response.status, 200, `${table} direct read status ${JSON.stringify(payload)}`)
    assert.deepEqual(payload, [], `${table} must deny AAL1 direct reads`)
  }

  const supportLogin = await login('account-finance-only@veyvio.test', ACCOUNT_PASSWORD, {
    secrets,
  })
  const supportOnB = await api(
    'GET',
    '/executive/authorisation?action=executive.dashboard.read',
    supportLogin.accessToken,
  )
  assert.equal(supportOnB.status, 403, 'support grantee without EXECUTIVE must not enter')
  assert.doesNotMatch(JSON.stringify(supportOnB.payload), new RegExp(orgB.companyId, 'u'))

  console.log('executive-sensitive-typed-execution.e2e: PASS')
  for (const row of results) {
    console.log(`  ✓ executed request ${row.requestId}`)
  }
  console.log('  ✓ Isolation A company soft-closure restored to active')
  console.log('  ✓ page RBAC + AAL1 Data API deny + support non-inference checked')
}

main().catch((error) => {
  console.error('executive-sensitive-typed-execution.e2e: FAIL')
  console.error(error)
  process.exit(1)
})
