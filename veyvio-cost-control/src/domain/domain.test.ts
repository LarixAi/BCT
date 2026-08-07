import { describe, expect, it } from 'vitest'
import { createSeedStore } from '../data/seed'
import { assertBalancedAllocations, isBalancedAllocations } from './allocation'
import {
  availableBudget,
  computeBudgetPosition,
  projectedFinalCost,
  projectedRemainingBudget,
} from './budget-equations'
import { canTransition, projectedFinalAfterCommitmentConversion } from './cost-status'
import { importCostCsv } from './csv-import'
import { formatMoney, parseMoneyToMinor } from './money'
import { buildFinancialSnapshot } from './snapshot'
import { buildSpendFlowSeries } from './spend-flow'
import {
  computeEmployerPayrollCost,
  computePayrollBudgetVariance,
  resolveDisplayedEmployerCost,
} from './payroll-cost'
import {
  buildOrgTree,
  incompleteAllocationCount,
  listWageCostMembers,
  personCostComposition,
  findEmployeeCostReference,
} from './org-structure'
import {
  importPayrollSummaryCsv,
  SAMPLE_PAYROLL_SUMMARY_CSV,
} from './payroll-summary-import'
import { buildCecBudgetHierarchy, computeLineVariance } from './budget-hierarchy'
import { applyReviewDecision } from './review-actions'
import { assertSameOrganisation, TenancyError } from './tenancy'
import { buildVehicleCostProfile, listVehicleIds } from './vehicle-cost-profile'
import { buildBankFeedSnapshot, refreshDemoBankFeed } from './bank-account'
import { createOpenBankingAdapter } from '../integrations/bank'
import {
  SAGE_EXPORT_PAYLOAD_VERSION,
  buildSageSupplierCostExport,
  buildSageWageJournalExport,
  isFullyReconciledCost,
  sagePostingDisplayLabel,
} from '../integrations/sage'
import {
  computeOperatingPosition,
  deriveApprovalStatus,
  deriveVatTreatment,
  filterOperatingLedger,
  listOperatingAttention,
  listOperatingCosts,
  operatingGroupFor,
} from './operating-costs'
import { computeProvisionalGross } from './driver-wage-hours'
import {
  buildProviderExportPackage,
  createWageAdjustment,
} from './wage-period-workflow'
import { resolveProgrammeGovernance } from './budget-governance'
import {
  assertQuarterMutable,
  buildQuarterlyCategoryRows,
} from './quarterly-review'
import { buildManagementAccounts } from './management-accounts'
import { BUDGET_EQUATION_LABELS } from './financial-views'
import {
  isRelatedPartySupplier,
  qualifiesForAuditExemption,
  resolveApprovalBand,
} from './clg-governance'

describe('money', () => {
  it('parses and formats GBP minor units', () => {
    expect(parseMoneyToMinor('12.34')).toBe(1234)
    expect(parseMoneyToMinor('4,850.00')).toBe(485000)
    expect(formatMoney(582000)).toBe('£5,820.00')
  })
})

describe('budget equations', () => {
  it('matches blueprint §5 identities', () => {
    expect(availableBudget(1000, 200, 100)).toBe(700)
    expect(projectedRemainingBudget(1000, 200, 100, 50)).toBe(650)
    expect(projectedFinalCost(200, 100, 50)).toBe(350)
    const pos = computeBudgetPosition({
      approvedMinor: 1000,
      actualMinor: 200,
      committedMinor: 100,
      forecastMinor: 50,
    })
    expect(pos.availableMinor).toBe(700)
    expect(pos.projectedRemainingMinor).toBe(650)
    expect(pos.projectedFinalMinor).toBe(350)
    expect(pos.varianceToApprovedMinor).toBe(650)
  })
})

describe('allocations', () => {
  it('requires exact balance', () => {
    expect(
      isBalancedAllocations(
        [{ budgetId: 'b', category: 'fuel', amountMinor: 60 }, { budgetId: 'b', category: 'fuel', amountMinor: 40 }],
        100,
      ),
    ).toBe(true)
    expect(() =>
      assertBalancedAllocations([{ budgetId: 'b', category: 'fuel', amountMinor: 99 }], 100),
    ).toThrow(/imbalance/i)
  })
})

