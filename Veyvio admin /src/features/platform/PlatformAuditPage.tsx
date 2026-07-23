import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'
import type { PlatformAuditRow } from '@/lib/api/types'
import { PlatformShell } from './PlatformShell'

export function PlatformAuditPage() {
  const [rows, setRows] = useState<PlatformAuditRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')

  useEffect(() => {
    void api
      .listPlatformAudit()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load audit log'))
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (actionFilter && !row.action.toLowerCase().includes(actionFilter.toLowerCase())) return false
      if (
        companyFilter &&
        !(row.target_company_id ?? '').toLowerCase().includes(companyFilter.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [rows, actionFilter, companyFilter])

  return (
    <PlatformShell title="Platform audit" description="Recent Veyvio staff actions across tenants.">
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <input
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="Filter by action"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          value={companyFilter}
          onChange={(event) => setCompanyFilter(event.target.value)}
          placeholder="Filter by company id"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((row) => (
          <article key={row.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-ink">{row.action}</strong>
              <span className="text-xs text-muted">{new Date(row.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Actor {row.actor_user_id}
              {row.target_company_id ? ` · Company ${row.target_company_id}` : ''}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-command-700">Detail</summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-surface-muted p-2 text-xs text-ink-soft">
                {JSON.stringify(row.detail ?? {}, null, 2)}
              </pre>
            </details>
          </article>
        ))}
        {!filtered.length && !error ? (
          <p className="text-sm text-muted">No platform audit events match these filters.</p>
        ) : null}
      </div>
    </PlatformShell>
  )
}
