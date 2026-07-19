import { SectionCard } from '@/components/ui'
import {
  useDriverAccessActions,
  type DriverAccessSecurityTabProps,
} from './hooks/useDriverAccessActions'
import { DriverAccessStatusGrid } from './components/DriverAccessStatusGrid'
import { DriverAccountSummary } from './components/DriverAccountSummary'
import { DriverDevicePanel } from './components/DriverDevicePanel'
import { DriverInvitationPanel } from './components/DriverInvitationPanel'
import { DriverOffboardingPanel } from './components/DriverOffboardingPanel'
import { DriverSecurityEvents } from './components/DriverSecurityEvents'
import { DriverSessionPanel } from './components/DriverSessionPanel'
import { DriverSuspensionPanel } from './components/DriverSuspensionPanel'

export type { DriverAccessSecurityTabProps }

export function DriverAccessSecurityTab(props: DriverAccessSecurityTabProps) {
  const access = useDriverAccessActions(props)

  return (
    <div className="space-y-6">
      <DriverAccessStatusGrid {...access.statusProps} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DriverAccountSummary {...access.accountProps} />
        <DriverInvitationPanel {...access.invitationProps} />

        <SectionCard title="Account controls">
          <div className="space-y-4">
            <DriverSuspensionPanel {...access.suspensionProps} />
            <DriverOffboardingPanel {...access.offboardingProps} />
          </div>
        </SectionCard>

        <DriverSessionPanel {...access.sessionProps} />
      </div>

      <DriverDevicePanel {...access.deviceProps} />

      <DriverSecurityEvents
        events={access.securityEvents}
        invitationSentAt={props.driver.account.invitationSentAt}
      />
    </div>
  )
}
