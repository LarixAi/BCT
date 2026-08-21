/**
 * Wave 3E-1 — Command Session BFF pure helpers (production module).
 */
import assert from 'node:assert/strict'
import {
  assessSameOriginMutation,
  buildSessionClearCookies,
  buildSessionSetCookies,
  COOKIE_ACCESS_HOST,
  COOKIE_REFRESH_HOST,
  enforceCanonicalHost,
  extractTokens,
  parseCookies,
  stripAuthCredentials,
} from '../functions/_lib/session.ts'

const env = {
  COMMAND_API_URL: 'https://example.supabase.co/functions/v1/command-api',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  VEYVIO_COMMAND_CANONICAL_HOST: 'command.veyvio.co.uk',
  VEYVIO_COMMAND_ENFORCE_CANONICAL_HOST: '1',
}

// Strip credentials from SPA responses
{
  const stripped = stripAuthCredentials({
    accessToken: 'secret-at',
    refreshToken: 'secret-rt',
    requiresTenantSelection: true,
    memberships: [{ companyId: 'c1' }],
    user: { id: 'u1' },
  }) as Record<string, unknown>
  assert.equal(stripped.accessToken, undefined)
  assert.equal(stripped.refreshToken, undefined)
  assert.equal(stripped.requiresTenantSelection, true)
  assert.ok(stripped.memberships)
}

assert.deepEqual(extractTokens({ access_token: 'a', refresh_token: 'r' }), {
  accessToken: 'a',
  refreshToken: 'r',
})

// Cookie names are __Host- in production mode
{
  const req = new Request('https://command.veyvio.co.uk/api/session/login', {
    method: 'POST',
    headers: { origin: 'https://command.veyvio.co.uk' },
  })
  const cookies = buildSessionSetCookies(req, env, {
    accessToken: 'at-value',
    refreshToken: 'rt-value',
  })
  assert.ok(cookies.some((c) => c.startsWith(`${COOKIE_ACCESS_HOST}=`)))
  assert.ok(cookies.some((c) => c.startsWith(`${COOKIE_REFRESH_HOST}=`)))
  assert.ok(cookies.every((c) => c.includes('HttpOnly')))
  assert.ok(cookies.every((c) => c.includes('Secure')))
  assert.ok(cookies.every((c) => c.includes('SameSite=Strict')))
  assert.ok(cookies.every((c) => c.includes('Path=/')))
  assert.ok(cookies.every((c) => !/Domain=/i.test(c)))

  const cleared = buildSessionClearCookies(req, env)
  assert.ok(cleared.every((c) => c.includes('Max-Age=0')))
}

// CSRF rejects foreign origin
{
  const bad = assessSameOriginMutation(
    new Request('https://command.veyvio.co.uk/api/session/login', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' },
    }),
  )
  assert.equal(bad.allowed, false)

  const good = assessSameOriginMutation(
    new Request('https://command.veyvio.co.uk/api/session/login', {
      method: 'POST',
      headers: { origin: 'https://command.veyvio.co.uk', 'sec-fetch-site': 'same-origin' },
    }),
  )
  assert.equal(good.allowed, true)

  const safeGet = assessSameOriginMutation(
    new Request('https://command.veyvio.co.uk/api/session/status', { method: 'GET' }),
  )
  assert.equal(safeGet.allowed, true)
}

// Canonical host enforcement
{
  const denied = enforceCanonicalHost(
    new Request('https://veyvio-admin.pages.dev/api/session/login', { method: 'POST' }),
    env,
  )
  assert.ok(denied)
  assert.equal(denied.status, 403)

  const allowed = enforceCanonicalHost(
    new Request('https://command.veyvio.co.uk/api/session/login', { method: 'POST' }),
    env,
  )
  assert.equal(allowed, null)
}

// Cookie parser
{
  const parsed = parseCookies(`${COOKIE_ACCESS_HOST}=abc; ${COOKIE_REFRESH_HOST}=def`)
  assert.equal(parsed[COOKIE_ACCESS_HOST], 'abc')
  assert.equal(parsed[COOKIE_REFRESH_HOST], 'def')
}

console.log('command-session-bff.unit: ok')
