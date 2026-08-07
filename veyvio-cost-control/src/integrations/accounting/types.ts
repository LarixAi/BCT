import type { CostRecord, OrganisationId } from '../../domain/types'

export type AccountingMode =
  | 'accountant_export'
  | 'sage'
  | 'other_software'
  | 'veyvio_ledger'

export type AccountingProviderSelection = {
  mode: AccountingMode
  providerName: string
  selectedAt: string
  productionPersisted: boolean
}

export type AccountantCostExportRow = {
  organisationId: OrganisationId
  costId: string
  transactionDate: string
  accountingPeriod: string
  supplierName: string
  reference: string
  description: string
  category: string
  netMinor: number
  vatMinor: number
  grossMinor: number
  currency: 'GBP'
  evidenceLabels: string[]
  sourceKey: string
}

export type AccountingExportBatch = {
  id: string
  organisationId: OrganisationId
  schemaVersion: typeof ACCOUNTING_EXPORT_SCHEMA_VERSION
  createdAt: string
  checksum: string
  rowCount: number
  controlTotalGrossMinor: number
  rows: AccountantCostExportRow[]
}

export type AccountingAdapter = {
  mode: AccountingMode
  displayName: string
  exportApprovedCosts(input: {
    organisationId: OrganisationId
    costs: CostRecord[]
    createdAt?: string
  }): AccountingExportBatch
}

export const ACCOUNTING_EXPORT_SCHEMA_VERSION = 'veyvio.accounting-cost-export.v1' as const