describe('cost status', () => {
  it('blocks illegal transitions and prevents double count on conversion', () => {
    expect(canTransition('committed', 'actual')).toBe(true)
    expect(canTransition('actual', 'committed')).toBe(false)
    const before = projectedFinalCost(100, 50, 20)
    const after = projectedFinalAfterCommitmentConversion({
      actualMinor: 100,
      committedMinor: 50,
      forecastMinor: 20,
      convertingMinor: 50,
    })
    expect(after).toBe(before)
  })
})

describe('csv import', () => {
  it('accepts valid rows, quarantines bad rows, skips duplicates', () => {
    const csv = `date,supplier,description,reference,category,status,net,vat,gross,source_key
2026-07-22,Shell,Fuel,A1,fuel,actual,100.00,20.00,120.00,shell|A1
2026-07-22,Shell,Fuel,A1,fuel,actual,100.00,20.00,120.00,shell|A1
2026-07-22,Bad,,,fuel,actual,10.00,2.00,12.00,bad|1
`
    const result = importCostCsv({
      organisationId: 'org',
      budgetId: 'bud',
      text: csv,
      existingSourceKeys: new Set(),
    })
    expect(result.rowsRead).toBe(3)
    expect(result.accepted).toHaveLength(1)
    expect(result.duplicatesSkipped).toBe(1)
    expect(result.quarantined).toHaveLength(1)
  })
})

describe('seed snapshot', () => {
  it('publishes one consistent position', () => {
    const store = createSeedStore()
    const snap = buildFinancialSnapshot({
      organisationId: store.organisation.id,
      budget: store.budget,
      costs: store.costs,
      nowIso: '2026-07-28T12:00:00.000Z',
    })
    expect(snap.projectedFinalMinor).toBe(snap.actualMinor + snap.committedMinor + snap.forecastMinor)
    expect(snap.availableMinor).toBe(snap.approvedMinor - snap.actualMinor - snap.committedMinor)
    expect(store.lastValidSnapshot?.formulaVersion).toBe(snap.formulaVersion)
  })
})

describe('spend flow series', () => {
  it('buckets actual up and committed down by week', () => {
    const store = createSeedStore()
    const series = buildSpendFlowSeries(store.costs)
    expect(series.length).toBeGreaterThan(1)
    const actualSum = series.reduce((s, p) => s + p.actualMinor, 0)
    const committedSum = series.reduce((s, p) => s + p.committedMinor, 0)
    const snap = store.lastValidSnapshot!
    expect(actualSum).toBe(snap.actualMinor)
    expect(committedSum).toBe(snap.committedMinor)
    expect(series.every((p) => p.label.length > 0)).toBe(true)
  })
})

describe('payroll employer cost', () => {
  it('sums employer components and never treats deductions as cost inputs', () => {
    const breakdown = computeEmployerPayrollCost({
      grossWagesMinor: 100_000_00,
      employerNiMinor: 15_000_00,
      employerPensionMinor: 3_000_00,
      overtimeMinor: 2_000_00,
      allowancesMinor: 500_00,
      agencyMinor: 0,
      statutoryEmployerCostMinor: 0,
      otherEmployerCostMinor: 200_00,
      recoveriesMinor: 700_00,
    })
    expect(breakdown.totalEmployerCostMinor).toBe(120_000_00)
    expect(breakdown.formulaVersion).toBe('cost-control.payroll-employer.v1')
  })

  it('computes budget variance for the seed July period', () => {
    const store = createSeedStore()
    const period = store.payPeriods[0]
    const displayed = resolveDisplayedEmployerCost(period)
    const variance = computePayrollBudgetVariance(
      period.budgetedEmployerCostMinor,
      displayed.totalEmployerCostMinor,
    )
    expect(displayed.totalEmployerCostMinor).toBe(170_100_00)
    expect(variance.varianceMinor).toBe(5_100_00)
    expect(variance.variancePercentHundredths).toBe(309)
    expect(period.exceptions.length).toBe(3)
    expect(period.finalPayroll).toBeNull()
  })
})

