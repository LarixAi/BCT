import { Link } from 'react-router-dom'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  ACCOUNT_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  DUTY_STATUS_LABELS,
  ELIGIBILITY_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  OPERATIONAL_STATUS_LABELS,
} from '@/lib/drivers/constants'
import type { DriverProfile } from '@/lib/drivers/types'
import { EligibilityPanel } from './EligibilityPanel'

export function DriverProfileHeader({
  driver,
  actions,
}: {
  driver: DriverProfile
  actions?: React.ReactNode
}) {
  const displayName = driver.preferredName
    ? `${driver.preferredName} (${driver.firstName} ${driver.lastName})`
    : `${driver.firstName} ${driver.lastName}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-command-100 text-xl font-semibold text-command-700">
            {driver.firstName[0]}
            {driver.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-command-600">{driver.reference}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
            <p className="text-sm text-slate-600">
              {EMPLOYMENT_TYPE_LABELS[driver.employmentType]} · {driver.depotName ?? 'No depot'}
              {driver.employeeNumber ? ` · ${driver.employeeNumber}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill status={driver.operationalStatus} />
              <StatusPill status={driver.account?.accountStatus ?? 'draft'} />
              <StatusPill status={driver.operationalEligibility} />
              <StatusPill status={driver.dutyStatus} />
            </div>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <EligibilityPanel eligibility={driver.eligibility} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm lg:col-span-2">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Meta label="Operational" value={OPERATIONAL_STATUS_LABELS[driver.operationalStatus]} />
            <Meta
              label="Account"
              value={ACCOUNT_STATUS_LABELS[driver.account?.accountStatus ?? 'draft']}
            />
            <Meta label="Eligibility" value={ELIGIBILITY_LABELS[driver.operationalEligibility]} />
            <Meta label="Duty status" value={DUTY_STATUS_LABELS[driver.dutyStatus]} />
            <Meta label="Compliance" value={COMPLIANCE_STATUS_LABELS[driver.complianceStatus]} />
            <Meta
              label="Next duty"
              value={
                driver.nextDutyReference
                  ? `${driver.nextDutyReference}${driver.nextDutyTime ? ` · ${driver.nextDutyTime}` : ''}`
                  : '—'
              }
            />
            <Meta
              label="Last app sync"
              value={
                driver.account?.lastAppSyncAt
                  ? new Date(driver.account.lastAppSyncAt).toLocaleString('en-GB')
                  : 'Never'
              }
            />
            <Meta label="App version" value={driver.account?.appVersion ?? '—'} />
            <Meta
              label="Last login"
              value={
                driver.account?.lastLoginAt
                  ? new Date(driver.account.lastLoginAt).toLocaleString('en-GB')
                  : '—'
              }
            />
            <Meta
              label="Nearest expiry"
              value={
                driver.nearestExpiryDate
                  ? `${driver.nearestExpiryLabel}: ${formatDate(driver.nearestExpiryDate)}`
                  : '—'
              }
            />
          </dl>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

export function DriverBackLink() {
  return (
    <Link to="/drivers" className="text-sm font-medium text-command-600 hover:underline">
      ← Back to drivers
    </Link>
  )
}
