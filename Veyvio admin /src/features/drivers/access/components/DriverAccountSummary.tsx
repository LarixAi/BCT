import { SectionCard } from '@/components/ui'
import { authenticationMethodLabel } from '@/lib/drivers/account-access'
import { ACCOUNT_STATUS_LABELS, EMPLOYMENT_STATUS_LABELS } from '@/lib/drivers/constants'
import type { DriverAccount, DriverProfile } from '@/lib/drivers/types'
import type { DriverContactEditorState } from '../hooks/useDriverContactEditor'
import { formatDateTime } from '../utils/driver-access-formatters'
import { DriverContactEditor } from './DriverContactEditor'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}

export function DriverAccountSummary({
  driver,
  companyName,
  account,
  canManage,
  contact,
  canResendInvite,
  invitePending,
  onSaveAndResend,
}: {
  driver: DriverProfile
  companyName?: string | null
  account: DriverAccount
  canManage: boolean
  contact: DriverContactEditorState
  canResendInvite: boolean
  invitePending: boolean
  onSaveAndResend: () => void
}) {
  return (
    <SectionCard title="Account summary">
      <dl className="space-y-2 text-sm">
        <Row label="Driver name" value={`${driver.firstName} ${driver.lastName}`} />
        <Row label="Driver ID" value={driver.reference} />
        <Row label="Company" value={companyName ?? 'Current company'} />
        <Row
          label="Assigned depots"
          value={[driver.depotName, ...driver.secondaryDepotNames].filter(Boolean).join(', ') || '—'}
        />
        <Row label="Employment status" value={EMPLOYMENT_STATUS_LABELS[driver.employmentStatus]} />
        <Row label="Login email on file" value={driver.email ?? '—'} />
        <Row label="Mobile on file" value={driver.phone ?? '—'} />
        <Row label="App account status" value={ACCOUNT_STATUS_LABELS[account.accountStatus]} />
        <Row label="Invitation status" value={account.invitationStatus.replace(/_/g, ' ')} />
        <Row label="Last successful login" value={formatDateTime(account.lastLoginAt)} />
        <Row label="Last failed login" value={formatDateTime(account.lastFailedLoginAt)} />
        <Row label="Last app activity" value={formatDateTime(account.lastAppActivityAt)} />
        <Row label="Current app version" value={account.appVersion ?? '—'} />
        <Row
          label="Password / passkey"
          value={authenticationMethodLabel(
            account.authenticationMethod,
            account.passkeyEnabled,
            account.mfaEnabled,
          )}
        />
        <Row label="MFA" value={account.mfaEnabled ? 'Enabled' : 'Disabled'} />
        <Row label="User account ID" value={account.userAccountId ?? 'Not linked'} />
      </dl>

      {canManage ? (
        <div className="mt-4 border-t border-border pt-4">
          <DriverContactEditor
            contact={contact}
            canResendInvite={canResendInvite}
            invitePending={invitePending}
            onSaveAndResend={onSaveAndResend}
          />
        </div>
      ) : null}
    </SectionCard>
  )
}
