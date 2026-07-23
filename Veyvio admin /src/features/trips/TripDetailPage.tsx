import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { RouteStopRecord } from '@/lib/api/types'

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const runId = searchParams.get('run')

  const { data: track, isLoading } = useQuery({
    queryKey: ['duty-track', runId],
    queryFn: () => api.getDutyTrack(runId!),
    enabled: !!runId,
  })

  const stop: RouteStopRecord | undefined = track?.duty.route?.stops?.find((s) => s.id === id)
  const checkpoint = track?.checkpoints.find((c) => c.routeStopId === id)
  const duty = track?.duty

  if (!runId) {
    return (
      <p className="text-sm text-muted">
        Open a trip from a{' '}
        <Link to="/runs" className="text-command-600 hover:underline">
          run detail
        </Link>{' '}
        page.
      </p>
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading trip…</p>
  }

  if (!stop || !duty) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
        Trip not found.
        <Link to={`/runs/${runId}`} className="ml-2 font-medium underline">
          Back to run
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/runs/${runId}`}
          className="text-sm font-medium text-command-600 hover:underline"
        >
          ← Back to {duty.reference}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{stop.name}</h1>
        <p className="text-sm text-ink-soft">Stop {stop.stopOrder} on {duty.route?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Location">
          <dl className="space-y-2 text-sm">
            <Row label="Address" value={stop.address ?? '—'} />
            <Row
              label="Coordinates"
              value={
                stop.latitude != null && stop.longitude != null
                  ? `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`
                  : '—'
              }
            />
          </dl>
        </SectionCard>

        <SectionCard title="Schedule">
          <dl className="space-y-2 text-sm">
            <Row label="Pickup time" value={stop.pickupTime ?? '—'} />
            <Row label="Drop-off time" value={stop.dropoffTime ?? '—'} />
            <Row
              label="Arrival status"
              value={checkpoint?.arrivedAt ? `Arrived ${formatTime(checkpoint.arrivedAt)}` : 'Pending'}
            />
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Run context">
        <dl className="space-y-2 text-sm">
          <Row label="Run" value={duty.reference} />
          <Row
            label="Driver"
            value={
              duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : 'Unassigned'
            }
          />
          <Row label="Vehicle" value={duty.vehicle?.registrationNumber ?? 'Unassigned'} />
          <Row label="Run status" value={duty.status.replace(/_/g, ' ')} />
        </dl>
      </SectionCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
