#!/usr/bin/env node
/**
 * Unit checks for record-release-provenance.mjs
 * Run: node scripts/record-release-provenance.unit.mjs
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const script = fileURLToPath(new URL('./record-release-provenance.mjs', import.meta.url))

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env, GITHUB_SHA: '' },
  })
}

const missing = run(['--platform', 'android'])
if (missing.status === 0) {
  console.error('expected fail without sha')
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'veyvio-prov-'))
const artifact = join(dir, 'app.aab')
const body = Buffer.from('fake-aab-bytes')
writeFileSync(artifact, body)
const out = join(dir, 'prov.json')
const ok = run([
  '--platform',
  'android',
  '--sha',
  'abc123',
  '--version-name',
  '1.0.0',
  '--version-code',
  '9',
  '--artifact',
  artifact,
  '--supabase-host',
  'qeckgqjrfbdyxchuncdt.supabase.co',
  '--out',
  out,
])
if (ok.status !== 0) {
  console.error(ok.stdout, ok.stderr)
  process.exit(1)
}
const report = JSON.parse(readFileSync(out, 'utf8'))
const expectHash = createHash('sha256').update(body).digest('hex')
if (report.artifact_sha256 !== expectHash || report.commit_sha !== 'abc123') {
  console.error('hash/sha mismatch', report)
  process.exit(1)
}

const badArt = run(['--platform', 'android', '--sha', 'x', '--artifact', join(dir, 'missing.aab')])
if (badArt.status === 0) {
  console.error('expected fail on missing artifact')
  process.exit(1)
}

rmSync(dir, { recursive: true, force: true })
console.log('record-release-provenance.unit.mjs: ok')
