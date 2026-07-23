import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LiveVehicleMap } from '@/components/map/LiveVehicleMap'
import { SectionCard } from '@/components/ui'
import { vehicleToMapMarker } from '@/lib/vehicles/telematics-map'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleTelematicsPanel({ vehicle }: { vehicle: VehicleProfile }) {
  const t = vehicle.telematics
  const mapVehicle = useMemo(() => vehicleToMapMarker(vehicle), [vehicle])

  const { data: track } = useQuery({
    queryKey: ['duty-track', vehicle.currentRunId],
    queryFn: () => api.getDutyTrack(vehicle.currentRunId!),
    enabled: Boolean(vehicle.currentRunId),
    refetchInterval: 30_000,
  })

  const trailLine = useMemo(
    () => (track?.pings ?? []).map((p) => [p.longitude, p.latitude] as [number, number]),
    [track],
  )

  if (!t?.connected) {
    return (
      <SectionCard title="Live telematics" description="GPS and fuel data from connected devices">
        <p className="text-sm text-muted">
          No live feed for this vehicle. Telematics appears when the vehicle is on an active duty with GPS reporting.
        </p>
      </SectionCard>
    )
  }

  const freshness =
    t.gpsFreshnessSeconds != null
      ? t.gpsFreshnessSeconds < 120
        ? 'Live'
        : `${Math.round(t.gpsFreshnessSeconds / 60)} min ago`
      : '—'

  return (
    <SectionCard title="Live telematics" description={`${t.provider} · last sync ${freshness}`} flush>
      <div className="border-b border-border p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Position" value={t.latitude != null && t.longitude != null ? `${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}` : '—'} />
          <Row label="Speed" value={t.speedMph != null ? `${t.speedMph} mph` : '—'} />
          <Row label="Heading" value={t.heading != null ? `${t.heading}°` : '—'} />
          <Row label="Ignition" value={t.ignitionOn ? 'On' : 'Off'} />
          <Row label="Odometer" value={t.odometerMiles != null ? `${t.odometerMiles.toLocaleString()} mi` : '—'} />
          <Row
            label="Fuel / charge"
            value={
              t.fuelPercent != null
                ? `${t.fuelPercent}% fuel`
                : t.batteryPercent != null
                  ? `${t.batteryPercent}% charge`
                  : '—'
            }
          />
        </dl>
        {vehicle.currentRunId && (
          <p className="mt-3 text-sm">
            <Link to={`/runs/${vehicle.currentRunId}`} className="font-medium text-command-600 hover:underline">
              View duty on map →
            </Link>
          </p>
        )}
      </div>
      {mapVehicle && (
        <LiveVehicleMap
          vehicles={[mapVehicle]}
          selectedVehicle={mapVehicle}
          trailLine={trailLine}
          className="h-56 min-h-[224px]"
          edgeToEdge
        />
      )}
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
