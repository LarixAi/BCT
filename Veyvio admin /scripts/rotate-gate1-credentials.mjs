#!/usr/bin/env node
/**
 * F-04 — rotate Gate 1 test credentials on hosted Supabase and verify live smokes.
 *
 * Sets edge secrets (isolation + pilot passwords), re-seeds auth users, writes
 * `.gate1-secrets.local.env` at repo root, and runs audit + dispatch + pilot smoke.
 *
 * Usage:
 *   cd "Veyvio admin "
 *   npm run gate1:rotate-credentials
 *   npm run gate1:rotate-credentials -- --push-ci
 *   npm run gate1:rotate-credentials -- --verify-only
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bearerHeaders, resolveCommandApiEnv } from './lib/command-api-env.mjs'
import { loadGate1Secrets, writeGate1Secrets } from './lib/gate1-secrets.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const adminRoot = join(scriptDir, '..')
const repoRoot = join(adminRoot, '..')
const driverRoot = join(repoRoot, 'veyvio-driver-App')

const pushCi = process.argv.includes('--push-ci')
const verifyOnly = process.argv.includes('--verify-only')
const skipSecretsSet = process.argv.includes('--skip-secrets-set')

const PLATFORM_EMAIL = process.env.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test'
const PLATFORM_PASSWORD = process.env.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!'
const PILOT_EMAIL = (process.env.VEYVIO_PILOT_EMAIL ?? 'pilot-driver@veyvio.test').trim().toLowerCase()

function generatePassword() {
  return `Vv1!${randomBytes(18).toString('base64url')}`
}

function run(command, args, { cwd = adminRoot, env = process.env } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status ?? 'unknown'})`)
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const { api: API, anon: ANON } = resolveCommandApiEnv()
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
  let lastError = null
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let res = await api('/auth/login', {
      method: 'POST',
      body: { email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD },
    })

    if (res.status === 502 || res.status === 503) {
      lastError = new Error(`platform login transient ${res.status}`)
      await new Promise((resolve) => setTimeout(resolve, attempt * 800))
      continue
    }

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

    const token = res.json?.accessToken
    assert.ok(token, 'platform access token missing')
    return token
  }
  throw lastError ?? new Error('platform login failed after retries')
}

function setSupabaseSecrets(projectRef, secrets) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('SUPABASE_ACCESS_TOKEN required to set edge secrets (from Admin .env)')
  }

  const pairs = Object.entries(secrets).map(([key, value]) => `${key}=${value}`)
  const args = ['secrets', 'set', ...pairs, '--project-ref', projectRef]
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: adminRoot,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`supabase secrets set failed (${result.status ?? 'unknown'})`)
  }
}

async function main() {
  const { anon: ANON } = resolveCommandApiEnv()
  if (!ANON) {
    console.error('VEYVIO_ANON_KEY or VITE_SUPABASE_ANON_KEY required')
    process.exit(1)
  }

  const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'qeckgqjrfbdyxchuncdt'
  const useEnvPasswords = process.argv.includes('--use-env-passwords')
  let isolationPassword = useEnvPasswords ? process.env.VEYVIO_ISOLATION_PASSWORD : undefined
  let pilotPassword = useEnvPasswords ? process.env.VEYVIO_PILOT_PASSWORD : undefined

  if (!verifyOnly) {
    isolationPassword = isolationPassword ?? generatePassword()
    pilotPassword = pilotPassword ?? generatePassword()

    if (!skipSecretsSet) {
      console.log('1) Set Supabase edge secrets (isolation + pilot passwords)')
      setSupabaseSecrets(projectRef, {
        VEYVIO_ISOLATION_PASSWORD: isolationPassword,
        VEYVIO_PILOT_PASSWORD: pilotPassword,
        VEYVIO_PILOT_EMAIL: PILOT_EMAIL,
      })
    } else {
      console.log('1) Skipping secrets set (--skip-secrets-set)')
    }

    const { api: apiUrl, supabase } = resolveCommandApiEnv()
    const secretsPath = writeGate1Secrets(repoRoot, {
      VEYVIO_ISOLATION_PASSWORD: isolationPassword,
      VEYVIO_PILOT_EMAIL: PILOT_EMAIL,
      VEYVIO_PILOT_PASSWORD: pilotPassword,
      VEYVIO_API_URL: apiUrl,
      VEYVIO_SUPABASE_URL: supabase,
      VEYVIO_ANON_KEY: ANON,
      VEYVIO_PLATFORM_EMAIL: PLATFORM_EMAIL,
      VEYVIO_PLATFORM_PASSWORD: PLATFORM_PASSWORD,
    })
    console.log(`2) Wrote ${secretsPath}`)

    process.env.VEYVIO_ISOLATION_PASSWORD = isolationPassword
    process.env.VEYVIO_PILOT_EMAIL = PILOT_EMAIL
    process.env.VEYVIO_PILOT_PASSWORD = pilotPassword

    console.log('3) Platform login + re-seed isolation tenants')
    const token = await loginPlatform()
    const isolationSeed = await api('/system/seed-isolation', { method: 'POST', token })
    assert.equal(isolationSeed.status, 200, `seed-isolation failed: ${JSON.stringify(isolationSeed.json)}`)

    console.log('4) Re-seed BCT pilot driver + published duty')
    const pilotSeed = await api('/system/seed-bct-pilot', { method: 'POST', token })
    assert.equal(pilotSeed.status, 200, `seed-bct-pilot failed: ${JSON.stringify(pilotSeed.json)}`)

    if (pushCi) {
      console.log('5) Push GitHub CI secrets')
      run('node', ['scripts/set-github-ci-secrets.mjs'], { cwd: adminRoot })
    }
  } else {
    const existing = loadGate1Secrets(repoRoot)
    isolationPassword = isolationPassword ?? existing.VEYVIO_ISOLATION_PASSWORD
    pilotPassword = pilotPassword ?? existing.VEYVIO_PILOT_PASSWORD
    assert.ok(isolationPassword && pilotPassword, 'verify-only needs .gate1-secrets.local.env or env vars')
    process.env.VEYVIO_ISOLATION_PASSWORD = isolationPassword
    process.env.VEYVIO_PILOT_EMAIL = PILOT_EMAIL
    process.env.VEYVIO_PILOT_PASSWORD = pilotPassword
  }

  console.log('\n6) Verify secrets audit')
  run('npm', ['run', 'audit:secrets'], { cwd: repoRoot })

  console.log('7) Verify tenant isolation + dispatch gates')
  run('npm', ['run', 'test:dispatch-gates-live'], { cwd: adminRoot })

  console.log('8) Verify BCT pilot driver live smoke')
  run('node', ['scripts/gate1-pilot-exit-smoke.mjs'], {
    cwd: driverRoot,
    env: {
      ...process.env,
      VEYVIO_PILOT_EMAIL: PILOT_EMAIL,
      VEYVIO_PILOT_PASSWORD: pilotPassword,
    },
  })

  console.log('\ngate1:rotate-credentials — PASS')
  console.log('Service role key rotation remains manual in Supabase Dashboard (see credential-rotation-runbook.md).')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
