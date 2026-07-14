import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { TRAINING_STATUS_LABELS } from '@/lib/staff/constants'
import type { StaffProfile } from '@/lib/staff/types'

export function StaffTrainingCompliancePanel({ staff }: { staff: StaffProfile }) {
  const gaps = staff.trainingRequirements.filter((r) =>
    ['expired', 'missing', 'expiring_soon', 'awaiting_verification'].includes(r.status),
  )

  return (
    <SectionCard
      title="Training compliance"
      description={`Overall: ${TRAINING_STATUS_LABELS[staff.trainingStatus]}`}
      action={
        <Link to={`/staff/${staff.id}?tab=training`} className="text-xs font-medium text-command-600 hover:underline">
          View all
        </Link>
      }
    >
      {staff.trainingAccessBlocks.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p className="font-medium">Access restrictions</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {staff.trainingAccessBlocks.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {gaps.length === 0 ? (
        <p className="text-sm text-emerald-800">All required training is current.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {gaps.slice(0, 4).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-slate-500">{r.requiredFor}</p>
              </div>
              <StatusPill status={r.status} />
            </li>
          ))}
          {gaps.length > 4 && <p className="text-xs text-slate-500">+{gaps.length - 4} more on Training tab</p>}
        </ul>
      )}
    </SectionCard>
  )
}
