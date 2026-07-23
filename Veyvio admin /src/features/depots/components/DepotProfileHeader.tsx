import { Link } from 'react-router-dom'
import { StatusPill } from '@/components/ui/status'
import { DEPOT_STATUS_LABELS } from '@/lib/depots/constants'
import type { DepotOpsSnapshot, DepotProfile } from '@/lib/depots/types'

export function DepotBackLink() {
  return (
    <Link to="/depots" className="text-sm font-medium text-command-600 hover:underline">
      ← Back to depots
    </Link>
  )
}

export function DepotProfileHeader({
  depot,
  snapshot,
  actions,
}: {
  depot: DepotProfile
  snapshot?: DepotOpsSnapshot
  actions?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-command-600">{depot.code}</p>
          <h1 className="text-2xl font-semibold text-ink">{depot.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{depot.address}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={depot.status} />
            <span className="text-xs text-muted">{DEPOT_STATUS_LABELS[depot.status]}</span>
            <StatusPill status={depot.readiness.level === 'ready' ? 'ready' : depot.readiness.level} />
            <span className="text-xs text-muted">
              Readiness: {depot.readiness.level.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Manager: {depot.contacts.managerName ?? '—'}
            {depot.contacts.yardSupervisor ? ` · Yard: ${depot.contacts.yardSupervisor}` : ''}
            {snapshot ? ` · ${snapshot.vehiclesAssigned} vehicles · ${snapshot.driversTotal} drivers` : ''}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
