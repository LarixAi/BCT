import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import type { PlatformPlanRow } from '@/lib/api/types'
import { BillingPlaceholder } from './BillingPlaceholder'
import { PlatformShell } from './PlatformShell'

export function PlatformPlansPage() {
  const [plans, setPlans] = useState<PlatformPlanRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .listPlatformPlans()
      .then(setPlans)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load plans'))
  }, [])

  return (
    <PlatformShell
      title="Plans"
      description="Subscription catalogue and the modules each plan unlocks. Pricing checkout is deferred."
    >
      <div className="mb-4">
        <BillingPlaceholder />
      </div>
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.code} className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
            <p className="mt-1 font-mono text-xs text-muted">{plan.code}</p>
            <p className="mt-3 text-sm text-ink-soft">{plan.description || 'No description'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.modules.map((moduleKey) => (
                <span
                  key={moduleKey}
                  className="rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-ink-soft"
                >
                  {moduleKey}
                </span>
              ))}
              {!plan.modules.length ? (
                <span className="text-xs text-muted">No modules configured</span>
              ) : null}
            </div>
          </article>
        ))}
        {!plans.length && !error ? <p className="text-sm text-muted">No active plans found.</p> : null}
      </div>
    </PlatformShell>
  )
}
