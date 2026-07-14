import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { VEYVIO_TERMS } from '@/lib/terminology'
import { AssignmentHistoryPanel } from '@/features/transfers/AssignmentHistoryPanel'
import { TransferNotificationPanel } from '@/features/transfers/TransferNotificationPanel'
import { ManageAssignmentDrawer } from '@/features/transfers/ManageAssignmentDrawer'
import { api } from '@/lib/api/client'

export function OperationalTripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [showTransfer, setShowTransfer] = useState(false)

  const { data: trip, isLoading, error, isError } = useQuery({
    queryKey: ['operational-trip', id],
    queryFn: () => api.getOperationalTrip(id!),
    enabled: !!id,
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading trip…</p>
  if (isError || !trip) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Trip not found'}</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={trip.dutyId ? `/runs/${trip.dutyId}` : '/dispatch'}
          className="text-sm font-medium text-command-600 hover:underline"
        >
          ← Back to {trip.runReference ? `run ${trip.runReference}` : 'dispatch'}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{trip.reference}</h1>
          <StatusPill status={trip.status} />
        </div>
        <p className="text-sm text-slate-600">
          {VEYVIO_TERMS.trip.term} — {trip.routeName ?? 'Operational work package'}
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <strong>{VEYVIO_TERMS.trip.term}</strong> = {VEYVIO_TERMS.trip.definition} A{' '}
        <strong>{VEYVIO_TERMS.run.term}</strong> ({trip.runReference ?? '—'}) is a sequence of trips on a duty.
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Info label="Driver" value={trip.driverName ?? 'Unassigned'} />
        <Info label="Vehicle" value={trip.vehicleRegistration ?? 'Unassigned'} />
        <Info label="Jobs" value={`${trip.completedJobCount}/${trip.totalJobCount}`} />
        <Info label="Delay" value={`${trip.delayMinutes} min`} />
      </div>

      <SectionCard
        title="Current assignment"
        action={
          <button
            type="button"
            onClick={() => setShowTransfer(true)}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
          >
            Manage assignment
          </button>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow label="Depot" value={trip.depotName ?? '—'} />
          <DetailRow label="Dispatcher" value={trip.dispatcherName ?? '—'} />
          <DetailRow label="Assignment status" value={trip.assignmentStatus} />
          <DetailRow label="Manifest version" value={`v${trip.manifestVersion}`} />
          <DetailRow label="Accepted" value={trip.acceptedAt ? new Date(trip.acceptedAt).toLocaleString('en-GB') : '—'} />
          <DetailRow label="Acknowledged" value={trip.acknowledgedAt ? 'Yes' : 'Pending'} />
          <DetailRow label="Driver online" value={trip.driverOnline ? 'Yes' : 'No'} />
          <DetailRow label="Last app sync" value={trip.lastAppSync ? new Date(trip.lastAppSync).toLocaleTimeString('en-GB') : '—'} />
        </dl>
      </SectionCard>

      <SectionCard title="Trip jobs" description="Each job is one passenger operational work unit">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Passenger</th>
              <th className="pb-2 pr-3 font-medium">Pickup</th>
              <th className="pb-2 pr-3 font-medium">Drop-off</th>
              <th className="pb-2 pr-3 font-medium">Planned</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {trip.jobs.map((job) => (
              <tr key={job.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 pr-3 font-medium">{job.passengerName}</td>
                <td className="py-2.5 pr-3 text-slate-600">{job.pickupAddress}</td>
                <td className="py-2.5 pr-3 text-slate-600">{job.dropoffAddress}</td>
                <td className="py-2.5 pr-3 tabular-nums text-slate-600">{job.plannedPickupTime}</td>
                <td className="py-2.5 pr-3">
                  <StatusPill status={job.status} />
                  {job.transferIndicator && (
                    <span className="ml-1 text-xs text-command-600">transferred</span>
                  )}
                </td>
                <td className="py-2.5 text-xs text-slate-500">
                  {job.wheelchairRequired && 'WC '}
                  {job.escortRequired && 'Escort '}
                  {job.safeguardingFlag && 'Safeguarding'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <AssignmentHistoryPanel tripId={trip.id} />

      <TransferNotificationPanel tripId={trip.id} />

      {showTransfer && (
        <ManageAssignmentDrawer tripId={trip.id} onClose={() => setShowTransfer(false)} />
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold capitalize text-slate-900">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium capitalize text-slate-900">{value}</dd>
    </div>
  )
}
