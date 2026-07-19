import { mockTransfersApi } from '@/lib/api/mock-transfers'
import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'
import {
  buildWorkspace,
  findLinkedReturn,
  recalculatePickupTimes,
} from './build-sequence'
import { NOTIFY_TOLERANCE } from './constants'
import { canReorderSequence, sequenceEditCapability } from './edit-rules'
import { evaluateMoveChecks } from './move-checks'
import type {
  DestinationRunOption,
  DriverAckRecord,
  DriverAckStatus,
  DriverDeclineReason,
  JourneySequenceWorkspace,
  LinkedReturnDecision,
  MoveJourneyAction,
  MoveJourneyPreview,
  SequenceAuditEvent,
  SequenceChangePreview,
  SequenceCommitInput,
} from './types'

let auditStore: SequenceAuditEvent[] = []
const ackByTrip = new Map<string, DriverAckRecord>()

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return (bh ?? 0) * 60 + (bm ?? 0) - ((ah ?? 0) * 60 + (am ?? 0))
}

function buildNotifications(
  _trip: OperationalTrip,
  deltas: SequenceChangePreview['pickupDeltas'],
  schoolDelta: number,
  capability: ReturnType<typeof sequenceEditCapability>,
): SequenceChangePreview['notifications'] {
  const moved = deltas.find((d) => Math.abs(d.minutesDelta) >= NOTIFY_TOLERANCE.passengerPickupMinutes)
  return [
    {
      audience: 'driver',
      notify: true,
      reason: 'Stop order and estimated timings changed',
    },
    {
      audience: 'parent_carer',
      notify: Boolean(moved),
      reason: moved
        ? `Pickup changes by ${Math.abs(moved.minutesDelta)} minutes (above ${NOTIFY_TOLERANCE.passengerPickupMinutes} min tolerance)`
        : `Pickup change within ${NOTIFY_TOLERANCE.passengerPickupMinutes} min tolerance`,
    },
    {
      audience: 'school',
      notify: Math.abs(schoolDelta) >= NOTIFY_TOLERANCE.schoolArrivalMinutes,
      reason:
        Math.abs(schoolDelta) >= NOTIFY_TOLERANCE.schoolArrivalMinutes
          ? `Arrival changes by ${Math.abs(schoolDelta)} minutes`
          : 'School arrival remains within agreed window',
    },
    {
      audience: 'control',
      notify: capability === 'active_warning' || capability === 'notify_required',
      reason:
        capability === 'active_warning'
          ? 'Any active-trip change is logged to control'
          : 'Assigned-trip reorganisation logged',
    },
  ]
}

function ensureAck(tripId: string, summary: string, require: boolean): DriverAckRecord | null {
  if (!require) {
    ackByTrip.delete(tripId)
    return null
  }
  const existing = ackByTrip.get(tripId)
  if (existing && existing.status !== 'acknowledged' && existing.status !== 'declined') {
    return existing
  }
  const now = new Date().toISOString()
  const record: DriverAckRecord = {
    id: `ack-${tripId}-${Date.now()}`,
    tripId,
    status: 'sent',
    sentAt: now,
    deliveredAt: now,
    viewedAt: null,
    acknowledgedAt: null,
    declinedAt: null,
    declineReason: null,
    summary,
    escalateAfterMinutes: 10,
  }
  ackByTrip.set(tripId, record)
  return record
}

