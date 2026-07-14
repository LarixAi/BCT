import { Link } from 'react-router-dom'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  COMPLIANCE_STATUS_LABELS,
  FUEL_TYPE_LABELS,
  OPERATIONAL_STATUS_LABELS,
  READINESS_STATUS_LABELS,
  RELEASE_DECISION_LABELS,
  VEHICLE_CATEGORY_LABELS,
  YARD_STATUS_LABELS,
} from '@/lib/vehicles/constants'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { ReleasePanel } from './ReleasePanel'

export function VehicleProfileHeader({
  vehicle,
  actions,
}: {
  vehicle: VehicleProfile
  actions?: React.ReactNode
}) {
  const fuelLabel =
    vehicle.fuelType === 'electric' && vehicle.batteryLevelPercent != null
      ? `${vehicle.batteryLevelPercent}% charge`
      : vehicle.fuelLevelPercent != null
        ? `${vehicle.fuelLevelPercent}% fuel`
        : '—'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-600">
            {vehicle.registrationNumber.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium text-command-600">{vehicle.reference}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{vehicle.registrationNumber}</h1>
            <p className="text-sm text-slate-600">
              {vehicle.make} {vehicle.model} · {vehicle.seatingCapacity} seats
              {vehicle.wheelchairCapacity > 0 && ` · ${vehicle.wheelchairCapacity} wheelchair`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill status={vehicle.operationalStatus} />
              <StatusPill status={vehicle.complianceStatus} />
              <StatusPill status={vehicle.releaseDecision} />
              <StatusPill status={vehicle.yardStatus} />
            </div>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReleasePanel release={vehicle.release} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm lg:col-span-2">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Meta label="Fleet number" value={vehicle.fleetNumber ?? '—'} />
            <Meta label="Category" value={VEHICLE_CATEGORY_LABELS[vehicle.vehicleCategory]} />
            <Meta label="Home depot" value={vehicle.homeDepotName} />
            <Meta label="Current location" value={vehicle.currentLocationLabel ?? YARD_STATUS_LABELS[vehicle.yardStatus]} />
            <Meta label="Current driver" value={vehicle.currentDriverName ?? '—'} />
            <Meta label="Current run" value={vehicle.currentRunReference ?? '—'} />
            <Meta label="Mileage" value={vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} mi` : '—'} />
            <Meta label="Fuel / charge" value={fuelLabel} />
            <Meta label="Operational" value={OPERATIONAL_STATUS_LABELS[vehicle.operationalStatus]} />
            <Meta label="Compliance" value={COMPLIANCE_STATUS_LABELS[vehicle.complianceStatus]} />
            <Meta label="Release" value={RELEASE_DECISION_LABELS[vehicle.releaseDecision]} />
            <Meta label="Readiness" value={READINESS_STATUS_LABELS[vehicle.readinessStatus]} />
            <Meta label="Fuel type" value={FUEL_TYPE_LABELS[vehicle.fuelType]} />
            <Meta label="Open defects" value={String(vehicle.openDefectCount)} />
            <Meta
              label="Nearest expiry"
              value={
                vehicle.nearestExpiryDate
                  ? `${vehicle.nearestExpiryLabel}: ${formatDate(vehicle.nearestExpiryDate)}`
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

export function VehicleBackLink() {
  return (
    <Link to="/vehicles" className="text-sm font-medium text-command-600 hover:underline">
      ← Back to vehicles
    </Link>
  )
}
