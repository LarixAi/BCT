/**
 * Payroll summary CSV import — employer-cost recognition only (no PAYE).
 * Deno-compatible for finance-api.
 */

export type PayrollEmployeeRef = {
  id: string
  externalPayrollId: string
  displayName: string
  expectedEmployerCostMinor: number
  overtimeMinor: number
  allocationComplete: boolean
  active: boolean
  wageCostBearing: boolean
}

export type PayrollSummaryImportPersistResult = {
  stage: 'pre_payroll' | 'final' | 'forecast'
  rowsRead: number
  matched: Array<{
    line: {
      externalPayrollId: string
      displayName: string
      basicPayMinor: number
      overtimeMinor: number
      employerNiMinor: number
      employerPensionMinor: number
      hoursCompleted: number | null
      costCentre: string
      sourceKey: string
      importedEmployerCostMinor: number
    }
    employeeId: string | null
    expectedEmployerCostMinor: number | null
    varianceMinor: number | null
    allocationComplete: boolean | null
    status: 'matched' | 'unmatched' | 'variance' | 'incomplete_allocation'
  }>
  quarantined: Array<{
    id: string
    organisationId: string
    sourceKey: string
    reason: string
    raw: Record<string, string>
    createdAt: string
  }>
  exceptions: Array<{
    id: string
    severity: 'info' | 'attention' | 'critical'
    code: string
    title: string
    detail: string
  }>
  reviews: Array<{
    organisationId: string
    costId: string
    signal: string
    title: string
    detail: string
    state: 'open'
  }>
  rolledUp: {
    grossWagesMinor: number
    employerNiMinor: number
    employerPensionMinor: number
    overtimeMinor: number
    allowancesMinor: number
    agencyMinor: number
    statutoryEmployerCostMinor: number
    otherEmployerCostMinor: number
    recoveriesMinor: number
    totalEmployerCostMinor: number
    formulaVersion: 'cost-control.payroll-employer.v1'
  } | null
  totals: {
    importedEmployerCostMinor: number
    expectedEmployerCostMinor: number
    varianceMinor: number
    matchedCount: number
    unmatchedCount: number
    varianceCount: number
  }
}

const VARIANCE_THRESHOLD_MINOR = 100
const FORMULA_VERSION = 'cost-control.payroll-employer.v1' as const

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

function moneyField(row: Record<string, string>, key: string): number {
  const raw = row[key]
  if (!raw) return 0
  return parseMoneyToMinor(raw)
}

export function importPayrollSummaryForPersist(input: {
  organisationId: string
  text: string
  wageCostId: string
  employees: PayrollEmployeeRef[]
  stage?: 'pre_payroll' | 'final' | 'forecast'
  nowIso?: string
  idFactory?: () => string
}): PayrollSummaryImportPersistResult {
  const stage = input.stage ?? 'pre_payroll'
  const now = input.nowIso ?? new Date().toISOString()
  const newId = input.idFactory ?? (() => crypto.randomUUID())
  const rows = parseCsv(input.text)
  const byExternal = new Map(
    input.employees
      .filter((e) => e.active && e.wageCostBearing)
      .map((e) => [e.externalPayrollId.toUpperCase(), e]),
  )

  const matched: PayrollSummaryImportPersistResult['matched'] = []
  const quarantined: PayrollSummaryImportPersistResult['quarantined'] = []
  const exceptions: PayrollSummaryImportPersistResult['exceptions'] = []
  const reviews: PayrollSummaryImportPersistResult['reviews'] = []
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
        id: newId(),
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
        id: newId(),
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
        id: newId(),
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
        id: newId(),
        organisationId: input.organisationId,
        sourceKey,
        reason: 'hours_completed is not a number',
        raw: row,
        createdAt: now,
      })
      continue
    }

    const line = {
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
        id: newId(),
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

    let status: 'matched' | 'variance' | 'incomplete_allocation' = 'matched'
    if (!employee.allocationComplete) {
      status = 'incomplete_allocation'
      exceptions.push({
        id: newId(),
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
        detail: employee.externalPayrollId,
        state: 'open',
      })
    } else if (Math.abs(varianceMinor) >= VARIANCE_THRESHOLD_MINOR) {
      status = 'variance'
      varianceCount += 1
      const risingOt = overtimeMinor > employee.overtimeMinor + VARIANCE_THRESHOLD_MINOR
      exceptions.push({
        id: newId(),
        severity: Math.abs(varianceMinor) >= 10_000 ? 'critical' : 'attention',
        code: risingOt ? 'overtime_over_budget' : 'person_cost_variance',
        title: risingOt
          ? `Overtime rising — ${employee.displayName}`
          : `Wage cost variance — ${employee.displayName}`,
        detail: `Imported £${(importedEmployerCostMinor / 100).toFixed(2)} vs expected £${(employee.expectedEmployerCostMinor / 100).toFixed(2)}.`,
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
      ? {
          grossWagesMinor: sumBasic,
          employerNiMinor: sumNi,
          employerPensionMinor: sumPen,
          overtimeMinor: sumOt,
          allowancesMinor: 0,
          agencyMinor: 0,
          statutoryEmployerCostMinor: 0,
          otherEmployerCostMinor: 0,
          recoveriesMinor: 0,
          totalEmployerCostMinor: sumBasic + sumNi + sumPen + sumOt,
          formulaVersion: FORMULA_VERSION,
        }
      : null

  if (unmatchedCount > 0) {
    exceptions.unshift({
      id: newId(),
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
