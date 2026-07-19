import { StatusPill } from '@/components/ui/status'
import {
  COMPLIANCE_STATUS_LABELS,
  CONDITION_STATUS_LABELS,
  LIFECYCLE_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
} from '@/lib/vehicles/constants'
import type { VehicleProfile } from '@/lib/vehicles/types'

/** Four distinct status dimensions — never merge into a single status. */
export function VehicleStatusStrip({ vehicle }: { vehicle: VehicleProfile }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="vehicle-status-strip">
      <StatusCell label="Lifecycle" value={LIFECYCLE_STATUS_LABELS[vehicle.lifecycleStatus]}>
        <StatusPill status={vehicle.lifecycleStatus} />
      </StatusCell>
      <StatusCell label="Operational" value={OPERATIONAL_STATUS_LABELS[vehicle.operationalStatus]}>
        <StatusPill status={vehicle.operationalStatus} />
      </StatusCell>
      <StatusCell label="Compliance" value={COMPLIANCE_STATUS_LABELS[vehicle.complianceStatus]}>
        <StatusPill status={vehicle.complianceStatus} />
      </StatusCell>
      <StatusCell label="Condition" value={CONDITION_STATUS_LABELS[vehicle.conditionStatus]}>
        <StatusPill status={vehicle.conditionStatus} />
      </StatusCell>
    </div>
  )
}

function StatusCell({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children: React.ReactNode
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      <span className="sr-only">{value}</span>
    </div>
  )
}
