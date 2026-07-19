import { SectionCard } from '@/components/ui'
import { INVITATION_HISTORY_LABELS } from '@/lib/drivers/constants'
import type { DriverAccount, DriverProfile } from '@/lib/drivers/types'
import { AppInvitePanel } from '../../components/AppInvitePanel'
import { formatDateTime } from '../utils/driver-access-formatters'

export function DriverInvitationPanel({
  driver,
  actorName,
  canManage,
  account,
}: {
  driver: DriverProfile
  actorName: string
  canManage: boolean
  account: DriverAccount
}) {
  return (
    <div className="space-y-6">
      {canManage ? <AppInvitePanel driver={driver} actorName={actorName} canManage={canManage} /> : null}

      <SectionCard title="Invitation history" description="Every invite attempt and its result">
        {(account.invitationHistory ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No invitation history yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {account.invitationHistory.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{INVITATION_HISTORY_LABELS[entry.stage]}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="text-xs text-slate-600">
                  {[entry.channel, entry.destination, entry.actor ? `by ${entry.actor}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {entry.detail ? <p className="mt-1 text-xs text-slate-500">{entry.detail}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
