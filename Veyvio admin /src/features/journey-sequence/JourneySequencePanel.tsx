import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { AUDIENCE_LABEL, REORGANISE_REASON_LABEL, REORGANISE_REASONS } from '@/lib/journey-sequence/constants'
import { canReorderSequence, canSaveWithoutNotify, capabilityBanner } from '@/lib/journey-sequence/edit-rules'
import { workspaceFromDuty } from '@/lib/journey-sequence/from-duty'
import { mockJourneySequenceApi } from '@/lib/journey-sequence/mock-hub'
import type {
  DriverDeclineReason,
  LinkedReturnDecision,
  ReorganiseReasonCode,
  SequenceStop,
} from '@/lib/journey-sequence/types'
import { api } from '@/lib/api/client'
import type { DutyDetailRecord } from '@/lib/api/types'
import type { OperationalTrip } from '@/lib/transfers/types'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { cn } from '@/lib/cn'
import { MoveJourneyPanel } from './MoveJourneyPanel'
import { tKey } from '@/lib/tenant/tenant-query-scope'


type Mode = 'view' | 'edit' | 'confirm'

const DECLINE_REASONS: { id: DriverDeclineReason; label: string }[] = [
  { id: 'already_driving', label: 'Already driving' },
  { id: 'timing_impossible', label: 'Timing impossible' },
  { id: 'passenger_not_suitable', label: 'Passenger not suitable for vehicle' },
  { id: 'capacity_problem', label: 'Capacity problem' },
  { id: 'route_conflict', label: 'Route conflict' },
  { id: 'missing_passenger_information', label: 'Missing passenger information' },
  { id: 'other', label: 'Other' },
]

