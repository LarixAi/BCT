import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import {
  formatJobExecutionTime,
  jobExecutionEventLabel,
  type JobExecutionSnapshot,
} from '@/lib/operations/job-execution'
import { tKey } from '@/lib/tenant/tenant-query-scope'

type Props = {
  jobId: string | null | undefined
  title?: string
  description?: string
  /** Poll while duty is live */
  live?: boolean
}

export function JobExecutionPanel({
  jobId,
  title = 'Driver execution',
  description = 'Authoritative stop-by-stop record from Command (F-18)',
  live = false,
}: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: tKey(['job-execution', jobId]),
    queryFn: () => api.getJobExecution(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: live ? 15_000 : false,
  })

  if (!jobId) return null

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading driver execution…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {error instanceof Error ? error.message : 'Execution record could not be loaded.'}
      </div>
    )
  }

  const snapshot = data ?? emptySnapshot()

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <ExecutionStat label="Accepted" value={formatJobExecutionTime(snapshot.acceptedAt)} />
        <ExecutionStat label="Started" value={formatJobExecutionTime(snapshot.startedAt)} />
        <ExecutionStat label="Completed" value={formatJobExecutionTime(snapshot.completedAt)} />
      </dl>

      {snapshot.events.length === 0 ? (
        <p className="text-sm text-muted">No driver steps recorded on Command yet.</p>
      ) : (
        <ol className="space-y-2 max-h-64 overflow-y-auto">
          {[...snapshot.events]
            .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
            .map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{jobExecutionEventLabel(event.eventType)}</p>
                  {event.stopId ? (
                    <p className="text-xs text-muted mt-0.5">Stop {event.stopSequence ?? event.stopId.slice(0, 8)}</p>
                  ) : null}
                </div>
                <time className="text-xs tabular-nums text-muted whitespace-nowrap">
                  {formatJobExecutionTime(event.occurredAt)}
                </time>
              </li>
            ))}
        </ol>
      )}
    </div>
  )
}

function ExecutionStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function emptySnapshot(): JobExecutionSnapshot {
  return {
    events: [],
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    stopStatusById: {},
    stopStatusBySequence: {},
  }
}
