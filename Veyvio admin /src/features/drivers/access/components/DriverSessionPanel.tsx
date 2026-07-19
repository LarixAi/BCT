import { SectionCard } from '@/components/ui'
import type { DriverAccount, DriverProfile } from '@/lib/drivers/types'
import { DriverInviteLinkBanner } from '../../components/DriverInviteLinkBanner'
import { formatDateTime, mutationErrorMessage } from '../utils/driver-access-formatters'

export function DriverSessionPanel({
  account,
  driver,
  activeInviteToken,
  canManage,
  canUnlock,
  unlockReason,
  setUnlockReason,
  unlockPending,
  onUnlock,
  passwordResetPending,
  onPasswordReset,
  revokeSessionsPending,
  onRevokeSessions,
  actionError,
}: {
  account: DriverAccount
  driver: DriverProfile
  activeInviteToken: string | null
  canManage: boolean
  canUnlock: boolean
  unlockReason: string
  setUnlockReason: (value: string) => void
  unlockPending: boolean
  onUnlock: () => void
  passwordResetPending: boolean
  onPasswordReset: () => void
  revokeSessionsPending: boolean
  onRevokeSessions: () => void
  actionError: unknown
}) {
  const showUnlock = canUnlock && (account.accountStatus === 'locked' || account.accountLocked)
  const showSessionControls =
    canManage &&
    ['active', 'password_reset_required', 'compliance_restricted'].includes(account.accountStatus)

  return (
    <SectionCard title="Sessions and credentials">
      <div className="flex flex-wrap gap-2">
        {showUnlock ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="Reason required to unlock"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={!unlockReason.trim() || unlockPending}
              onClick={onUnlock}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Unlock account
            </button>
          </div>
        ) : null}

        {showSessionControls ? (
          <>
            <button
              type="button"
              onClick={onPasswordReset}
              disabled={passwordResetPending}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Force password reset
            </button>
            <button
              type="button"
              onClick={onRevokeSessions}
              disabled={revokeSessionsPending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
            >
              Sign out every device
            </button>
          </>
        ) : null}
      </div>

      {activeInviteToken ? (
        <div className="mt-4">
          <DriverInviteLinkBanner
            token={activeInviteToken}
            emailDeliveryStatus={account.emailDeliveryStatus}
            inviteUrl={account.inviteUrl}
            email={account.loginEmail ?? driver.email}
          />
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-3 text-sm text-red-800">{mutationErrorMessage(actionError)}</p>
      ) : null}

      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Creating the driver record is separate from granting Driver app access. Administrators never set or see
        passwords — invite the driver to create their own credentials.
      </p>

      {(account.sessions ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No active sessions.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {account.sessions.map((session) => (
            <li key={session.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <p className="font-medium">{session.deviceLabel}</p>
              <p className="text-xs text-slate-500">
                Started {formatDateTime(session.startedAt)} · Last active {formatDateTime(session.lastActiveAt)}
                {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                {session.current ? <span className="ml-2 text-emerald-700">Current</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
