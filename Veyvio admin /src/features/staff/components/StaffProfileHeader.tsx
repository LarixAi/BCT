import { Link } from 'react-router-dom'
import { StatusPill } from '@/components/ui/status'
import { ACCOUNT_STATUS_LABELS, DUTY_STATUS_LABELS, EMPLOYMENT_STATUS_LABELS } from '@/lib/staff/constants'
import type { StaffProfile } from '@/lib/staff/types'

export function StaffBackLink() {
  return (
    <Link to="/staff" className="text-sm text-command-600 hover:underline">
      ← Back to staff
    </Link>
  )
}

export function StaffProfileHeader({ staff, actions }: { staff: StaffProfile; actions?: React.ReactNode }) {
  const primaryRole = staff.roleAssignments[0]?.roleLabel ?? staff.jobTitle
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-command-100 text-lg font-semibold text-command-700">
          {staff.firstName[0]}{staff.lastName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {staff.firstName} {staff.lastName}
            {staff.preferredName && <span className="text-lg font-normal text-muted"> ({staff.preferredName})</span>}
          </h1>
          <p className="text-sm text-ink-soft">
            {staff.jobTitle} · {staff.department} · {staff.primaryDepotName}
          </p>
          <p className="text-xs text-muted">{staff.reference}{staff.employeeNumber ? ` · ${staff.employeeNumber}` : ''}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={staff.employmentStatus} />
            <span className="text-xs text-muted">{EMPLOYMENT_STATUS_LABELS[staff.employmentStatus]}</span>
            <StatusPill status={staff.account.accountStatus} />
            <span className="text-xs text-muted">{ACCOUNT_STATUS_LABELS[staff.account.accountStatus]}</span>
            <StatusPill status={staff.dutyStatus} />
            <span className="text-xs text-muted">{DUTY_STATUS_LABELS[staff.dutyStatus]}</span>
          </div>
          <p className="mt-1 text-xs text-muted">Role: {primaryRole}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
