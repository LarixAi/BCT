import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { ELIGIBILITY_LABELS, ACCOUNT_STATUS_LABELS } from '@/lib/drivers/constants'
import { authenticationMethodLabel, isAccountSuspended } from '@/lib/drivers/account-access'
import type { DriverAccount, EligibilityFailure, OperationalEligibility } from '@/lib/drivers/types'
import { formatDateTime } from '../utils/driver-access-formatters'

function StatusBlock({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/80 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {status ? <StatusPill status={status} /> : null}
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

export function DriverAccessStatusGrid({
  account,
  operationalEligibility,
  canSignIn,
  eligibilityBlocked,
  blockingFailure,
  suspensionCategoryLabel,
}: {
  account: DriverAccount
  operationalEligibility: OperationalEligibility
  canSignIn: boolean
  eligibilityBlocked: boolean
  blockingFailure?: EligibilityFailure
  suspensionCategoryLabel: string | null | undefined
}) {
  return (
    <SectionCard title="Driver app access">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusBlock
          label="Driver app access"
          value={ACCOUNT_STATUS_LABELS[account.accountStatus]}
          status={account.accountStatus}
        />
        <StatusBlock
          label="Operational eligibility"
          value={ELIGIBILITY_LABELS[operationalEligibility]}
          status={operationalEligibility}
        />
        <StatusBlock label="Last login" value={formatDateTime(account.lastLoginAt)} />
        <StatusBlock
          label="Registered devices"
          value={String(account.devices.filter((d) => d.securityStatus !== 'revoked').length)}
        />
        <StatusBlock
          label="Authentication method"
          value={authenticationMethodLabel(
            account.authenticationMethod,
            account.passkeyEnabled,
            account.mfaEnabled,
          )}
        />
        <StatusBlock label="Active sessions" value={String(account.activeSessionCount)} />
      </div>

      {canSignIn && eligibilityBlocked ? (
        <div className="mt-4 rounded-lg border border-attention/40 bg-attention/10 px-4 py-3 text-sm text-ink">
          <p className="font-medium">Driver can sign in but cannot start duty.</p>
          {blockingFailure ? (
            <p className="mt-1 text-ink-soft">Blocking requirement: {blockingFailure.message}</p>
          ) : (
            <p className="mt-1 text-ink-soft">
              Eligibility is {ELIGIBILITY_LABELS[operationalEligibility].toLowerCase()}.
            </p>
          )}
        </div>
      ) : null}

      {isAccountSuspended(account.accountStatus) && account.suspension ? (
        <div className="mt-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-ink">
          <p className="font-medium">Access suspended — sign-in blocked.</p>
          <p className="mt-1 text-ink-soft">
            {suspensionCategoryLabel}: {account.suspension.reason}
          </p>
          {account.suspension.driverMessage ? (
            <p className="mt-1 text-ink-soft">Driver message: {account.suspension.driverMessage}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            Suspended by {account.suspension.suspendedBy} · {formatDateTime(account.suspension.suspendedAt)}
            {account.suspension.restoreAt
              ? ` · restore ${formatDateTime(account.suspension.restoreAt)}`
              : ' · until manually restored'}
          </p>
        </div>
      ) : null}
    </SectionCard>
  )
}