export function JourneySequencePanel({
  tripId,
  duty,
  initialTrip,
}: {
  tripId?: string | null
  duty?: DutyDetailRecord | null
  /** When already loaded on the parent page (avoids a second failing fetch). */
  initialTrip?: OperationalTrip | null
}) {
  const { user } = useAuth()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Operations'
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('view')
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [linkedDecision, setLinkedDecision] = useState<LinkedReturnDecision>('keep_unchanged')
  const [showLinkedPrompt, setShowLinkedPrompt] = useState(false)
  const [reason, setReason] = useState<ReorganiseReasonCode>('operational_optimisation')
  const [reasonNotes, setReasonNotes] = useState('')
  const [commitMessage, setCommitMessage] = useState<string | null>(null)
  const [dragJobId, setDragJobId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState<DriverDeclineReason>('timing_impossible')

  const {
    data: workspace,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: tKey([
      'journey-sequence',
      tripId ?? duty?.id ?? 'none',
      initialTrip?.manifestVersion,
      initialTrip?.jobs?.length ?? 0,
      duty?.route?.stops?.length ?? 0,
    ]),
    queryFn: async () => {
      const project = async (trip: OperationalTrip) => {
        if (!trip.jobs?.length && duty) {
          const { dutyToSyntheticTrip } = await import('@/lib/journey-sequence/from-duty')
          const { mockTransfersApi } = await import('@/lib/api/mock-transfers')
          const synthetic = dutyToSyntheticTrip(duty)
          mockTransfersApi.upsertTrip({
            ...synthetic,
            id: trip.id,
            reference: trip.reference || synthetic.reference,
            dutyId: trip.dutyId ?? duty.id,
          })
          return mockJourneySequenceApi.getWorkspace(trip.id)
        }
        const siblings = await api.getOperationalTrips().catch(() => [])
        const list = Array.isArray(siblings) ? siblings : []
        return mockJourneySequenceApi.ensureWorkspaceFromTrips(trip, list)
      }

      const dutyPickupCount = (duty?.route?.stops ?? []).filter((stop) => {
        const label = `${stop.name ?? ''} ${stop.address ?? ''}`
        return !/drop|school|destination|hub|centre|center|primary|academy/i.test(label)
      }).length

      const fromDuty = async () => {
        if (!duty) throw new Error('No operational trip or duty stops available for this run')
        const { dutyToSyntheticTrip } = await import('@/lib/journey-sequence/from-duty')
        const { mockTransfersApi } = await import('@/lib/api/mock-transfers')
        const trip = dutyToSyntheticTrip(duty)
        mockTransfersApi.upsertTrip(trip)
        return workspaceFromDuty(duty)
      }

      // Prefer duty route stops when they already match the Stops tab (full pickup list).
      if (dutyPickupCount >= 2 && dutyPickupCount >= (initialTrip?.jobs?.length ?? 0)) {
        return fromDuty()
      }
      if (initialTrip?.jobs?.length && initialTrip.jobs.length >= Math.max(dutyPickupCount, 1)) {
        return project(initialTrip)
      }
      if (dutyPickupCount > (initialTrip?.jobs?.length ?? 0)) {
        return fromDuty()
      }
      if (initialTrip?.jobs?.length) {
        return project(initialTrip)
      }

      if (tripId) {
        try {
          const trip = await api.getOperationalTrip(tripId)
          if ((trip.jobs?.length ?? 0) >= Math.max(dutyPickupCount, 1)) {
            return project(trip)
          }
        } catch {
          // fall through
        }
      }

      if (duty) return fromDuty()
      throw new Error('No operational trip or duty stops available for this run')
    },
    retry: 1,
  })

  const activeTripId = workspace?.tripId ?? tripId ?? ''

  const { data: audit = [] } = useQuery({
    queryKey: tKey(['journey-sequence-audit', activeTripId]),
    queryFn: () => mockJourneySequenceApi.listAudit(activeTripId),
    enabled: !!activeTripId,
  })

  const order = draftOrder ?? workspace?.pickupJobIds ?? []

  const liveStops = useMemo(() => {
    if (!workspace || !activeTripId) return [] as SequenceStop[]
    if ((mode === 'edit' || mode === 'confirm') && draftOrder?.length) {
      try {
        return mockJourneySequenceApi.previewStops(activeTripId, draftOrder)
      } catch {
        return workspace.stops
      }
    }
    return workspace.stops
  }, [workspace, mode, draftOrder, activeTripId])

  const previewQuery = useQuery({
    queryKey: tKey(['journey-sequence-preview', activeTripId, order, linkedDecision]),
    queryFn: () => mockJourneySequenceApi.previewReorder(activeTripId, order, linkedDecision),
    enabled: mode === 'confirm' && order.length > 0 && !!activeTripId,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['journey-sequence']) })
    queryClient.invalidateQueries({ queryKey: tKey(['journey-sequence-audit', activeTripId]) })
    queryClient.invalidateQueries({ queryKey: tKey(['operational-trip', activeTripId]) })
    queryClient.invalidateQueries({ queryKey: tKey(['assignment-history', activeTripId]) })
  }

  const commit = useMutation({
    mutationFn: async (sendNotifications: boolean) =>
      mockJourneySequenceApi.commitReorder({
        tripId: activeTripId,
        orderedPickupJobIds: order,
        reason,
        reasonNotes: reason === 'other' ? reasonNotes : undefined,
        linkedReturnDecision: linkedDecision,
        sendNotifications,
        actorName,
      }),
    onSuccess: (result) => {
      setCommitMessage(
        result.preview.movedPassengerName
          ? `Saved — ${result.preview.movedPassengerName} moved. Manifest updated.`
          : 'Saved — journey sequence updated.',
      )
      setMode('view')
      setDraftOrder(null)
      setShowLinkedPrompt(false)
      invalidateAll()
    },
  })

  const ackMut = useMutation({
    mutationFn: async (next: 'viewed' | 'acknowledged' | 'declined') =>
      mockJourneySequenceApi.advanceAcknowledgement(
        activeTripId,
        next,
        next === 'declined' ? declineReason : null,
      ),
    onSuccess: () => invalidateAll(),
  })

  const primarySelected = selectedJobIds[0] ?? null
  const linked = useMemo(() => {
    if (!primarySelected || !workspace || !activeTripId) return null
    return mockJourneySequenceApi.findLinkedReturnForJob(activeTripId, primarySelected)
  }, [primarySelected, activeTripId, workspace])

  if (isLoading) {
    return <p className="text-sm text-muted">Loading journey sequence…</p>
  }

  if (isError || !workspace) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Journey sequence could not be loaded</p>
        <p className="mt-1">
          {error instanceof Error
            ? error.message
            : 'This run does not yet have passenger jobs for reorganisation.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 rounded-lg border border-amber-300 bg-surface px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
        >
          Try again
        </button>
      </div>
    )
  }

  const banner = capabilityBanner(workspace.capability)
  const editable = canReorderSequence(workspace.capability)
  const stops: SequenceStop[] =
    mode === 'confirm' && previewQuery.data ? previewQuery.data.stops : liveStops
  const ack = workspace.acknowledgement

  const enterEdit = () => {
    setDraftOrder([...workspace.pickupJobIds])
    setMode('edit')
    setCommitMessage(null)
  }

  const toggleSelect = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId],
    )
  }

  const applyOrder = (next: string[], focusJobId?: string) => {
    setDraftOrder(next)
    if (focusJobId) {
      setSelectedJobIds((prev) => (prev.includes(focusJobId) ? prev : [focusJobId]))
      const found = mockJourneySequenceApi.findLinkedReturnForJob(activeTripId, focusJobId)
      if (found) setShowLinkedPrompt(true)
    }
  }

  const movePickup = (jobId: string, direction: -1 | 1) => {
    if (!draftOrder) return
    const idx = draftOrder.indexOf(jobId)
    const nextIdx = idx + direction
    if (idx < 0 || nextIdx < 0 || nextIdx >= draftOrder.length) return
    const stop = workspace.stops.find((s) => s.jobId === jobId && s.kind === 'pickup')
    const swapId = draftOrder[nextIdx]!
    const swapStop = workspace.stops.find((s) => s.jobId === swapId && s.kind === 'pickup')
    if (stop?.locked || swapStop?.locked) return
    const copy = [...draftOrder]
    ;[copy[idx], copy[nextIdx]] = [copy[nextIdx]!, copy[idx]!]
    applyOrder(copy, jobId)
  }

  const onDropPickup = (targetJobId: string) => {
    if (!draftOrder || !dragJobId || dragJobId === targetJobId) return
    const from = draftOrder.indexOf(dragJobId)
    const to = draftOrder.indexOf(targetJobId)
    if (from < 0 || to < 0) return
    const fromStop = workspace.stops.find((s) => s.jobId === dragJobId && s.kind === 'pickup')
    const toStop = workspace.stops.find((s) => s.jobId === targetJobId && s.kind === 'pickup')
    if (fromStop?.locked || toStop?.locked) return
    const copy = [...draftOrder]
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item!)
    applyOrder(copy, dragJobId)
    setDragJobId(null)
  }

  return (
    <div className="space-y-4">
      {commitMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
          {commitMessage}
        </div>
      )}

      {banner && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            workspace.capability === 'active_warning'
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : workspace.capability === 'correction_only' || workspace.capability === 'reinstate_only'
                ? 'border-border bg-surface-muted text-ink'
                : 'border-sky-200 bg-sky-50 text-sky-950',
          )}
        >
          {banner}
        </div>
      )}

      {ack && ack.status !== 'acknowledged' && (
        <SectionCard
          title="Driver acknowledgement"
          description={`Status: ${ack.status.replace(/_/g, ' ')} · escalate after ${ack.escalateAfterMinutes} min`}
        >
          <p className="text-sm text-ink">{ack.summary}</p>
          <p className="mt-1 text-xs text-muted">
            Sent {ack.sentAt ? new Date(ack.sentAt).toLocaleTimeString('en-GB') : '—'}
            {ack.status === 'declined' && ack.declineReason
              ? ` · Declined: ${ack.declineReason.replace(/_/g, ' ')}`
              : ''}
          </p>
          {ack.status !== 'declined' && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={() => ackMut.mutate('viewed')}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
              >
                Mark viewed (demo)
              </button>
              <button
                type="button"
                onClick={() => ackMut.mutate('acknowledged')}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Acknowledge
              </button>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value as DriverDeclineReason)}
                className="rounded-lg border border-border px-2 py-1.5 text-xs"
              >
                {DECLINE_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => ackMut.mutate('declined')}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Cannot accept
              </button>
              <Link to="/messages" className="text-xs font-medium text-command-700 hover:underline">
                Call driver
              </Link>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="text-xs font-medium text-command-700 hover:underline"
              >
                Reassign / reorganise
              </button>
            </div>
          )}
          {ack.status === 'declined' && (
            <p className="mt-2 text-xs font-medium text-amber-900">
              Driver declined — alert control, call driver, or reassign.
            </p>
          )}
        </SectionCard>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <SectionCard
          title="Journey sequence"
          description={`${stops.length} stops on this run${
            workspace.routeName ? ` · ${workspace.routeName}` : ''
          }${workspace.runReference ? ` · ${workspace.runReference}` : ''}`}
          action={
            mode === 'view' ? (
              <button
                type="button"
                disabled={!editable}
                onClick={enterEdit}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                Rearrange order
              </button>
            ) : mode === 'edit' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('view')
                    setDraftOrder(null)
                    setShowLinkedPrompt(false)
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setMode('confirm')}
                  className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
                >
                  Preview changes
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Back to edit
              </button>
            )
          }
        >
          {mode === 'edit' && (
            <p className="mb-3 text-xs text-muted">
              Drag pickups (☰) or use Up/Down to change order. School drop-off stays fixed at the end.
              Select a pickup to move it to another run.
            </p>
          )}
          {mode === 'view' && editable && (
            <p className="mb-3 text-xs text-muted">
              Same stops as the Stops tab. Use Rearrange order to change pickup sequence.
            </p>
          )}
          <ol className="space-y-2">
            {stops.map((stop) => {
              const isSelected = stop.jobId != null && selectedJobIds.includes(stop.jobId)
              const isLinked =
                linked &&
                stop.passengerId === linked.passengerId &&
                stop.kind !== 'depot_depart' &&
                stop.kind !== 'depot_return' &&
                !isSelected
              const canDrag = mode === 'edit' && stop.kind === 'pickup' && !stop.locked && !!stop.jobId
              const clock = stop.estimatedTime ?? stop.plannedTime
              const timingLabel =
                stop.kind === 'pickup'
                  ? clock
                    ? `Pickup ${clock}`
                    : 'Pickup'
                  : stop.kind === 'dropoff'
                    ? clock
                      ? `Drop-off ${clock}`
                      : 'Drop-off'
                    : clock ?? '—'
              const statusLabel =
                stop.status === 'completed' || stop.status === 'onboard'
                  ? 'Arrived'
                  : stop.locked && stop.kind === 'pickup'
                    ? 'Locked'
                    : 'Pending'
              return (
                <li key={stop.id}>
                  <div
                    draggable={canDrag}
                    onDragStart={() => {
                      if (stop.jobId) setDragJobId(stop.jobId)
                    }}
                    onDragEnd={() => setDragJobId(null)}
                    onDragOver={(e) => {
                      if (canDrag) e.preventDefault()
                    }}
                    onDrop={() => {
                      if (stop.jobId) onDropPickup(stop.jobId)
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition',
                      isSelected && 'border-command-500 ring-1 ring-command-500 bg-command-50/40',
                      isLinked && 'border-sky-300 bg-sky-50/70',
                      !isSelected && !isLinked && 'border-border bg-surface',
                      dragJobId === stop.jobId && 'opacity-50',
                      canDrag && 'cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => stop.jobId && toggleSelect(stop.jobId)}
                      disabled={!stop.jobId}
                    >
                      {canDrag ? (
                        <span className="mt-0.5 text-muted" aria-hidden>
                          ☰
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-soft">
                          {stop.position}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-command-600">{stop.label}</p>
                        {stop.address && stop.address !== stop.label && (
                          <p className="mt-0.5 text-xs text-muted">{stop.address}</p>
                        )}
                        <p className="mt-1 text-xs tabular-nums text-muted">
                          {timingLabel}
                          {isLinked ? ' · Linked journey' : ''}
                          {isSelected ? ' · Selected' : ''}
                        </p>
                      </div>
                    </button>
                    {mode === 'edit' && stop.kind === 'pickup' && stop.jobId && !stop.locked ? (
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-muted"
                          onClick={() => movePickup(stop.jobId!, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-muted"
                          onClick={() => movePickup(stop.jobId!, 1)}
                        >
                          Down
                        </button>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          statusLabel === 'Arrived'
                            ? 'bg-emerald-100 text-emerald-800'
                            : statusLabel === 'Locked'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-surface-muted text-ink-soft',
                        )}
                      >
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <p className="mt-3 text-xs text-muted">
            Reordering pickups updates the operating sequence. The school drop-off stays at the end
            unless you move a journey to another run.
          </p>
        </SectionCard>

        <div className="space-y-4">
          <MoveJourneyPanel
            tripId={activeTripId}
            selectedJobIds={selectedJobIds}
            actorName={actorName}
            onDone={(message) => {
              setCommitMessage(message)
              setSelectedJobIds([])
              setDraftOrder(null)
              setMode('view')
              invalidateAll()
            }}
          />

          {linked && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                Linked return
              </p>
              <p className="mt-1 font-semibold">
                {linked.plannedPickupTime} — {linked.fromAddress} → {linked.toAddress}
              </p>
              <p className="mt-1 text-xs">
                {linked.runReference ? `Run ${linked.runReference}` : linked.tripReference} · Driver:{' '}
                {linked.driverName ?? '—'} · Vehicle: {linked.vehicleRegistration ?? '—'} · Status:{' '}
                {linked.tripStatus.replace(/_/g, ' ')}
              </p>
              <Link
                to={`/live-operations/trips/${linked.tripId}?tab=journey`}
                className="mt-2 inline-block text-xs font-medium text-command-700 hover:underline"
              >
                Open linked journey →
              </Link>
            </div>
          )}
        </div>
      </div>

      {showLinkedPrompt && linked && mode === 'edit' && (
        <SectionCard title="Linked return journey found" description="This return journey has not been changed">
          <p className="text-sm text-ink">
            {linked.passengerName} also has a {linked.direction} journey today at{' '}
            <span className="font-semibold tabular-nums">{linked.plannedPickupTime}</span> on{' '}
            {linked.runReference ? `Run ${linked.runReference}` : linked.tripReference}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'keep_unchanged' as const, label: 'Keep return unchanged' },
                { id: 'review_return' as const, label: 'Review return journey' },
                { id: 'move_both' as const, label: 'Move both journeys' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setLinkedDecision(opt.id)
                  if (opt.id !== 'review_return') setShowLinkedPrompt(false)
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  linkedDecision === opt.id
                    ? 'bg-command-600 text-white'
                    : 'border border-border hover:bg-surface-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {mode === 'confirm' && previewQuery.data && (
        <SectionCard title="Confirm run changes" description="Review impact, notifications and reason before saving">
          <div className="space-y-3 text-sm">
            {previewQuery.data.activeTripWarning && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                This trip is currently active. Changes may affect the driver and passengers
                immediately. Save without sending is disabled.
              </p>
            )}

            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Changes</p>
              {previewQuery.data.movedPassengerName ? (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    {previewQuery.data.movedPassengerName} moved from position{' '}
                    {previewQuery.data.oldPosition} to {previewQuery.data.newPosition}
                  </li>
                  {previewQuery.data.pickupDeltas
                    .filter((d) => d.minutesDelta !== 0)
                    .slice(0, 4)
                    .map((d) => (
                      <li key={d.passengerName}>
                        {d.passengerName}: pickup {d.oldPickup} → {d.newPickup}
                      </li>
                    ))}
                  <li>
                    Run distance {previewQuery.data.distanceMiles.from} →{' '}
                    {previewQuery.data.distanceMiles.to} miles
                  </li>
                  <li>
                    Linked return:{' '}
                    {previewQuery.data.linkedReturnDecision === 'keep_unchanged'
                      ? 'No change'
                      : previewQuery.data.linkedReturnDecision.replace(/_/g, ' ')}
                  </li>
                </ul>
              ) : (
                <p className="mt-1 text-ink-soft">No pickup order change detected.</p>
              )}
            </div>

            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Notifications
              </p>
              <ul className="mt-1 space-y-1">
                {previewQuery.data.notifications.map((n) => (
                  <li key={n.audience} className="flex gap-2">
                    <span className={n.notify ? 'text-emerald-700' : 'text-muted'}>
                      {n.notify ? '✓' : '–'}
                    </span>
                    <span>
                      <span className="font-medium">{AUDIENCE_LABEL[n.audience]}</span>
                      <span className="text-muted"> — {n.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Reason (required)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReorganiseReasonCode)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                {REORGANISE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REORGANISE_REASON_LABEL[r]}
                  </option>
                ))}
              </select>
              {reason === 'other' && (
                <input
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  placeholder="Describe the reason"
                  className="mt-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={
                  !canSaveWithoutNotify(workspace.capability) ||
                  commit.isPending ||
                  (reason === 'other' && !reasonNotes.trim())
                }
                onClick={() => commit.mutate(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
              >
                Save without sending
              </button>
              <button
                type="button"
                disabled={commit.isPending || (reason === 'other' && !reasonNotes.trim())}
                onClick={() => commit.mutate(true)}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                Save and notify
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {audit.length > 0 && (
        <SectionCard title="Change history" description="Permanent audit of sequence reorganisations">
          <ol className="space-y-2 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-ink">
                  {new Date(a.at).toLocaleString('en-GB')} · {a.actorName}
                </p>
                <p className="text-ink-soft">{a.summary}</p>
                <p className="mt-1 text-xs text-muted">
                  Reason: {REORGANISE_REASON_LABEL[a.reason]} · Linked return:{' '}
                  {a.linkedReturnDecision.replace(/_/g, ' ')}
                  {a.notificationsSent.length
                    ? ` · Notified: ${a.notificationsSent.map((x) => AUDIENCE_LABEL[x]).join(', ')}`
                    : ' · No notifications'}
                </p>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}
    </div>
  )
}
