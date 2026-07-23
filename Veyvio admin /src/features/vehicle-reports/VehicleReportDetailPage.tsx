import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import type { ReviewVehicleReportInput } from '@/lib/vehicle-reports/types'

const ACTIONS: Array<{ action: ReviewVehicleReportInput['action']; label: string }> = [
  { action: 'accept', label: 'Accept report' },
  { action: 'request_info', label: 'Request more information' },
  { action: 'apply_vor', label: 'Apply VOR' },
  { action: 'restrict', label: 'Permit restricted use' },
  { action: 'create_work_order', label: 'Create work order' },
  { action: 'escalate', label: 'Escalate severity' },
  { action: 'mark_duplicate', label: 'Mark duplicate' },
  { action: 'close_no_fault', label: 'Close — no fault found' },
]

export function VehicleReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['vehicle-report', id],
    queryFn: () => api.getVehicleReport(id!),
    enabled: !!id,
  })

  const review = useMutation({
    mutationFn: (input: ReviewVehicleReportInput) => api.reviewVehicleReport(id!, input, actorName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicle-report', id] })
      void queryClient.invalidateQueries({ queryKey: ['vehicle-reports-hub'] })
      void queryClient.invalidateQueries({ queryKey: ['vehicle-profile', report?.vehicleId] })
    },
  })

  if (isLoading) return <p className="text-sm text-muted">Loading report…</p>
  if (error || !report) {
    return (
      <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Report not found'}</p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/vehicle-reports" className="text-sm font-medium text-command-700 hover:underline">
          ← Vehicle Reports
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{report.reference}</p>
            <h1 className="text-2xl font-semibold text-ink">{report.title}</h1>
            <p className="text-sm text-ink-soft">
              <Link to={`/vehicles/${report.vehicleId}`} className="font-medium text-command-700 hover:underline">
                {report.registrationNumber}
              </Link>
              {report.fleetNumber ? ` · ${report.fleetNumber}` : ''} · {report.depotName ?? 'Depot'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={report.severity === 'critical' ? 'vor' : 'warning'} />
            <StatusPill status={report.vehicleOperationalStatus} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <SectionCard title="Report information">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Type</dt>
                <dd className="capitalize">{report.reportType.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Stage</dt>
                <dd className="capitalize">{report.stage.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Reported by</dt>
                <dd>
                  {report.reportedBy}
                  <span className="block text-xs text-muted">{report.reportedByRole}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Reported at</dt>
                <dd>{new Date(report.reportedAt).toLocaleString('en-GB')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Vehicle area</dt>
                <dd>{report.vehicleArea ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Mileage</dt>
                <dd className="tabular-nums">
                  {report.mileage != null ? `${report.mileage.toLocaleString('en-GB')} mi` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Safe to move</dt>
                <dd>{report.safeToMove == null ? '—' : report.safeToMove ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Passengers onboard</dt>
                <dd>{report.passengersOnboard ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-ink-soft">{report.description}</p>
          </SectionCard>

          <SectionCard title="Evidence" description={`${report.evidence.length} items`}>
            {report.evidence.length === 0 ? (
              <p className="text-sm text-muted">No evidence attached.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.evidence.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                    {item.label}
                    <span className="block text-xs text-muted">
                      {item.kind} · {new Date(item.capturedAt).toLocaleString('en-GB')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Timeline">
            <ul className="space-y-3 text-sm">
              {report.timeline.map((event) => (
                <li key={event.id} className="border-b border-border pb-3 last:border-0">
                  <p className="font-medium capitalize">{event.action}</p>
                  <p className="text-ink-soft">{event.detail ?? '—'}</p>
                  <p className="text-xs text-muted">
                    {event.actorName} · {new Date(event.occurredAt).toLocaleString('en-GB')}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Immediate decision" description={report.nextAction}>
            <div className="flex flex-col gap-2">
              {ACTIONS.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  disabled={review.isPending || report.status === 'closed' || report.status === 'duplicate'}
                  onClick={() =>
                    review.mutate({
                      action: item.action,
                      notes: `${item.label} by ${actorName}`,
                      workOrderTitle: `WO — ${report.title}`,
                      restrictionType: 'restricted_use',
                    })
                  }
                  className="rounded-lg border border-border px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
            {review.isError && (
              <p className="mt-2 text-sm text-red-800">
                {review.error instanceof Error ? review.error.message : 'Could not update report'}
              </p>
            )}
          </SectionCard>

          <SectionCard title="Linked records">
            <ul className="space-y-2 text-sm">
              <li>
                Vehicle:{' '}
                <Link to={`/vehicles/${report.vehicleId}`} className="text-command-700 hover:underline">
                  {report.registrationNumber}
                </Link>
              </li>
              <li>Defect: {report.linkedDefectId ? <Link to={`/defects/${report.linkedDefectId}`} className="text-command-700 hover:underline">{report.linkedDefectId}</Link> : '—'}</li>
              <li>Work order: {report.linkedWorkOrderId ?? '—'}</li>
              <li>VOR episode: {report.linkedVorId ?? '—'}</li>
              <li>Incident: {report.linkedIncidentId ?? '—'}</li>
              <li>Vehicle check: {report.linkedCheckId ?? '—'}</li>
            </ul>
          </SectionCard>

          <SectionCard title="Resolution">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Root cause</dt>
                <dd>{report.rootCause ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Resolution</dt>
                <dd>{report.resolution ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Cost</dt>
                <dd className="tabular-nums">
                  {report.totalCost != null ? `£${report.totalCost.toLocaleString('en-GB')}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Downtime</dt>
                <dd className="tabular-nums">
                  {report.downtimeHours != null ? `${report.downtimeHours} h` : '—'}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
