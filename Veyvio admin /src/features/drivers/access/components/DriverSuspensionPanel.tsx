import { isAccountOffboarded, isAccountSuspended } from '@/lib/drivers/account-access'
import type { DriverAccount, SuspendDriverInput } from '@/lib/drivers/types'
import { SuspendDriverAccessDialog } from '../../components/SuspendDriverAccessDialog'

export function DriverSuspensionPanel({
  account,
  driverName,
  canSuspend,
  canManage,
  suspendOpen,
  setSuspendOpen,
  reinstateReason,
  setReinstateReason,
  reinstatePending,
  onReinstate,
  suspendPending,
  suspendError,
  onSuspend,
}: {
  account: DriverAccount
  driverName: string
  canSuspend: boolean
  canManage: boolean
  suspendOpen: boolean
  setSuspendOpen: (open: boolean) => void
  reinstateReason: string
  setReinstateReason: (value: string) => void
  reinstatePending: boolean
  onReinstate: () => void
  suspendPending: boolean
  suspendError: unknown
  onSuspend: (input: SuspendDriverInput) => void
}) {
  const showSuspend =
    canSuspend && !isAccountSuspended(account.accountStatus) && !isAccountOffboarded(account.accountStatus)
  const showReinstate = canManage && isAccountSuspended(account.accountStatus)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showSuspend ? (
          <button
            type="button"
            onClick={() => setSuspendOpen(true)}
            className="rounded-lg border border-attention/40 px-3 py-1.5 text-sm font-medium text-attention hover:bg-attention/10"
          >
            Suspend access
          </button>
        ) : null}
        {showReinstate ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={reinstateReason}
              onChange={(e) => setReinstateReason(e.target.value)}
              placeholder="Reason required to reinstate"
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={!reinstateReason.trim() || reinstatePending}
              onClick={onReinstate}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Reinstate access
            </button>
          </div>
        ) : null}
      </div>
      <SuspendDriverAccessDialog
        open={suspendOpen}
        driverName={driverName}
        pending={suspendPending}
        error={suspendError instanceof Error ? suspendError.message : null}
        onClose={() => setSuspendOpen(false)}
        onConfirm={onSuspend}
      />
    </>
  )
}
