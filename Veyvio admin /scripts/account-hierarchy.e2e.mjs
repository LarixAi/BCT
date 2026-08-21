/**
 * Hosted end-to-end proof for the Veyvio account hierarchy.
 *
 * Uses the existing, idempotent Isolation A fixture. The accounts use the
 * reserved @veyvio.test domain and never touch a customer company.
 */
import assert from 'node:assert/strict'

const DEFAULT_API = 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const API = String(process.env.VEYVIO_API_URL ?? process.env.VITE_API_URL ?? DEFAULT_API).replace(/\/$/, '')
const ANON = String(process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const ISOLATION_PASSWORD = process.env.VEYVIO_ISOLATION_PASSWORD ?? 'VeyvioIsolation1!'
const ACCOUNT_PASSWORD = process.env.VEYVIO_ACCOUNT_E2E_PASSWORD ?? 'VeyvioAccounts1!'

const TEST_ACCOUNTS = {
  executive: 'account-executive@veyvio.test',
  command: 'account-command@veyvio.test',
  finance: 'account-finance-only@veyvio.test',
  multi: 'account-multi@veyvio.test',
  hr: 'account-hr@veyvio.test',
  yard: 'account-yard@veyvio.test',
}

function headers(token, withJson = false) {
  return {
    apikey: ANON,
    Authorization: `Bearer ${token}`,
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
  }
}

async function api(method, path, token, body) {
  const response = await fetch(`${API}/api${path}`, {
    method,
    headers: headers(token, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: response.status, json }
}

async function login(email, password) {
  let result = await api('POST', '/auth/login', ANON, { email, password })
  assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.json)}`)

  if (result.json?.requiresMfaChallenge) {
    assert.ok(result.json.devMfaCode, `MFA test code unavailable for ${email}`)
    result = await api('POST', '/auth/login/confirm', ANON, {
      challengeId: result.json.mfaChallengeId,
      code: result.json.devMfaCode,
      companyId: result.json.pendingCompanyId,
    })
    assert.equal(result.status, 200, `MFA confirm failed for ${email}: ${JSON.stringify(result.json)}`)
  }

  if (result.json?.requiresTenantSelection) {
    const companyId = result.json.memberships?.[0]?.companyId ?? result.json.memberships?.[0]?.tenantId
    assert.ok(companyId, `company selection missing for ${email}`)
    result = await api('POST', '/auth/select-company', result.json.accessToken, {
      companyId,
      refreshToken: result.json.refreshToken,
    })
    assert.equal(result.status, 200, `company selection failed for ${email}: ${JSON.stringify(result.json)}`)
  }

  assert.ok(result.json?.accessToken, `access token missing for ${email}`)
  return result.json
}

async function inviteAndAccept(actorToken, input) {
  const created = await api('POST', '/settings/invitations', actorToken, input)
  assert.equal(created.status, 201, `invite failed: ${JSON.stringify(created.json)}`)
  const token = created.json?.invitationToken ?? created.json?.devInvitationToken
  assert.ok(token, `invitation token missing for ${input.email}`)

  const accepted = await api('POST', '/auth/accept-invitation', ANON, {
    token,
    password: ACCOUNT_PASSWORD,
    firstName: input.firstName,
    lastName: input.lastName,
  })
  assert.equal(accepted.status, 200, `accept failed for ${input.email}: ${JSON.stringify(accepted.json)}`)
  return login(input.email, ACCOUNT_PASSWORD)
}

async function assertApplications(session, expected) {
  const access = await api('GET', '/auth/application-access', session.accessToken)
  assert.equal(access.status, 200, `application access failed: ${JSON.stringify(access.json)}`)
  for (const app of expected) {
    assert.ok(access.json.applications.includes(app), `expected ${app}, got ${JSON.stringify(access.json)}`)
  }
  return access.json
}

async function main() {
  assert.ok(ANON, 'VEYVIO_ANON_KEY is required')

  const platform = await login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
  const seeded = await api('POST', '/system/seed-isolation', platform.accessToken)
  assert.ok([200, 201].includes(seeded.status), `isolation seed failed: ${JSON.stringify(seeded.json)}`)
  const org = seeded.json?.orgs?.find((item) => item.label === 'A')
  assert.ok(org?.email && org?.depotId, 'Isolation A fixture is incomplete')

  // Existing fixture proves one identity can hold Executive, Command and Driver.
  const owner = await login(org.email, org.password ?? ISOLATION_PASSWORD)
  await assertApplications(owner, ['EXECUTIVE', 'COMMAND', 'DRIVER'])
  assert.equal((await api('GET', '/settings/account-hierarchy', owner.accessToken)).status, 200)
  assert.equal((await api('GET', '/driver/bootstrap', owner.accessToken)).status, 200)

  const executive = await inviteAndAccept(owner.accessToken, {
    email: TEST_ACCOUNTS.executive,
    appType: 'EXECUTIVE',
    roleName: 'director',
    firstName: 'Account',
    lastName: 'Executive',
  })
  await assertApplications(executive, ['EXECUTIVE'])
  assert.equal((await api('GET', '/settings/account-hierarchy', executive.accessToken)).status, 200)

  const command = await inviteAndAccept(owner.accessToken, {
    email: TEST_ACCOUNTS.command,
    appType: 'COMMAND',
    roleName: 'transport_manager',
    firstName: 'Account',
    lastName: 'Command',
  })
  await assertApplications(command, ['COMMAND'])
  assert.equal((await api('GET', '/vehicles/profiles', command.accessToken)).status, 200)

  const finance = await inviteAndAccept(owner.accessToken, {
    email: TEST_ACCOUNTS.finance,
    appType: 'FINANCE',
    roleName: 'finance_manager',
    firstName: 'Account',
    lastName: 'Finance',
  })
  await assertApplications(finance, ['FINANCE'])
  const financeMemberships = await api('GET', '/auth/finance-memberships', finance.accessToken)
  assert.equal(financeMemberships.status, 200)
  assert.equal(financeMemberships.json?.memberships?.[0]?.role, 'finance_manager')
  assert.equal((await api('GET', '/settings/invitations', finance.accessToken)).status, 403)
  assert.equal((await api('GET', '/vehicles/profiles', finance.accessToken)).status, 403)

  const hr = await inviteAndAccept(owner.accessToken, {
    email: TEST_ACCOUNTS.hr,
    appType: 'HR',
    roleName: 'hr_manager',
    firstName: 'Account',
    lastName: 'People',
  })
  await assertApplications(hr, ['HR'])

  const yard = await inviteAndAccept(command.accessToken, {
    email: TEST_ACCOUNTS.yard,
    appType: 'YARD',
    roleName: 'yard_manager',
    depotIds: [org.depotId],
    firstName: 'Account',
    lastName: 'Yard',
  })
  await assertApplications(yard, ['YARD'])
  assert.equal((await api('GET', '/yard/hub', yard.accessToken)).status, 200)

  // One login gains a second app without losing the first role or Finance access.
  await inviteAndAccept(owner.accessToken, {
    email: TEST_ACCOUNTS.multi,
    appType: 'FINANCE',
    roleName: 'finance_officer',
    firstName: 'Account',
    lastName: 'Multi',
  })
  const financeAndCommand = await inviteAndAccept(owner.accessToken, {
    email: TEST_ACCOUNTS.multi,
    appType: 'COMMAND',
    roleName: 'dispatcher',
    firstName: 'Account',
    lastName: 'Multi',
  })
  await assertApplications(financeAndCommand, ['FINANCE', 'COMMAND'])

  // Forbidden account creation and cross-app calls must fail closed.
  const commandCreatesFinance = await api('POST', '/settings/invitations', command.accessToken, {
    email: 'denied-command-finance@veyvio.test',
    appType: 'FINANCE',
    roleName: 'finance_manager',
  })
  assert.equal(commandCreatesFinance.status, 403)

  const smuggledRole = await api('POST', '/settings/invitations', owner.accessToken, {
    email: 'denied-role-smuggling@veyvio.test',
    appType: 'FINANCE',
    roleName: 'transport_manager',
  })
  assert.equal(smuggledRole.status, 403)

  assert.equal((await api('GET', '/settings/account-hierarchy', command.accessToken)).status, 403)
  assert.equal((await api('GET', '/driver/bootstrap', yard.accessToken)).status, 403)

  console.log('account-hierarchy.e2e: PASS')
  console.log('  ✓ Executive, Command, Finance, HR, Driver and Yard access')
  console.log('  ✓ Executive → department account creation')
  console.log('  ✓ Command → Yard account creation')
  console.log('  ✓ one identity → multiple applications')
  console.log('  ✓ forbidden lateral and cross-app access')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
