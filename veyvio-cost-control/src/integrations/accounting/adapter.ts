import type { CostRecord, OrganisationId } from '../../domain/types'
import {
  ACCOUNTING_EXPORT_SCHEMA_VERSION,
  type AccountingAdapter,
  type AccountingExportBatch,
  type AccountingProviderSelection,
} from './types'

const SELECTION_KEY = 'veyvio-accounting-provider-selection-v1'

export function createAccountantExportAdapter(): AccountingAdapter {
  return {
    mode: 'accountant_export',
    displayName: 'Accountant export',
    exportApprovedCosts: buildApprovedCostExportBatch,
  }
}

export function buildApprovedCostExportBatch(input: {
  organisationId: OrganisationId
  costs: CostRecord[]
  createdAt?: string
}): AccountingExportBatch {
  const rows = input.costs
    .filter(
      (cost) =>
        cost.organisationId === input.organisationId &&
        cost.status === 'actual' &&
        cost.reviewState === 'approved',
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((cost) => ({
      organisationId: input.organisationId,
      costId: cost.id,
      transactionDate: cost.transactionDate,
      accountingPeriod: cost.accountingPeriod,
      supplierName: cost.supplierName,
      reference: cost.reference,
      description: cost.description,
      category: cost.category,
      netMinor: cost.net.amountMinor,
      vatMinor: cost.vat.amountMinor,
      grossMinor: cost.gross.amountMinor,
      currency: cost.gross.currency,
      evidenceLabels: cost.evidence.map((evidence) => evidence.label).sort(),
      sourceKey: cost.sourceKey,
    }))
  const controlTotalGrossMinor = rows.reduce((sum, row) => sum + row.grossMinor, 0)
  const checksum = deterministicChecksum(
    JSON.stringify({
      schemaVersion: ACCOUNTING_EXPORT_SCHEMA_VERSION,
      organisationId: input.organisationId,
      rows,
    }),
  )
  return {
    id: `acct_export_${checksum}`,
    organisationId: input.organisationId,
    schemaVersion: ACCOUNTING_EXPORT_SCHEMA_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    checksum,
    rowCount: rows.length,
    controlTotalGrossMinor,
    rows,
  }
}

export function defaultAccountingProviderSelection(): AccountingProviderSelection {
  return {
    mode: 'accountant_export',
    providerName: 'Accountant export',
    selectedAt: new Date(0).toISOString(),
    productionPersisted: false,
  }
}

export function readAccountingProviderSelection(): AccountingProviderSelection {
  try {
    const raw = localStorage.getItem(SELECTION_KEY)
    if (!raw) return defaultAccountingProviderSelection()
    const parsed = JSON.parse(raw) as AccountingProviderSelection
    if (
      !['accountant_export', 'sage', 'other_software', 'veyvio_ledger'].includes(parsed.mode)
    ) {
      return defaultAccountingProviderSelection()
    }
    return parsed
  } catch {
    return defaultAccountingProviderSelection()
  }
}

export function writeAccountingProviderSelection(
  selection: AccountingProviderSelection,
): void {
  localStorage.setItem(SELECTION_KEY, JSON.stringify(selection))
}

function deterministicChecksum(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
