/**
 * Driver-hours CSV import — durable wage-cost inputs (not PAYE).
 * Deno-compatible for finance-api.
 */

import type { DriverDayRecord, EffectivePayRate, HourCategory, HoursSource } from './finance-driver-wage-hours'

export type DriverHoursQuarantine = {
  id: string
  organisationId: string
  sourceKey: string
  reason: string
  raw: Record<string, string>
  createdAt: string
}

export type DriverHoursImportPersistResult = {
  days: DriverDayRecord[]
  rates: EffectivePayRate[]
  quarantined: DriverHoursQuarantine[]
  rowsRead: number
  unmatchedExternalIds: string[]
}

const HOUR_COLUMNS: Array<{ key: string; category: HourCategory }> = [
  { key: 'basic_hours', category: 'basic' },
  { key: 'overtime_hours', category: 'overtime' },
  { key: 'night_hours', category: 'night' },
  { key: 'weekend_hours', category: 'weekend' },
  { key: 'bank_holiday_hours', category: 'bank_holiday' },
  { key: 'training_hours', category: 'training' },
  { key: 'other_work_hours', category: 'other_work' },
  { key: 'poa_hours', category: 'period_of_availability' },
  { key: 'period_of_availability_hours', category: 'period_of_availability' },
  { key: 'unpaid_break_hours', category: 'unpaid_break' },
  { key: 'paid_absence_hours', category: 'paid_absence' },
]

const SOURCES = new Set<HoursSource>([
  'timesheet',
  'clock',
  'duty',
  'tachograph',
  'depot_attendance',
  'ops_import',
])

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

function parseHoursToCenti(value: string): number {
  const cleaned = value.trim()
  if (!cleaned) return 0
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid hours: ${value}`)
  }
  const [whole, frac = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(frac.padEnd(2, '0').slice(0, 2))
}

function parseMoneyToMinor(value: string): number {
  const cleaned = value.trim().replace(/£/g, '').replace(/,/g, '')
  if (!cleaned) throw new Error('empty money')
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money amount: ${value}`)
  }
  const negative = cleaned.startsWith('-')
  const [pounds, pence = '0'] = cleaned.replace('-', '').split('.')
  const minor = Number(pounds) * 100 + Number(pence.padEnd(2, '0').slice(0, 2))
  return negative ? -minor : minor
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export const SAMPLE_DRIVER_HOURS_CSV = `external_payroll_id,work_date,source,basic_hours,overtime_hours,night_hours,weekend_hours,training_hours,other_work_hours,poa_hours,unpaid_break_hours,disputed,notes,basic_hourly,overtime_hourly,night_premium_hourly,weekend_premium_hourly,bank_holiday_premium_hourly
PRV-2001,2026-07-01,duty,8.00,0,0,0,0,0,0,0.60,false,,15.00,22.50,2.00,3.00,5.00
PRV-2001,2026-07-02,duty,8.00,0,4.00,0,0,0,0,0.60,false,,15.00,22.50,2.00,3.00,5.00
PRV-2001,2026-07-03,timesheet,8.00,2.00,0,0,0,0,0,0.60,false,,15.00,22.50,2.00,3.00,5.00
PRV-2002,2026-07-01,tachograph,7.50,1.00,0,0,0,0,0,0,false,,12.80,19.20,1.50,2.50,4.00
PRV-2002,2026-07-10,clock,4.00,2.00,0,0,0,0,0,0,true,Driver disputes overtime,12.80,19.20,1.50,2.50,4.00
`

