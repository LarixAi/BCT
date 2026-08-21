#!/usr/bin/env node
/**
 * Unit checks for Admin assert-release-config.mjs
 * Run: node scripts/assert-release-config.unit.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./assert-release-config.mjs', import.meta.url))

function run(dist, host) {
  return spawnSync(process.execPath, [script, '--dist', dist, '--expected-supabase-host', host], {
    encoding: 'utf8',
  })
}

const good = mkdtempSync(join(tmpdir(), 'veyvio-admin-assert-good-'))
writeFileSync(join(good, 'app.js'), 'const u = "https://qeckgqjrfbdyxchuncdt.supabase.co";')
const ok = run(good, 'qeckgqjrfbdyxchuncdt.supabase.co')
if (ok.status !== 0) {
  console.error(ok.stdout, ok.stderr)
  process.exit(1)
}

const bad = mkdtempSync(join(tmpdir(), 'veyvio-admin-assert-bad-'))
writeFileSync(join(bad, 'app.js'), 'const u = "https://example.supabase.co";')
const fail = run(bad, 'qeckgqjrfbdyxchuncdt.supabase.co')
if (fail.status === 0) {
  console.error('expected fail on example.supabase.co')
  process.exit(1)
}

rmSync(good, { recursive: true, force: true })
rmSync(bad, { recursive: true, force: true })
console.log('assert-release-config.unit.mjs: ok')
