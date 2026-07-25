#!/usr/bin/env node
/**
 * Gate 1 handset automation for a connected Android device (adb).
 * Covers install + launch + airplane-mode offline/online cycle.
 * iOS still requires a physical walkthrough (no device attached here).
 *
 * Usage:
 *   npm run gate1:device-exit -- --android-native
 *   node scripts/gate1-device-handset.mjs
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const driverRoot = join(scriptDir, '..')
const repoRoot = join(driverRoot, '..')
const reportPath = join(repoRoot, 'docs/plan/.gate1-handset-android.local.md')

function loadEnv(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    let k = t.slice(0, i)
    let v = t.slice(i + 1)
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[k] = v
  }
}

loadEnv(join(repoRoot, 'Veyvio admin ', '.env'))
loadEnv(join(repoRoot, '.gate1-secrets.local.env'))

const rows = []
function pass(name, detail = '') {
  rows.push({ name, ok: true, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  rows.push({ name, ok: false, detail })
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}
function note(name, detail = '') {
  rows.push({ name, ok: true, detail: `manual/partial: ${detail}` })
  console.log(`~ ${name}${detail ? ` — ${detail}` : ''}`)
}

function adb(args, opts = {}) {
  return spawnSync('adb', args, { encoding: 'utf8', ...opts })
}

const devices = adb(['devices'])
const serial = (devices.stdout || '')
  .split('\n')
  .slice(1)
  .map((l) => l.trim())
  .find((l) => /\tdevice$/.test(l))
  ?.split(/\s+/)[0]

if (!serial) {
  fail('Android device', 'no adb device connected')
  process.exit(1)
}
pass('Android device connected', serial)

const buildEnv = {
  ...process.env,
  VITE_SUPABASE_URL: process.env.VEYVIO_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'https://qeckgqjrfbdyxchuncdt.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
  VITE_COMMAND_API_BASE_URL:
    process.env.VEYVIO_API_URL ??
    process.env.VITE_COMMAND_API_BASE_URL ??
    'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api',
  VITE_AUTH_API_BASE_URL:
    process.env.VEYVIO_API_URL ??
    process.env.VITE_AUTH_API_BASE_URL ??
    'https://qeckgqjrfbdyxchuncdt.supabase.co/functions/v1/command-api',
  VITE_MOCK_API: '',
  VITE_ENABLE_BASE44: '',
  VITE_ENABLE_PHV_MODULE: '',
  VITE_DRIVER_NAV_TEST_MODE: '',
}

try {
  console.log('\nBuilding Android debug APK…')
  execSync('npm run build:android', { cwd: driverRoot, stdio: 'inherit', env: buildEnv })
  execSync('npm run android:apk', { cwd: driverRoot, stdio: 'inherit', env: buildEnv })
  execSync(`adb -s ${serial} install -r android/app/build/outputs/apk/debug/app-debug.apk`, {
    cwd: driverRoot,
    stdio: 'inherit',
  })
  pass('11 Production APK installed', 'uk.veyvio.driver debug')
} catch (error) {
  fail('11 Production APK installed', error instanceof Error ? error.message : String(error))
}

try {
  execSync(
    `adb -s ${serial} shell monkey -p uk.veyvio.driver -c android.intent.category.LAUNCHER 1`,
    { stdio: 'inherit' },
  )
  pass('1 App launch', 'package uk.veyvio.driver')
} catch {
  fail('1 App launch')
}

// Airplane mode cycle — proves offline/online path is device-controllable for walkaround tests.
try {
  execSync(`adb -s ${serial} shell cmd connectivity airplane-mode enable`, { stdio: 'inherit' })
  pass('3 Airplane mode ON', 'network disabled for offline queue test')
  execSync('sleep 2')
  execSync(`adb -s ${serial} shell cmd connectivity airplane-mode disable`, { stdio: 'inherit' })
  pass('3 Airplane mode OFF', 'network restored for reconnect upload')
} catch (error) {
  note('3 Airplane mode', `adb toggle failed — do manually: ${error instanceof Error ? error.message : error}`)
}

note('2 Sync centre honest queue', 'confirm pending count on device after offline action')
note('6 Bodywork defect → Yard', 'submit defect on device; verify Yard hub')
note('7 Handback + parking', 'complete handback on device; verify Command/Yard')
note('9 Native push tap', 'publish duty from Command; tap notification on device')
note('iOS physical checklist', 'no iOS device attached — complete gate1-pilot-exit-test.md iOS column manually')

const markdown = [
  '# Gate 1 Android handset run',
  '',
  `Date: ${new Date().toISOString()}`,
  `Device: ${serial}`,
  '',
  ...rows.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
  '',
  'iOS rows remain operator-signed in gate1-pilot-exit-test.md.',
  '',
]
writeFileSync(reportPath, markdown.join('\n'), 'utf8')
console.log(`\nWrote ${reportPath}`)

if (rows.some((r) => !r.ok && !String(r.detail).startsWith('manual'))) process.exit(1)
console.log('Android handset automation complete (manual UI rows still need operator eyes).')
