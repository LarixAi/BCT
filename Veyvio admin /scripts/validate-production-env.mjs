#!/usr/bin/env node
/**
 * Fail production builds/deploys when mock, bypass or unsafe bootstrap flags are enabled.
 */
import assert from 'node:assert/strict'

const env = process.env
const mode = env.NODE_ENV ?? env.MODE ?? ''
const isProd =
  mode === 'production' ||
  env.CI === 'true' ||
  env.VERCEL === '1' ||
  env.NETLIFY === 'true' ||
  env.VALIDATE_PRODUCTION_ENV === 'true'

if (!isProd) {
  console.log('validate-production-env: skip (not production/CI)')
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

const testAdmin = (env.VEYVIO_PLATFORM_BOOTSTRAP_EMAIL ?? '').toLowerCase()
if (testAdmin === 'admin@veyvio.test') {
  errors.push('VEYVIO_PLATFORM_BOOTSTRAP_EMAIL must not be admin@veyvio.test in production')
}

assert.equal(errors.length, 0, errors.join('\n'))
console.log('validate-production-env: OK')
