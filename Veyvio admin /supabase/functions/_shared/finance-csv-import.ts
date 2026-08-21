/**
 * Cost CSV import (Blueprint §8.1) — Deno-compatible for finance-api.
 * Accepts validated rows to the ledger; incomplete rows go to quarantine.
 */

export type ImportedCost = {
  id: string
  organisationId: string
  version: number
  supplierName: string
  description: string
  reference: string
  transactionDate: string
  accountingPeriod: string
  netMinor: number
  vatMinor: number
  grossMinor: number
  status: 'actual' | 'committed' | 'forecast' | 'estimated'
  category: string
  validationState: 'pending' | 'validated' | 'quarantined' | 'reconciled'
  reviewState: 'none' | 'open' | 'approved' | 'rejected' | 'snoozed'
  sourceKey: string
  costCentreId: string | null
  vehicleId: string | null
  evidenceLabel: string | null
  createdAt: string
  updatedAt: string
}

export type ImportedQuarantine = {
  id: string
  organisationId: string
  sourceKey: string
  reason: string
  raw: Record<string, string>
  createdAt: string
}

export type CsvImportPersistResult = {
  accepted: ImportedCost[]
  quarantined: ImportedQuarantine[]
  duplicatesSkipped: number
  rowsRead: number
}

const CATEGORIES = new Set([
  'fuel',
  'vehicle_ownership',
  'maintenance',
  'wages',
  'premises',
  'technology',
  'professional',
  'administration',
  'exceptional',
])

const STATUSES = new Set(['actual', 'committed', 'forecast', 'estimated'])

function parseMoneyToMinor(value: string): number {
  const cleaned = value.trim().replace(/£/g, '').replace(/,/g, '')
  if (!cleaned || !/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money amount: ${value}`)
  }
  const negative = cleaned.startsWith('-')
  const [pounds, pence = '0'] = cleaned.replace('-', '').split('.')
  const minor = Number(pounds) * 100 + Number(pence.padEnd(2, '0').slice(0, 2))
  return negative ? -minor : minor
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
}

function required(row: Record<string, string>, key: string): string {
  const v = row[key]
  if (!v) throw new Error(`Missing required field: ${key}`)
  return v
}

export function importCostCsvForPersist(input: {
  organisationId: string
  text: string
  budgetId: string
  existingSourceKeys: Set<string>
  nowIso?: string
  idFactory?: () => string
}): CsvImportPersistResult {
  const now = input.nowIso ?? new Date().toISOString()
  const newId = input.idFactory ?? (() => crypto.randomUUID())
  const rows = parseCsv(input.text)
  const accepted: ImportedCost[] = []
  const quarantined: ImportedQuarantine[] = []
  let duplicatesSkipped = 0
  const seenInBatch = new Set<string>()

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    const sourceKey =
      row.source_key ||
      row.reference ||
      `${row.supplier ?? ''}|${row.date ?? ''}|${row.gross ?? ''}|${index}`

    try {
      if (input.existingSourceKeys.has(sourceKey) || seenInBatch.has(sourceKey)) {
        duplicatesSkipped += 1
        continue
      }

      const category = required(row, 'category').toLowerCase()
      if (!CATEGORIES.has(category)) throw new Error(`Unknown category: ${category}`)

      const status = (row.status || 'actual').toLowerCase()
      if (!STATUSES.has(status)) throw new Error(`Unknown status: ${status}`)

      const netMinor = parseMoneyToMinor(required(row, 'net'))
      const vatMinor = parseMoneyToMinor(row.vat || '0')
      const grossMinor = row.gross ? parseMoneyToMinor(row.gross) : netMinor + vatMinor
      if (grossMinor !== netMinor + vatMinor) {
        throw new Error(`Gross ${grossMinor} does not equal net+VAT ${netMinor + vatMinor}`)
      }

      const transactionDate = required(row, 'date')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
        throw new Error('date must be YYYY-MM-DD')
      }

      const evidenceLabel = (row.evidence || '').trim() || null
      // cost_centre_id is FK — only persist free-text vehicle; centre left null unless known.
      const record: ImportedCost = {
        id: newId(),
        organisationId: input.organisationId,
        version: 1,
        supplierName: required(row, 'supplier'),
        description: required(row, 'description'),
        reference: row.reference || sourceKey,
        transactionDate,
        accountingPeriod: row.period || transactionDate.slice(0, 7),
        netMinor,
        vatMinor,
        grossMinor,
        status: status as ImportedCost['status'],
        category,
        validationState: 'validated',
        reviewState: evidenceLabel ? 'none' : 'open',
        sourceKey,
        costCentreId: null,
        vehicleId: row.vehicle || null,
        evidenceLabel,
        createdAt: now,
        updatedAt: now,
      }

      void input.budgetId
      seenInBatch.add(sourceKey)
      accepted.push(record)
    } catch (error) {
      quarantined.push({
        id: newId(),
        organisationId: input.organisationId,
        sourceKey,
        reason: error instanceof Error ? error.message : 'Invalid row',
        raw: row,
        createdAt: now,
      })
    }
  }

  return {
    accepted,
    quarantined,
    duplicatesSkipped,
    rowsRead: rows.length,
  }
}
