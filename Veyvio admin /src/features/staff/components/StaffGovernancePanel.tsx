import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { StaffProfile } from '@/lib/staff/types'

export function StaffGovernancePanel({ staff }: { staff: StaffProfile }) {
  if (staff.governanceAlerts.length === 0 && staff.lifecycleWorkflow.length === 0) return null

  return (
    <SectionCard
      title="Identity governance"
      action={
        <Link to={`/staff/${staff.id}?tab=account`} className="text-xs font-medium text-command-600 hover:underline">
          Account settings
        </Link>
      }
    >
      {staff.governanceAlerts.length > 0 && (
        <ul className="mb-3 space-y-2 text-sm">
          {staff.governanceAlerts.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border px-3 py-2 ${a.severity === 'critical' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
            >
              {a.message}
            </li>
          ))}
        </ul>
      )}
      {staff.lifecycleWorkflow.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted">Lifecycle workflow</p>
          <ol className="space-y-1 text-sm">
            {staff.lifecycleWorkflow.map((step) => (
              <li key={step.key} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5">
                <span>{step.label}</span>
                <span className="text-xs capitalize text-muted">{step.status.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </SectionCard>
  )
}
