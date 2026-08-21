import type {
  DriverDayRecord,
  EffectivePayRate,
} from '../domain/driver-wage-hours'
import { buildWageCostBatch, type WageCostBatch } from '../domain/wage-period-workflow'
import type { OrganisationId } from '../domain/types'

/** Demo driver-days + rates for July 2026 wage-cost workbench. */
export function createDemoWageHours(organisationId: OrganisationId): {
  driverDays: DriverDayRecord[]
  payRates: EffectivePayRate[]
  wageBatches: WageCostBatch[]
} {
  // Taylor Wheel — matches approved example: 160h × £15, 12 OT × £22.50, 24 night × £2, £50 allowance
  const taylorDays: DriverDayRecord[] = [
    day(organisationId, 'dd_tw_01', 'ecr_drv1', 'pp_2026_07', '2026-07-01', 'duty', [
      ['basic', 800],
      ['unpaid_break', 60],
    ]),
    day(organisationId, 'dd_tw_02', 'ecr_drv1', 'pp_2026_07', '2026-07-02', 'duty', [
      ['basic', 800],
      ['night', 400],
      ['unpaid_break', 60],
    ]),
    day(organisationId, 'dd_tw_03', 'ecr_drv1', 'pp_2026_07', '2026-07-03', 'timesheet', [
      ['basic', 800],
      ['overtime', 200],
      ['unpaid_break', 60],
    ]),
    // Aggregate remainder so period totals match the worked example
    day(organisationId, 'dd_tw_period', 'ecr_drv1', 'pp_2026_07', '2026-07-15', 'ops_import', [
      ['basic', 13_600], // 136h → total basic with above ≈ 160h (8+8+8+136)
      ['overtime', 1_000], // +10h → 12 OT with the 2h day
      ['night', 2_000], // +20h → 24 night with the 4h day
      ['period_of_availability', 400],
      ['training', 0],
    ]),
  ]

  // Fix basic total: 8+8+8+136 = 160 ✓, OT 2+10 = 12 ✓, night 4+20 = 24 ✓

  const jamieDays: DriverDayRecord[] = [
    day(organisationId, 'dd_jl_01', 'ecr_drv2', 'pp_2026_07', '2026-07-01', 'tachograph', [
      ['basic', 750],
      ['overtime', 100],
    ]),
    day(organisationId, 'dd_jl_02', 'ecr_drv2', 'pp_2026_07', '2026-07-02', 'duty', [
      ['basic', 800],
      ['other_work', 75],
      ['training', 100],
      ['unpaid_break', 45],
      ['period_of_availability', 50],
    ]),
    day(organisationId, 'dd_jl_03', 'ecr_drv2', 'pp_2026_07', '2026-07-08', 'duty', [
      ['basic', 800],
      ['weekend', 800],
      ['unpaid_break', 60],
    ]),
  ]

  const disputed: DriverDayRecord = day(
    organisationId,
    'dd_jl_dispute',
    'ecr_drv2',
    'pp_2026_07',
    '2026-07-10',
    'clock',
    [
      ['basic', 400],
      ['overtime', 200],
    ],
  )
  disputed.disputed = true
  disputed.notes = 'Driver disputes overtime — awaiting supervisor correction'

  const driverDays = [...taylorDays, ...jamieDays, disputed]

  const payRates: EffectivePayRate[] = [
    {
      id: 'rate_tw_a',
      organisationId,
      employeeCostReferenceId: 'ecr_drv1',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-07-16',
      basicHourlyMinor: 15_00,
      overtimeHourlyMinor: 22_50,
      nightPremiumHourlyMinor: 2_00,
      weekendPremiumHourlyMinor: 3_00,
      bankHolidayPremiumHourlyMinor: 5_00,
    },
    {
      id: 'rate_tw_b',
      organisationId,
      employeeCostReferenceId: 'ecr_drv1',
      effectiveFrom: '2026-07-16',
      effectiveTo: null,
      basicHourlyMinor: 15_50,
      overtimeHourlyMinor: 23_25,
      nightPremiumHourlyMinor: 2_00,
      weekendPremiumHourlyMinor: 3_00,
      bankHolidayPremiumHourlyMinor: 5_00,
    },
    {
      id: 'rate_jl',
      organisationId,
      employeeCostReferenceId: 'ecr_drv2',
      effectiveFrom: '2026-04-01',
      effectiveTo: null,
      basicHourlyMinor: 12_80,
      overtimeHourlyMinor: 19_20,
      nightPremiumHourlyMinor: 1_50,
      weekendPremiumHourlyMinor: 2_50,
      bankHolidayPremiumHourlyMinor: 4_00,
    },
  ]

  // Taylor period day is dated 2026-07-15 so it uses rate_tw_a (£15) — matches example.
  const taylorOnlyDays = taylorDays
  const taylorBatch = buildWageCostBatch({
    id: 'wb_2026_07_taylor_preview',
    organisationId,
    payPeriodId: 'pp_2026_07',
    label: 'July 2026 — Taylor Wheel (worked example)',
    days: taylorOnlyDays,
    rates: payRates,
    people: [
      {
        id: 'ecr_drv1',
        displayName: 'Taylor Wheel',
        externalPayrollId: 'PRV-2001',
        approvedAllowanceMinor: 50_00,
        holidayPayMode: 'leave_when_taken',
      },
    ],
  })

  const fullBatch = buildWageCostBatch({
    id: 'wb_2026_07',
    organisationId,
    payPeriodId: 'pp_2026_07',
    label: 'July 2026 driver wage-cost batch',
    days: driverDays,
    rates: payRates,
    people: [
      {
        id: 'ecr_drv1',
        displayName: 'Taylor Wheel',
        externalPayrollId: 'PRV-2001',
        approvedAllowanceMinor: 50_00,
        holidayPayMode: 'leave_when_taken',
      },
      {
        id: 'ecr_drv2',
        displayName: 'Jamie Lane',
        externalPayrollId: 'PRV-2002',
        approvedAllowanceMinor: 0,
        holidayPayMode: 'rolled_up_separate',
        rolledUpHolidayPayMinor: 85_00,
      },
    ],
  })

  return {
    driverDays,
    payRates,
    wageBatches: [fullBatch, taylorBatch],
  }
}

function day(
  organisationId: OrganisationId,
  id: string,
  employeeCostReferenceId: string,
  payPeriodId: string,
  workDate: string,
  source: DriverDayRecord['source'],
  lines: Array<[DriverDayRecord['lines'][number]['category'], number]>,
): DriverDayRecord {
  return {
    id,
    organisationId,
    employeeCostReferenceId,
    payPeriodId,
    workDate,
    source,
    disputed: false,
    lines: lines
      .filter(([, h]) => h > 0)
      .map(([category, hoursCenti]) => ({ category, hoursCenti })),
  }
}
