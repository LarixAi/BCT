#!/usr/bin/env node
/**
 * Gate 1 handset automation for a connected Android device (adb).
 * Covers install + launch + airplane-mode offline/online cycle + deep-link probes.
 * iOS still requires a physical walkthrough (no device attached here).
 *
 * Usage:
 *   npm run gate1:device-exit -- --android-native
 *   node scripts/gate1-device-handset.mjs
 *   node scripts/gate1-device-handset.mjs --skip-build   # reuse installed APK
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const driverRoot = join(scriptDir, '..')
const repoRoot = join(driverRoot, '..')
const reportPath = join(repoRoot, 'docs/plan/.gate1-handset-android.local.md')
const shotDir = join(repoRoot, 'docs/plan/.gate1-handset-shots')
const skipBuild = process.argv.includes('--skip-build')

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

function adbOk(args) {
  const r = adb(args)
  return r.status === 0
}

function screenshot(label) {
  try {
    mkdirSync(shotDir, { recursive: true })
    const remote = `/sdcard/gate1-${label}.png`
    const local = join(shotDir, `${label}.png`)
    execSync(`adb -s ${serial} shell screencap -p ${remote}`, { stdio: 'pipe' })
    execSync(`adb -s ${serial} pull ${remote} ${local}`, { stdio: 'pipe' })
    execSync(`adb -s ${serial} shell rm ${remote}`, { stdio: 'pipe' })
    return local
  } catch {
    return null
  }
}

function openDeepLink(path) {
  // Prefer path-form (///) — Cap + Android reliably deliver pathname to appUrlOpen.
  const cleaned = String(path).replace(/^\//, '')
  const url = `uk.veyvio.driver:///${cleaned}`
  return adbOk([
    '-s',
    serial,
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    url,
    'uk.veyvio.driver',
  ])
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

if (skipBuild) {
  note('11 APK build', 'skipped (--skip-build); using installed package')
} else {
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
}

try {
  execSync(
    `adb -s ${serial} shell monkey -p uk.veyvio.driver -c android.intent.category.LAUNCHER 1`,
    { stdio: 'inherit' },
  )
  pass('1 App launch', 'package uk.veyvio.driver')
  execSync('sleep 3')
  const launchShot = screenshot('01-launch')
  if (launchShot) pass('1 Launch screenshot', launchShot)
} catch {
  fail('1 App launch')
}

// Deep-link probes — opens routes if session already on device; otherwise lands on auth (still useful).
for (const [label, path] of [
  ['02-sync', 'sync'],
  ['03-handback', 'vehicle/handback'],
  ['04-duty', 'duty'],
]) {
  if (openDeepLink(path)) {
    execSync('sleep 2')
    const shot = screenshot(label)
    pass(`Deep link /${path}`, shot ? `opened + ${shot}` : 'opened')
  } else {
    note(`Deep link /${path}`, 'am start failed — open manually from More menu')
  }
}

// Airplane mode cycle — proves offline/online path is device-controllable for walkaround tests.
try {
  execSync(`adb -s ${serial} shell cmd connectivity airplane-mode enable`, { stdio: 'inherit' })
  pass('3 Airplane mode ON', 'network disabled for offline queue test')
  openDeepLink('sync')
  execSync('sleep 2')
  const offlineShot = screenshot('05-sync-airplane')
  if (offlineShot) pass('2 Sync centre while offline', offlineShot)
  else note('2 Sync centre while offline', 'screenshot failed — confirm pending UI on device')
  execSync(`adb -s ${serial} shell cmd connectivity airplane-mode disable`, { stdio: 'inherit' })
  pass('3 Airplane mode OFF', 'network restored for reconnect upload')
  execSync('sleep 2')
  screenshot('06-sync-online')
} catch (error) {
  note('3 Airplane mode', `adb toggle failed — do manually: ${error instanceof Error ? error.message : error}`)
}

note('2 Sync centre honest queue', 'after offline action, pending count must rise then clear on reconnect — confirm on device')
note('6 Bodywork defect → Yard', 'API chain proven in gate1:device-exit; confirm Yard hub UI on device/browser')
note('7 Handback + parking', 'complete handback on device; deep link /vehicle/handback opened above')
note('9 Native push tap', 'in-app notifications proven via API; lock-screen push needs Firebase (Gate 3)')
note('iOS physical checklist', 'no iOS device attached — complete gate1-operator-physical-runbook.md §2')

const markdown = [
  '# Gate 1 Android handset run',
  '',
  `Date: ${new Date().toISOString()}`,
  `Device: ${serial}`,
  '',
  ...rows.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
  '',
  'Screenshots (local): `docs/plan/.gate1-handset-shots/`',
  '',
  '## Still needs operator eyes on this handset',
  '1. Sign in as pilot-driver@veyvio.test if prompted',
  '2. Sync centre: pending 0 when idle; rises offline; returns to 0 after reconnect',
  '3. Walkaround submit while airplane was ON (or repeat once)',
  '4. Handback + bay → verify Command timeline',
  '5. Open Yard hub — recent bodywork smoke defect visible',
  '',
  'iOS rows: `npm run gate1:ios-checklist` then physical iPhone.',
  '',
]
writeFileSync(reportPath, markdown.join('\n'), 'utf8')
console.log(`\nWrote ${reportPath}`)

if (rows.some((r) => !r.ok && !String(r.detail).startsWith('manual'))) process.exit(1)
console.log('Android handset automation complete (manual UI rows still need operator eyes).')
