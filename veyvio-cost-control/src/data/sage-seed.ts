import type { OrganisationId } from '../domain/types'
import {
  emptySageConnection,
  type SageCodeMapping,
  type SageConnection,
  type SageExportException,
  type SageIntegrationSnapshot,
  type SagePostingResult,
} from '../integrations/sage/types'

/** Demo Sage connection — disconnected until CLG confirms product + OAuth. */
export function createDemoSageIntegration(organisationId: OrganisationId): SageIntegrationSnapshot {
  const connection: SageConnection = {
    ...emptySageConnection(organisationId),
    id: 'sage_conn_demo',
    productId: 'undecided',
    status: 'disconnected',
    sageOrganisationName: null,
    lastFailureReason: null,
    accountingYearLabel: '2026/27 (pending connect)',
    openPeriodsLabel: 'Confirm with accountant after connect',
  }

  const mappings: SageCodeMapping[] = [
    {
      id: 'map_nom_fuel',
      organisationId,
      kind: 'nominal',
      veyvioKey: 'fuel',
      sageCode: '5000',
      sageLabel: 'Motor expenses — fuel',
      mapped: true,
    },
    {
      id: 'map_nom_wages',
      organisationId,
      kind: 'nominal',
      veyvioKey: 'wages',
      sageCode: '7000',
      sageLabel: 'Wages and salaries',
      mapped: true,
    },
    {
      id: 'map_vat_std',
      organisationId,
      kind: 'vat',
      veyvioKey: 'standard',
      sageCode: 'T1',
      sageLabel: 'Standard rate',
      mapped: true,
    },
    {
      id: 'map_cc_ops',
      organisationId,
      kind: 'cost_centre',
      veyvioKey: 'cc_ops',
      sageCode: 'OPS',
      sageLabel: 'Operations',
      mapped: true,
    },
    {
      id: 'map_sup_allstar',
      organisationId,
      kind: 'supplier',
      veyvioKey: 'Allstar Business Solutions',
      sageCode: '',
      sageLabel: '',
      mapped: false,
    },
    {
      id: 'map_pay_journal',
      organisationId,
      kind: 'payroll_journal',
      veyvioKey: 'employer_wage_cost',
      sageCode: '',
      sageLabel: '',
      mapped: false,
    },
  ]

  const failedExports: SageExportException[] = [
    {
      id: 'sage_ex_1',
      organisationId,
      veyvioCostId: 'cost_ops_unknown_card',
      idempotencyKey: 'veyvio|cost|cost_ops_unknown_card|cost-control.sage-export.v1',
      failureReason: 'Supplier not mapped to a Sage supplier account',
      failedAt: '2026-07-28T10:15:00.000Z',
      retryCount: 1,
      payloadVersion: 'cost-control.sage-export.v1',
    },
  ]

  const recentPostings: SagePostingResult[] = [
    {
      veyvioCostId: 'cost_fuel_1',
      sageTransactionId: 'SAGE-PI-88421',
      postingDate: '2026-07-28',
      accountingPeriod: '2026-07',
      nominalCode: '5000',
      taxCode: 'T1',
      postedNetMinor: 4_850_00,
      postedVatMinor: 970_00,
      postedGrossMinor: 5_820_00,
      postingStatus: 'posted',
      paymentStatus: 'paid',
      creditNoteOrReversalRef: null,
      bankReconciliationStatus: 'proposed',
      lastSageUpdateAt: '2026-07-28T11:40:00.000Z',
    },
  ]

  return {
    connection,
    mappings,
    unmappedCount: mappings.filter((m) => !m.mapped).length,
    failedExports,
    recentPostings,
  }
}
