#!/usr/bin/env node
/**
 * Gate 1 physical device exit — automated path for Android + iOS checklist.
 *
 * Default: live API checks shared by both platforms (login, BCT bootstrap, duty
 * gate, vehicle readiness/timeline, notifications, company scope).
 *
 * Optional:
 *   --ui              Playwright mobile viewports (auth entry smoke)
 *   --android-native  Install APK when an adb device is connected
 *   --skip-build      Skip production rebuild (still runs VERIFY_SKIP_BUILD scan if dist exists)
 *
 * Manual still required on handsets: airplane mode walkaround, handback/parking,
 * native push tap-through.
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAdminEnv } from '../../scripts/load-admin-env.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const driverAppRoot = join(scriptDir, '..')
const repoRoot = join(driverAppRoot, '..')
const playwrightConfig = join(repoRoot, 'playwright.driver.config.ts')

const skipBuild = process.argv.includes('--skip-build')
const androidNative = process.argv.includes('--android-native')
const runUi = process.argv.includes('--ui')

function loadEnvFile(path, { overwrite = false } = {}) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (overwrite || !process.env[key]) process.env[key] = value
  }
}

loadAdminEnv(repoRoot)
loadEnvFile(join(repoRoot, '.gate1-secrets.local.env'), { overwrite: true })

function normalizeSupabaseUrl(apiUrl, explicit) {
  const direct = String(explicit ?? '').trim()
  if (direct) return direct.replace(/\/$/, '')
  const derived = String(apiUrl ?? '').replace(/\/functions\/v1\/command-api\/?$/, '')
  if (derived && derived !== apiUrl) return derived
  return 'https://qeckgqjrfbdyxchuncdt.supabase.co'
}

const anon = process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const apiUrl =
  process.env.VEYVIO_API_URL ??
  process.env.VITE_API_URL ??
  process.env.VITE_COMMAND_API_BASE_URL
const supabaseUrl = normalizeSupabaseUrl(
  apiUrl,
  process.env.VEYVIO_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
)

if (!anon || !supabaseUrl) {
  console.error('Missing VEYVIO_ANON_KEY / VEYVIO_SUPABASE_URL — load Admin .env or gate1 secrets first.')
  process.exit(1)
}

if (!process.env.VEYVIO_PILOT_EMAIL || !process.env.VEYVIO_PILOT_PASSWORD) {
  console.error('Missing VEYVIO_PILOT_EMAIL / VEYVIO_PILOT_PASSWORD — run npm run gate1:rotate-credentials first.')
  process.exit(1)
}

const buildEnv = {
  ...process.env,
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: anon,
  VITE_COMMAND_API_BASE_URL: apiUrl ?? `${supabaseUrl}/functions/v1/command-api`,
  VITE_AUTH_API_BASE_URL: apiUrl ?? `${supabaseUrl}/functions/v1/command-api`,
  VITE_MOCK_API: '',
  VITE_ENABLE_BASE44: '',
  VITE_ENABLE_PHV_MODULE: '',
  VITE_DRIVER_NAV_TEST_MODE: '',
}

console.log('Gate 1 device exit — Android + iOS automated path\n')

console.log('1) Production build guard')
execSync(
  skipBuild
    ? 'VERIFY_SKIP_BUILD=1 node scripts/verify-production-build.mjs'
    : 'node scripts/verify-production-build.mjs',
  { cwd: driverAppRoot, stdio: 'inherit', env: buildEnv },
)

console.log('\n2) Live API pilot path (shared Android/iOS backend)')
const apiSmoke = spawnSync('node', ['scripts/gate1-device-exit-api.mjs'], {
  cwd: driverAppRoot,
  stdio: 'inherit',
  env: buildEnv,
})
if (apiSmoke.status !== 0) process.exit(apiSmoke.status ?? 1)

if (runUi) {
  if (!existsSync(join(driverAppRoot, 'dist'))) {
    console.error('dist/ missing for --ui — run without --skip-build first')
    process.exit(1)
  }
  console.log('\n3) Optional Playwright mobile viewports')
  execSync('npx playwright install chromium', { cwd: repoRoot, stdio: 'inherit' })
  const pw = spawnSync('npx', ['playwright', 'test', '--config', playwrightConfig], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...buildEnv,
      VEYVIO_PILOT_EMAIL: process.env.VEYVIO_PILOT_EMAIL,
      VEYVIO_PILOT_PASSWORD: process.env.VEYVIO_PILOT_PASSWORD,
      VEYVIO_ANON_KEY: anon,
      VEYVIO_SUPABASE_URL: supabaseUrl,
      VEYVIO_API_URL: apiUrl,
    },
  })
  if (pw.status !== 0) process.exit(pw.status ?? 1)
} else {
  console.log('\n3) Playwright UI skipped (pass --ui for mobile viewport smoke)')
}

if (androidNative) {
  console.log('\n4) Optional native Android install')
  const devices = spawnSync('adb', ['devices'], { encoding: 'utf8' })
  const connected = devices.stdout
    ?.split('\n')
    .slice(1)
    .some((line) => /\tdevice$/.test(line.trim()))

  if (!connected) {
    console.warn('No adb device connected — skipping APK install.')
  } else {
    execSync('npm run build:android', { cwd: driverAppRoot, stdio: 'inherit', env: buildEnv })
    execSync('npm run android:apk', { cwd: driverAppRoot, stdio: 'inherit' })
    execSync('npm run android:install', { cwd: driverAppRoot, stdio: 'inherit' })
    console.log('APK installed — complete manual checklist rows 3, 6–10 on device.')
  }
} else {
  console.log('\n4) Native APK skipped (pass --android-native when adb device is connected)')
}

console.log('\nGate 1 device exit — automated checks PASS')
console.log('Manual on physical Android + iOS: airplane mode (row 3), handback/parking (row 7), native push (row 9).')
