#!/usr/bin/env node
/**
 * Set hosted Edge Function secret VEYVIO_DEPLOYMENT_SHA to current HEAD (Gate A observability).
 * Called before functions deploy. Non-fatal if supabase CLI / link is unavailable in dry runs.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const adminRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const sha =
  process.env.VEYVIO_DEPLOYMENT_SHA ||
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: join(adminRoot, '..') }).stdout?.trim()

if (!sha) {
  console.error('set-deployment-sha: could not resolve git SHA')
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['supabase', 'secrets', 'set', `VEYVIO_DEPLOYMENT_SHA=${sha}`, '--project-ref', process.env.SUPABASE_PROJECT_REF || 'qeckgqjrfbdyxchuncdt'],
  { cwd: adminRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
)

if (result.status !== 0) {
  console.error('set-deployment-sha: supabase secrets set failed')
  console.error(result.stderr || result.stdout)
  process.exit(result.status ?? 1)
}

console.log(`set-deployment-sha: VEYVIO_DEPLOYMENT_SHA=${sha}`)
