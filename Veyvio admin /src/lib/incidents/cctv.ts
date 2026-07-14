import type { IncidentCctvAsset } from './types'

const DEPOT_CAMERAS: Record<string, Omit<IncidentCctvAsset, 'id' | 'clipRequested' | 'clipRequestedAt' | 'preservedUntil'>[]> = {
  'depot-wembley': [
    { label: 'Yard entrance — north', depotId: 'depot-wembley', coverageArea: 'Vehicle exit lane', retentionDays: 30, available: true },
    { label: 'Workshop bay 2', depotId: 'depot-wembley', coverageArea: 'Maintenance area', retentionDays: 14, available: true },
    { label: 'Staff entrance CCTV', depotId: 'depot-wembley', coverageArea: 'Depot perimeter', retentionDays: 30, available: false },
  ],
  'depot-croydon': [
    { label: 'Yard reversing lane', depotId: 'depot-croydon', coverageArea: 'Reversing zone', retentionDays: 30, available: true },
    { label: 'Fuel island', depotId: 'depot-croydon', coverageArea: 'Fuel pumps', retentionDays: 21, available: true },
  ],
}

export function defaultCctvAssetsForDepot(depotId: string): IncidentCctvAsset[] {
  const cameras = DEPOT_CAMERAS[depotId] ?? DEPOT_CAMERAS['depot-wembley'] ?? []
  return cameras.map((cam, i) => ({
    ...cam,
    id: `cctv-${depotId}-${i}`,
    clipRequested: false,
    clipRequestedAt: null,
    preservedUntil: null,
  }))
}
