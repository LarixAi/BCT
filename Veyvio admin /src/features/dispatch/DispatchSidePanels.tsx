import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { cn } from '@/lib/cn'
import type {
  DispatchActiveRun,
  DispatchLateJob,
  DispatchUrgentJob,
} from '@/lib/dispatch/dispatch-board'
import type { MessageRecord } from '@/lib/api/types'
import type { OperationalException } from '@/lib/types'

type DispatchSidePanelsProps = {
  activeRuns: DispatchActiveRun[]
  lateJobs: DispatchLateJob[]
  exceptions: OperationalException[]
  messages: MessageRecord[]
  urgentJobs: DispatchUrgentJob[]
  selectedDutyId: string | null
  onSelectDuty: (dutyId: string) => void
}

export function DispatchSidePanels({
  activeRuns,
  lateJobs,
  exceptions,
  messages,
  urgentJobs,
  selectedDutyId,
  onSelectDuty,
}: DispatchSidePanelsProps) {
  return (
    <div className="space-y-4">
      <SectionCard title="Active runs" description={`${activeRuns.length} on the road`}>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-muted">No active runs for this date.</p>
        ) : (
          <ul className="space-y-2">
            {activeRuns.slice(0, 6).map((run) => (
              <li key={run.dutyId}>
                <button
                  type="button"
                  onClick={() => onSelectDuty(run.dutyId)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-left text-sm transition',
                    selectedDutyId === run.dutyId
                      ? 'border-command-400 bg-command-50'
                      : 'border-border hover:bg-surface-muted',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{run.reference}</span>
                    <StatusPill status={run.status} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {run.driverName ?? 'Unassigned'} · {run.vehicleRegistration ?? 'No vehicle'}
                  </p>
                  {run.delayMinutes > 0 && (
                    <p className="mt-1 text-xs font-medium text-amber-900">+{run.delayMinutes} min</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Late jobs" description={`${lateJobs.length} behind plan`}>
        {lateJobs.length === 0 ? (
          <p className="text-sm text-muted">No late jobs right now.</p>
        ) : (
          <ul className="space-y-2">
            {lateJobs.slice(0, 5).map((job) => (
              <li key={job.jobId} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <p className="font-medium text-amber-950">{job.passengerName}</p>
                <p className="text-xs text-amber-900">
                  {job.tripReference} · +{job.delayMinutes} min · {job.requiredTime}
                </p>
                <Link to={`/trips/${job.tripId}`} className="mt-1 text-xs font-medium text-command-700 hover:underline">
                  Open trip
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Exceptions" description="Critical and high priority">
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted">No open dispatch exceptions.</p>
        ) : (
          <ul className="space-y-2">
            {exceptions.map((ex) => (
              <li key={ex.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink">{ex.title}</p>
                  <StatusPill status={ex.severity} />
                </div>
                <p className="mt-1 text-xs text-ink-soft">{ex.description}</p>
                <Link to="/exceptions" className="mt-1 text-xs font-medium text-command-700 hover:underline">
                  Open exceptions
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Messages" description="Recent driver comms">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No recent messages.</p>
        ) : (
          <ul className="space-y-2">
            {messages.slice(0, 4).map((msg) => (
              <li key={msg.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-medium text-ink">{msg.subject ?? 'Message'}</p>
                <p className="line-clamp-2 text-xs text-ink-soft">{msg.body}</p>
              </li>
            ))}
          </ul>
        )}
        <Link to="/messages" className="mt-2 inline-block text-xs font-medium text-command-700 hover:underline">
          Open messages
        </Link>
      </SectionCard>

      <SectionCard title="Unassigned urgent jobs" description={`${urgentJobs.length} need action`}>
        {urgentJobs.length === 0 ? (
          <p className="text-sm text-muted">No urgent unassigned jobs.</p>
        ) : (
          <ul className="space-y-2">
            {urgentJobs.slice(0, 5).map((job) => (
              <li key={job.jobId} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm">
                <p className="font-medium text-red-950">{job.passengerName}</p>
                <p className="text-xs text-red-900">
                  {job.tripReference} · {job.requiredTime}
                </p>
                <p className="mt-1 text-xs font-medium text-red-900">{job.reason}</p>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/schedule?mode=planning"
          className="mt-2 inline-block text-xs font-medium text-command-700 hover:underline"
        >
          Open schedule planning
        </Link>
      </SectionCard>
    </div>
  )
}
