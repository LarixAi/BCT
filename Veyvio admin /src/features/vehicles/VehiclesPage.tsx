import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import { FLEET_DIRECTORY_CARDS, VEHICLE_CATEGORY_LABELS } from '@/lib/vehicles/constants'
import { canCreateVehicle } from '@/lib/vehicles/permissions'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

type ListFilter =
  | 'all'
  | 'available'
  | 'allocated'
  | 'in_service'
  | 'vor'
  | 'maintenance'
  | 'checks_overdue'
  | 'expiring'
  | 'mot_due'
  | 'tacho_due'
  | 'retorque_due'
  | 'unknown_location'

export function VehiclesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const filter = (searchParams.get('filter') as ListFilter) || 'all'

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: summary } = useQuery({
    queryKey: ['vehicle-directory-summary'],
    queryFn: () => api.getVehicleDirectorySummary(),
  })

  const filtered = useMemo(() => filterVehicles(vehicles, filter, search), [vehicles, filter, search])
  const canCreate = canCreateVehicle(user?.permissions ?? [])

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
          <h1 className="text-2xl font-semibold text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-600">
            Can this vehicle safely and compliantly leave the yard and complete its assigned work?
          </p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <Link to="/vehicles/new" className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700">
              Add vehicle
            </Link>
            <Link to="/vehicles/vor" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              VOR board
            </Link>
            <Link to="/vehicles/compliance" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Compliance
            </Link>
            <Link to="/vehicles/intelligence" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Intelligence
            </Link>
          </div>
        )}
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FLEET_DIRECTORY_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setFilter((card.filterKey as ListFilter) ?? 'all')}
              className={`rounded-xl border p-4 text-left transition ${
                filter === (card.filterKey ?? 'all')
                  ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-2xl font-bold tabular-nums text-slate-900">{summary[card.id]}</p>
              <p className="text-sm text-slate-600">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search registration, fleet no, make, depot…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            Clear filter
          </button>
        )}
      </div>

      <SectionCard title="Fleet register" description={`${filtered.length} vehicles`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Registration</th>
                  <th className="pb-2 pr-4 font-medium">Fleet no</th>
                  <th className="pb-2 pr-4 font-medium">Vehicle</th>
                  <th className="pb-2 pr-4 font-medium">Depot</th>
                  <th className="pb-2 pr-4 font-medium">Location</th>
                  <th className="pb-2 pr-4 font-medium">Capacity</th>
                  <th className="pb-2 pr-4 font-medium">Operational</th>
                  <th className="pb-2 pr-4 font-medium">Release</th>
                  <th className="pb-2 pr-4 font-medium">Driver / run</th>
                  <th className="pb-2 pr-4 font-medium">Last check</th>
                  <th className="pb-2 pr-4 font-medium">Compliance</th>
                  <th className="pb-2 font-medium">Defects</th>
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

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
      <td className="py-2.5 pr-4">
        <Link to={`/vehicles/${vehicle.id}`} className="font-medium text-command-600 hover:underline">
          {vehicle.registrationNumber}
        </Link>
        <p className="text-xs text-slate-500">{vehicle.reference}</p>
      </td>
      <td className="py-2.5 pr-4 text-slate-600">{vehicle.fleetNumber ?? '—'}</td>
      <td className="py-2.5 pr-4 text-slate-600">
        {vehicle.make} {vehicle.model}
        <span className="ml-1 text-xs text-slate-400">({VEHICLE_CATEGORY_LABELS[vehicle.vehicleCategory]})</span>
      </td>
      <td className="py-2.5 pr-4 text-slate-600">{vehicle.currentDepotName}</td>
      <td className="py-2.5 pr-4 text-xs text-slate-600">
        {vehicle.currentLocationLabel ?? vehicle.parkingBay ?? '—'}
      </td>
      <td className="py-2.5 pr-4 text-slate-600">
        {vehicle.seatingCapacity} seats
        {vehicle.wheelchairCapacity > 0 && ` · ${vehicle.wheelchairCapacity} WC`}
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={vehicle.operationalStatus} />
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={vehicle.releaseDecision} />
      </td>
      <td className="py-2.5 pr-4 text-xs text-slate-600">
        {vehicle.currentDriverName ?? vehicle.nextDriverName ?? '—'}
        {(vehicle.currentRunReference || vehicle.nextRunReference) && (
          <p className="text-slate-400">{vehicle.currentRunReference ?? vehicle.nextRunReference}</p>
        )}
      </td>
      <td className="py-2.5 pr-4 text-xs text-slate-600">
        {vehicle.lastCheckAt
          ? new Date(vehicle.lastCheckAt).toLocaleString('en-GB', { day: 'numeric', month: 'short' })
          : '—'}
        {vehicle.checksOverdue && <p className="text-red-600">Overdue</p>}
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={vehicle.complianceStatus} />
        {vehicle.nearestExpiryDate && (
          <p className={`text-xs ${expiry === 'expired' ? 'text-red-600' : expiry === 'warning' ? 'text-amber-600' : 'text-slate-400'}`}>
            {vehicle.nearestExpiryLabel}: {formatDate(vehicle.nearestExpiryDate)}
          </p>
        )}
      </td>
      <td className="py-2.5 text-slate-600">
        {vehicle.openDefectCount > 0 ? (
          <span className={vehicle.criticalDefectCount > 0 ? 'font-medium text-red-700' : ''}>
            {vehicle.openDefectCount}
            {vehicle.criticalDefectCount > 0 && ` (${vehicle.criticalDefectCount} critical)`}
          </span>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}

function filterVehicles(vehicles: VehicleProfile[], filter: ListFilter, search: string): VehicleProfile[] {
  const WARN = 30
  const warnThreshold = Date.now() + WARN * 24 * 60 * 60 * 1000
  let list = vehicles

  switch (filter) {
    case 'available':
      list = list.filter((v) => v.operationalStatus === 'available')
      break
    case 'allocated':
      list = list.filter((v) => ['allocated', 'reserved'].includes(v.operationalStatus))
      break
    case 'in_service':
      list = list.filter((v) => v.operationalStatus === 'in_service')
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
