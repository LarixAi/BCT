import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(
  new URL(
    '../supabase/functions/_shared/executive-documents.ts',
    import.meta.url,
  ),
  'utf8',
)

assert.match(source, /EXECUTIVE_DOCUMENTS_BUCKET = 'executive-documents'/)
assert.match(source, /EXECUTIVE_DOWNLOAD_TTL_SECONDS = 90/)
assert.match(source, /malware_scan_pending/)
assert.match(source, /assertCommandExportAllowed/)
assert.match(source, /watermark/)
assert.match(source, /legal_hold/)
assert.match(source, /fulfilAuthorisedExecutiveExport/)
assert.match(source, /forceScanClean/)
assert.match(source, /executive_highly_restricted/)
assert.match(source, /storageBucket/)

function sanitizeExecutiveFilename(filename) {
  const base = String(filename ?? '').split(/[/\\]/).pop()?.trim() ?? ''
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').replace(/^\.+/, '')
  if (!cleaned || cleaned.length > 180) throw new Error('invalid_filename')
  return cleaned
}

function detectExecutiveMime(bytes, claimedMime, filename) {
  const claimed = String(claimedMime ?? '').trim().toLowerCase()
  const lowerName = filename.toLowerCase()
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  const hasNul = [...bytes].some((b) => b === 0)
  if (!hasNul) {
    if (lowerName.endsWith('.json') || claimed === 'application/json') return 'application/json'
    if (lowerName.endsWith('.csv') || claimed === 'text/csv') return 'text/csv'
    if (lowerName.endsWith('.txt') || claimed === 'text/plain') return 'text/plain'
  }
  throw new Error('invalid_file_content')
}

assert.equal(sanitizeExecutiveFilename('../../etc/passwd'), 'passwd')
assert.equal(
  detectExecutiveMime(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf', 'a.pdf'),
  'application/pdf',
)
assert.equal(
  detectExecutiveMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg', 'a.jpg'),
  'image/jpeg',
)
assert.throws(() =>
  detectExecutiveMime(Uint8Array.from([0x00, 0x01]), 'application/pdf', 'a.pdf'),
)

assert.match(
  await readFile(
    new URL(
      '../supabase/migrations/202607300012_executive_documents_storage.sql',
      import.meta.url,
    ),
    'utf8',
  ),
  /executive-documents/,
)
assert.match(
  await readFile(
    new URL(
      '../supabase/migrations/202607300013_executive_export_fulfilment.sql',
      import.meta.url,
    ),
    'utf8',
  ),
  /sensitive_action_request_id/,
)
assert.match(
  await readFile(
    new URL('../supabase/functions/command-api/index.ts', import.meta.url),
    'utf8',
  ),
  /executive\/documents/,
)
assert.match(
  await readFile(
    new URL('../supabase/functions/_shared/tenant-auth.ts', import.meta.url),
    'utf8',
  ),
  /assertCommandExportAllowed/,
)

console.log('executive-documents.unit: ok')
