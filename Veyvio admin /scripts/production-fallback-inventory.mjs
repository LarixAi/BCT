/**
 * F-03 — inventory mock / fixture fallback paths reachable from production clients.
 *
 * Scans live API wiring (`real-client.ts`) and feature modules that bypass `isMockApi`.
 * Mock-only modules (`mock-*.ts`) are excluded — they are opt-in via VITE_MOCK_API.
 *
 * Run: node scripts/production-fallback-inventory.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/** Production-reachable files to audit (not mock-only trees). */
const PRODUCTION_FILES = [
  'src/lib/api/real-client.ts',
  'src/lib/api/index.ts',
  'src/lib/api/config.ts',
  'src/lib/operations/operations-data-source.ts',
]

const FEATURE_SCAN = path.join(ROOT, 'src/features')

const PATTERNS = [
  { id: 'mock-import', re: /import\([^)]*mock[-/]/i },
  { id: 'mock-api-call', re: /mock[A-Z][A-Za-z]+Api\./ },
  { id: 'mock-hub-fn', re: /mock[A-Z][A-Za-z]+Hub\(/ },
  { id: 'demo-layer', re: /isOperationsDemoLayerActive|OPERATIONS_DEMO/ },
]

function listFeatureFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      listFeatureFiles(full, acc)
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      acc.push(full)
    }
  }
  return acc
}

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath)
  const content = fs.readFileSync(filePath, 'utf8')
  const usesMockApiGuard = content.includes('isMockApi') || content.includes('VITE_MOCK_API')
  const lines = content.split('\n')
  const hits = []

  lines.forEach((line, index) => {
    for (const pattern of PATTERNS) {
      if (!pattern.re.test(line)) continue
      hits.push({
        file: rel,
        line: index + 1,
        pattern: pattern.id,
        usesMockApiGuard,
        text: line.trim().slice(0, 120),
      })
    }
  })

  return hits
}

const featureFiles = listFeatureFiles(FEATURE_SCAN).filter((file) => {
  const rel = path.relative(ROOT, file)
  return !rel.includes('/__tests__/')
})

const files = [
  ...PRODUCTION_FILES.map((rel) => path.join(ROOT, rel)).filter((f) => fs.existsSync(f)),
  ...featureFiles,
]

const findings = files.flatMap(scanFile)

/** Tracked production fallbacks — remove as live APIs replace them. */
const TRACKED_DEBT = new Map([
  ['src/lib/api/real-client.ts', 'fail-closed empty hubs — no mock fallbacks'],
  ['src/features/journey-sequence/JourneySequencePanel.tsx', 'journey sequence live read-only until Command workspace API (mutations mock-gated)'],
  ['src/features/journey-sequence/MoveJourneyPanel.tsx', 'journey move live-blocked until Command workspace API'],
  ['src/features/jobs/JobsPage.tsx', 'operations demo layer banner only'],
  ['src/features/schedule/SchedulePage.tsx', 'operations demo layer banner only'],
  ['src/lib/operations/operations-data-source.ts', 'demo layer toggle — fail-closed in production builds'],
])

console.log('F-03 production fallback inventory')
console.log(`Scanned ${files.length} production-reachable files`)

const grouped = new Map()
for (const row of findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
  grouped.set(`${row.file}:${row.line}`, row)
}

let untracked = 0
for (const row of grouped.values()) {
  const tracked = TRACKED_DEBT.has(row.file)
  const tag = tracked ? 'tracked' : row.usesMockApiGuard ? 'guarded' : 'UNTRACKED'
  if (tag === 'UNTRACKED') untracked += 1
  console.log(`  [${tag}] ${row.file}:${row.line} (${row.pattern}) ${row.text}`)
}

console.log('\nTracked debt areas:')
for (const [file, note] of TRACKED_DEBT) {
  const count = [...grouped.values()].filter((r) => r.file === file).length
  console.log(`  - ${file} (${count} hits): ${note}`)
}

if (untracked > 0) {
  console.error(`\nUntracked production mock paths: ${untracked}`)
  process.exit(1)
}

assert.ok(grouped.size > 0, 'inventory should document known production fallbacks')
console.log('\nproduction-fallback-inventory.mjs: PASS')
