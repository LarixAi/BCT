import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import {
  FLEET_PRIMARY_CARDS,
  FLEET_SECONDARY_CARDS,
  VEHICLE_CATEGORY_LABELS,
} from '@/lib/vehicles/constants'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

type ListFilter =
  | 'all'
  | 'active'
  | 'available'
  | 'allocated'
  | 'in_service'
  | 'attention'
  | 'vor'
  | 'maintenance'
  | 'checks_overdue'
  | 'expiring'
  | 'mot_due'
  | 'tacho_due'
  | 'retorque_due'
  | 'unknown_location'

export function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [stubNotice, setStubNotice] = useState<string | null>(null)
  const filter = (searchParams.get('filter') as ListFilter) || 'all'

  function showStub(message: string) {
    setStubNotice(message)
    window.setTimeout(() => setStubNotice(null), 4000)
  }

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: summary } = useQuery({
    queryKey: ['vehicle-directory-summary'],
    queryFn: () => api.getVehicleDirectorySummary(),
  })

  const filtered = useMemo(() => filterVehicles(vehicles, filter, search), [vehicles, filter, search])

  function setFilter(next: ListFilter) {
    if (next === 'all') {
      searchParams.delete('filter')
    } else {
      searchParams.set('filter', next)
    }
    setSearchParams(searchParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vehicles</h1>
          <p className="text-sm text-ink-soft">
            Master fleet register — availability, compliance, condition, equipment and readiness across Admin, Yard,
            Maintenance and Driver.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/vehicles/new"
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            Add vehicle
          </Link>
          <button
            type="button"
            onClick={() => showStub('Import will land in a later release.')}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => showStub('Export will land in a later release.')}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => showStub('Bulk actions will land in a later release.')}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Bulk
          </button>
          <Link
            to="/vehicles/vor"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            VOR board
          </Link>
          <Link
            to="/vehicles/compliance"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Compliance
          </Link>
        </div>
      </div>

      {stubNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{stubNotice}</div>
      )}

      {summary && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {FLEET_PRIMARY_CARDS.map((card) => {
              const key = (card.filterKey as ListFilter) ?? 'all'
              const selected = filter === key || (card.id === 'total' && filter === 'all')
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setFilter(card.id === 'total' ? 'all' : key)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                      : 'border-border bg-surface hover:border-border-strong'
                  }`}
                >
                  <p className="text-2xl font-bold tabular-nums text-ink">{summary[card.id]}</p>
                  <p className="text-sm text-ink-soft">{card.label}</p>
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {FLEET_SECONDARY_CARDS.map((card) => {
              const key = (card.filterKey as ListFilter) ?? 'all'
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filter === key
                      ? 'border-command-500 bg-command-50 text-command-800'
                      : 'border-border bg-surface text-ink-soft hover:border-border-strong'
                  }`}
                >
                  {card.label} · {summary[card.id]}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search registration, fleet no, make, depot…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-soft"
          >
            Clear filter
          </button>
        )}
      </div>

      <SectionCard title="Fleet register" description={`${filtered.length} vehicles`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1600px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Vehicle</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Depot</th>
                  <th className="pb-2 pr-3 font-medium">Capacity</th>
                  <th className="pb-2 pr-3 font-medium">Operational</th>
                  <th className="pb-2 pr-3 font-medium">Readiness</th>
                  <th className="pb-2 pr-3 font-medium">Lifecycle</th>
                  <th className="pb-2 pr-3 font-medium">Condition</th>
                  <th className="pb-2 pr-3 font-medium">Compliance</th>
                  <th className="pb-2 pr-3 font-medium">Driver</th>
                  <th className="pb-2 pr-3 font-medium">Duty</th>
                  <th className="pb-2 pr-3 font-medium">MOT</th>
                  <th className="pb-2 pr-3 font-medium">Defects</th>
                  <th className="pb-2 pr-3 font-medium">Mileage</th>
                  <th className="pb-2 pr-3 font-medium">Last seen</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vehicle) => (
                  <VehicleRow key={vehicle.id} vehicle={vehicle} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function VehicleRow({ vehicle }: { vehicle: VehicleProfile }) {
  const expiry = expiryTone(vehicle.nearestExpiryDate)
  const lastSeen =
    vehicle.telematics?.lastSyncAt ?? vehicle.lastCheckAt ?? vehicle.updatedAt

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
      <td className="py-2.5 pr-3">
        <Link to={`/vehicles/${vehicle.id}`} className="font-medium text-command-600 hover:underline">
          {vehicle.registrationNumber}
        </Link>
        <p className="text-xs text-muted">
          {vehicle.fleetNumber ? `${vehicle.fleetNumber} · ` : ''}
          {vehicle.reference}
        </p>
        <p className="text-xs text-muted">
          {vehicle.make} {vehicle.model}
        </p>
      </td>
      <td className="py-2.5 pr-3 text-ink-soft">{VEHICLE_CATEGORY_LABELS[vehicle.vehicleCategory]}</td>
      <td className="py-2.5 pr-3 text-ink-soft">{vehicle.currentDepotName}</td>
      <td className="py-2.5 pr-3 text-ink-soft">
        {vehicle.seatingCapacity}
        {vehicle.wheelchairCapacity > 0 && ` · ${vehicle.wheelchairCapacity} WC`}
      </td>
      <td className="py-2.5 pr-3">
        <StatusPill status={vehicle.operationalStatus} />
      </td>
      <td className="py-2.5 pr-3">
        <StatusPill status={vehicle.releaseDecision} />
        {vehicle.readiness && !vehicle.readiness.assignmentEligible && (
          <p className="mt-0.5 text-[11px] text-red-700">Not assignable</p>
        )}
      </td>
      <td className="py-2.5 pr-3">
        <StatusPill status={vehicle.lifecycleStatus} />
      </td>
      <td className="py-2.5 pr-3">
        <StatusPill status={vehicle.conditionStatus} />
      </td>
      <td className="py-2.5 pr-3">
        <StatusPill status={vehicle.complianceStatus} />
        {vehicle.nearestExpiryDate && (
          <p
            className={`text-xs ${
              expiry === 'expired' ? 'text-red-600' : expiry === 'warning' ? 'text-amber-600' : 'text-muted'
            }`}
          >
            {vehicle.nearestExpiryLabel}: {formatDate(vehicle.nearestExpiryDate)}
          </p>
        )}
      </td>
      <td className="py-2.5 pr-3 text-xs text-ink-soft">
        {vehicle.currentDriverName ?? vehicle.nextDriverName ?? '—'}
      </td>
      <td className="py-2.5 pr-3 text-xs text-ink-soft">
        {vehicle.currentRunReference ?? vehicle.nextRunReference ?? '—'}
      </td>
      <td className="py-2.5 pr-3 text-xs text-ink-soft">
        {vehicle.motExpiry ? formatDate(vehicle.motExpiry) : '—'}
      </td>
      <td className="py-2.5 pr-3 text-ink-soft">
        {vehicle.openDefectCount > 0 ? (
          <span className={vehicle.criticalDefectCount > 0 ? 'font-medium text-red-700' : ''}>
            {vehicle.openDefectCount}
            {vehicle.criticalDefectCount > 0 && ` (${vehicle.criticalDefectCount} critical)`}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="py-2.5 pr-3 text-ink-soft tabular-nums">
        {vehicle.mileage != null ? vehicle.mileage.toLocaleString() : '—'}
      </td>
      <td className="py-2.5 pr-3 text-xs text-ink-soft">
        {lastSeen
          ? new Date(lastSeen).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '—'}
      </td>
      <td className="py-2.5">
        <div className="flex flex-col gap-1">
          <Link to={`/vehicles/${vehicle.id}`} className="text-xs font-medium text-command-600 hover:underline">
            Open
          </Link>
          {vehicle.lifecycleStatus === 'awaiting_onboarding' && (
            <Link
              to={`/vehicles/${vehicle.id}/onboarding`}
              className="text-xs font-medium text-amber-700 hover:underline"
            >
              Resume onboarding
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}

function filterVehicles(vehicles: VehicleProfile[], filter: ListFilter, search: string): VehicleProfile[] {
  const WARN = 30
  const warnThreshold = Date.now() + WARN * 24 * 60 * 60 * 1000
  let list = vehicles

  switch (filter) {
    case 'active':
      list = list.filter((v) => v.lifecycleStatus === 'active')
      break
    case 'available':
      list = list.filter((v) => v.operationalStatus === 'available')
      break
    case 'allocated':
      list = list.filter((v) => ['allocated', 'reserved'].includes(v.operationalStatus))
      break
    case 'in_service':
      list = list.filter((v) => v.operationalStatus === 'in_service')
      break
    case 'attention':
      list = list.filter(
        (v) =>
          v.readiness?.assignmentEligible === false ||
          (v.conditionStatus != null && v.conditionStatus !== 'no_known_issues') ||
          v.complianceStatus === 'expiring_soon' ||
          v.complianceStatus === 'non_compliant' ||
          v.checksOverdue ||
          v.openDefectCount > 0,
      )
      break
    case 'vor':
      list = list.filter((v) => v.operationalStatus === 'vor')
      break
    case 'maintenance':
      list = list.filter((v) => ['in_workshop', 'awaiting_parts', 'under_inspection'].includes(v.operationalStatus))
      break
    case 'checks_overdue':
      list = list.filter((v) => v.checksOverdue)
      break
    case 'expiring':
      list = list.filter((v) => v.complianceStatus === 'expiring_soon')
      break
    case 'mot_due':
      list = list.filter(
        (v) => v.motExpiry && new Date(v.motExpiry).getTime() < warnThreshold && new Date(v.motExpiry).getTime() > Date.now(),
      )
      break
    case 'tacho_due':
      list = list.filter(
        (v) =>
          v.tachographCalibrationExpiry &&
          new Date(v.tachographCalibrationExpiry).getTime() < warnThreshold &&
          new Date(v.tachographCalibrationExpiry).getTime() > Date.now(),
      )
      break
    case 'retorque_due':
      list = list.filter(
        (v) => v.wheelRetorqueDueAt && new Date(v.wheelRetorqueDueAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000,
      )
      break
    case 'unknown_location':
      list = list.filter((v) => v.yardStatus === 'unknown_location')
      break
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        v.reference.toLowerCase().includes(q) ||
        v.fleetNumber?.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.currentDepotName.toLowerCase().includes(q),
    )
  }

  return list
}
