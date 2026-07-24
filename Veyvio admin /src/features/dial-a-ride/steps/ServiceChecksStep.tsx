import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { DialARideRequest } from '@/lib/dial-a-ride/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function ServiceChecksStep({
  request,
  onChange,
}: {
  request: DialARideRequest
  onChange: (patch: Partial<DialARideRequest>) => void
}) {
  const { data: outcome, isFetching, refetch } = useQuery({
    queryKey: tKey(['dial-a-ride-checks', request.id, request.memberId, request.travelDate, request.pickupAddress]),
    queryFn: () => api.runDialARideServiceChecks(request),
    enabled: !!request.memberId,
  })

  useEffect(() => {
    if (!outcome) return
    if (
      request.serviceCheckResult === outcome.result &&
      request.serviceCheckMessages.join('|') === outcome.messages.join('|')
    ) {
      return
    }
    onChange({
      serviceCheckResult: outcome.result,
      serviceCheckMessages: outcome.messages,
    })
  }, [outcome, request.serviceCheckResult, request.serviceCheckMessages, onChange])

  return (
    <SectionCard title="Service checks" description="Step 5 — eligibility, zone, capacity and booking rules">
      {!request.memberId ? (
        <p className="text-sm text-ink-soft">Select a member on step 1 to run service checks.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            {isFetching ? 'Checking…' : 'Re-run checks'}
          </button>
          {outcome && (
            <div
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                outcome.blocking
                  ? 'bg-red-50 text-red-900'
                  : outcome.result === 'requires_approval'
                    ? 'bg-amber-50 text-amber-900'
                    : outcome.result === 'eligible_with_warning'
                      ? 'bg-amber-50 text-amber-900'
                      : 'bg-emerald-50 text-emerald-900'
              }`}
            >
              <p className="font-semibold capitalize">{outcome.result.replace(/_/g, ' ')}</p>
              <ul className="mt-2 list-inside list-disc">
                {outcome.messages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}
