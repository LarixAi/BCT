#!/usr/bin/env node
/**
 * Dependency vulnerability scan (PR-06). Critical always fails; high fails unless allowlisted.
 *
 *   node scripts/audit-dependencies.mjs
 *   node scripts/audit-dependencies.mjs --cwd "Veyvio admin "
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const cwdFlag = process.argv.indexOf('--cwd')
const cwd =
  cwdFlag >= 0 && process.argv[cwdFlag + 1]
    ? resolve(process.cwd(), process.argv[cwdFlag + 1])
    : process.cwd()

/** Keep empty unless the board accepts a time-limited non-exploitable exception. */
const ALLOWED_HIGH_PACKAGES = new Map([])

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
})

let report
try {
  report = JSON.parse(result.stdout || '{}')
} catch {
  console.error(`npm audit did not return JSON (cwd=${cwd})`)
  console.error(result.stderr || result.stdout)
  process.exit(1)
}

const vulnerabilities = report.vulnerabilities ?? {}
const metadata = report.metadata?.vulnerabilities ?? {}
const high = Number(metadata.high ?? 0)
const critical = Number(metadata.critical ?? 0)

const unexpected = []
for (const [name, detail] of Object.entries(vulnerabilities)) {
  const severity = String(detail.severity ?? '')
  if (severity === 'critical') {
    unexpected.push(`${name} (critical)`)
    continue
  }
  if (severity === 'high' && !ALLOWED_HIGH_PACKAGES.has(name)) {
    unexpected.push(`${name} (high)`)
  }
}

if (critical > 0 || unexpected.length > 0) {
  console.error(
    `Dependency audit failed (cwd=${cwd}): high=${high} critical=${critical}. Unexpected: ${unexpected.join(', ') || 'none'}`,
  )
  process.exit(1)
}

console.log(`Dependency audit passed (cwd=${cwd}, high=${high}, critical=${critical}).`)
