#!/usr/bin/env node
/**
 * Push tenant-isolation CI secrets to GitHub (reads local Admin .env — never logs values).
 *
 * Usage:
 *   node scripts/set-github-ci-secrets.mjs [--repo owner/name]
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { gate1SecretsPath, loadGate1Secrets, parseEnvFile } from './lib/gate1-secrets.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const adminRoot = join(root, '..')
const repoRoot = join(adminRoot, '..')
const envPath = join(adminRoot, '.env')
const repoFlag = process.argv.includes('--repo')
  ? ['--repo', process.argv[process.argv.indexOf('--repo') + 1]]
  : []

function setSecret(name, value) {
  if (!value) {
    console.error(`skip ${name}: no value`)
    return false
  }
  const ghBin = process.env.GH_BIN || (existsSync('/Users/laingfamily/.local/bin/gh')
    ? '/Users/laingfamily/.local/bin/gh'
    : 'gh')
  const result = spawnSync(
    ghBin,
    ['secret', 'set', name, ...repoFlag],
    { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: process.env },
  )
  if (result.status !== 0) {
    console.error(
      `failed ${name}:`,
      result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status ?? 'spawn'}`,
    )
    return false
  }
  console.log(`set ${name}`)
  return true
}

const env = parseEnvFile(envPath)
const gate1 = loadGate1Secrets(repoRoot)
const projectRef = env.SUPABASE_PROJECT_REF ?? 'qeckgqjrfbdyxchuncdt'
const apiUrl =
  gate1.VEYVIO_API_URL ??
  env.VITE_API_URL ??
  `https://${projectRef}.supabase.co/functions/v1/command-api`
const supabaseUrl =
  gate1.VEYVIO_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? `https://${projectRef}.supabase.co`

const secrets = {
  VEYVIO_ANON_KEY: gate1.VEYVIO_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY,
  VEYVIO_API_URL: apiUrl,
  VEYVIO_SUPABASE_URL: supabaseUrl,
  VEYVIO_PLATFORM_EMAIL: gate1.VEYVIO_PLATFORM_EMAIL ?? 'admin@veyvio.test',
  VEYVIO_PLATFORM_PASSWORD: gate1.VEYVIO_PLATFORM_PASSWORD ?? 'VeyvioCommand1!',
  VEYVIO_ISOLATION_PASSWORD: gate1.VEYVIO_ISOLATION_PASSWORD ?? 'VeyvioIsolation1!',
  ...(gate1.VEYVIO_PILOT_EMAIL && gate1.VEYVIO_PILOT_PASSWORD
    ? {
        VEYVIO_PILOT_EMAIL: gate1.VEYVIO_PILOT_EMAIL,
        VEYVIO_PILOT_PASSWORD: gate1.VEYVIO_PILOT_PASSWORD,
      }
    : {}),
}

if (gate1.VEYVIO_ISOLATION_PASSWORD) {
  console.log(`Using rotated credentials from ${gate1SecretsPath(repoRoot)}`)
}

let ok = 0
for (const [name, value] of Object.entries(secrets)) {
  if (setSecret(name, value)) ok++
}

if (ok < Object.keys(secrets).length) {
  process.exit(1)
}
console.log('GitHub CI secrets configured.')
