import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { createSeedStore, type CostControlStore } from '../data/seed'
import { CostStoreContext } from '../data/CostStoreContext'
import {
  createLiveOrganisationWorkspace,
  isDemoOrganisationId,
} from '../data/live-workspace'
import {
  readFinanceRepositoryConfig,
  resolveCostControlRepository,
} from '../repositories/cost-control-repository'
import { importCostCsv } from '../domain/csv-import'
import {
  importPayrollSummaryCsv,
  type PayrollSummaryImportResult,
} from '../domain/payroll-summary-import'
import { applyReviewDecision, type ReviewDecision } from '../domain/review-actions'
import { buildFinancialSnapshot } from '../domain/snapshot'
import { assertSameOrganisation, filterByOrganisation } from '../domain/tenancy'
import {
  createOpenBankingAdapter,
  emptyBankConnection,
  getBankIntegrationConfig,
  resolveBankAdapter,
} from '../integrations/bank'
import type { ReviewItem } from '../domain/types'
import {
  advanceWageBatch,
  createWageAdjustment,
} from '../domain/wage-period-workflow'

/** Browser-local cost writes are demo-only. API mode must use durable finance commands. */
function assertBrowserMutationAllowed(action: string) {
  const config = readFinanceRepositoryConfig()
  if (config.mode === 'api') {
    throw new Error(
      `Cost Control cannot apply "${action}" in the browser when VITE_FINANCE_DATA_MODE=api. Durable finance command APIs are required.`,
    )
  }
}

type StoreApi = CostControlStore & {
  workspaceStatus: 'idle' | 'loading' | 'ready' | 'error'
  workspaceError: string | null
  refreshSnapshot: () => void
  importCsv: (fileName: string, text: string) => {
    accepted: number
    quarantined: number
    duplicatesSkipped: number
  }
  importPayrollSummary: (
    fileName: string,
    text: string,
  ) => {
    matched: number
    unmatched: number
    variance: number
    quarantined: number
    exceptions: number
  }
  resolveReview: (reviewId: string, state: ReviewItem['state']) => void
  resolveReviewDecision: (reviewId: string, decision: ReviewDecision) => void
  advanceWageBatchStatus: (batchId: string) => void
  clearDriverDayDispute: (driverDayId: string) => void
  addWageAdjustment: (input: {
    batchId: string
    employeeCostReferenceId: string
    reason: string
    grossDeltaMinor: number
  }) => void
  refreshBankFeed: (accountId?: string) => Promise<void>
  startBankConnect: (institutionHint?: string) => Promise<{ consentUrl: string }>
  completeBankConnect: (input: {
    state: string
    authorizationCode?: string
    sandbox?: boolean
  }) => Promise<void>
  disconnectBank: () => Promise<void>
  sourceKeys: Set<string>
  lastPayrollSummaryImport: PayrollSummaryImportResult | null
}

function withSeedDefaults(store: CostControlStore): CostControlStore {
  // Never mix Demo CEC seed slices into a live Command company workspace.
  if (!isDemoOrganisationId(store.organisation.id)) return store
  const seed = createSeedStore()
  return {
    ...store,
    payPeriods: store.payPeriods?.length ? store.payPeriods : seed.payPeriods,
    orgNodes: store.orgNodes?.length ? store.orgNodes : seed.orgNodes,
    employeeCostReferences: store.employeeCostReferences?.length
      ? store.employeeCostReferences
      : seed.employeeCostReferences,
    bankAccounts: store.bankAccounts?.length ? store.bankAccounts : seed.bankAccounts,
    bankTransactions: store.bankTransactions?.length
      ? store.bankTransactions
      : seed.bankTransactions,
    bankConnection: store.bankConnection ?? seed.bankConnection,
    bankRestrictedMinor: store.bankRestrictedMinor ?? seed.bankRestrictedMinor,
    sageIntegration: store.sageIntegration ?? seed.sageIntegration,
    pendingBankConsentState:
      store.pendingBankConsentState !== undefined
        ? store.pendingBankConsentState
        : seed.pendingBankConsentState,
    auditEvents: store.auditEvents ?? seed.auditEvents,
    budgetChanges: store.budgetChanges?.length ? store.budgetChanges : seed.budgetChanges,
    quarterlyReview: store.quarterlyReview ?? seed.quarterlyReview,
    incomeSummary: store.incomeSummary !== undefined ? store.incomeSummary : seed.incomeSummary,
    driverDays: store.driverDays?.length ? store.driverDays : seed.driverDays,
    payRates: store.payRates?.length ? store.payRates : seed.payRates,
    wageBatches: store.wageBatches?.length ? store.wageBatches : seed.wageBatches,
    clgProfile: store.clgProfile ?? seed.clgProfile,
    clgPersons: store.clgPersons?.length ? store.clgPersons : seed.clgPersons,
    approvalBands: store.approvalBands?.length ? store.approvalBands : seed.approvalBands,
    fundingAwards: store.fundingAwards?.length ? store.fundingAwards : seed.fundingAwards,
  }
}