describe('organisation structure', () => {
  it('builds the tree and lists only wage-cost members by default', () => {
    const store = createSeedStore()
    const tree = buildOrgTree(store.orgNodes)
    expect(tree[0]?.title).toBe('Member(s)')
    expect(tree[0]?.children.some((c) => c.title === 'Board of Directors')).toBe(true)

    const wageMembers = listWageCostMembers(store.employeeCostReferences)
    expect(wageMembers.length).toBe(9)
    expect(wageMembers.every((p) => p.wageCostBearing)).toBe(true)
    expect(incompleteAllocationCount(store.employeeCostReferences)).toBe(2)
    expect(store.employeeCostReferences.some((p) => p.employmentKind === 'board')).toBe(true)
    expect(listWageCostMembers(store.employeeCostReferences).some((p) => p.employmentKind === 'board')).toBe(
      false,
    )
  })

  it('gives wage members pay inputs that compose to expected employer cost', () => {
    const store = createSeedStore()
    const wageMembers = listWageCostMembers(store.employeeCostReferences)
    for (const person of wageMembers) {
      expect(person.payInputs).toBeTruthy()
      expect(person.payInputs?.niNumberMasked).toMatch(/\*/)
      expect(person.payInputs?.bankAccountMasked).toMatch(/\*/)
      const composition = personCostComposition(person)
      expect(composition.matchesExpected).toBe(true)
    }
    const harper = findEmployeeCostReference(store.employeeCostReferences, 'ecr_pa1')
    expect(harper?.payInputs?.sickDaysThisPeriod).toBe(3)
    expect(harper?.payInputs?.hoursCompletedThisPeriod).toBe(118)
  })
})

describe('payroll summary import', () => {
  it('matches provider lines, flags unmatched and variance, rolls up employer cost', () => {
    const store = createSeedStore()
    const result = importPayrollSummaryCsv({
      organisationId: store.organisation.id,
      text: SAMPLE_PAYROLL_SUMMARY_CSV,
      employees: store.employeeCostReferences,
      wageCostId: 'cost_wages_jul',
      nowIso: '2026-07-28T15:00:00.000Z',
    })

    expect(result.rowsRead).toBe(10)
    expect(result.totals.matchedCount).toBe(9)
    expect(result.totals.unmatchedCount).toBe(1)
    expect(result.totals.varianceCount).toBeGreaterThanOrEqual(1)
    expect(result.exceptions.some((e) => e.code === 'unmatched_payroll_id')).toBe(true)
    expect(result.exceptions.some((e) => e.code === 'missing_cost_centre')).toBe(true)
    expect(result.exceptions.some((e) => e.code === 'overtime_over_budget')).toBe(true)
    expect(result.rolledUp).toBeTruthy()
    expect(result.rolledUp!.overtimeMinor).toBeGreaterThan(0)
    expect(result.reviews.some((r) => r.signal === 'overtime_rising')).toBe(true)
  })
})

describe('tenancy', () => {
  it('blocks cross-organisation access', () => {
    expect(() => assertSameOrganisation('org_a', 'org_b', 'cost')).toThrow(TenancyError)
    expect(() => assertSameOrganisation('org_a', 'org_a', 'cost')).not.toThrow()
  })
})

describe('CEC budget hierarchy', () => {
  it('builds org → year → programme → category and drills line variance', () => {
    const store = createSeedStore()
    const tree = buildCecBudgetHierarchy({
      organisationId: store.organisation.id,
      organisationName: store.organisation.tradingName,
      budget: store.budget,
      costs: store.costs,
    })
    expect(tree.level).toBe('organisation')
    expect(tree.children[0]?.level).toBe('financial_year')
    expect(tree.children[0]?.children[0]?.code).toBe('CEC-FY26')
    const fuel = store.budget.lines.find((l) => l.id === 'bl_fuel')!
    const variance = computeLineVariance(fuel, store.costs, store.budget.id, store.organisation.id)
    expect(variance.costs.length).toBeGreaterThan(0)
    expect(variance.position.actualMinor).toBeGreaterThan(0)
  })
})

