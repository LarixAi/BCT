/**
 * Pure helpers for journey-sequence acknowledgement state machine.
 */

export type JourneyAckStatus =
  | 'not_required'
  | 'sent'
  | 'delivered'
  | 'viewed'
  | 'acknowledged'
  | 'declined'
  | 'failed'

export type JourneyDeclineReason =
  | 'already_driving'
  | 'timing_impossible'
  | 'passenger_not_suitable'
  | 'capacity_problem'
  | 'route_conflict'
  | 'missing_passenger_information'
  | 'other'

const TERMINAL = new Set<JourneyAckStatus>(['acknowledged', 'declined', 'failed', 'not_required'])

const ALLOWED: Record<JourneyAckStatus, JourneyAckStatus[]> = {
  not_required: [],
  sent: ['delivered', 'viewed', 'acknowledged', 'declined', 'failed'],
  delivered: ['viewed', 'acknowledged', 'declined', 'failed'],
  viewed: ['acknowledged', 'declined', 'failed'],
  acknowledged: [],
  declined: [],
  failed: ['sent'],
}

export function canAdvanceJourneyAck(
  current: JourneyAckStatus,
  next: JourneyAckStatus,
): boolean {
  if (current === next) return true
  return (ALLOWED[current] ?? []).includes(next)
}

export function isTerminalJourneyAck(status: JourneyAckStatus): boolean {
  return TERMINAL.has(status)
}

export function mapJourneyAckRow(row: Record<string, unknown>): {
  id: string
  tripId: string
  status: JourneyAckStatus
  sentAt: string | null
  deliveredAt: string | null
  viewedAt: string | null
  acknowledgedAt: string | null
  declinedAt: string | null
  declineReason: JourneyDeclineReason | null
  summary: string
  escalateAfterMinutes: number
} {
  return {
    id: String(row.id),
    tripId: String(row.trip_key),
    status: String(row.status ?? 'sent') as JourneyAckStatus,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    viewedAt: row.viewed_at ? String(row.viewed_at) : null,
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
    declinedAt: row.declined_at ? String(row.declined_at) : null,
    declineReason: row.decline_reason ? (String(row.decline_reason) as JourneyDeclineReason) : null,
    summary: String(row.summary ?? ''),
    escalateAfterMinutes: Number(row.escalate_after_minutes ?? 10),
  }
}
