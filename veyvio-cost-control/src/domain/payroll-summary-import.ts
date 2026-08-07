import type { EmployeeCostReference } from './org-structure'
import {
  computeEmployerPayrollCost,
  type EmployerPayrollCostBreakdown,
  type PayrollCostException,
  type PayrollImportStage,
} from './payroll-cost'
import { parseMoneyToMinor } from './money'
import type { OrganisationId, QuarantineItem, ReviewItem } from './types'

/**
 * Payroll provider summary import — Blueprint §11 / §7 Wage costs.
 * Imports permitted wage-cost lines (employer cost inputs), matches EmployeeCostReference,
 * and produces variance exceptions. Never calculates PAYE or employee NI.
 */

export type PayrollSummaryLine = {
  externalPayrollId: string
  displayName: string
  basicPayMinor: number
  overtimeMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  hoursCompleted: number | null
  costCentre: string
  sourceKey: string
  /** basic + OT + employer NI + pension */
  importedEmployerCostMinor: number
}

export type PayrollSummaryMatch = {
  line: PayrollSummaryLine
  employeeId: string | null
  expectedEmployerCostMinor: number | null
  varianceMinor: number | null
  allocationComplete: boolean | null
  status: 'matched' | 'unmatched' | 'variance' | 'incomplete_allocation'
}

export type PayrollSummaryImportResult = {
  stage: PayrollImportStage
  rowsRead: number
  matched: PayrollSummaryMatch[]
  quarantined: QuarantineItem[]
  exceptions: PayrollCostException[]
  reviews: Omit<ReviewItem, 'id' | 'createdAt'>[]
  /** Roll-up of accepted matched lines into employer cost formula. */
  rolledUp: EmployerPayrollCostBreakdown | null
  totals: {
    importedEmployerCostMinor: number
    expectedEmployerCostMinor: number
    varianceMinor: number
    matchedCount: number
    unmatchedCount: number
    varianceCount: number
  }
}

const VARIANCE_THRESHOLD_MINOR = 100 // £1.00

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

function moneyField(row: Record<string, string>, key: string): number {
  const raw = row[key]
  if (!raw) return 0
  return parseMoneyToMinor(raw)
}

/**
 * Import a payroll-summary CSV and reconcile against wage-cost members.
 *
 * Required columns: external_payroll_id, basic_pay
 * Optional: display_name, overtime, employer_ni, employer_pension, hours_completed,
 * cost_centre, source_key
 */