describe('review actions', () => {
  it('approves with balanced reallocation, evidence and audit', () => {
    const store = createSeedStore()
    const review = store.reviews.find((r) => r.id === 'rev_2')!
    const cost = store.costs.find((c) => c.id === review.costId)!
    const result = applyReviewDecision({
      organisationId: store.organisation.id,
      review,
      cost,
      decision: {
        type: 'approve',
        reason: 'Quotation attached and cost centre confirmed',
        evidenceLabel: 'quotation-tyres-2026.pdf',
        allocations: [
          {
            budgetId: store.budget.id,
            category: 'maintenance',
            costCentreId: 'cc_yard',
            vehicleId: null,
            supplierId: null,
            amountMinor: cost.gross.amountMinor,
          },
        ],
      },
      nowIso: '2026-07-28T16:00:00.000Z',
    })
    expect(result.review.state).toBe('approved')
    expect(result.cost.reviewState).toBe('approved')
    expect(result.cost.evidence.some((e) => e.label === 'quotation-tyres-2026.pdf')).toBe(true)
    expect(result.cost.allocations[0]?.costCentreId).toBe('cc_yard')
    expect(result.audit.action).toBe('review.approve')
    expect(result.audit.organisationId).toBe(store.organisation.id)
  })

  it('rejects without a reason', () => {
    const store = createSeedStore()
    const review = store.reviews[0]!
    const cost = store.costs.find((c) => c.id === review.costId)!
    expect(() =>
      applyReviewDecision({
        organisationId: store.organisation.id,
        review,
        cost,
        decision: { type: 'reject', reason: '   ' },
      }),
    ).toThrow(/reason/i)
  })
})

describe('vehicle cost profile', () => {
  it('splits insurance, lease, tax, fuel and maintenance per vehicle', () => {
    const store = createSeedStore()
    const ids = listVehicleIds(store.costs, store.organisation.id)
    expect(ids).toEqual(['BX62BCT', 'LK71CEC'])

    const bx62 = buildVehicleCostProfile({
      organisationId: store.organisation.id,
      vehicleId: 'BX62BCT',
      costs: store.costs,
    })
    const insurance = bx62.buckets.find((b) => b.key === 'insurance')!
    const lease = bx62.buckets.find((b) => b.key === 'lease')!
    const tax = bx62.buckets.find((b) => b.key === 'tax')!
    const fuel = bx62.buckets.find((b) => b.key === 'fuel')!
    const maintenance = bx62.buckets.find((b) => b.key === 'maintenance')!

    expect(insurance.amountMinor).toBe(7_200_00)
    expect(lease.amountMinor).toBe(20_160_00) // 16800 + 3360 VAT
    expect(tax.amountMinor).toBe(320_00)
    expect(fuel.amountMinor).toBeGreaterThan(0)
    expect(maintenance.amountMinor).toBeGreaterThan(0)
    expect(bx62.missingOwnershipSignals).toEqual([])
    expect(bx62.costs.every((c) => c.subcategory || c.category === 'wages')).toBe(true)
  })
})

describe('business bank feed', () => {
  it('shows available balance and unmatched debits for reconciliation', () => {
    const store = createSeedStore()
    expect(store.bankAccounts).toHaveLength(1)
    const account = store.bankAccounts[0]!
    const snap = buildBankFeedSnapshot({
      organisationId: store.organisation.id,
      account,
      transactions: store.bankTransactions,
      nowIso: '2026-07-28T12:00:00.000Z',
    })
    expect(snap.availableMinor).toBe(84_620_45)
    expect(snap.unmatchedCount).toBeGreaterThanOrEqual(1)
    expect(snap.pendingDebitsMinor).toBe(6_720_00)
    expect(account.accountNumberMasked).toMatch(/\*/)
    expect(account.feedMode).toBe('demo_live')

    const refreshed = refreshDemoBankFeed({
      account,
      transactions: store.bankTransactions,
      nowIso: '2026-07-28T12:05:00.000Z',
    })
    expect(refreshed.account.lastSyncedAt).toBe('2026-07-28T12:05:00.000Z')
  })
})

describe('open banking adapter', () => {
  it('completes sandbox consent and syncs AIS-shaped balances', async () => {
    const store = createSeedStore()
    const config = {
      mode: 'open_banking' as const,
      providerId: 'truelayer_sandbox' as const,
      tokenProxyBaseUrl: null,
      redirectUri: 'http://localhost:5176/settings?bank_callback=1',
      clientIdPublic: null,
    }
    const adapter = createOpenBankingAdapter(config, 'truelayer_sandbox')
    const started = await adapter.startConsent({
      organisationId: store.organisation.id,
      institutionHint: 'NatWest Business',
      redirectUri: config.redirectUri,
    })
    expect(started.connection.status).toBe('awaiting_consent')
    expect(started.consentUrl).toContain('bank_sandbox=1')

    const connected = await adapter.completeConsent({
      organisationId: store.organisation.id,
      connection: started.connection,
      callbackState: started.state,
    })
    expect(connected.status).toBe('connected')
    expect(adapter.supportsPaymentInitiation).toBe(false)

    const synced = await adapter.sync({
      organisationId: store.organisation.id,
      connection: connected,
      existingAccounts: [],
    })
    expect(synced.accounts[0]?.feedMode).toBe('open_banking')
    expect(synced.accounts[0]?.balanceMinor).toBe(84_620_45)
    expect(synced.transactions.length).toBeGreaterThan(0)
    expect(synced.accounts[0]?.accountNumberMasked).toMatch(/\*/)
  })
})

