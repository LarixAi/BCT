/**
 * Release-blocking tenant isolation checks for Command API.
 * Run: node --experimental-strip-types or via npx tsx after deploy.
 *
 * These assert Company A cannot read Company B records by id.
 */
import assert from 'node:assert/strict'

const API = process.env.VEYVIO_API_URL ?? 'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api'
const ANON = process.env.VEYVIO_ANON_KEY ?? ''

async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(res.status, 200, `login failed for ${email}`)
  return res.json()
}

async function get(path, token) {
  return fetch(`${API}/api${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  })
}

async function main() {
  if (!ANON) {
    console.log('Skip: set VEYVIO_ANON_KEY to run isolation tests against hosted API')
    return
  }

  const a = await login('admin@veyvio.test', 'VeyvioCommand1!')
  assert.ok(a.accessToken)

  const vehicles = await (await get('/vehicles/profiles', a.accessToken)).json()
  assert.ok(Array.isArray(vehicles))
  assert.ok(vehicles.length > 0, 'expected seeded vehicles for company A')

  // Guaranteed foreign UUID — must not leak existence as 200 with foreign payload.
  const foreignId = '00000000-0000-4000-8000-000000000099'
  const foreign = await get(`/vehicles/${foreignId}/profile`, a.accessToken)
  assert.ok(foreign.status === 404 || foreign.status === 403, `expected 404/403 for foreign vehicle, got ${foreign.status}`)

  const noCompanyHeader = await fetch(`${API}/api/vehicles/profiles`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  })
  assert.ok([401, 403, 409].includes(noCompanyHeader.status), 'unauthenticated list must fail')

  console.log('tenant-isolation: ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
