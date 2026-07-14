import { Link } from 'react-router-dom'
import type { LiveDispatchVehicle } from '@/lib/api/types'

function driverInitials(name: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?'
}

export function LiveMapDriverCard({ vehicle }: { vehicle: LiveDispatchVehicle }) {
  return (
    <div className="pointer-events-auto w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
          {driverInitials(vehicle.driverName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {vehicle.driverName ?? 'No driver'}
          </p>
          <p className="truncate text-xs text-slate-500">
            {vehicle.vehicleRegistration ?? vehicle.reference}
          </p>
        </div>
      </div>

      <p className="mt-2 truncate text-xs text-slate-600">
        {vehicle.routeName ?? vehicle.reference}
      </p>

      {vehicle.nextStop && (
        <p className="mt-1 text-xs text-slate-500">
          ~{vehicle.nextStop.etaMinutes}m to {vehicle.nextStop.name}
        </p>
      )}

      {vehicle.isStale && (
        <p className="mt-1 text-xs font-medium text-amber-700">
          GPS stale — last update {vehicle.staleMinutes ?? '?'} min ago
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        {vehicle.driverId && (
          <Link
            to={`/drivers/${vehicle.driverId}`}
            className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
          >
            Profile
          </Link>
        )}
        <Link
          to="/messages"
          className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
        >
          Message
        </Link>
        {vehicle.lastLatitude != null && vehicle.lastLongitude != null && (
          <a
            href={`https://www.google.com/maps?q=${vehicle.lastLatitude},${vehicle.lastLongitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-blue-50 px-2 py-1 text-blue-800 hover:bg-blue-100"
          >
            Directions
          </a>
        )}
      </div>
    </div>
  )
}