export function importPayrollSummaryCsv(input: {
  organisationId: OrganisationId
  text: string
  stage?: PayrollImportStage
  employees: EmployeeCostReference[]
  /** Ledger cost to attach wage reviews to (period wage summary). */
  wageCostId: string
  nowIso?: string
}): PayrollSummaryImportResult {
  const stage = input.stage ?? 'pre_payroll'
  const now = input.nowIso ?? new Date().toISOString()
  const rows = parseCsv(input.text)
  const byExternal = new Map(
    input.employees
      .filter((e) => e.active && e.wageCostBearing)
      .map((e) => [e.externalPayrollId.toUpperCase(), e]),
  )

  const matched: PayrollSummaryMatch[] = []
  const quarantined: QuarantineItem[] = []
  const exceptions: PayrollCostException[] = []
  const reviews: Omit<ReviewItem, 'id' | 'createdAt'>[] = []
  const seenKeys = new Set<string>()

  let importedTotal = 0
  let expectedTotal = 0
  let sumBasic = 0
  let sumOt = 0
  let sumNi = 0
  let sumPen = 0
  let matchedCount = 0
  let unmatchedCount = 0
  let varianceCount = 0

  for (const row of rows) {
    const externalPayrollId = (row.external_payroll_id || row.payroll_id || '').trim()
    if (!externalPayrollId) {
      quarantined.push({
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        sourceKey: row.source_key || `payroll|row|${quarantined.length}`,
        reason: 'Missing external_payroll_id',
        raw: row,
        createdAt: now,
      })
      continue
    }

    let basicPayMinor = 0
    let overtimeMinor = 0
    let employerNiMinor = 0
    let employerPensionMinor = 0
    try {
      basicPayMinor = moneyField(row, 'basic_pay')
      overtimeMinor = moneyField(row, 'overtime')
      employerNiMinor = moneyField(row, 'employer_ni')
      employerPensionMinor = moneyField(row, 'employer_pension')
    } catch (err) {
      quarantined.push({
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        sourceKey: row.source_key || `payroll|${externalPayrollId}`,
        reason: err instanceof Error ? err.message : 'Invalid money field',
        raw: row,
        createdAt: now,
      })
      continue
    }

    const sourceKey =
      row.source_key?.trim() || `payroll|${stage}|${externalPayrollId}|${basicPayMinor}`
    if (seenKeys.has(sourceKey)) {
      quarantined.push({
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        sourceKey,
        reason: 'Duplicate source_key within file',
        raw: row,
        createdAt: now,
      })
      continue
    }
    seenKeys.add(sourceKey)

    const importedEmployerCostMinor =
      basicPayMinor + overtimeMinor + employerNiMinor + employerPensionMinor
    const hoursRaw = row.hours_completed?.trim()
    const hoursCompleted = hoursRaw ? Number(hoursRaw) : null
    if (hoursRaw && !Number.isFinite(hoursCompleted)) {
      quarantined.push({
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        sourceKey,
        reason: 'hours_completed is not a number',
        raw: row,
        createdAt: now,
      })
      continue
    }

    const line: PayrollSummaryLine = {
      externalPayrollId,
      displayName: row.display_name?.trim() || externalPayrollId,
      basicPayMinor,
      overtimeMinor,
      employerNiMinor,
      employerPensionMinor,
      hoursCompleted: hoursCompleted ?? null,
      costCentre: row.cost_centre?.trim() || '',
      sourceKey,
      importedEmployerCostMinor,
    }

    const employee = byExternal.get(externalPayrollId.toUpperCase())
    if (!employee) {
      unmatchedCount += 1
      matched.push({
        line,
        employeeId: null,
        expectedEmployerCostMinor: null,
        varianceMinor: null,
        allocationComplete: null,
        status: 'unmatched',
      })
      exceptions.push({
        id: crypto.randomUUID(),
        severity: 'critical',
        code: 'unmatched_payroll_id',
        title: `Unmatched payroll id ${externalPayrollId}`,
        detail: `${line.displayName} is not in the wage-cost register. Link EmployeeCostReference before publishing.`,
      })
      reviews.push({
        organisationId: input.organisationId,
        costId: input.wageCostId,
        signal: 'allocation_issue',
        title: `Unmatched payroll person ${externalPayrollId}`,
        detail: `${line.displayName} · imported employer cost £${(importedEmployerCostMinor / 100).toFixed(2)}`,
        state: 'open',
      })
      continue
    }

    const varianceMinor = importedEmployerCostMinor - employee.expectedEmployerCostMinor
    importedTotal += importedEmployerCostMinor
    expectedTotal += employee.expectedEmployerCostMinor
    sumBasic += basicPayMinor
    sumOt += overtimeMinor
    sumNi += employerNiMinor
    sumPen += employerPensionMinor
    matchedCount += 1

    let status: PayrollSummaryMatch['status'] = 'matched'
    if (!employee.allocationComplete) {
      status = 'incomplete_allocation'
      exceptions.push({
        id: crypto.randomUUID(),
        severity: 'critical',
        code: 'missing_cost_centre',
        title: `${employee.displayName} allocation incomplete`,
        detail: 'Employer cost cannot publish until cost-centre allocation is complete.',
      })
      reviews.push({
        organisationId: input.organisationId,
        costId: input.wageCostId,
        signal: 'allocation_issue',
        title: `${employee.displayName} missing cost-centre allocation`,
        detail: `${employee.externalPayrollId} · ${employee.costCentre}`,
        state: 'open',
      })
    } else if (Math.abs(varianceMinor) >= VARIANCE_THRESHOLD_MINOR) {
      status = 'variance'
      varianceCount += 1
      const risingOt = overtimeMinor > employee.overtimeMinor + VARIANCE_THRESHOLD_MINOR
      exceptions.push({
        id: crypto.randomUUID(),
        severity: Math.abs(varianceMinor) >= 10_000 ? 'critical' : 'attention',
        code: risingOt ? 'overtime_over_budget' : 'person_cost_variance',
        title: risingOt
          ? `Overtime rising — ${employee.displayName}`
          : `Wage cost variance — ${employee.displayName}`,
        detail: `Imported £${(importedEmployerCostMinor / 100).toFixed(2)} vs expected £${(employee.expectedEmployerCostMinor / 100).toFixed(2)} (Δ £${(varianceMinor / 100).toFixed(2)}).`,
      })
      reviews.push({
        organisationId: input.organisationId,
        costId: input.wageCostId,
        signal: risingOt ? 'overtime_rising' : 'wage_variance',
        title: risingOt
          ? `Review overtime — ${employee.displayName}`
          : `Review wage variance — ${employee.displayName}`,
        detail: `Provider extract vs register · Δ £${(varianceMinor / 100).toFixed(2)}`,
        state: 'open',
      })
    }

    matched.push({
      line,
      employeeId: employee.id,
      expectedEmployerCostMinor: employee.expectedEmployerCostMinor,
      varianceMinor,
      allocationComplete: employee.allocationComplete,
      status,
    })
  }

  const rolledUp =
    matchedCount > 0
      ? computeEmployerPayrollCost({
          grossWagesMinor: sumBasic,
          employerNiMinor: sumNi,
          employerPensionMinor: sumPen,
          overtimeMinor: sumOt,
          allowancesMinor: 0,
          agencyMinor: 0,
          statutoryEmployerCostMinor: 0,
          otherEmployerCostMinor: 0,
        })
      : null

  if (unmatchedCount > 0) {
    exceptions.unshift({
      id: crypto.randomUUID(),
      severity: 'critical',
      code: 'payroll_summary_unmatched',
      title: `${unmatchedCount} unmatched payroll line${unmatchedCount === 1 ? '' : 's'}`,
      detail: 'Unmatched lines are excluded from the published employer-cost roll-up until linked.',
    })
  }

  return {
    stage,
    rowsRead: rows.length,
    matched,
    quarantined,
    exceptions,
    reviews,
    rolledUp,
    totals: {
      importedEmployerCostMinor: importedTotal,
      expectedEmployerCostMinor: expectedTotal,
      varianceMinor: importedTotal - expectedTotal,
      matchedCount,
      unmatchedCount,
      varianceCount,
    },
  }
}