export function importDriverHoursForPersist(input: {
  organisationId: string
  payPeriodId: string
  text: string
  employees: Array<{ id: string; externalPayrollId: string; displayName: string }>
  idFactory: () => string
  nowIso?: string
}): DriverHoursImportPersistResult {
  const now = input.nowIso ?? new Date().toISOString()
  const lines = input.text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    throw new Error('csv_requires_header_and_rows')
  }

  const headers = splitCsvLine(lines[0]!).map(normalizeHeader)
  const idx = (name: string) => headers.indexOf(name)
  const externalIdx = idx('external_payroll_id')
  const dateIdx = idx('work_date')
  if (externalIdx < 0 || dateIdx < 0) {
    throw new Error('csv_requires_external_payroll_id_and_work_date')
  }

  const byExternal = new Map(
    input.employees.map((e) => [e.externalPayrollId.trim().toUpperCase(), e]),
  )
  const days: DriverDayRecord[] = []
  const dayKeys = new Set<string>()
  const ratesByKey = new Map<string, EffectivePayRate>()
  const quarantined: DriverHoursQuarantine[] = []
  const unmatched = new Set<string>()

  for (let rowNo = 1; rowNo < lines.length; rowNo++) {
    const cols = splitCsvLine(lines[rowNo]!)
    const raw: Record<string, string> = {}
    headers.forEach((h, i) => {
      raw[h] = (cols[i] ?? '').trim()
    })
    const external = raw.external_payroll_id ?? ''
    const workDate = raw.work_date ?? ''
    const sourceRaw = (raw.source || 'ops_import').toLowerCase() as HoursSource
    try {
      if (!external) throw new Error('external_payroll_id required')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) throw new Error('work_date must be YYYY-MM-DD')
      if (!SOURCES.has(sourceRaw)) throw new Error(`unknown source: ${sourceRaw}`)
      const employee = byExternal.get(external.toUpperCase())
      if (!employee) {
        unmatched.add(external)
        throw new Error(`unmatched external_payroll_id: ${external}`)
      }

      const hourLines: DriverDayRecord['lines'] = []
      const seenCats = new Set<HourCategory>()
      for (const col of HOUR_COLUMNS) {
        if (seenCats.has(col.category)) continue
        const value = raw[col.key]
        if (value === undefined || value === '') continue
        const hoursCenti = parseHoursToCenti(value)
        if (hoursCenti <= 0) continue
        seenCats.add(col.category)
        hourLines.push({ category: col.category, hoursCenti })
      }
      if (!hourLines.length) throw new Error('at least one hour category required')

      const disputed =
        (raw.disputed ?? '').toLowerCase() === 'true' ||
        (raw.disputed ?? '') === '1' ||
        (raw.disputed ?? '').toLowerCase() === 'yes'
      const dayId = `dd_${employee.id}_${workDate}`
      if (dayKeys.has(dayId)) throw new Error(`duplicate driver-day for ${external} on ${workDate}`)
      dayKeys.add(dayId)
      days.push({
        id: dayId,
        organisationId: input.organisationId,
        employeeCostReferenceId: employee.id,
        payPeriodId: input.payPeriodId,
        workDate,
        source: sourceRaw,
        disputed,
        notes: raw.notes || undefined,
        lines: hourLines,
      })

      const basicHourly = raw.basic_hourly
      if (basicHourly) {
        const rateKey = `${employee.id}|${basicHourly}|${raw.overtime_hourly ?? ''}|${raw.night_premium_hourly ?? ''}`
        if (!ratesByKey.has(rateKey)) {
          ratesByKey.set(rateKey, {
            id: `rate_${employee.id}_${workDate}`,
            organisationId: input.organisationId,
            employeeCostReferenceId: employee.id,
            effectiveFrom: workDate,
            effectiveTo: null,
            basicHourlyMinor: parseMoneyToMinor(basicHourly),
            overtimeHourlyMinor: parseMoneyToMinor(raw.overtime_hourly || basicHourly),
            nightPremiumHourlyMinor: parseMoneyToMinor(raw.night_premium_hourly || '0'),
            weekendPremiumHourlyMinor: parseMoneyToMinor(raw.weekend_premium_hourly || '0'),
            bankHolidayPremiumHourlyMinor: parseMoneyToMinor(raw.bank_holiday_premium_hourly || '0'),
          })
        } else {
          const existing = ratesByKey.get(rateKey)!
          if (workDate < existing.effectiveFrom) {
            ratesByKey.set(rateKey, { ...existing, effectiveFrom: workDate })
          }
        }
      }
    } catch (error) {
      quarantined.push({
        id: input.idFactory(),
        organisationId: input.organisationId,
        sourceKey: `driver-hours|row|${rowNo}`,
        reason: error instanceof Error ? error.message : 'invalid_row',
        raw,
        createdAt: now,
      })
    }
  }

  return {
    days,
    rates: [...ratesByKey.values()],
    quarantined,
    rowsRead: lines.length - 1,
    unmatchedExternalIds: [...unmatched],
  }
}
