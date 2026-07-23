import { Link } from 'react-router-dom'
import { StatusPill } from '@/components/ui/status'
import { CONDITION_STATUS_LABELS, RELEASE_DECISION_LABELS } from '@/lib/vehicles/constants'
import type { VehicleProfile } from '@/lib/vehicles/types'

/** Shared readiness projection — same answer Dispatch, Yard and Live Ops should use. */
export function VehicleReadinessCard({ vehicle }: { vehicle: VehicleProfile }) {
  const readiness = vehicle.readiness
  const blockingReasons = Array.isArray(readiness?.blockingReasons) ? readiness.blockingReasons : []
  const warningReasons = Array.isArray(readiness?.warningReasons) ? readiness.warningReasons : []

  if (!readiness) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4" data-testid="vehicle-readiness-card">
        <p className="text-sm text-muted">Readiness not available for this vehicle yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4" data-testid="vehicle-readiness-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Readiness</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {readiness.assignmentEligible ? 'Eligible for assignment' : 'Not eligible for assignment'}
          </p>
          <p className="text-sm text-ink-soft">{RELEASE_DECISION_LABELS[readiness.releaseDecision]}</p>
        </div>
        <StatusPill status={readiness.releaseDecision} />
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Condition</dt>
          <dd className="font-medium text-ink">{CONDITION_STATUS_LABELS[readiness.conditionStatus]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Calculated</dt>
          <dd className="font-medium text-ink">
            {new Date(readiness.calculatedAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </div>
      </dl>

      {blockingReasons.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Blocking</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-red-800">
            {blockingReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {warningReasons.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Warnings</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-800">
            {warningReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
        <Link to={`/vehicles/${vehicle.id}?tab=damage`} className="text-command-600 hover:underline">
          Yard / damage
        </Link>
        <Link to={`/defects?vehicle=${vehicle.registrationNumber}`} className="text-command-600 hover:underline">
          Defects
        </Link>
        <Link to={`/maintenance?vehicle=${vehicle.id}`} className="text-command-600 hover:underline">
          Maintenance
        </Link>
        <Link to={`/exceptions?module=vehicle`} className="text-command-600 hover:underline">
          Exceptions
        </Link>
      </div>
    </div>
  )
}
