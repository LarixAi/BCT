import { SectionCard } from '@/components/ui'
import { formatDate } from '@/components/ui/status'
import type { DriverAuditEvent } from '@/lib/drivers/types'
import { formatDateTime } from '../utils/driver-access-formatters'

export function DriverSecurityEvents({
  events,
  invitationSentAt,
}: {
  events: DriverAuditEvent[]
  invitationSentAt?: string | null
}) {
  return (
    <SectionCard title="Security activity" description="Recent login and account events">
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No security events recorded.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.slice(0, 12).map((event) => (
            <li key={event.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{event.action}</p>
                <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
              </div>
              <p className="text-xs text-slate-600">
                {event.actor} · {event.actorRole}
                {event.previousValue || event.newValue
                  ? ` · ${event.previousValue ?? '—'} → ${event.newValue ?? '—'}`
                  : ''}
              </p>
              {event.reason ? <p className="mt-1 text-xs text-slate-500">{event.reason}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Full audit trail (including non-security events) is on the Notes & Audit tab. Invitation sent{' '}
        {invitationSentAt ? formatDate(invitationSentAt.slice(0, 10)) : '—'}.
      </p>
    </SectionCard>
  )
}
