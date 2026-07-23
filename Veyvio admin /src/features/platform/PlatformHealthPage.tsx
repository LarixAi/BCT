import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import type { PlatformHealth } from '@/lib/api/types'
import { BillingPlaceholder } from './BillingPlaceholder'
import { PlatformShell } from './PlatformShell'

export function PlatformHealthPage() {
  const [health, setHealth] = useState<PlatformHealth | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .getPlatformHealth()
      .then(setHealth)
      .catch((err) => setError(err instanceof Error ? err.message : 'Health check failed'))
  }, [])

  return (
    <PlatformShell title="Platform health" description="Control-plane connectivity and licence counts.">
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      {health ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-surface p-5">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd className="mt-1 font-semibold uppercase tracking-wide">{health.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Database</dt>
                <dd className="mt-1 font-medium">{health.database}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Billing mode</dt>
                <dd className="mt-1 font-medium">{health.billingMode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Checked</dt>
                <dd className="mt-1 font-medium">
                  {health.checkedAt ? new Date(health.checkedAt).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Counts</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Customers</dt>
                <dd className="text-2xl font-semibold">{health.counts.companies}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Active subscriptions</dt>
                <dd className="text-2xl font-semibold">{health.counts.activeSubscriptions}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Feature flags</dt>
                <dd className="text-2xl font-semibold">{health.counts.featureFlags}</dd>
              </div>
            </dl>
          </section>

          <BillingPlaceholder />
        </div>
      ) : !error ? (
        <p className="text-sm text-muted">Checking…</p>
      ) : null}
    </PlatformShell>
  )
}