/** Sample demo file aligned to org-seed wage members (with intentional variances). */
export const SAMPLE_PAYROLL_SUMMARY_CSV = `external_payroll_id,display_name,basic_pay,overtime,employer_ni,employer_pension,hours_completed,cost_centre,source_key
PRV-1001,Alex Founder,5118.00,0.00,820.00,312.00,152,CC-EXEC,pay|2026-07|PRV-1001
PRV-1002,Jordan Miles,3600.00,320.00,640.00,240.00,168,CC-OPS,pay|2026-07|PRV-1002
PRV-1003,Sam Ledger,3195.00,0.00,510.00,195.00,140,CC-FIN,pay|2026-07|PRV-1003
PRV-1004,Riley Care,2998.00,0.00,470.00,182.00,120,CC-PPL,pay|2026-07|PRV-1004
PRV-1005,Casey Bay,2450.00,180.00,410.00,160.00,148,CC-YARD,pay|2026-07|PRV-1005
PRV-1006,Morgan Route,2188.00,640.00,450.00,172.00,176,CC-DRV,pay|2026-07|PRV-1006
PRV-2001,Taylor Wheel,1418.00,1120.00,370.00,142.00,190,CC-DRV,pay|2026-07|PRV-2001
PRV-2002,Jamie Lane,1871.00,410.00,360.00,139.00,158,CC-DRV,pay|2026-07|PRV-2002
PRV-2101,Harper Assist,1575.00,150.00,270.00,105.00,118,CC-DRV,pay|2026-07|PRV-2101
PRV-9999,Unknown Temp,800.00,0.00,90.00,40.00,40,CC-DRV,pay|2026-07|PRV-9999
`
