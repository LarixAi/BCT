export type JobExecutionEventRecord = {
  id: string
  eventType: string
  occurredAt: string
  stopId: string | null
  stopSequence: number | null
}

export type JobExecutionSnapshot = {
  events: JobExecutionEventRecord[]
  acceptedAt: string | null
  startedAt: string | null
  completedAt: string | null
  stopStatusById: Record<string, string>
  stopStatusBySequence: Record<number, string>
}

const EVENT_LABELS: Record<string, string> = {
  job_accepted: 'Job accepted',
  job_started: 'Duty started',
  arrived_stop: 'Arrived at stop',
  completed_stop: 'Stop completed',
  job_completed: 'Job completed',
  issue_reported: 'Issue reported',
}

export function jobExecutionEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
}

export function stopExecutionStatus(
  snapshot: JobExecutionSnapshot | null | undefined,
  stop: { id: string; stopOrder?: number },
): string | null {
  if (!snapshot) return null
  const fromId = snapshot.stopStatusById[stop.id]
  if (fromId) return fromId
  if (stop.stopOrder != null) {
    return snapshot.stopStatusBySequence[stop.stopOrder] ?? null
  }
  return null
}

export function stopExecutionDone(
  snapshot: JobExecutionSnapshot | null | undefined,
  stop: { id: string; stopOrder?: number },
): boolean {
  const status = stopExecutionStatus(snapshot, stop)
  return status === 'completed' || status === 'arrived'
}

export function formatJobExecutionTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