describe('operating costs', () => {
  const store = createSeedStore()

  it('lists only operating categories and computes pool position', () => {
    const rows = listOperatingCosts(store.costs, store.organisation.id)
    expect(rows.length).toBeGreaterThanOrEqual(10)
    expect(
      rows.every((c) =>
        ['premises', 'technology', 'professional', 'administration', 'exceptional'].includes(
          c.category,
        ),
      ),
    ).toBe(true)

    const position = computeOperatingPosition({
      organisationId: store.organisation.id,
      budget: store.budget,
      costs: store.costs,
    })
    expect(position.approvedMinor).toBe(70_000_00)
    expect(position.projectedFinalMinor).toBe(
      position.actualMinor + position.committedMinor + position.forecastMinor,
    )
    expect(position.varianceToApprovedMinor).toBe(
      position.approvedMinor - position.projectedFinalMinor,
    )
  })

  it('maps groups, approval and VAT treatment', () => {
    const rent = store.costs.find((c) => c.id === 'cost_ops_rent')!
    const training = store.costs.find((c) => c.id === 'cost_ops_training')!
    const disputed = store.costs.find((c) => c.id === 'cost_ops_disputed_clean')!
    const draft = store.costs.find((c) => c.id === 'cost_ops_bank_fees')!
    const rates = store.costs.find((c) => c.id === 'cost_ops_rates')!

    expect(operatingGroupFor(rent)).toBe('premises')
    expect(operatingGroupFor(training)).toBe('training_staff')
    expect(deriveApprovalStatus(disputed)).toBe('disputed')
    expect(deriveApprovalStatus(draft)).toBe('draft')
    expect(deriveVatTreatment(rates)).toBe('out_of_scope')
    expect(deriveVatTreatment(rent)).toBe('standard')
  })

  it('filters ledger and surfaces attention items', () => {
    const operating = listOperatingCosts(store.costs, store.organisation.id)
    const filtered = filterOperatingLedger(operating, {
      group: 'technology',
      approval: 'all',
      lifecycle: 'all',
      query: '',
      period: 'all',
    })
    expect(filtered.every((c) => operatingGroupFor(c) === 'technology')).toBe(true)

    const recurring = filterOperatingLedger(operating, {
      group: 'recurring',
      approval: 'all',
      lifecycle: 'all',
      query: '',
      period: 'all',
    })
    expect(recurring.length).toBeGreaterThan(0)

    const position = computeOperatingPosition({
      organisationId: store.organisation.id,
      budget: store.budget,
      costs: store.costs,
    })
    const attention = listOperatingAttention({
      organisationId: store.organisation.id,
      costs: store.costs,
      reviews: store.reviews,
      position,
    })
    expect(attention.some((a) => a.costId === 'cost_ops_disputed_clean')).toBe(true)
    expect(attention.some((a) => a.costId === 'cost_ops_legal')).toBe(true)
  })
})

