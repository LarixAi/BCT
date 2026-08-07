import type { OrganisationId } from '../../domain/types'

/**
 * Sage accounting adapter contract — Cost Control Master Blueprint / approved Jul 2026 boundary.
 * Veyvio exports approved costs; Sage owns GL, VAT, AP and statutory records.
 * Explicit non-goals: sales invoicing, bookings, dispatch, PAYE engine, MTD VAT return.
 */

export type SageProductId =
  | 'undecided'
  | 'sage_accounting'
  | 'sage_50'
  | 'sage_payroll'
  | 'sage_50_payroll'
  | 'sage_intacct'

export type SageConnectionStatus =
  | 'disconnected'
  | 'awaiting_consent'
  | 'connected'
  | 'error'
  | 'revoked'

export type SagePostingStatus =
  | 'not_sent'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'posted'
  | 'paid'
  | 'bank_reconciled'
  | 'reversed'

export type SageConnection = {
  id: string
  organisationId: OrganisationId
  productId: SageProductId
  status: SageConnectionStatus
  /** Sage business / organisation display name — not credentials. */
  sageOrganisationName: string | null
  sageBusinessId: string | null
  connectedAt: string | null
  lastSuccessfulSyncAt: string | null
  lastFailedSyncAt: string | null
  lastFailureReason: string | null
  accountingYearLabel: string | null
  openPeriodsLabel: string | null
  /** Permissions mirror the authenticated Sage user’s roles. */
  permissions: {
    readJournals: boolean
    writeJournals: boolean
    readSuppliers: boolean
    writePurchaseInvoices: boolean
  }
  secretStorage: 'none' | 'demo_memory' | 'server_vault'
}

export type SageCodeMapping = {
  id: string
  organisationId: OrganisationId
  kind: 'nominal' | 'vat' | 'cost_centre' | 'supplier' | 'payroll_journal'
  veyvioKey: string
  sageCode: string
  sageLabel: string
  mapped: boolean
}

export type SageExportException = {
  id: string
  organisationId: OrganisationId
  veyvioCostId: string
  idempotencyKey: string
  failureReason: string
  failedAt: string
  retryCount: number
  payloadVersion: string
}

/** Approved supplier cost → Sage purchase / journal payload (outbound). */
export type SageSupplierCostExport = {
  veyvioCostId: string
  supplierName: string
  supplierInvoiceReference: string
  invoiceDate: string
  accountingDate: string
  netMinor: number
  vatMinor: number
  grossMinor: number
  sageNominalCode: string | null
  sageTaxCode: string | null
  costCentre: string | null
  department: string | null
  vehicleOrProgramme: string | null
  description: string
  evidenceUrl: string | null
  approvalDate: string | null
  idempotencyKey: string
  payloadVersion: string
}

/** Summarised approved payroll journal — not employee PAYE detail. */
export type SageWageJournalExport = {
  payrollBatchReference: string
  payPeriod: string
  grossWagesMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  otherEmployerCostsMinor: number
  costCentre: string | null
  department: string | null
  accountingDate: string
  idempotencyKey: string
  payloadVersion: string
}

/** Confirmation returned from Sage (inbound). */
export type SagePostingResult = {
  veyvioCostId: string
  sageTransactionId: string
  postingDate: string
  accountingPeriod: string
  nominalCode: string
  taxCode: string
  postedNetMinor: number
  postedVatMinor: number
  postedGrossMinor: number
  postingStatus: SagePostingStatus
  paymentStatus: 'unpaid' | 'part_paid' | 'paid' | 'unknown'
  creditNoteOrReversalRef: string | null
  bankReconciliationStatus: 'unreconciled' | 'proposed' | 'sage_confirmed'
  lastSageUpdateAt: string
}

export type SageIntegrationSnapshot = {
  connection: SageConnection
  mappings: SageCodeMapping[]
  unmappedCount: number
  failedExports: SageExportException[]
  recentPostings: SagePostingResult[]
}

export const SAGE_EXPORT_PAYLOAD_VERSION = 'cost-control.sage-export.v1' as const

