import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import { SAMPLE_PAYROLL_SUMMARY_CSV } from '../domain/payroll-summary-import'
import { formatDate } from '../lib/labels'

const SAMPLE = `date,supplier,description,reference,category,status,net,vat,gross,vehicle,evidence,source_key
2026-07-22,Shell,Fuel top-up BX62 BCT,SH-9912,fuel,actual,120.00,24.00,144.00,BX62BCT,receipt-9912.pdf,shell|SH-9912
2026-07-22,Bad Row,Missing category,,,actual,10.00,2.00,12.00,,,bad|1
2026-07-21,Allstar Fuel,Exact duplicate of seed,FC-2026-0721,fuel,actual,4850.00,970.00,5820.00,BX62BCT,dup.pdf,allstar|FC-2026-0721
`

export function ImportsPage() {
  const { importCsv, importPayrollSummary, imports, quarantine, lastPayrollSummaryImport } =
    useCostStore()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | null) {
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      const text = await file.text()
      const summary = await importCsv(file.name, text)
      setMessage(
        `Imported ${file.name}: ${summary.accepted} accepted, ${summary.quarantined} quarantined, ${summary.duplicatesSkipped} duplicates skipped.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function onPayrollFile(file: File | null) {
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      const text = await file.text()
      const summary = importPayrollSummary(file.name, text)
      setMessage(
        `Payroll summary ${file.name}: ${summary.matched} matched, ${summary.unmatched} unmatched, ${summary.variance} variance, ${summary.exceptions} exceptions, ${summary.quarantined} quarantined.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payroll summary import failed')
    }
  }

  async function loadSample() {
    try {
      setError(null)
      const summary = await importCsv('sample-costs.csv', SAMPLE)
      setMessage(
        `Sample import: ${summary.accepted} accepted, ${summary.quarantined} quarantined, ${summary.duplicatesSkipped} duplicates skipped.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  function loadPayrollSample() {
    const summary = importPayrollSummary('sample-payroll-summary.csv', SAMPLE_PAYROLL_SUMMARY_CSV)
    setMessage(
      `Sample payroll summary: ${summary.matched} matched, ${summary.unmatched} unmatched, ${summary.variance} variance → open Reviews / Wage costs.`,
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Imports</h1>
          <p className="muted">
            Raw rows are validated before the canonical ledger. Failed rows quarantine; last valid
            snapshot is preserved. Payroll summaries reconcile to wage-cost members — not PAYE
            processing.
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>CSV cost upload</h2>
        <p className="muted small">
          Required columns: date, supplier, description, category, net. Optional: vat, gross, status,
          vehicle, evidence, source_key, reference, period, cost_centre, subcategory (e.g. insurance,
          lease, tax, mot, fuel_card).
        </p>
        <div className="row-actions">
          <label className="btn file-btn">
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="btn-secondary" onClick={loadSample}>
            Run sample import
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Payroll provider summary</h2>
        <p className="muted small">
          Blueprint §11 — import approved / permitted employer wage-cost lines. Match on{' '}
          <code>external_payroll_id</code>. Columns: external_payroll_id, basic_pay; optional overtime,
          employer_ni, employer_pension, hours_completed, cost_centre, display_name, source_key.
        </p>
        <div className="row-actions">
          <label className="btn file-btn">
            Choose payroll CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => void onPayrollFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="btn-secondary" onClick={loadPayrollSample}>
            Run sample payroll summary
          </button>
          <Link to="/wages" className="btn-ghost">
            Open wage costs
          </Link>
          <Link to="/reviews" className="btn-ghost">
            Open reviews
          </Link>
        </div>
        {lastPayrollSummaryImport ? (
          <div className="import-payroll-summary">
            <div className="kpi-grid dense">
              <div className="kpi">
                <div className="kpi-label">Matched</div>
                <div className="kpi-value">{lastPayrollSummaryImport.totals.matchedCount}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Unmatched</div>
                <div className="kpi-value tone-critical">
                  {lastPayrollSummaryImport.totals.unmatchedCount}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Imported employer cost</div>
                <div className="kpi-value">
                  <MoneyText
                    amountMinor={lastPayrollSummaryImport.totals.importedEmployerCostMinor}
                  />
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Vs register</div>
                <div className="kpi-value">
                  <MoneyText amountMinor={lastPayrollSummaryImport.totals.varianceMinor} />
                </div>
              </div>
            </div>
            {lastPayrollSummaryImport.exceptions.slice(0, 4).map((ex) => (
              <p key={ex.id} className={`callout ${ex.severity === 'critical' ? 'critical' : 'attention'}`}>
                <strong>{ex.title}</strong> — {ex.detail}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      {message ? <p className="callout healthy">{message}</p> : null}
      {error ? <p className="callout critical">{error}</p> : null}

      <div className="split">
        <section className="panel">
          <h2>Recent runs</h2>
          <ul className="stack-list">
            {imports.map((run) => (
              <li key={run.id}>
                <strong>{run.fileName}</strong> · {formatDate(run.finishedAt)} · accepted {run.accepted} ·
                quarantine {run.quarantined} · dup {run.duplicatesSkipped}
              </li>
            ))}
            {!imports.length ? <li className="muted">No imports yet.</li> : null}
          </ul>
        </section>
        <section className="panel">
          <h2>Quarantine</h2>
          <ul className="stack-list">
            {quarantine.map((q) => (
              <li key={q.id}>
                <StatusPill tone="attention">Quarantined</StatusPill> {q.reason}
                <div className="muted small">
                  <code>{q.sourceKey}</code>
                </div>
              </li>
            ))}
            {!quarantine.length ? <li className="muted">Quarantine empty.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  )
}
