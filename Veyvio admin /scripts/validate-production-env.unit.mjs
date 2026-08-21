#!/usr/bin/env node
/**
 * Unit checks for validate-production-env.mjs (CI must not imply production).
 * Run: node scripts/validate-production-env.unit.mjs
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const script = join(dirname(fileURLToPath(import.meta.url)), 'validate-production-env.mjs')

function run(env) {
  return spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
}

const skipCi = run({
  CI: 'true',
  NODE_ENV: 'development',
  VALIDATE_PRODUCTION_ENV: '',
  VERCEL: '',
  NETLIFY: '',
})
if (skipCi.status !== 0 || !/skip \(not production\)/.test(skipCi.stdout + skipCi.stderr)) {
  console.error('expected CI alone to skip validation', skipCi.stdout, skipCi.stderr)
  process.exit(1)
}

const failMock = run({
  VALIDATE_PRODUCTION_ENV: 'true',
  VITE_MOCK_API: 'true',
  VITE_API_URL: '/api/command',
})
if (failMock.status === 0) {
  console.error('expected VITE_MOCK_API=true to fail')
  process.exit(1)
}

const ok = run({
  VALIDATE_PRODUCTION_ENV: 'true',
  VITE_API_URL: '/api/command',
  VITE_MOCK_API: 'false',
})
if (ok.status !== 0) {
  console.error('expected clean production env to pass', ok.stdout, ok.stderr)
  process.exit(1)
}

console.log('validate-production-env.unit.mjs: ok')
