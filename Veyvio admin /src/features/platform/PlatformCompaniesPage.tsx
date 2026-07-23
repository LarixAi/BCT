import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api/client'
import type { PlatformCompanyRow } from '@/lib/api/types'
import { BillingPlaceholder } from './BillingPlaceholder'
import { PlatformShell } from './PlatformShell'

export function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState<PlatformCompanyRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    void api
      .listPlatformCompanies()
      .then(setCompanies)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load companies'))
  }, [])

  const filtered = companies.filter((company) => {
    const haystack = `${company.tradingName ?? ''} ${company.legalName ?? ''} ${company.id}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <PlatformShell
      title="Customers"
      description="Licence status, plans, and support access across every Veyvio organisation."
    >
      <div className="mb-4">
        <BillingPlaceholder />
      </div>
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company name or id"
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted">{filtered.length} companies</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Tenant status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Period / trial</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((company) => (
              <tr key={company.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{company.tradingName ?? company.legalName}</div>
                  <div className="text-xs text-muted">{company.id}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{company.tenantStatus ?? '—'}</div>
                  <div className="text-xs text-muted">{company.subscriptionStatus ?? '—'}</div>
                </td>
                <td className="px-4 py-3">{company.planCode ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {company.currentPeriodEnd
                    ? `Period end ${new Date(company.currentPeriodEnd).toLocaleDateString()}`
                    : company.trialEndsAt
                      ? `Trial end ${new Date(company.trialEndsAt).toLocaleDateString()}`
                      : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/platform/companies/${company.id}`}
                    className="rounded-md bg-command-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-command-800"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={5}>
                  No companies match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PlatformShell>
  )
}
