import { SectionCard } from '@/components/ui'
import { ACCOUNT_STATUS_LABELS } from '@/lib/drivers/constants'
import type { DriverProfile, InvitationChannel } from '@/lib/drivers/types'
import { AppInvitePanel } from '../../components/AppInvitePanel'
import type { DriverOnboardingForm } from '../driver-onboarding.types'

export function AppAccountStep({
  form,
  driver,
  actorName,
  canManage,
  onChange,
}: {
  form: DriverOnboardingForm
  driver?: DriverProfile | null
  actorName: string
  canManage: boolean
  onChange: (patch: Partial<DriverOnboardingForm>) => void
}) {
  return (
    <>
      <SectionCard
        title="Create Driver app account"
        description="The driver creates their own password. Admins never see it."
      >
        <p className="mb-4 text-sm text-muted">
          This creates a user, company membership, driver role link, and a single-use invitation. It does not
          activate the driver for Dispatch.
        </p>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Invitation method</legend>
          {(['email', 'sms', 'both'] as InvitationChannel[]).map((ch) => (
            <label key={ch} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name="invite-channel"
                checked={form.inviteChannel === ch}
                onChange={() => onChange({ inviteChannel: ch })}
              />
              {ch}
            </label>
          ))}
        </fieldset>
        {driver?.account.devInvitationToken ? (
          <p className="mt-4 rounded-lg bg-attention/10 px-3 py-2 text-xs text-attention">
            Temporary invite token (dev):{' '}
            <strong className="text-ink">{driver.account.devInvitationToken}</strong>
          </p>
        ) : null}
        {['invitation_pending', 'active', 'setup_incomplete', 'pending_approval'].includes(
          driver?.account.accountStatus ?? '',
        ) ? (
          <p className="mt-3 text-sm text-ready">
            Account status: {ACCOUNT_STATUS_LABELS[driver!.account.accountStatus]}
          </p>
        ) : null}
      </SectionCard>
      {driver ? <AppInvitePanel driver={driver} actorName={actorName} canManage={canManage} /> : null}
    </>
  )
}
