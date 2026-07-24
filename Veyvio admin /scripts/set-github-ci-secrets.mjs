#!/usr/bin/env node
/**
 * Push tenant-isolation CI secrets to GitHub (reads local Admin .env — never logs values).
 *
 * Usage:
 *   node scripts/set-github-ci-secrets.mjs [--repo owner/name]
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const envPath = join(root, '..', '.env')
const repoFlag = process.argv.includes('--repo')
  ? ['--repo', process.argv[process.argv.indexOf('--repo') + 1]]
  : []

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return out
}

function setSecret(name, value) {
  if (!value) {
    console.error(`skip ${name}: no value`)
    return false
  }
  const result = spawnSync(
    'gh',
    ['secret', 'set', name, ...repoFlag],
    { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  )
  if (result.status !== 0) {
    console.error(`failed ${name}:`, result.stderr?.trim() || 'unknown error')
    return false
  }
  console.log(`set ${name}`)
  return true
}

const env = parseEnvFile(envPath)
const projectRef = env.SUPABASE_PROJECT_REF ?? 'qeckgqjrfbdyxchuncdt'
const apiUrl =
  env.VITE_API_URL ?? `https://${projectRef}.supabase.co/functions/v1/command-api`
const supabaseUrl = env.VITE_SUPABASE_URL ?? `https://${projectRef}.supabase.co`

const secrets = {
  VEYVIO_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
  VEYVIO_API_URL: apiUrl,
  VEYVIO_SUPABASE_URL: supabaseUrl,
  VEYVIO_PLATFORM_EMAIL: 'admin@veyvio.test',
  VEYVIO_PLATFORM_PASSWORD: 'VeyvioCommand1!',
  VEYVIO_ISOLATION_PASSWORD: 'VeyvioIsolation1!',
}

let ok = 0
for (const [name, value] of Object.entries(secrets)) {
  if (setSecret(name, value)) ok++
}

if (ok < Object.keys(secrets).length) {
  process.exit(1)
}
console.log('GitHub CI secrets configured.')
