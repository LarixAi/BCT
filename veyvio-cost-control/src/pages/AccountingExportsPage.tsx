import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  buildApprovedCostExportBatch,
  readAccountingProviderSelection,
  type AccountingExportBatch,
} from '../integrations/accounting'
import { formatDate } from '../lib/labels'

export function AccountingExportsPage() {
  const { organisation, costs } = useCostStore()
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString())
  const selection = readAccountingProviderSelection()
  const batch = useMemo(
    () =>
      buildApprovedCostExportBatch({
        organisationId: organisation.id,
        costs,
        createdAt,
      }),
    [costs, createdAt, organisation.id],
  )
  const blockedCosts = costs.filter(
    (cost) => cost.status === 'actual' && cost.reviewState !== 'approved',
  )

  return (
    <div className="page accounting-exports-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Accounting integration</p>
          <h1>Accountant Export Centre</h1>
          <p className="muted">
            Produce a versioned, reproducible cost batch without requiring a Sage subscription.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn-secondary" to="/settings/integrations">
            Accounting settings
          </Link>
          <button
            type="button"
            className="btn-primary"
            disabled={batch.rowCount === 0}
            onClick={() => downloadAccountingBatch(batch, organisation.tradingName)}
          >
            Download batch
          </button>
        </div>
      </header>

      <p className="callout info">
        Current mode: <strong>{selection.providerName}</strong>. This export is an accountant-ready
        cost subledger, not statutory accounts, a VAT return or a Company Tax Return.
      </p>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Approved actual rows</div>
          <div className="kpi-value">{batch.rowCount}</div>
          <div className="kpi-hint">Only explicitly approved actual costs</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Control total</div>
          <div className="kpi-value"><MoneyText amountMinor={batch.controlTotalGrossMinor} /></div>
          <div className="kpi-hint">Gross amount in integer pence</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Awaiting approval</div>
          <div className="kpi-value">{blockedCosts.length}</div>
          <div className="kpi-hint">Excluded from this batch</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Schema</div>
          <div className="kpi-value small-value">v1</div>
          <div className="kpi-hint">{batch.schemaVersion}</div>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Export manifest</h2>
            <p className="muted">
              The checksum is derived from the schema, organisation and sorted export rows.
            </p>
          </div>
          <StatusPill tone={batch.rowCount ? 'healthy' : 'attention'}>
            {batch.rowCount ? 'Ready to download' : 'No eligible rows'}
          </StatusPill>
        </div>
        <dl className="detail-grid">
          <dt>Batch ID</dt><dd><code>{batch.id}</code></dd>
          <dt>Organisation ID</dt><dd><code>{batch.organisationId}</code></dd>
          <dt>Created</dt><dd>{formatDate(batch.createdAt)}</dd>
          <dt>Checksum</dt><dd><code>{batch.checksum}</code></dd>
          <dt>Schema version</dt><dd><code>{batch.schemaVersion}</code></dd>
        </dl>
        <div className="row-actions">
          <button type="button" className="btn-secondary" onClick={() => setCreatedAt(new Date().toISOString())}>
            Refresh draft
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Included cost rows</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Supplier / reference</th><th>Evidence</th><th className="num">Net</th><th className="num">VAT</th><th className="num">Gross</th></tr>
            </thead>
            <tbody>
              {batch.rows.map((row) => (
                <tr key={row.costId}>
                  <td>{formatDate(row.transactionDate)}<small>{row.costId}</small></td>
                  <td><strong>{row.supplierName}</strong><small>{row.reference}</small></td>
                  <td>{row.evidenceLabels.join(', ') || 'No evidence'}</td>
                  <td className="num"><MoneyText amountMinor={row.netMinor} /></td>
                  <td className="num"><MoneyText amountMinor={row.vatMinor} /></td>
                  <td className="num"><MoneyText amountMinor={row.grossMinor} /></td>
                </tr>
              ))}
              {batch.rows.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">No explicitly approved actual costs are available. Resolve approvals before producing an accounting batch.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadAccountingBatch(batch: AccountingExportBatch, organisationName: string) {
  const headers = [
    'organisation_id',
    'cost_id',
    'transaction_date',
    'accounting_period',
    'supplier',
    'reference',
    'description',
    'category',
    'net_minor',
    'vat_minor',
    'gross_minor',
    'currency',
    'evidence_labels',
    'source_key',
  ]
  const rows = batch.rows.map((row) => [
    row.organisationId,
    row.costId,
    row.transactionDate,
    row.accountingPeriod,
    row.supplierName,
    row.reference,
    row.description,
    row.category,
    row.netMinor,
    row.vatMinor,
    row.grossMinor,
    row.currency,
    row.evidenceLabels.join(' | '),
    row.sourceKey,
  ])
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const manifest = JSON.stringify(
    {
      id: batch.id,
      organisationId: batch.organisationId,
      schemaVersion: batch.schemaVersion,
      createdAt: batch.createdAt,
      checksum: batch.checksum,
      rowCount: batch.rowCount,
      controlTotalGrossMinor: batch.controlTotalGrossMinor,
    },
    null,
    2,
  )
  downloadFile(csv, `${safeName(organisationName)}-${batch.id}.csv`, 'text/csv;charset=utf-8')
  downloadFile(manifest, `${safeName(organisationName)}-${batch.id}-manifest.json`, 'application/json')
}

function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function safeName(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '')
}
