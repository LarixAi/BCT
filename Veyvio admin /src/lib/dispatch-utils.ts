import type { DriverRecord, DutyRecord, VehicleRecord } from '@/lib/api/types'
import { getDriverComplianceBlocks, getDriverComplianceWarnings } from '@/lib/eligibility/engine'

export type DispatchColumn = 'unassigned' | 'assigned' | 'in_progress' | 'completed'

export function columnForDuty(duty: DutyRecord): DispatchColumn {
  if (duty.status === 'completed') return 'completed'
  if (duty.status === 'in_progress') return 'in_progress'
  if (duty.status === 'assigned' || (duty.driver && duty.vehicle)) return 'assigned'
  return 'unassigned'
}

export function dutiesForColumn(duties: DutyRecord[], column: DispatchColumn) {
  return duties.filter((d) => columnForDuty(d) === column)
}

export function getDutyComplianceBlocks(
  driver: DriverRecord | null,
  vehicle: VehicleRecord | null,
): string[] {
  return getDriverComplianceBlocks(driver, vehicle)
}

export function getDutyComplianceWarnings(
  driver: DriverRecord | null,
  vehicle: VehicleRecord | null,
): string[] {
  return getDriverComplianceWarnings(driver, vehicle)
}

export function getDutyConflicts(duty: DutyRecord, allDuties: DutyRecord[]): string[] {
  const warnings: string[] = []
  if (duty.status === 'completed') return warnings

  for (const other of allDuties) {
    if (other.id === duty.id || other.status === 'completed') continue

    if (duty.driver?.id && other.driver?.id === duty.driver.id) {
      warnings.push(
        `Driver ${duty.driver.firstName} ${duty.driver.lastName} is also on ${other.route?.name ?? other.reference}`,
      )
    }
    if (duty.vehicle?.id && other.vehicle?.id === duty.vehicle.id) {
      warnings.push(
        `Vehicle ${duty.vehicle.registrationNumber} is also on ${other.route?.name ?? other.reference}`,
      )
    }
  }

  return warnings
}

export function updateForColumn(column: DispatchColumn): Record<string, unknown> | null {
  switch (column) {
    case 'unassigned':
      return { status: 'unassigned', driverId: null, vehicleId: null }
    case 'assigned':
      return { status: 'assigned' }
    case 'in_progress':
      return { status: 'in_progress' }
    case 'completed':
      return { status: 'completed' }
    default:
      return null
  }
}

export function applyUpdatePreview(
  duty: DutyRecord,
  update: Record<string, unknown>,
): DutyRecord {
  const next = { ...duty, status: (update.status as string) ?? duty.status }
  if ('driverId' in update && update.driverId === null) next.driver = null
  if ('vehicleId' in update && update.vehicleId === null) next.vehicle = null
  return next
}

export function resolveDriver(
  dutyDriver: DutyRecord['driver'],
  drivers: DriverRecord[],
): DriverRecord | null {
  if (!dutyDriver) return null
  return drivers.find((d) => d.id === dutyDriver.id) ?? dutyDriver
}

export function resolveVehicle(
  dutyVehicle: DutyRecord['vehicle'],
  vehicles: VehicleRecord[],
): VehicleRecord | null {
  if (!dutyVehicle) return null
  return vehicles.find((v) => v.id === dutyVehicle.id) ?? dutyVehicle
}
