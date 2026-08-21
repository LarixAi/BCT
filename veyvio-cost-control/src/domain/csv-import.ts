import { assertBalancedAllocations } from './allocation'
import { parseMoneyToMinor } from './money'
import { parseCostSubcategory } from './vehicle-cost-profile'
import type {
  CostCategory,
  CostLifecycleStatus,
  CostRecord,
  OrganisationId,
  QuarantineItem,
} from './types'

export type CsvImportResult = {
  accepted: CostRecord[]
  quarantined: QuarantineItem[]
  duplicatesSkipped: number
  rowsRead: number
}

const CATEGORIES = new Set<CostCategory>([
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

const STATUSES = new Set<CostLifecycleStatus>(['actual', 'committed', 'forecast', 'estimated'])

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
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

function required(row: Record<string, string>, key: string): string {
  const v = row[key]
  if (!v) throw new Error(`Missing required field: ${key}`)
  return v
}

/**
 * Blueprint §8.1 — store raw, validate, normalise, duplicate-detect, quarantine incomplete.
 * Only validated records become canonical ledger entries.
 */
export function importCostCsv(input: {
  organisationId: OrganisationId
  text: string
  budgetId: string
  existingSourceKeys: Set<string>
  nowIso?: string
}): CsvImportResult {
  const now = input.nowIso ?? new Date().toISOString()
  const rows = parseCsv(input.text)
  const accepted: CostRecord[] = []
  const quarantined: QuarantineItem[] = []
  let duplicatesSkipped = 0
  const seenInBatch = new Set<string>()

  rows.forEach((row, index) => {
    const sourceKey =
      row.source_key ||
      row.reference ||
      `${row.supplier ?? ''}|${row.date ?? ''}|${row.gross ?? ''}|${index}`

    try {
      if (input.existingSourceKeys.has(sourceKey) || seenInBatch.has(sourceKey)) {
        duplicatesSkipped += 1
        return
      }

      const category = required(row, 'category').toLowerCase() as CostCategory
      if (!CATEGORIES.has(category)) throw new Error(`Unknown category: ${category}`)

      const subcategory = parseCostSubcategory(category, row.subcategory || row.subtype || null)

      const status = (row.status || 'actual').toLowerCase() as CostLifecycleStatus
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

      const allocations = [
        {
          budgetId: input.budgetId,
          category,
          costCentreId: row.cost_centre || null,
          vehicleId: row.vehicle || null,
          supplierId: null,
          amountMinor: grossMinor,
        },
      ]
      assertBalancedAllocations(allocations, grossMinor)

      const evidenceLabel = row.evidence || ''
      const record: CostRecord = {
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        version: 1,
        supplierName: required(row, 'supplier'),
        description: required(row, 'description'),
        reference: row.reference || sourceKey,
        transactionDate,
        accountingPeriod: row.period || transactionDate.slice(0, 7),
        net: { amountMinor: netMinor, currency: 'GBP' },
        vat: { amountMinor: vatMinor, currency: 'GBP' },
        gross: { amountMinor: grossMinor, currency: 'GBP' },
        status,
        category,
        subcategory,
        allocations,
        validationState: evidenceLabel ? 'validated' : 'validated',
        reviewState: evidenceLabel ? 'none' : 'open',
        evidence: evidenceLabel
          ? [{ id: crypto.randomUUID(), label: evidenceLabel, sourceType: 'csv' }]
          : [],
        sourceKey,
        linkedCommitmentId: null,
        createdAt: now,
        updatedAt: now,
      }

      if (!evidenceLabel) {
        // Missing evidence is still accepted to ledger but flagged for review (Blueprint §10).
        record.reviewState = 'open'
      }

      seenInBatch.add(sourceKey)
      accepted.push(record)
    } catch (error) {
      quarantined.push({
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        sourceKey,
        reason: error instanceof Error ? error.message : 'Invalid row',
        raw: row,
        createdAt: now,
      })
    }
  })

  return {
    accepted,
    quarantined,
    duplicatesSkipped,
    rowsRead: rows.length,
  }
}
