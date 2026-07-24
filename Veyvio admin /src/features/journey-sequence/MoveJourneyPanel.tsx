import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { mockJourneySequenceApi } from '@/lib/journey-sequence/mock-hub'
import type { MoveJourneyAction } from '@/lib/journey-sequence/types'
import { cn } from '@/lib/cn'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const ACTIONS: { id: MoveJourneyAction; label: string; description: string }[] = [
  { id: 'move_to_run', label: 'Move to another run', description: 'Transfer selected legs onto an existing run' },
  { id: 'create_new_run', label: 'Create new run', description: 'Split into a new planned run' },
  { id: 'assign_standby', label: 'Assign to standby', description: 'Queue for standby driver coverage' },
  { id: 'leave_unassigned', label: 'Leave unassigned', description: 'Remove from this run without a destination yet' },
]

export function MoveJourneyPanel({
  tripId,
  selectedJobIds,
  actorName,
  onDone,
}: {
  tripId: string
  selectedJobIds: string[]
  actorName: string
  onDone: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<MoveJourneyAction>('move_to_run')
  const [destinationTripId, setDestinationTripId] = useState<string>('')

  const { data: destinations = [] } = useQuery({
    queryKey: tKey(['journey-destinations', tripId]),
    queryFn: () => mockJourneySequenceApi.listDestinationRuns(tripId),
  })

  const preview = useMemo(
    () =>
      selectedJobIds.length
        ? mockJourneySequenceApi.previewMove({
            sourceTripId: tripId,
            jobIds: selectedJobIds,
            action,
            destinationTripId: action === 'move_to_run' ? destinationTripId || null : null,
          })
        : null,
    [tripId, selectedJobIds, action, destinationTripId],
  )

  const commit = useMutation({
    mutationFn: async () =>
      mockJourneySequenceApi.commitMove({
        sourceTripId: tripId,
        jobIds: selectedJobIds,
        action,
        destinationTripId: action === 'move_to_run' ? destinationTripId || null : null,
        actorName,
        reason: 'Operational transfer',
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: tKey(['journey-sequence']) })
      queryClient.invalidateQueries({ queryKey: tKey(['operational-trip']) })
      queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
      queryClient.invalidateQueries({ queryKey: tKey(['assignment-history']) })
      onDone(result.message)
    },
  })

  if (selectedJobIds.length === 0) {
    return (
      <SectionCard title="Move journey" description="Select one or more pickup stops first">
        <p className="text-sm text-muted">
          Click a passenger pickup in the sequence, then choose where to move their journey leg.
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Move journey"
      description={`${selectedJobIds.length} leg(s) selected · outbound/return stay independently editable`}
    >
      <div className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAction(a.id)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left',
                action === a.id
                  ? 'border-command-500 ring-1 ring-command-500 bg-command-50/40'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <p className="font-medium text-ink">{a.label}</p>
              <p className="text-xs text-muted">{a.description}</p>
            </button>
          ))}
        </div>

        {action === 'move_to_run' && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Destination run
            </label>
            <select
              value={destinationTripId}
              onChange={(e) => setDestinationTripId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              <option value="">Select run…</option>
              {destinations.map((d) => (
                <option key={d.tripId} value={d.tripId}>
                  {d.runReference ?? d.tripReference} · {d.routeName ?? '—'} ·{' '}
                  {d.driverName ?? 'No driver'} · WC spaces ~{d.wheelchairSpacesHint}
                </option>
              ))}
            </select>
          </div>
        )}

        {preview && (
          <div
            className={cn(
              'rounded-xl border px-3 py-2',
              preview.blocked ? 'border-red-200 bg-red-50 text-red-950' : 'border-border bg-surface-muted',
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              {preview.blocked ? 'Cannot move this journey' : 'Move checks'}
            </p>
            <p className="mt-1 font-medium">{preview.passengerNames.join(', ')}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {preview.checks.map((c) => (
                <li key={c.code}>
                  <span className="font-semibold uppercase">{c.level}</span> — {c.message}
                </li>
              ))}
            </ul>
            {preview.suggestedOptions.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs">
                {preview.suggestedOptions.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!preview || preview.blocked || commit.isPending}
          onClick={() => commit.mutate()}
          className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
        >
          Confirm move
        </button>

        {commit.isError && (
          <p className="text-xs text-red-700">
            {commit.error instanceof Error ? commit.error.message : 'Move failed'}
          </p>
        )}

        {preview && !preview.blocked && preview.destinationTripId && (
          <Link
            to={`/live-operations/trips/${preview.destinationTripId}?tab=journey`}
            className="inline-block text-xs font-medium text-command-700 hover:underline"
          >
            Preview destination workspace →
          </Link>
        )}
      </div>
    </SectionCard>
  )
}
