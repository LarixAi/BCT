#!/usr/bin/env node
/**
 * Gate 1 operator status — prints what is automated vs still manual.
 * Optionally writes a blank iOS sign-off sheet.
 *
 *   npm run gate1:operator-status
 *   npm run gate1:ios-checklist
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, '..')
const writeIos = process.argv.includes('--ios-sheet') || process.argv.includes('--write-ios')

const rows = [
  { n: 1, step: 'Login + company select', android: 'API + APK launch', ios: 'manual UI', auto: true },
  { n: 2, step: 'Sync centre honest queue', android: 'manual UI', ios: 'manual UI', auto: false },
  { n: 3, step: 'Airplane mid-walkaround', android: 'adb cycle; UI manual', ios: 'manual', auto: 'partial' },
  { n: 4, step: 'Acknowledge published duty', android: 'API', ios: 'API + UI confirm', auto: true },
  { n: 5, step: 'Sign-on gate (server reason)', android: 'API', ios: 'API + UI confirm', auto: true },
  { n: 6, step: 'Bodywork defect → Yard', android: 'API chain + UI confirm', ios: 'manual UI', auto: 'partial' },
  { n: 7, step: 'Handback + parking', android: 'manual UI', ios: 'manual UI', auto: false },
  { n: 8, step: 'AdBlue / readiness / timeline', android: 'API', ios: 'API + UI confirm', auto: true },
  { n: 9, step: 'Duty notification', android: 'API in-app; push manual', ios: 'manual push', auto: 'partial' },
  { n: 10, step: 'Sequential company login', android: 'API session; UI manual', ios: 'manual UI', auto: 'partial' },
  { n: 11, step: 'Production build profile', android: 'verify + APK', ios: 'verify + Xcode', auto: true },
]

/** @type {Map<number, string>} */
function parseAndroidHandsetReport(path) {
  const map = new Map()
  if (!existsSync(path)) return map
  const md = readFileSync(path, 'utf8')
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|[^|]*\|\s*\*\*(Pass|N\/A)\*\*/i)
    if (m) map.set(Number(m[1]), m[2].toUpperCase())
  }
  return map
}

function effectiveTag(row, androidSigned) {
  const signed = androidSigned.get(row.n)
  if (signed === 'PASS' || signed === 'N/A') return 'PASS'
  if (row.auto === true) return 'AUTO'
  if (row.auto === 'partial') return 'PART'
  return 'HAND'
}

const androidReport = join(repoRoot, 'docs/plan/.gate1-handset-android.local.md')
const androidSigned = parseAndroidHandsetReport(androidReport)

function parseOpsLeadAndroid(path) {
  if (!existsSync(path)) return 'missing'
  const md = readFileSync(path, 'utf8')
  // Prefer explicit status line; fall back to legacy "Ops lead sign-off: …"
  const statusLine = md.match(/\*\*Ops lead Android:\*\*\s*(.+)/i)
  const legacy = md.match(/\*\*Ops lead sign-off:\*\*\s*(.+)/i)
  const raw = (statusLine?.[1] ?? legacy?.[1] ?? '').trim()
  if (!raw) return 'missing'
  if (/\*\*PASS\*\*|^PASS\b|_?pass_?/i.test(raw) && !/pending/i.test(raw)) return 'PASS'
  if (/pending/i.test(raw)) return 'pending'
  if (/fail/i.test(raw)) return 'FAIL'
  return 'pending'
}

const opsLeadAndroid = parseOpsLeadAndroid(androidReport)

console.log('Gate 1 operator checklist status\n')
console.log('Runbook: docs/plan/gate1-operator-physical-runbook.md')
console.log('Live shift: docs/plan/bct-pilot-live-shift-runbook.md')
console.log('Exit matrix: docs/plan/gate1-pilot-exit-test.md\n')

for (const r of rows) {
  const tag = effectiveTag(r, androidSigned)
  const androidNote =
    androidSigned.get(r.n) === 'PASS'
      ? `${r.android} · signed PASS`
      : androidSigned.get(r.n) === 'N/A'
        ? `${r.android} · N/A (single tenant)`
        : r.android
  console.log(`${String(r.n).padStart(2)}. [${tag}] ${r.step}`)
  console.log(`    Android: ${androidNote}`)
  console.log(`    iOS:     ${r.ios}`)
}

