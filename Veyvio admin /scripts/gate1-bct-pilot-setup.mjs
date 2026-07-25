#!/usr/bin/env node
/**
 * Gate 1 BCT pilot driver setup — seeds pilot auth + duty via Command API, then runs live smoke.
 *
 * Usage:
 *   VEYVIO_ANON_KEY=... npm run gate1:bct-pilot-setup
 *   VEYVIO_ANON_KEY=... npm run gate1:bct-pilot-setup -- --smoke-only
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bearerHeaders, resolveCommandApiEnv } from './lib/command-api-env.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, '../..')
const driverRoot = join(repoRoot, 'veyvio-driver-App')

const { api: API, anon: ANON } = resolveCommandApiEnv()
const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const smokeOnly = process.argv.includes('--smoke-only')
const seedOnly = process.argv.includes('--seed-only')

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: bearerHeaders(ANON, token),
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

async function loginPlatform() {
  let res = await api('/auth/login', { method: 'POST', body: { email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD } })
  assert.equal(res.status, 200, `platform login failed: ${JSON.stringify(res.json)}`)

  if (res.json?.requiresMfaChallenge && res.json.devMfaCode) {
    res = await api('/auth/login/confirm', {
      method: 'POST',
      body: {
        challengeId: res.json.mfaChallengeId,
        code: res.json.devMfaCode,
        companyId: res.json.pendingCompanyId,
      },
    })
    assert.equal(res.status, 200, `platform MFA failed: ${JSON.stringify(res.json)}`)
  }

  // Platform routes (seed-bct-pilot) authenticate without active company — do not select tenant.
  const token = res.json?.accessToken
  assert.ok(token, 'platform access token missing')
  return token
}

async function seedPilot(token) {
  const res = await api('/system/seed-bct-pilot', { method: 'POST', token })
  assert.equal(res.status, 200, `seed-bct-pilot failed: ${JSON.stringify(res.json)}`)
  assert.ok(res.json?.email && res.json?.dutyId, 'seed response incomplete')
  return res.json
}

async function main() {
  if (!ANON) {
    console.error('VEYVIO_ANON_KEY required (or VITE_SUPABASE_ANON_KEY in Admin .env)')
    process.exit(1)
  }

  let pilotEmail = process.env.VEYVIO_PILOT_EMAIL
  let pilotPassword = process.env.VEYVIO_PILOT_PASSWORD

  if (!smokeOnly) {
    console.log('1) Platform login')
    const token = await loginPlatform()

    console.log('2) Seed BCT pilot driver + published duty')
    const seeded = await seedPilot(token)
    pilotEmail = pilotEmail ?? seeded.email
    pilotPassword = pilotPassword ?? seeded.password

    console.log('gate1-bct-pilot-setup: seeded')
    console.log(
      JSON.stringify(
        {
          email: seeded.email,
          companyName: seeded.companyName,
          vehicleRegistration: seeded.vehicleRegistration,
          dutyId: seeded.dutyId,
          serviceDate: seeded.serviceDate,
        },
        null,
        2,
      ),
    )
    console.log('')
    console.log('Export for smoke:')
    console.log(`export VEYVIO_PILOT_EMAIL="${pilotEmail}"`)
    console.log(`export VEYVIO_PILOT_PASSWORD="${pilotPassword}"`)
  } else {
    pilotEmail = pilotEmail ?? 'pilot-driver@veyvio.test'
    pilotPassword = pilotPassword ?? 'VeyvioPilot1!'
  }

  if (seedOnly) {
    return
  }

  console.log('\n3) Pilot driver live smoke')
  const smoke = spawnSync('node', ['scripts/gate1-pilot-exit-smoke.mjs'], {
    cwd: driverRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      VEYVIO_PILOT_EMAIL: pilotEmail,
      VEYVIO_PILOT_PASSWORD: pilotPassword,
    },
  })
  process.exit(smoke.status ?? 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