describe('driver wage hours + provisional gross', () => {
  it('matches the approved worked example for Taylor Wheel', () => {
    const store = createSeedStore()
    const taylorBatch = store.wageBatches.find((b) => b.id === 'wb_2026_07_taylor_preview')
    expect(taylorBatch).toBeTruthy()
    const snap = taylorBatch!.personSnapshots[0]
    expect(snap.provisional.grossPayMinor).toBe(2_768_00)
    expect(snap.provisional.basicPayMinor).toBe(2_400_00)
    expect(snap.provisional.overtimePayMinor).toBe(270_00)
    expect(snap.provisional.premiumPayMinor).toBe(48_00)
    expect(snap.provisional.allowancesMinor).toBe(50_00)
    expect(snap.provisional.payableHoursCenti).toBe(17_200) // 160 basic + 12 OT
    expect(snap.provisional.nmwCheck.passed).toBe(true)
  })

  it('blocks disputed hours and creates post-lock adjustments without overwrite', () => {
    const store = createSeedStore()
    const batch = store.wageBatches.find((b) => b.id === 'wb_2026_07')!
    expect(batch.status).toBe('exception')
    expect(batch.validationIssues.some((i) => i.code === 'disputed_hours')).toBe(true)

    const lockedSeed = {
      ...batch,
      status: 'locked' as const,
      lockedAt: '2026-07-28T16:00:00.000Z',
      validationIssues: [],
    }
    const originalGross = lockedSeed.personSnapshots[0].provisional.grossPayMinor
    const adjusted = createWageAdjustment(lockedSeed, {
      id: 'adj_1',
      employeeCostReferenceId: lockedSeed.personSnapshots[0].employeeCostReferenceId,
      reason: 'OT correction',
      grossDeltaMinor: -2_250,
      createdByRole: 'payroll_manager',
      nowIso: '2026-07-28T17:00:00.000Z',
    })
    expect(adjusted.personSnapshots[0].provisional.grossPayMinor).toBe(originalGross)
    expect(adjusted.adjustments).toHaveLength(1)
    expect(adjusted.totalProvisionalGrossMinor).toBe(
      lockedSeed.totalProvisionalGrossMinor - 2_250,
    )

    const pkg = buildProviderExportPackage(adjusted)
    expect(pkg.warning).toMatch(/FPS/)
    expect(pkg.lines[0].externalPayrollId).toBe('PRV-2001')
  })

  it('splits hours across effective-dated rates mid-period', () => {
    const store = createSeedStore()
    const result = computeProvisionalGross({
      days: [
        {
          id: 'd1',
          organisationId: store.organisation.id,
          employeeCostReferenceId: 'ecr_drv1',
          payPeriodId: 'pp_2026_07',
          workDate: '2026-07-10',
          source: 'duty',
          disputed: false,
          lines: [{ category: 'basic', hoursCenti: 800 }],
        },
        {
          id: 'd2',
          organisationId: store.organisation.id,
          employeeCostReferenceId: 'ecr_drv1',
          payPeriodId: 'pp_2026_07',
          workDate: '2026-07-20',
          source: 'duty',
          disputed: false,
          lines: [{ category: 'basic', hoursCenti: 800 }],
        },
      ],
      rates: store.payRates,
      employeeCostReferenceId: 'ecr_drv1',
    })
    // 8h × £15.00 + 8h × £15.50
    expect(result.basicPayMinor).toBe(8 * 15_00 + 8 * 15_50)
    expect(result.lines.filter((l) => l.kind === 'hours')).toHaveLength(2)
  })
})

describe('financial governance', () => {
  const store = createSeedStore()

  it('keeps original budget immutable and tracks revisions separately', () => {
    const fuel = store.budget.lines.find((l) => l.id === 'bl_fuel')!
    expect(fuel.originalApprovedMinor).toBe(180_000_00)
    expect(fuel.approvedMinor).toBe(182_000_00)
    expect(store.budgetChanges[0]?.amountMinor).toBe(2_000_00)
    const programme = resolveProgrammeGovernance(
      store.budget.lines.reduce((s, l) => s + l.originalApprovedMinor, 0),
      store.budget.contingencyMinor,
      store.budgetChanges,
    )
    expect(programme.revisedApprovedMinor).toBe(
      programme.originalApprovedMinor + programme.changesMinor,
    )
  })

  it('builds quarterly category rows and blocks locked mutation', () => {
    const revised: Record<string, number> = {}
    for (const line of store.budget.lines) {
      revised[line.id] = line.approvedMinor
    }
    const rows = buildQuarterlyCategoryRows({
      organisationId: store.organisation.id,
      budget: store.budget,
      costs: store.costs,
      review: store.quarterlyReview,
      revisedApprovedByLineId: revised,
    })
    expect(rows.length).toBe(store.budget.lines.length)
    expect(rows[0]?.quarterBudgetMinor).toBe(Math.round(rows[0]!.annualBudgetMinor / 4))

    expect(() =>
      assertQuarterMutable({ ...store.quarterlyReview, status: 'locked' }),
    ).toThrow(/locked/i)
  })

  it('builds management accounts from income summary + cost ledger', () => {
    const accounts = buildManagementAccounts({
      organisationId: store.organisation.id,
      budget: store.budget,
      costs: store.costs,
      income: store.incomeSummary,
    })
    expect(accounts.incomeApproved).toBe(true)
    expect(accounts.lines.some((l) => l.id === 'operating_result')).toBe(true)
    expect(accounts.lines.find((l) => l.id === 'total_income')?.actualMinor).toBeGreaterThan(0)
  })

  it('labels available-now formula correctly', () => {
    expect(BUDGET_EQUATION_LABELS.availableNow.formula).toMatch(/Approved budget − Actual/)
    expect(BUDGET_EQUATION_LABELS.projectedFinal.formula).toMatch(/Actual costs \+ Commitments/)
  })
})