export const mockJourneySequenceApi = {
  getWorkspace(tripId: string): JourneySequenceWorkspace {
    const trip = mockTransfersApi.getTrip(tripId)
    const all = mockTransfersApi.listTrips()
    const base = buildWorkspace(trip, all)
    return {
      ...base,
      acknowledgement: ackByTrip.get(tripId) ?? null,
    }
  },

  /** Prefer mock store; otherwise upsert a live trip (and siblings) then build. */
  ensureWorkspaceFromTrips(
    trip: OperationalTrip,
    siblings: OperationalTrip[] = [],
  ): JourneySequenceWorkspace {
    for (const t of [trip, ...siblings]) {
      mockTransfersApi.upsertTrip(t)
    }
    return this.getWorkspace(trip.id)
  },

  previewStops(tripId: string, orderedPickupJobIds: string[]) {
    const trip = mockTransfersApi.getTrip(tripId)
    const recalculated = recalculatePickupTimes(trip.jobs, orderedPickupJobIds)
    return buildWorkspace(trip, mockTransfersApi.listTrips(), recalculated).stops
  },

  findLinkedReturnForJob(tripId: string, jobId: string) {
    const trip = mockTransfersApi.getTrip(tripId)
    const job = trip.jobs.find((j) => j.id === jobId)
    if (!job) return null
    return findLinkedReturn(trip, job, mockTransfersApi.listTrips())
  },

  previewReorder(
    tripId: string,
    orderedPickupJobIds: string[],
    linkedReturnDecision: LinkedReturnDecision = 'keep_unchanged',
  ): SequenceChangePreview {
    const trip = mockTransfersApi.getTrip(tripId)
    const capability = sequenceEditCapability(trip.status)
    if (!canReorderSequence(capability)) {
      throw new Error('This trip cannot be reorganised in its current status')
    }

    const original = [...trip.jobs].sort((a, b) => a.sequence - b.sequence)
    const originalIds = original.map((j) => j.id)
    const recalculated = recalculatePickupTimes(trip.jobs, orderedPickupJobIds)
    const workspace = buildWorkspace(trip, mockTransfersApi.listTrips(), recalculated)

    const pickupDeltas = orderedPickupJobIds.map((id) => {
      const before = original.find((j) => j.id === id)!
      const after = recalculated.find((j) => j.id === id)!
      return {
        passengerName: before.passengerName,
        oldPickup: before.plannedPickupTime,
        newPickup: after.plannedPickupTime,
        minutesDelta: minutesBetween(before.plannedPickupTime, after.plannedPickupTime),
      }
    })

    let movedPassengerName: string | null = null
    let oldPosition: number | null = null
    let newPosition: number | null = null
    for (let i = 0; i < orderedPickupJobIds.length; i += 1) {
      const id = orderedPickupJobIds[i]!
      const prev = originalIds.indexOf(id)
      if (prev !== i) {
        const job = original.find((j) => j.id === id)!
        movedPassengerName = job.passengerName
        oldPosition = prev + 1
        newPosition = i + 1
        break
      }
    }

    const movedJob =
      (movedPassengerName &&
        original.find((j) => j.passengerName === movedPassengerName)) ||
      original[0]!
    const linkedReturn = findLinkedReturn(trip, movedJob, mockTransfersApi.listTrips())

    const schoolFrom = original[original.length - 1]?.plannedDropoffTime ?? '08:50'
    const schoolTo = recalculated[recalculated.length - 1]?.plannedDropoffTime ?? schoolFrom
    const schoolDelta = minutesBetween(schoolFrom, schoolTo)
    const orderChanged = orderedPickupJobIds.some((id, i) => id !== originalIds[i])

    return {
      tripId: trip.id,
      tripReference: trip.reference,
      capability,
      movedPassengerName,
      oldPosition,
      newPosition,
      pickupDeltas,
      distanceMiles: {
        from: 12.4,
        to: 12.4 + (orderChanged ? 0.7 : 0),
      },
      durationMinutes: {
        from: 48,
        to: 48 + Math.abs(pickupDeltas.find((d) => d.minutesDelta !== 0)?.minutesDelta ?? 0),
      },
      affectedPassengerCount: pickupDeltas.filter((d) => d.minutesDelta !== 0).length,
      schoolArrival: { from: schoolFrom, to: schoolTo },
      linkedReturn,
      linkedReturnDecision,
      notifications: buildNotifications(trip, pickupDeltas, schoolDelta, capability),
      acknowledgementRequired: capability === 'notify_required' || capability === 'active_warning',
      activeTripWarning: capability === 'active_warning',
      stops: workspace.stops,
    }
  },

  commitReorder(input: SequenceCommitInput): {
    trip: OperationalTrip
    preview: SequenceChangePreview
    audit: SequenceAuditEvent
    acknowledgement: DriverAckRecord | null
  } {
    const trip = mockTransfersApi.getTrip(input.tripId)
    const originalIds = [...trip.jobs].sort((a, b) => a.sequence - b.sequence).map((j) => j.id)
    const preview = this.previewReorder(
      input.tripId,
      input.orderedPickupJobIds,
      input.linkedReturnDecision,
    )

    const updatedJobs = recalculatePickupTimes(trip.jobs, input.orderedPickupJobIds)
    mockTransfersApi.applyJobReorder(input.tripId, updatedJobs)

    const notified = preview.notifications
      .filter((n) => n.notify && input.sendNotifications)
      .map((n) => n.audience)

    const audit: SequenceAuditEvent = {
      id: `seq-audit-${Date.now()}`,
      at: new Date().toISOString(),
      actorName: input.actorName,
      tripId: trip.id,
      tripReference: trip.reference,
      summary: preview.movedPassengerName
        ? `${preview.movedPassengerName}: pickup position ${preview.oldPosition} → ${preview.newPosition}`
        : 'Run sequence reorganised',
      reason: input.reason,
      reasonNotes: input.reasonNotes,
      linkedReturnDecision: input.linkedReturnDecision,
      notificationsSent: notified,
      acknowledgementRequired: preview.acknowledgementRequired && input.sendNotifications,
      originalPickupOrder: originalIds,
      newPickupOrder: input.orderedPickupJobIds,
    }
    auditStore = [audit, ...auditStore]

    if (input.sendNotifications) {
      mockTransfersApi.recordSequenceNotification(input.tripId, notified, input.actorName)
    }

    const acknowledgement = ensureAck(
      input.tripId,
      audit.summary,
      Boolean(preview.acknowledgementRequired && input.sendNotifications),
    )

    return {
      trip: mockTransfersApi.getTrip(input.tripId),
      preview,
      audit,
      acknowledgement,
    }
  },

  listAudit(tripId: string): SequenceAuditEvent[] {
    return auditStore.filter((a) => a.tripId === tripId)
  },

  getAcknowledgement(tripId: string): DriverAckRecord | null {
    return ackByTrip.get(tripId) ?? null
  },

  advanceAcknowledgement(
    tripId: string,
    next: DriverAckStatus,
    declineReason?: DriverDeclineReason | null,
  ): DriverAckRecord {
    const current = ackByTrip.get(tripId)
    if (!current) throw new Error('No acknowledgement pending for this trip')
    const now = new Date().toISOString()
    const updated: DriverAckRecord = {
      ...current,
      status: next,
      deliveredAt: next === 'delivered' || current.deliveredAt ? current.deliveredAt ?? now : null,
      viewedAt: next === 'viewed' || next === 'acknowledged' || next === 'declined'
        ? current.viewedAt ?? now
        : current.viewedAt,
      acknowledgedAt: next === 'acknowledged' ? now : current.acknowledgedAt,
      declinedAt: next === 'declined' ? now : current.declinedAt,
      declineReason: next === 'declined' ? declineReason ?? 'other' : current.declineReason,
    }
    ackByTrip.set(tripId, updated)
    return updated
  },

  listDestinationRuns(sourceTripId: string): DestinationRunOption[] {
    return mockTransfersApi
      .listTrips()
      .filter((t) => t.id !== sourceTripId)
      .map((t) => ({
        tripId: t.id,
        tripReference: t.reference,
        runReference: t.runReference,
        routeName: t.routeName,
        driverName: t.driverName,
        vehicleRegistration: t.vehicleRegistration,
        tripStatus: t.status,
        jobCount: t.jobs.length,
        wheelchairSpacesHint: Math.max(
          0,
          2 - t.jobs.filter((j) => j.wheelchairRequired).length,
        ),
      }))
  },

  previewMove(input: {
    sourceTripId: string
    jobIds: string[]
    action: MoveJourneyAction
    destinationTripId?: string | null
  }): MoveJourneyPreview {
    const sourceTrip = mockTransfersApi.getTrip(input.sourceTripId)
    const jobs = sourceTrip.jobs.filter((j) => input.jobIds.includes(j.id))
    const destinationTrip = input.destinationTripId
      ? mockTransfersApi.getTrip(input.destinationTripId)
      : null
    const { checks, blocked, suggestedOptions } = evaluateMoveChecks({
      sourceTrip,
      destinationTrip,
      jobs,
      action: input.action,
    })
    return {
      sourceTripId: input.sourceTripId,
      destinationTripId: input.destinationTripId ?? null,
      action: input.action,
      jobIds: input.jobIds,
      passengerNames: jobs.map((j) => j.passengerName),
      checks,
      blocked,
      suggestedOptions,
    }
  },

  commitMove(input: {
    sourceTripId: string
    jobIds: string[]
    action: MoveJourneyAction
    destinationTripId?: string | null
    actorName: string
    reason: string
  }): { message: string; destinationTripId: string | null } {
    const preview = this.previewMove(input)
    if (preview.blocked) {
      throw new Error(preview.checks.find((c) => c.level === 'error')?.message ?? 'Cannot move journey')
    }

    if (input.action === 'create_new_run') {
      const created = mockTransfersApi.createSplitTripFromJobs({
        sourceTripId: input.sourceTripId,
        jobIds: input.jobIds,
        actorName: input.actorName,
      })
      ensureAck(created.id, `New run created with ${preview.passengerNames.join(', ')}`, true)
      return {
        message: `Created ${created.reference} (${created.runReference}) with ${preview.passengerNames.join(', ')}. New driver must acknowledge.`,
        destinationTripId: created.id,
      }
    }

    if (input.action === 'leave_unassigned' || input.action === 'assign_standby') {
      mockTransfersApi.moveJobsBetweenTrips({
        sourceTripId: input.sourceTripId,
        destinationTripId: null,
        jobIds: input.jobIds,
        actorName: input.actorName,
      })
      return {
        message:
          input.action === 'assign_standby'
            ? `${preview.passengerNames.join(', ')} queued for standby assignment.`
            : `${preview.passengerNames.join(', ')} left unassigned.`,
        destinationTripId: null,
      }
    }

    const result = mockTransfersApi.moveJobsBetweenTrips({
      sourceTripId: input.sourceTripId,
      destinationTripId: input.destinationTripId ?? null,
      jobIds: input.jobIds,
      actorName: input.actorName,
    })
    if (result.destination) {
      ensureAck(
        result.destination.id,
        `Received ${preview.passengerNames.join(', ')} from ${result.source.reference}`,
        true,
      )
    }
    return {
      message: `${preview.passengerNames.join(', ')} moved to ${result.destination?.reference ?? 'queue'}. Original and receiving drivers notified.`,
      destinationTripId: result.destination?.id ?? null,
    }
  },
}

export type { OperationalJob }
