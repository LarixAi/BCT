#!/usr/bin/env node
/**
 * Fail production builds/deploys when mock, bypass or unsafe bootstrap flags are enabled.
 */
import assert from 'node:assert/strict'

const env = process.env
const mode = env.NODE_ENV ?? env.MODE ?? ''
// CI alone is not production (PR-06). Explicit VALIDATE_PRODUCTION_ENV or NODE_ENV=production.
const isProd =
  mode === 'production' ||
  env.VALIDATE_PRODUCTION_ENV === 'true' ||
  env.VEYVIO_APP_ENV === 'production'

if (!isProd) {
  console.log('validate-production-env: skip (not production)')
  process.exit(0)
}

const forbidden = [
  ['VITE_MOCK_API', 'true'],
  ['VITE_OPERATIONS_MOCK', 'true'],
  ['VITE_USE_MOCK_API', 'true'],
  ['VITE_DEV_BYPASS_AUTH', 'true'],
  ['ALLOW_PLATFORM_BOOTSTRAP', 'true'],
  ['MFA_DEV_MODE', 'true'],
]

const errors = []
for (const [key, bad] of forbidden) {
  if (String(env[key] ?? '').toLowerCase() === bad) {
    errors.push(`${key} must not be ${bad} in production`)
  }
}

// Unsafe default-on: mock enabled when unset
if (env.VITE_MOCK_API !== 'false' && env.VITE_MOCK_API !== undefined && env.VITE_MOCK_API !== 'true') {
  // explicit other values still checked above
}

if (env.VITE_MOCK_API === undefined && env.VITE_USE_MOCK_API === undefined) {
  // live-by-default — OK
}

// Wave 3E-1: production SPA must use same-origin BFF, not direct Supabase token custody.
const apiUrl = String(env.VITE_API_URL ?? '').trim()
if (apiUrl && !apiUrl.startsWith('/api/command') && /supabase\.co/i.test(apiUrl)) {
  errors.push(
    'VITE_API_URL must be /api/command (same-origin Pages Functions BFF) in production — not a direct Supabase command-api URL',
  )
}
if (!apiUrl || apiUrl === '/api/command') {
  // OK — relative BFF
} else if (apiUrl.startsWith('/api/command')) {
  // OK
} else if (!/supabase\.co/i.test(apiUrl)) {
  // Non-supabase absolute URLs still rejected for Command production custody.
  if (apiUrl.startsWith('http')) {
    errors.push('VITE_API_URL must be the same-origin path /api/command for production Command builds')
  }
}

const testAdmin = (env.VEYVIO_PLATFORM_BOOTSTRAP_EMAIL ?? '').toLowerCase()
if (testAdmin === 'admin@veyvio.test') {
  errors.push('VEYVIO_PLATFORM_BOOTSTRAP_EMAIL must not be admin@veyvio.test in production')
}

assert.equal(errors.length, 0, errors.join('\n'))
console.log('validate-production-env: OK')
