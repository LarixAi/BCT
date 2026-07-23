import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api/client'
import type { PlatformSubscriptionRow } from '@/lib/api/types'
import { PlatformShell } from './PlatformShell'

export function PlatformSubscriptionsPage() {
  const [rows, setRows] = useState<PlatformSubscriptionRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .listPlatformSubscriptions()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load subscriptions'))
  }, [])

  return (
    <PlatformShell
      title="Subscriptions"
      description="Commercial licence status across tenants. Tenant status is derived from subscription."
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Period end</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.companyId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    to={`/platform/companies/${row.companyId}`}
                    className="font-medium text-command-700 hover:underline"
                  >
                    {row.tradingName ?? row.legalName ?? row.companyId}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.planCode}</td>
                <td className="px-4 py-3">{row.subscriptionStatus}</td>
                <td className="px-4 py-3">{row.tenantStatus ?? '—'}</td>
                <td className="px-4 py-3 text-muted">
                  {row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
            {!rows.length && !error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No subscriptions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PlatformShell>
  )
}