export function emptySageConnection(organisationId: OrganisationId): SageConnection {
  return {
    id: 'sage_conn_none',
    organisationId,
    productId: 'undecided',
    status: 'disconnected',
    sageOrganisationName: null,
    sageBusinessId: null,
    connectedAt: null,
    lastSuccessfulSyncAt: null,
    lastFailedSyncAt: null,
    lastFailureReason: null,
    accountingYearLabel: null,
    openPeriodsLabel: null,
    permissions: {
      readJournals: false,
      writeJournals: false,
      readSuppliers: false,
      writePurchaseInvoices: false,
    },
    secretStorage: 'none',
  }
}

export function buildSageSupplierCostExport(input: {
  veyvioCostId: string
  supplierName: string
  supplierInvoiceReference: string
  invoiceDate: string
  accountingDate: string
  netMinor: number
  vatMinor: number
  grossMinor: number
  sageNominalCode?: string | null
  sageTaxCode?: string | null
  costCentre?: string | null
  department?: string | null
  vehicleOrProgramme?: string | null
  description: string
  evidenceUrl?: string | null
  approvalDate?: string | null
}): SageSupplierCostExport {
  const idempotencyKey = `veyvio|cost|${input.veyvioCostId}|${SAGE_EXPORT_PAYLOAD_VERSION}`
  return {
    veyvioCostId: input.veyvioCostId,
    supplierName: input.supplierName,
    supplierInvoiceReference: input.supplierInvoiceReference,
    invoiceDate: input.invoiceDate,
    accountingDate: input.accountingDate,
    netMinor: input.netMinor,
    vatMinor: input.vatMinor,
    grossMinor: input.grossMinor,
    sageNominalCode: input.sageNominalCode ?? null,
    sageTaxCode: input.sageTaxCode ?? null,
    costCentre: input.costCentre ?? null,
    department: input.department ?? null,
    vehicleOrProgramme: input.vehicleOrProgramme ?? null,
    description: input.description,
    evidenceUrl: input.evidenceUrl ?? null,
    approvalDate: input.approvalDate ?? null,
    idempotencyKey,
    payloadVersion: SAGE_EXPORT_PAYLOAD_VERSION,
  }
}

export function buildSageWageJournalExport(input: {
  payrollBatchReference: string
  payPeriod: string
  grossWagesMinor: number
  employerNiMinor: number
  employerPensionMinor: number
  otherEmployerCostsMinor?: number
  costCentre?: string | null
  department?: string | null
  accountingDate: string
}): SageWageJournalExport {
  const idempotencyKey = `veyvio|wage|${input.payrollBatchReference}|${input.payPeriod}|${SAGE_EXPORT_PAYLOAD_VERSION}`
  return {
    payrollBatchReference: input.payrollBatchReference,
    payPeriod: input.payPeriod,
    grossWagesMinor: input.grossWagesMinor,
    employerNiMinor: input.employerNiMinor,
    employerPensionMinor: input.employerPensionMinor,
    otherEmployerCostsMinor: input.otherEmployerCostsMinor ?? 0,
    costCentre: input.costCentre ?? null,
    department: input.department ?? null,
    accountingDate: input.accountingDate,
    idempotencyKey,
    payloadVersion: SAGE_EXPORT_PAYLOAD_VERSION,
  }
}

export function sagePostingDisplayLabel(status: SagePostingStatus): string {
  switch (status) {
    case 'not_sent':
      return 'Not sent to Sage'
    case 'sent':
      return 'Sent to Sage'
    case 'accepted':
      return 'Accepted by Sage'
    case 'rejected':
      return 'Rejected — correction required'
    case 'posted':
      return 'Posted'
    case 'paid':
      return 'Paid'
    case 'bank_reconciled':
      return 'Bank reconciled (Sage confirmed)'
    case 'reversed':
      return 'Reversed or credited'
  }
}

export function isFullyReconciledCost(input: {
  approvedInVeyvio: boolean
  sagePostingStatus: SagePostingStatus | null
  bankReconciliationStatus: SagePostingResult['bankReconciliationStatus'] | null
}): boolean {
  return (
    input.approvedInVeyvio &&
    (input.sagePostingStatus === 'posted' ||
      input.sagePostingStatus === 'paid' ||
      input.sagePostingStatus === 'bank_reconciled') &&
    input.bankReconciliationStatus === 'sage_confirmed'
  )
}
