import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { JourneySequencePanel } from '@/features/journey-sequence/JourneySequencePanel'
import { AssignmentHistoryPanel } from '@/features/transfers/AssignmentHistoryPanel'
import { TransferNotificationPanel } from '@/features/transfers/TransferNotificationPanel'
import { ManageAssignmentDrawer } from '@/features/transfers/ManageAssignmentDrawer'
import { api } from '@/lib/api/client'
import { VEYVIO_TERMS } from '@/lib/terminology'
import { cn } from '@/lib/cn'

const TABS = [
  'Overview',
  'Journey sequence',
  'Passengers',
  'Driver & vehicle',
  'Communications',
  'Change history',
] as const

export function OperationalTripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')?.toLowerCase()
  const initialTab =
    tabParam === 'journey' || tabParam === 'journey-sequence'
      ? 'Journey sequence'
      : tabParam === 'passengers'
        ? 'Passengers'
        : tabParam === 'driver'
          ? 'Driver & vehicle'
          : tabParam === 'communications'
            ? 'Communications'
            : tabParam === 'history'
              ? 'Change history'
              : 'Overview'
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab)
  const [showTransfer, setShowTransfer] = useState(false)

  const { data: trip, isLoading, error, isError } = useQuery({
    queryKey: ['operational-trip', id],
    queryFn: () => api.getOperationalTrip(id!),
    enabled: !!id,
  })

  const setTabAndUrl = (next: (typeof TABS)[number]) => {
    setTab(next)
    const key =
      next === 'Journey sequence'
        ? 'journey'
        : next === 'Passengers'
          ? 'passengers'
          : next === 'Driver & vehicle'
            ? 'driver'
            : next === 'Communications'
              ? 'communications'
              : next === 'Change history'
                ? 'history'
                : null
    if (key) setSearchParams({ tab: key }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading trip…</p>
  if (isError || !trip) {
    return (
      <p className="text-sm text-red-800">
        {error instanceof Error ? error.message : 'Trip not found'}
      </p>
    )
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
          {trip.routeName ?? VEYVIO_TERMS.trip.term}
          {trip.runReference ? ` · Run ${trip.runReference}` : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Info label="Driver" value={trip.driverName ?? 'Unassigned'} />
        <Info label="Vehicle" value={trip.vehicleRegistration ?? 'Unassigned'} />
        <Info label="Jobs" value={`${trip.completedJobCount}/${trip.totalJobCount}`} />
        <Info label="Delay" value={`${trip.delayMinutes} min`} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTabAndUrl(label)}
            className={cn(
              'shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium',
              tab === label
                ? 'border border-b-0 border-slate-200 bg-white text-command-700'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Open <strong>Journey sequence</strong> to reorder pickups, review linked return legs, and
            save with notifications. What you can change depends on trip status.
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
              <DetailRow
                label="Accepted"
                value={trip.acceptedAt ? new Date(trip.acceptedAt).toLocaleString('en-GB') : '—'}
              />
              <DetailRow label="Acknowledged" value={trip.acknowledgedAt ? 'Yes' : 'Pending'} />
              <DetailRow label="Driver online" value={trip.driverOnline ? 'Yes' : 'No'} />
              <DetailRow
                label="Last app sync"
                value={
                  trip.lastAppSync ? new Date(trip.lastAppSync).toLocaleTimeString('en-GB') : '—'
                }
              />
            </dl>
          </SectionCard>
          <button
            type="button"
            onClick={() => setTabAndUrl('Journey sequence')}
            className="rounded-lg border border-command-200 bg-command-50 px-4 py-2 text-sm font-medium text-command-800 hover:bg-command-100"
          >
            Open journey sequence / reorganise run →
          </button>
        </div>
      )}

      {tab === 'Journey sequence' && <JourneySequencePanel tripId={trip.id} />}

      {tab === 'Passengers' && (
        <SectionCard title="Passengers / jobs" description="Each job is one passenger journey leg">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Passenger</th>
                <th className="pb-2 pr-3 font-medium">Pickup</th>
                <th className="pb-2 pr-3 font-medium">Drop-off</th>
                <th className="pb-2 pr-3 font-medium">Planned</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {[...trip.jobs]
                .sort((a, b) => a.sequence - b.sequence)
                .map((job) => (
                  <tr key={job.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 tabular-nums text-slate-500">{job.sequence}</td>
                    <td className="py-2.5 pr-3 font-medium">{job.passengerName}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{job.pickupAddress}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{job.dropoffAddress}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">
                      {job.plannedPickupTime}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={job.status} />
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
      )}

      {tab === 'Driver & vehicle' && (
        <SectionCard
          title="Driver & vehicle"
          action={
            <button
              type="button"
              onClick={() => setShowTransfer(true)}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
            >
              Change assignment
            </button>
          }
        >
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow label="Driver" value={trip.driverName ?? 'Unassigned'} />
            <DetailRow label="Vehicle" value={trip.vehicleRegistration ?? 'Unassigned'} />
            <DetailRow label="Depot" value={trip.depotName ?? '—'} />
            <DetailRow label="Assignment" value={trip.assignmentStatus} />
          </dl>
        </SectionCard>
      )}

      {tab === 'Communications' && <TransferNotificationPanel tripId={trip.id} />}

      {tab === 'Change history' && <AssignmentHistoryPanel tripId={trip.id} />}

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
