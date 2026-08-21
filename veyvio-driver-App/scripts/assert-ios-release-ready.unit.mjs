#!/usr/bin/env node
/**
 * Unit for assert-ios-release-ready --strict placeholder check (uses temp copy logic via spawn on real tree).
 * Scaffolding mode must pass; --strict fails while REPLACE_WITH_* remain in ExportOptions.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const script = fileURLToPath(new URL('./assert-ios-release-ready.mjs', import.meta.url))
const exportPath = fileURLToPath(new URL('../ios/ExportOptions.plist', import.meta.url))

const soft = spawnSync(process.execPath, [script], { encoding: 'utf8' })
if (soft.status !== 0) {
  console.error(soft.stdout, soft.stderr)
  process.exit(1)
}

const src = readFileSync(exportPath, 'utf8')
if (!/REPLACE_WITH_/.test(src)) {
  console.log('assert-ios-release-ready.unit.mjs: ok (placeholders already cleared — strict skipped)')
  process.exit(0)
}

const strict = spawnSync(process.execPath, [script, '--strict'], { encoding: 'utf8' })
if (strict.status === 0) {
  console.error('expected --strict to fail while REPLACE_WITH_* present')
  process.exit(1)
}
console.log('assert-ios-release-ready.unit.mjs: ok')
