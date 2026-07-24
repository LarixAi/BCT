import { SectionCard } from '@/components/ui'
import { buildJobsFromDialARideRequest } from '@/lib/dial-a-ride/job-generation'
import type { DialARideMember, DialARideRequest } from '@/lib/dial-a-ride/types'

export function DarReviewStep({
  request,
  member,
  onChange,
}: {
  request: DialARideRequest
  member?: DialARideMember
  onChange: (patch: Partial<DialARideRequest>) => void
}) {
  const jobs = member ? buildJobsFromDialARideRequest(request, member) : []

  return (
    <div className="space-y-4">
      <SectionCard title="Jobs to create on acceptance">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted">Select a member to preview jobs.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.leg} className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
                <p className="font-semibold capitalize">{job.leg} job</p>
                <p>{job.passengerName}</p>
                <p className="text-ink-soft">{job.pickupAddress} → {job.dropoffAddress}</p>
                <p className="text-ink-soft">Pickup {job.plannedPickupTime}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Request summary">
        <dl className="space-y-2 text-sm">
          <Row label="Member" value={`${request.memberName} (${request.memberNumber})`} />
          <Row label="Date" value={request.travelDate} />
          <Row label="Window" value={`${request.pickupWindowStart}–${request.pickupWindowEnd}`} />
          <Row label="Journey" value={`${request.pickupAddress} → ${request.destinationAddress}`} />
          <Row label="Service check" value={request.serviceCheckResult?.replace(/_/g, ' ') ?? 'Not run'} />
        </dl>
      </SectionCard>

      {(request.serviceCheckResult === 'requires_approval' || request.serviceCheckResult === 'cannot_accept') && (
        <SectionCard title="Authorised override">
          <label className="block text-sm">
            <span className="text-ink-soft">Override reason (required to accept)</span>
            <textarea
              value={request.overrideReason ?? ''}
              onChange={(e) => onChange({ overrideReason: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
        </SectionCard>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
