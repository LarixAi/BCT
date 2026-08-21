#!/usr/bin/env node
/**
 * Record mobile release provenance (ADR-PR-007).
 * Writes JSON to --out (default stdout / evidence path).
 *
 *   node scripts/record-release-provenance.mjs \
 *     --platform android --sha $GITHUB_SHA --version-name 1.2.3 --version-code 45 \
 *     --artifact path.aab --out ../docs/plan/evidence/driver-android-release-provenance.json
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : ''
}

const platform = arg('--platform') || 'android'
const sha = arg('--sha') || process.env.GITHUB_SHA || ''
const versionName = arg('--version-name') || process.env.VEYVIO_VERSION_NAME || ''
const versionCode = arg('--version-code') || process.env.VEYVIO_VERSION_CODE || ''
const artifact = arg('--artifact') || ''
const supabaseHost = arg('--supabase-host') || process.env.EXPECTED_SUPABASE_HOST || ''
const out = arg('--out') || ''

if (!sha) {
  console.error('record-release-provenance: --sha or GITHUB_SHA required')
  process.exit(1)
}

let artifactSha256 = null
let artifactBytes = null
if (artifact) {
  if (!existsSync(artifact)) {
    console.error(`record-release-provenance: artifact missing ${artifact}`)
    process.exit(1)
  }
  const buf = readFileSync(artifact)
  artifactBytes = buf.length
  artifactSha256 = createHash('sha256').update(buf).digest('hex')
}

const report = {
  generated_at: new Date().toISOString(),
  adr: 'ADR-PR-007',
  platform,
  commit_sha: sha,
  version_name: versionName || null,
  version_code: versionCode || null,
  supabase_host: supabaseHost || null,
  artifact_path: artifact || null,
  artifact_bytes: artifactBytes,
  artifact_sha256: artifactSha256,
  github_run_id: process.env.GITHUB_RUN_ID || null,
  github_run_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
}

const text = JSON.stringify(report, null, 2) + '\n'
if (out) {
  const abs = resolve(out)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, text)
  console.log(`Wrote ${abs}`)
}
console.log(text)