export function CostStoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [store, setStore] = useState<CostControlStore>(() => createSeedStore())
  const [workspaceStatus, setWorkspaceStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [lastPayrollSummaryImport, setLastPayrollSummaryImport] =
    useState<PayrollSummaryImportResult | null>(null)

  // Bind workspace to the signed-in company — never show Demo CEC as Fleet LTD.
  useEffect(() => {
    const membership = auth.activeMembership
    const identity = auth.identity
    if (!membership) return

    if (isDemoOrganisationId(membership.organisationId)) {
      setStore(createSeedStore())
      setWorkspaceStatus('ready')
      setWorkspaceError(null)
      return
    }

    const financeConfig = readFinanceRepositoryConfig()
    const empty = createLiveOrganisationWorkspace({
      organisationId: membership.organisationId,
      organisationName: membership.organisationName,
    })

    if (financeConfig.mode !== 'api' || !financeConfig.apiBaseUrl || !identity?.accessToken) {
      setStore(empty)
      setWorkspaceStatus('ready')
      setWorkspaceError(
        financeConfig.mode === 'api' && !financeConfig.apiBaseUrl
          ? 'VITE_FINANCE_API_URL is not configured'
          : null,
      )
      return
    }

    let cancelled = false
    setWorkspaceStatus('loading')
    setWorkspaceError(null)
    setStore(empty)

    void resolveCostControlRepository(financeConfig)
      .loadWorkspace({
        accessToken: identity.accessToken,
        userSubject: identity.userSubject,
        activeOrganisationId: membership.organisationId,
      })
      .then((workspace) => {
        if (cancelled) return
        setStore(withSeedDefaults(workspace))
        setWorkspaceStatus('ready')
        setWorkspaceError(null)
      })
      .catch((reason) => {
        if (cancelled) return
        setStore(empty)
        setWorkspaceStatus('error')
        setWorkspaceError(
          reason instanceof Error ? reason.message : 'Finance workspace could not be loaded',
        )
      })

    return () => {
      cancelled = true
    }
  }, [
    auth.activeMembership?.organisationId,
    auth.activeMembership?.organisationName,
    auth.identity?.accessToken,
    auth.identity?.userSubject,
  ])

  // After HMR, older in-memory state may lack Phase 1/2 seed fields — backfill demo only.
  useEffect(() => {
    setStore((prev) => {
      const next = withSeedDefaults(prev)
      if (
        next.orgNodes === prev.orgNodes &&
        next.employeeCostReferences === prev.employeeCostReferences &&
        next.payPeriods === prev.payPeriods &&
        next.bankAccounts === prev.bankAccounts &&
        next.bankTransactions === prev.bankTransactions
      ) {
        return prev
      }
      return next
    })
  }, [])

  const refreshSnapshot = useCallback(() => {
    setStore((prev) => {
      try {
        const snap = buildFinancialSnapshot({
          organisationId: prev.organisation.id,
          budget: prev.budget,
          costs: prev.costs,
        })
        return {
          ...prev,
          lastSnapshot: snap,
          lastValidSnapshot: snap,
        }
      } catch {
        // Last valid state protection — Blueprint §3 / §8.6
        return prev
      }
    })
  }, [])

  const importCsv = useCallback((fileName: string, text: string) => {
    assertBrowserMutationAllowed('importCsv')
    let summary = { accepted: 0, quarantined: 0, duplicatesSkipped: 0 }
    setStore((prev) => {
      const existing = new Set(prev.costs.map((c) => c.sourceKey))
      const result = importCostCsv({
        organisationId: prev.organisation.id,
        text,
        budgetId: prev.budget.id,
        existingSourceKeys: existing,
      })
      summary = {
        accepted: result.accepted.length,
        quarantined: result.quarantined.length,
        duplicatesSkipped: result.duplicatesSkipped,
      }

      const nextCosts = [...prev.costs, ...result.accepted]
      const nextReviews = [...prev.reviews]
      for (const cost of result.accepted) {
        if (cost.reviewState === 'open') {
          nextReviews.push({
            id: crypto.randomUUID(),
            organisationId: prev.organisation.id,
            costId: cost.id,
            signal: cost.evidence.length ? 'allocation_issue' : 'missing_evidence',
            title: cost.evidence.length
              ? 'Imported cost needs review'
              : 'Imported cost missing evidence',
            detail: `${cost.supplierName} · ${cost.reference}`,
            state: 'open',
            createdAt: new Date().toISOString(),
          })
        }
      }

      let lastSnapshot = prev.lastSnapshot
      let lastValidSnapshot = prev.lastValidSnapshot
      try {
        const snap = buildFinancialSnapshot({
          organisationId: prev.organisation.id,
          budget: prev.budget,
          costs: nextCosts,
        })
        lastSnapshot = snap
        lastValidSnapshot = snap
      } catch {
        // keep last valid
      }

      const run = {
        id: crypto.randomUUID(),
        organisationId: prev.organisation.id,
        fileName,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        rowsRead: result.rowsRead,
        accepted: result.accepted.length,
        quarantined: result.quarantined.length,
        duplicatesSkipped: result.duplicatesSkipped,
      }

      return {
        ...prev,
        costs: nextCosts,
        quarantine: [...result.quarantined, ...prev.quarantine],
        reviews: nextReviews,
        imports: [run, ...prev.imports],
        lastSnapshot,
        lastValidSnapshot,
      }
    })
    return summary
  }, [])

  const importPayrollSummary = useCallback((fileName: string, text: string) => {
    assertBrowserMutationAllowed('importPayrollSummary')
    let result!: PayrollSummaryImportResult
    setStore((prev) => {
      const wageCost =
        prev.costs.find((c) => c.category === 'wages' && c.status === 'actual') ??
        prev.costs.find((c) => c.category === 'wages')
      const wageCostId = wageCost?.id ?? 'cost_wages_jul'
      result = importPayrollSummaryCsv({
        organisationId: prev.organisation.id,
        text,
        stage: 'pre_payroll',
        employees: prev.employeeCostReferences ?? [],
        wageCostId,
      })

      const nextReviews: ReviewItem[] = [
        ...result.reviews.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        })),
        ...prev.reviews,
      ]

      const payPeriods = (prev.payPeriods ?? []).map((period, index) => {
        if (index !== 0) return period
        return {
          ...period,
          status: 'review' as const,
          prePayroll: result.rolledUp ?? period.prePayroll,
          lastImportAt: new Date().toISOString(),
          exceptions: result.exceptions.length ? result.exceptions : period.exceptions,
          employeeCount: Math.max(period.employeeCount, result.totals.matchedCount),
          formulaVersion: result.rolledUp?.formulaVersion ?? period.formulaVersion,
        }
      })

      const run = {
        id: crypto.randomUUID(),
        organisationId: prev.organisation.id,
        fileName: `[payroll-summary] ${fileName}`,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        rowsRead: result.rowsRead,
        accepted: result.totals.matchedCount,
        quarantined: result.quarantined.length + result.totals.unmatchedCount,
        duplicatesSkipped: 0,
      }

      return {
        ...prev,
        payPeriods,
        reviews: nextReviews,
        quarantine: [...result.quarantined, ...prev.quarantine],
        imports: [run, ...prev.imports],
      }
    })
    setLastPayrollSummaryImport(result)

    return {
      matched: result.totals.matchedCount,
      unmatched: result.totals.unmatchedCount,
      variance: result.totals.varianceCount,
      quarantined: result.quarantined.length,
      exceptions: result.exceptions.length,
    }
  }, [])

  const resolveReviewDecision = useCallback((reviewId: string, decision: ReviewDecision) => {
    assertBrowserMutationAllowed('resolveReviewDecision')
    let failure: Error | null = null
    setStore((prev) => {
      try {
        const orgId = prev.organisation.id
        const review = filterByOrganisation(prev.reviews, orgId).find((r) => r.id === reviewId)
        if (!review) throw new Error('Review not found in this organisation')
        const cost = prev.costs.find((c) => c.id === review.costId)
        if (!cost) throw new Error('Cost not found for review')
        assertSameOrganisation(orgId, cost.organisationId, 'cost')

        const result = applyReviewDecision({
          organisationId: orgId,
          review,
          cost,
          decision,
        })

        const nextCosts = prev.costs.map((c) => (c.id === result.cost.id ? result.cost : c))
        let lastSnapshot = prev.lastSnapshot
        let lastValidSnapshot = prev.lastValidSnapshot
        try {
          const snap = buildFinancialSnapshot({
            organisationId: orgId,
            budget: prev.budget,
            costs: nextCosts,
          })
          lastSnapshot = snap
          lastValidSnapshot = snap
        } catch {
          // keep last valid
        }

        return {
          ...prev,
          costs: nextCosts,
          reviews: prev.reviews.map((r) => (r.id === result.review.id ? result.review : r)),
          auditEvents: [result.audit, ...(prev.auditEvents ?? [])],
          lastSnapshot,
          lastValidSnapshot,
        }
      } catch (err) {
        failure = err instanceof Error ? err : new Error('Review decision failed')
        return prev
      }
    })
    if (failure) throw failure
  }, [])

  const resolveReview = useCallback((reviewId: string, state: ReviewItem['state']) => {
    const map: Record<Exclude<ReviewItem['state'], 'open'>, ReviewDecision> = {
      approved: { type: 'approve' },
      rejected: { type: 'reject', reason: 'Rejected from queue' },
      snoozed: { type: 'snooze' },
    }
    if (state === 'open') return
    resolveReviewDecision(reviewId, map[state])
  }, [resolveReviewDecision])

  const clearDriverDayDispute = useCallback((driverDayId: string) => {
    assertBrowserMutationAllowed('clearDriverDayDispute')
    setStore((prev) => {
      const driverDays = (prev.driverDays ?? []).map((d) =>
        d.id === driverDayId ? { ...d, disputed: false, notes: undefined } : d,
      )
      // Rebuild primary batch validation by clearing disputed flag on the day only;
      // batch issues list is refreshed on next advance attempt via re-seed of issues.
      const wageBatches = (prev.wageBatches ?? []).map((batch) => {
        if (!batch.driverDayIds.includes(driverDayId)) return batch
        const remaining = batch.validationIssues.filter(
          (i) => !(i.code === 'disputed_hours' && i.driverDayId === driverDayId),
        )
        const stillCritical = remaining.some((i) => i.severity === 'critical')
        return {
          ...batch,
          validationIssues: remaining,
          status: stillCritical
            ? batch.status
            : batch.status === 'exception'
              ? 'draft'
              : batch.status,
        }
      })
      return { ...prev, driverDays, wageBatches }
    })
  }, [])

  const advanceWageBatchStatus = useCallback((batchId: string) => {
    assertBrowserMutationAllowed('advanceWageBatchStatus')
    let failure: Error | null = null
    setStore((prev) => {
      try {
        const wageBatches = (prev.wageBatches ?? []).map((batch) => {
          if (batch.id !== batchId) return batch
          return advanceWageBatch(batch, { nowIso: new Date().toISOString() })
        })
        return { ...prev, wageBatches }
      } catch (err) {
        failure = err instanceof Error ? err : new Error('Could not advance wage batch')
        return prev
      }
    })
    if (failure) throw failure
  }, [])

  const addWageAdjustment = useCallback(
    (input: {
      batchId: string
      employeeCostReferenceId: string
      reason: string
      grossDeltaMinor: number
    }) => {
      assertBrowserMutationAllowed('addWageAdjustment')
      let failure: Error | null = null
      setStore((prev) => {
        try {
          const wageBatches = (prev.wageBatches ?? []).map((batch) => {
            if (batch.id !== input.batchId) return batch
            return createWageAdjustment(batch, {
              id: crypto.randomUUID(),
              employeeCostReferenceId: input.employeeCostReferenceId,
              reason: input.reason,
              grossDeltaMinor: input.grossDeltaMinor,
              createdByRole: 'payroll_manager',
              nowIso: new Date().toISOString(),
            })
          })
          return { ...prev, wageBatches }
        } catch (err) {
          failure = err instanceof Error ? err : new Error('Adjustment failed')
          return prev
        }
      })
      if (failure) throw failure
    },
    [],
  )

  const startBankConnect = useCallback(async (institutionHint?: string) => {
    const config = {
      ...getBankIntegrationConfig(),
      accessToken: auth.identity?.accessToken ?? null,
    }
    const adapter = createOpenBankingAdapter(
      config,
      config.providerId === 'demo' ? 'truelayer_sandbox' : config.providerId,
    )
    const orgId = store.organisation.id
    const started = await adapter.startConsent({
      organisationId: orgId,
      institutionHint: institutionHint ?? 'NatWest Business',
      redirectUri: config.redirectUri,
    })
    try {
      sessionStorage.setItem(
        'veyvio_cc_bank_consent',
        JSON.stringify({
          state: started.state,
          connection: started.connection,
        }),
      )
    } catch {
      /* ignore */
    }
    setStore((prev) => ({
      ...prev,
      bankConnection: started.connection,
      pendingBankConsentState: started.state,
    }))
    return { consentUrl: started.consentUrl }
  }, [store.organisation.id, auth.identity?.accessToken])

  const completeBankConnect = useCallback(
    async (input: { state: string; authorizationCode?: string; sandbox?: boolean }) => {
      let connection = store.bankConnection ?? emptyBankConnection(store.organisation.id)
      let pendingState = store.pendingBankConsentState
      try {
        const raw = sessionStorage.getItem('veyvio_cc_bank_consent')
        if (raw) {
          const parsed = JSON.parse(raw) as {
            state: string
            connection: typeof connection
          }
          if (parsed.state) pendingState = parsed.state
          if (parsed.connection) connection = parsed.connection
        }
      } catch {
        /* ignore */
      }

      if (pendingState && input.state !== pendingState) {
        throw new Error('Bank consent state mismatch — restart Connect from Settings')
      }
      const config = {
        ...getBankIntegrationConfig(),
        accessToken: auth.identity?.accessToken ?? null,
      }
      const adapter = createOpenBankingAdapter(
        config,
        connection.providerId === 'demo' ? 'truelayer_sandbox' : connection.providerId,
      )
      const completed = await adapter.completeConsent({
        organisationId: store.organisation.id,
        connection,
        callbackState: input.state,
        authorizationCode: input.authorizationCode,
      })
      if (completed.status !== 'connected') {
        setStore((s) => ({ ...s, bankConnection: completed, pendingBankConsentState: null }))
        throw new Error(completed.lastError ?? 'Bank consent failed')
      }
      const synced = await adapter.sync({
        organisationId: store.organisation.id,
        connection: completed,
        existingAccounts: store.bankAccounts ?? [],
      })
      try {
        sessionStorage.removeItem('veyvio_cc_bank_consent')
      } catch {
        /* ignore */
      }
      setStore((s) => ({
        ...s,
        bankConnection: completed,
        pendingBankConsentState: null,
        bankAccounts: synced.accounts,
        bankTransactions: synced.transactions,
      }))
    },
    [store, auth.identity?.accessToken],
  )

  const disconnectBank = useCallback(async () => {
    const prev = store
    const connection = prev.bankConnection
    if (!connection) return
    const config = {
      ...getBankIntegrationConfig(),
      accessToken: auth.identity?.accessToken ?? null,
    }
    const adapter = resolveBankAdapter(connection, config)
    const revoked = await adapter.disconnect({
      organisationId: prev.organisation.id,
      connection,
    })
    setStore((s) => ({
      ...s,
      bankConnection: {
        ...emptyBankConnection(s.organisation.id),
        status: 'disconnected',
        lastError: revoked.lastError,
      },
      pendingBankConsentState: null,
      bankAccounts: isDemoOrganisationId(s.organisation.id)
        ? createSeedStore().bankAccounts
        : [],
      bankTransactions: isDemoOrganisationId(s.organisation.id)
        ? createSeedStore().bankTransactions
        : [],
    }))
  }, [store, auth.identity?.accessToken])

  const refreshBankFeed = useCallback(async (_accountId?: string) => {
    const prev = store
    const connection = prev.bankConnection ?? emptyBankConnection(prev.organisation.id)
    const config = {
      ...getBankIntegrationConfig(),
      accessToken: auth.identity?.accessToken ?? null,
    }
    const adapter = resolveBankAdapter(connection, config)
    if (connection.status !== 'connected') {
      const demo = resolveBankAdapter(emptyBankConnection(prev.organisation.id), config)
      const synced = await demo.sync({
        organisationId: prev.organisation.id,
        connection: emptyBankConnection(prev.organisation.id),
        existingAccounts: prev.bankAccounts ?? [],
      })
      setStore((s) => ({
        ...s,
        bankAccounts: synced.accounts.length ? synced.accounts : s.bankAccounts,
      }))
      return
    }
    const synced = await adapter.sync({
      organisationId: prev.organisation.id,
      connection,
      existingAccounts: prev.bankAccounts ?? [],
    })
    setStore((s) => ({
      ...s,
      bankAccounts: synced.accounts,
      bankTransactions: synced.transactions.length ? synced.transactions : s.bankTransactions,
    }))
  }, [store, auth.identity?.accessToken])

  const value = useMemo<StoreApi>(() => {
    const safe = withSeedDefaults(store)
    return {
      ...safe,
      workspaceStatus,
      workspaceError,
      refreshSnapshot,
      importCsv,
      importPayrollSummary,
      resolveReview,
      resolveReviewDecision,
      advanceWageBatchStatus,
      clearDriverDayDispute,
      addWageAdjustment,
      refreshBankFeed,
      startBankConnect,
      completeBankConnect,
      disconnectBank,
      sourceKeys: new Set(safe.costs.map((c) => c.sourceKey)),
      lastPayrollSummaryImport,
    }
  }, [
    store,
    workspaceStatus,
    workspaceError,
    refreshSnapshot,
    importCsv,
    importPayrollSummary,
    resolveReview,
    resolveReviewDecision,
    advanceWageBatchStatus,
    clearDriverDayDispute,
    addWageAdjustment,
    refreshBankFeed,
    startBankConnect,
    completeBankConnect,
    disconnectBank,
    lastPayrollSummaryImport,
  ])

  return <CostStoreContext.Provider value={value}>{children}</CostStoreContext.Provider>
}

export function useCostStore(): StoreApi {
  const ctx = useContext(CostStoreContext)
  if (!ctx) throw new Error('useCostStore requires CostStoreProvider')
  return ctx
}
