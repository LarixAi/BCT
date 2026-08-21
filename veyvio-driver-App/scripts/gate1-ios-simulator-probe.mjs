#!/usr/bin/env node
/**
 * Gate 1 — iOS Simulator availability probe (non-physical).
 * Does not claim airplane-mode / native-push exit. Writes evidence JSON.
 *
 *   node scripts/gate1-ios-simulator-probe.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, '..', 'docs/plan/evidence')
mkdirSync(outDir, { recursive: true })

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' })
}

const xcrun = run('which', ['xcrun'])
const list = run('xcrun', ['simctl', 'list', 'devices', 'available'])
const iphones = (list.stdout || '')
  .split('\n')
  .filter((l) => /iPhone/.test(l) && /\([A-F0-9-]{36}\)/.test(l))
  .map((l) => l.trim())

const pick = iphones.find((l) => /iPhone 17 Pro/.test(l)) || iphones[0] || null
const udid = pick?.match(/\(([A-F0-9-]{36})\)/)?.[1] ?? null

let boot = null
if (udid) {
  boot = run('xcrun', ['simctl', 'boot', udid])
  // Already booted → exit 149 is ok
  if (boot.status !== 0 && !/Booted|current state: Booted/i.test(boot.stderr || '')) {
    // ignore if already booted
  }
  run('xcrun', ['simctl', 'bootstatus', udid, '-b'])
}

const report = {
  generated_at: new Date().toISOString(),
  drill: 'gate1-ios-simulator-probe',
  xcrun_present: xcrun.status === 0,
  available_iphone_count: iphones.length,
  selected: pick,
  udid,
  boot_attempted: Boolean(udid),
  boot_status: boot?.status ?? null,
  boot_stderr: (boot?.stderr || '').slice(0, 400),
  verdict: udid
    ? 'IOS_SIMULATOR_AVAILABLE_PHYSICAL_STILL_REQUIRED'
    : 'NO_IOS_SIMULATOR',
  note: 'Simulator proves tooling only. Airplane mode, Cap install, and native push need a physical iPhone.',
}

const outPath = join(outDir, 'gate-a-ios-simulator-probe.json')
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
console.log(`Wrote ${outPath}`)
if (!udid) process.exit(1)
console.log('gate1-ios-simulator-probe.mjs: PASS')
