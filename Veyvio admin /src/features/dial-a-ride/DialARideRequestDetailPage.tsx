import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { buildJobsFromDialARideRequest } from '@/lib/dial-a-ride/job-generation'
import { canConfirmWithoutOverride } from '@/lib/dial-a-ride/eligibility'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DialARideRequestDetailPage() {
  const { requestId = '' } = useParams()
  const queryClient = useQueryClient()
  const [overrideReason, setOverrideReason] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [actionError, setActionError] = useState('')

  const { data: request, isLoading } = useQuery({
    queryKey: tKey(['dial-a-ride-request', requestId]),
    queryFn: () => api.getDialARideRequest(requestId),
    enabled: !!requestId,
  })

  const { data: member } = useQuery({
    queryKey: tKey(['dial-a-ride-member', request?.memberId]),
    queryFn: () => api.getDialARideMember(request!.memberId),
    enabled: !!request?.memberId,
  })

  const { data: serviceChecks } = useQuery({
    queryKey: tKey(['dial-a-ride-checks', requestId, request?.memberId, request?.travelDate, request?.pickupAddress]),
    queryFn: () => api.runDialARideServiceChecks(request!),
    enabled: !!request?.memberId,
  })

  useEffect(() => {
    if (request?.overrideReason) setOverrideReason(request.overrideReason)
  }, [request?.overrideReason])

  const accept = useMutation({
    mutationFn: () =>
      api.acceptDialARideRequest(requestId, {
        overrideReason: overrideReason.trim() || undefined,
      }),
    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: tKey(['dial-a-ride-request', requestId]) })
      queryClient.invalidateQueries({ queryKey: tKey(['dial-a-ride-requests']) })
      queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
    },
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : 'Could not accept request'),
  })

  const decline = useMutation({
    mutationFn: () =>
      api.declineDialARideRequest(
        requestId,
        declineReason.trim() || 'Unable to accommodate on requested date',
      ),
    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: tKey(['dial-a-ride-request', requestId]) })
      queryClient.invalidateQueries({ queryKey: tKey(['dial-a-ride-requests']) })
    },
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : 'Could not decline request'),
  })

  if (isLoading || !request) {
    return <p className="p-6 text-sm text-muted">Loading request…</p>
  }

  const jobPreview = member ? buildJobsFromDialARideRequest(request, member) : []
  const checks = serviceChecks ?? (request.serviceCheckResult
    ? {
        result: request.serviceCheckResult,
        messages: request.serviceCheckMessages,
        blocking: request.serviceCheckResult === 'cannot_accept',
      }
    : null)
  const needsOverride = checks
    ? checks.blocking || !canConfirmWithoutOverride(checks)
    : false
  const canAccept = !needsOverride || overrideReason.trim().length > 0
  const pendingDecision = request.status !== 'accepted' && request.status !== 'declined'

  return (
    <div className="space-y-4">
      <div>
        <Link to="/dial-a-ride" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to Dial-a-Ride
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{request.reference}</h1>
          <StatusPill status={request.status} />
        </div>
        <p className="text-sm text-ink-soft">{request.memberName} · {request.travelDate}</p>
      </div>

      <SectionCard title="Journey">
        <p className="text-sm">{request.pickupAddress} → {request.destinationAddress}</p>
        <p className="mt-1 text-sm text-ink-soft">
          Window {request.pickupWindowStart}–{request.pickupWindowEnd}
          {request.returnRequired ? ` · Return ${request.returnTime}` : ''}
        </p>
      </SectionCard>

      {checks && (
        <SectionCard title="Service checks">
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              checks.blocking
                ? 'bg-red-50 text-red-900'
                : checks.result === 'requires_approval'
                  ? 'bg-amber-50 text-amber-900'
                  : checks.result === 'eligible_with_warning'
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-emerald-50 text-emerald-900'
            }`}
          >
            <p className="font-semibold capitalize">{checks.result.replace(/_/g, ' ')}</p>
            {checks.messages.length > 0 && (
              <ul className="mt-2 list-inside list-disc">
                {checks.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      )}

      {jobPreview.length > 0 && (
        <SectionCard title="Jobs">
          <ul className="space-y-2 text-sm">
            {jobPreview.map((j) => (
              <li key={j.leg} className="rounded-lg border border-border px-3 py-2">
                <span className="font-medium capitalize">{j.leg}</span> — {j.pickupAddress} → {j.dropoffAddress}
              </li>
            ))}
          </ul>
          {request.jobIds.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              {request.jobIds.length} job(s) created — view in{' '}
              <Link to="/jobs" className="font-medium text-command-600 hover:underline">Jobs</Link>
            </p>
          )}
        </SectionCard>
      )}

      {request.declineReason && (
        <SectionCard title="Decline reason">
          <p className="text-sm text-ink-soft">{request.declineReason}</p>
        </SectionCard>
      )}

      {pendingDecision && needsOverride && (
        <SectionCard title="Authorised override">
          <label className="block text-sm">
            <span className="text-ink-soft">Override reason (required to accept)</span>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
        </SectionCard>
      )}

      {pendingDecision && (
        <SectionCard title="Decision">
          {actionError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{actionError}</p>
          )}
          <label className="mb-3 block text-sm">
            <span className="text-ink-soft">Decline reason (optional)</span>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={2}
              placeholder="Unable to accommodate on requested date"
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActionError('')
                accept.mutate()
              }}
              disabled={accept.isPending || !canAccept}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              {accept.isPending ? 'Accepting…' : 'Accept and create jobs'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError('')
                decline.mutate()
              }}
              disabled={decline.isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {decline.isPending ? 'Declining…' : 'Decline request'}
            </button>
          </div>
          {needsOverride && !canAccept && (
            <p className="mt-2 text-sm text-amber-800">
              Enter an authorised override reason before accepting this request.
            </p>
          )}
        </SectionCard>
      )}
    </div>
  )
}