describe('CLG governance', () => {
  const store = createSeedStore()

  it('models ordinary CLG with charity decision still open', () => {
    expect(store.clgProfile.legalForm).toBe('clg')
    expect(store.clgProfile.charityStatus).toBe('pending_decision')
    const exemption = qualifiesForAuditExemption(store.clgProfile)
    expect(exemption.met.turnover).toBe(true)
    expect(exemption.met.employees).toBe(true)
    expect(exemption.qualifies).toBe(false)
    expect(exemption.stillRequiredReasons.some((r) => /funder/i.test(r))).toBe(true)
  })

  it('flags related-party suppliers and routes approval bands', () => {
    const hit = isRelatedPartySupplier(store.clgPersons, 'Hart & Partners')
    expect(hit.related).toBe(true)
    const band = resolveApprovalBand(store.approvalBands, 200_00, {
      relatedParty: true,
      unbudgeted: false,
    })
    expect(band.relatedPartyOverride).toBe(true)
    const mid = resolveApprovalBand(store.approvalBands, 2_000_00, {
      relatedParty: false,
      unbudgeted: false,
    })
    expect(mid.id).toBe('band_5k')
  })
})

describe('Sage accounting boundary', () => {
  it('builds idempotent supplier and wage journal exports without PAYE detail', () => {
    const supplier = buildSageSupplierCostExport({
      veyvioCostId: 'cost_fuel_1',
      supplierName: 'Allstar Business Solutions',
      supplierInvoiceReference: 'INV-100',
      invoiceDate: '2026-07-28',
      accountingDate: '2026-07-28',
      netMinor: 4_850_00,
      vatMinor: 970_00,
      grossMinor: 5_820_00,
      sageNominalCode: '5000',
      sageTaxCode: 'T1',
      costCentre: 'cc_ops',
      description: 'Fuel card settlement',
      approvalDate: '2026-07-28',
    })
    expect(supplier.idempotencyKey).toContain('cost_fuel_1')
    expect(supplier.payloadVersion).toBe(SAGE_EXPORT_PAYLOAD_VERSION)

    const wage = buildSageWageJournalExport({
      payrollBatchReference: 'batch_jul',
      payPeriod: '2026-07',
      grossWagesMinor: 28_760_00,
      employerNiMinor: 3_200_00,
      employerPensionMinor: 1_100_00,
      costCentre: 'cc_drv',
      accountingDate: '2026-08-01',
    })
    expect(wage.grossWagesMinor).toBe(28_760_00)
    expect(wage.idempotencyKey).toContain('batch_jul')
    // Wage journal is summarised employer cost — no tax codes / deductions fields.
    expect('employeeTaxCode' in wage).toBe(false)
  })

  it('requires Sage-confirmed bank reconciliation for fully reconciled costs', () => {
    expect(
      isFullyReconciledCost({
        approvedInVeyvio: true,
        sagePostingStatus: 'posted',
        bankReconciliationStatus: 'proposed',
      }),
    ).toBe(false)
    expect(
      isFullyReconciledCost({
        approvedInVeyvio: true,
        sagePostingStatus: 'bank_reconciled',
        bankReconciliationStatus: 'sage_confirmed',
      }),
    ).toBe(true)
    expect(sagePostingDisplayLabel('rejected')).toMatch(/correction required/i)
  })

  it('seeds Sage settings snapshot as disconnected until product choice', () => {
    const store = createSeedStore()
    expect(store.sageIntegration.connection.status).toBe('disconnected')
    expect(store.sageIntegration.connection.productId).toBe('undecided')
    expect(store.sageIntegration.unmappedCount).toBeGreaterThan(0)
    expect(store.sageIntegration.failedExports.length).toBeGreaterThan(0)
  })
})