console.log(`\nOps lead Android: ${opsLeadAndroid}`)
if (opsLeadAndroid === 'pending' || opsLeadAndroid === 'missing') {
  console.log('  → Complete live shift + sign-off block in docs/plan/.gate1-handset-android.local.md')
  console.log('  → Runbook: docs/plan/bct-pilot-live-shift-runbook.md')
}

if (existsSync(androidReport)) {
  console.log(`\nLast Android handset report: ${androidReport}`)
  console.log(readFileSync(androidReport, 'utf8').split('\n').slice(0, 8).join('\n'))
} else {
  console.log('\nNo Android handset report yet — run: npm run gate1:device-handset')
}

const adb = spawnSync('adb', ['devices'], { encoding: 'utf8' })
const adbDevice = (adb.stdout || '')
  .split('\n')
  .slice(1)
  .some((l) => /\tdevice$/.test(l.trim()))
console.log(`\nadb device: ${adbDevice ? 'connected' : 'none'}`)

const xcrun = spawnSync('xcrun', ['xctrace', 'list', 'devices'], { encoding: 'utf8' })
const iosLines = (xcrun.stdout || '')
  .split('\n')
  .filter((l) => /iPhone|iPad/i.test(l) && !/Simulator/i.test(l))
const iosOnline = iosLines.some((l) => !/Offline/i.test(l) && !/== Devices Offline/i.test(l))
// xctrace prints online devices under "== Devices ==" and offline under "== Devices Offline =="
const allOut = xcrun.stdout || ''
const offlineSection = allOut.split(/== Devices Offline ==/i)[1] || ''
const onlineSection = (allOut.split(/== Devices ==/i)[1] || '').split(/== Devices Offline ==/i)[0] || ''
const iosOnlineList = onlineSection
  .split('\n')
  .filter((l) => /iPhone|iPad/i.test(l) && !/Simulator/i.test(l))
const iosOfflineList = offlineSection
  .split('\n')
  .filter((l) => /iPhone|iPad/i.test(l) && !/Simulator/i.test(l))
console.log(
  `iOS physical (xctrace): ${
    iosOnlineList[0]?.trim() ||
    (iosOfflineList[0] ? `${iosOfflineList[0].trim()} (offline)` : 'none detected')
  }`,
)
void iosOnline

if (writeIos) {
  const out = join(repoRoot, 'docs/plan/.gate1-handset-ios.local.md')
  const md = [
    '# Gate 1 iOS handset sign-off',
    '',
    `Prepared: ${new Date().toISOString()}`,
    `Device detected: ${iosOnlineList[0]?.trim() || iosOfflineList[0]?.trim() || '(none — fill manually)'}`,
    '',
    'Pilot: pilot-driver@veyvio.test · Vehicle: BX62 BCT',
    'Follow: docs/plan/gate1-operator-physical-runbook.md §2',
    'Xcode: docs/plan/gate1-ios-xcode-runbook.md',
    '',
    ...rows.map(
      (r) =>
        `- [ ] ${r.n}. ${r.step} — pass criteria in gate1-pilot-exit-test.md`,
    ),
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Device model | |',
    '| iOS version | |',
    '| App build / commit | |',
    '| Ops lead | |',
    '| Date | |',
    '| Result | Pass / Fail |',
    '',
  ]
  writeFileSync(out, md.join('\n'), 'utf8')
  console.log(`\nWrote ${out}`)
}

const pendingAndroid = rows.filter((r) => effectiveTag(r, androidSigned) === 'HAND').length
const pendingIos = rows.length
console.log(
  `\nAndroid: ${rows.length - pendingAndroid}/${rows.length} rows signed or automated · iOS: ${pendingIos} rows still open`,
)
console.log(
  opsLeadAndroid === 'PASS'
    ? 'Next: Android-only BCT pilot may continue; complete iOS before App Store submit.'
    : 'Next: ops lead live shift (bct-pilot-live-shift-runbook.md), then iOS physical, then Gate 3 store submit.',
)