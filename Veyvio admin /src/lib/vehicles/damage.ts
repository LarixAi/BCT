import type { DamageZone } from './types'

export const DAMAGE_ZONES: { id: DamageZone; label: string; row: number; col: number }[] = [
  { id: 'front_bumper', label: 'Front bumper', row: 0, col: 1 },
  { id: 'bonnet', label: 'Bonnet', row: 1, col: 1 },
  { id: 'windscreen', label: 'Windscreen', row: 2, col: 1 },
  { id: 'roof', label: 'Roof', row: 3, col: 1 },
  { id: 'driver_front', label: 'Driver front', row: 1, col: 0 },
  { id: 'driver_centre', label: 'Driver centre', row: 2, col: 0 },
  { id: 'driver_rear', label: 'Driver rear', row: 3, col: 0 },
  { id: 'passenger_front', label: 'Passenger front', row: 1, col: 2 },
  { id: 'passenger_centre', label: 'Passenger centre', row: 2, col: 2 },
  { id: 'passenger_rear', label: 'Passenger rear', row: 3, col: 2 },
  { id: 'rear', label: 'Rear', row: 4, col: 1 },
  { id: 'doors', label: 'Doors', row: 2, col: 1 },
  { id: 'mirrors', label: 'Mirrors', row: 1, col: 1 },
  { id: 'lights', label: 'Lights', row: 0, col: 1 },
  { id: 'wheels', label: 'Wheels', row: 4, col: 0 },
  { id: 'interior', label: 'Interior', row: 3, col: 1 },
  { id: 'wheelchair_area', label: 'Wheelchair area', row: 3, col: 2 },
]

export const DAMAGE_CLASSIFICATION_LABELS = {
  existing: 'Existing damage',
  possible_deterioration: 'Possible deterioration',
  likely_new: 'Likely new damage',
  unable_to_determine: 'Unable to determine',
} as const

export function zoneLabel(zone: DamageZone): string {
  return DAMAGE_ZONES.find((z) => z.id === zone)?.label ?? zone.replace(/_/g, ' ')
}
