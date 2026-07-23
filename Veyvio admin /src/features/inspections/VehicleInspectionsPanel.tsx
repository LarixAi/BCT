import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { vehicleInspectionSummary } from '@/lib/inspections/aggregate'
import { INSPECTION_OUTCOME_LABELS, INSPECTION_TYPE_LABELS } from '@/lib/inspections/constants'
import { daysRemainingLabel } from '@/lib/inspections/due'
import { resolveInspectionsHub } from '@/lib/inspections/resolve-hub'
import { api } from '@/lib/api/client'

export function VehicleInspectionsPanel({
  vehicleId,
  registrationNumber,
}: {
  vehicleId: string
  registrationNumber: string
}) {
  const { data } = useQuery({
    queryKey: ['inspections-hub'],
    queryFn: () =>
      resolveInspectionsHub({
        fetchLiveHub: () => api.getInspectionsHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
  })

  const hub = data?.hub
  if (!hub) return null

  const summary = vehicleInspectionSummary(hub.register, vehicleId)
  const { nextPmi, lastSigned, overdueCount } = summary

  return (
    <SectionCard
      title="Formal inspections"
      description="Safety Inspection (PMI) and statutory inspections — separate from daily checks"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="text-xs text-muted">Next PMI</p>
          {nextPmi ? (
            <>
              <Link
                to={`/inspections/${nextPmi.id}`}
                className="font-medium text-command-600 hover:underline"
              >
                {daysRemainingLabel(nextPmi.dueDate)}
              </Link>
              <div className="mt-1 flex items-center gap-2">
                <StatusPill status={nextPmi.status} />
                <span className="text-xs text-muted">
                  {new Date(nextPmi.dueDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            </>
          ) : (
            <p className="text-ink-soft">No open PMI</p>
          )}
        </div>
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="text-xs text-muted">Last outcome</p>
          {lastSigned ? (
            <>
              <p className="font-medium text-ink">
                {INSPECTION_OUTCOME_LABELS[lastSigned.outcome] ?? lastSigned.outcome}
              </p>
              <p className="text-xs text-muted">
                {INSPECTION_TYPE_LABELS[lastSigned.inspectionType]} ·{' '}
                {lastSigned.signedOffAt
                  ? new Date(lastSigned.signedOffAt).toLocaleDateString('en-GB')
                  : '—'}
              </p>
            </>
          ) : (
            <p className="text-ink-soft">No signed-off inspection</p>
          )}
        </div>
        <div
          className={`rounded-lg border p-3 text-sm ${
            overdueCount > 0 ? 'border-red-200 bg-red-50' : 'border-border'
          }`}
        >
          <p className={`text-xs ${overdueCount > 0 ? 'text-red-700' : 'text-muted'}`}>Overdue</p>
          <p className={`text-xl font-bold tabular-nums ${overdueCount > 0 ? 'text-red-800' : 'text-ink'}`}>
            {overdueCount}
          </p>
          {overdueCount > 0 && (
            <Link
              to={`/inspections?filter=overdue&q=${encodeURIComponent(registrationNumber)}`}
              className="text-xs font-medium text-red-800 hover:underline"
            >
              View overdue
            </Link>
          )}
        </div>
      </div>
      <Link to="/inspections" className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
        Open inspections centre →
      </Link>
    </SectionCard>
  )
}
