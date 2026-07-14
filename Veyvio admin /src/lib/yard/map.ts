import { DEPOT_ZONES } from './constants'
import type { YardMapVehicleMarker, YardVehicleRow } from './types'

function zoneIdForRow(row: YardVehicleRow, depotId: string): string {
  const zones = DEPOT_ZONES[depotId] ?? DEPOT_ZONES['depot-wembley']!
  const zone = row.zone.toLowerCase()
  if (zone.includes('workshop')) return zones.find((z) => z.kind === 'workshop')?.id ?? 'zone-unallocated'
  if (zone.includes('inspection')) return zones.find((z) => z.kind === 'inspection')?.id ?? 'zone-unallocated'
  if (zone.includes('wash')) return zones.find((z) => z.kind === 'wash')?.id ?? 'zone-unallocated'
  if (zone.includes('fuel')) return zones.find((z) => z.kind === 'fuel')?.id ?? 'zone-unallocated'
  if (zone.includes('charg')) return zones.find((z) => z.kind === 'charge')?.id ?? 'zone-unallocated'
  if (zone.includes('quarantine')) return zones.find((z) => z.kind === 'quarantine')?.id ?? 'zone-unallocated'
  if (zone.includes('unallocated') || !row.bay) return zones.find((z) => z.kind === 'unallocated')?.id ?? 'zone-unallocated'
  if (row.bay.toLowerCase().includes('b')) return zones.find((z) => z.id.includes('bays-b') || z.label.includes('B'))?.id ?? zones[0]!.id
  return zones.find((z) => z.kind === 'bay')?.id ?? zones[0]!.id
}

export function buildMapMarkers(rows: YardVehicleRow[], depotId: string): YardMapVehicleMarker[] {
  return rows
    .filter((r) => r.presenceState === 'in_yard' || r.presenceState === 'entering')
    .map((r) => ({
      vehicleId: r.vehicleId,
      registrationNumber: r.registrationNumber,
      zoneId: zoneIdForRow(r, depotId),
      bay: r.bay,
      readinessState: r.readinessState,
      activityState: r.activityState,
      openTaskCount: r.openTaskCount,
      nextDeparture: r.nextDeparture,
      locationConfidence: r.locationConfidence,
    }))
}
