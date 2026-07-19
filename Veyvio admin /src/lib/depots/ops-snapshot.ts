import type { DutyRecord } from '@/lib/api/types'
import type { DriverProfile } from '@/lib/drivers/types'
import type { StaffProfile } from '@/lib/staff/types'
import type { VehicleProfile } from '@/lib/vehicles/types'
import type { DepotOpsSnapshot } from './types'

const OUT_YARD = new Set(['checked_out', 'unknown_location'])
const WORKSHOP_OPS = new Set(['in_workshop', 'awaiting_parts', 'under_inspection'])

function isOnSite(v: VehicleProfile, depotId: string): boolean {
  if (v.currentDepotId !== depotId) return false
  return !OUT_YARD.has(v.yardStatus)
}

function driverBucket(status: string): 'active' | 'sick' | 'leave' | 'other' {
  const s = status.toLowerCase()
  if (s.includes('sick')) return 'sick'
  if (s.includes('leave') || s.includes('holiday') || s.includes('absent')) return 'leave'
  if (s.includes('active') || s.includes('on_duty') || s.includes('available') || s.includes('eligible')) {
    return 'active'
  }
  return 'other'
}

function runBucket(status: string): 'completed' | 'running' | 'pending' {
  const s = status.toLowerCase()
  if (['completed', 'complete', 'finished', 'closed'].includes(s)) return 'completed'
  if (['in_progress', 'running', 'active', 'on_trip', 'departed'].includes(s)) return 'running'
  return 'pending'
}

export function buildDepotOpsSnapshot(input: {
  depotId: string
  vehicles: VehicleProfile[]
  drivers: DriverProfile[]
  duties: DutyRecord[]
  staff?: StaffProfile[]
  defectsTodayCount?: number
}): DepotOpsSnapshot {
  const { depotId, vehicles, drivers, duties, staff = [] } = input
  const assigned = vehicles.filter((v) => v.homeDepotId === depotId)
  const onSite = vehicles.filter((v) => isOnSite(v, depotId))

  const depotDrivers = drivers.filter((d) => d.depotId === depotId)
  let driversActive = 0
  let driversSick = 0
  let driversLeave = 0
  for (const d of depotDrivers) {
    const bucket = driverBucket(d.operationalStatus ?? d.employmentStatus ?? '')
    if (bucket === 'sick') driversSick += 1
    else if (bucket === 'leave') driversLeave += 1
    else if (bucket === 'active') driversActive += 1
    else driversActive += 1
  }

  const yardStaffOnDuty = staff.filter(
    (s) => s.primaryDepotId === depotId && (s.dutyStatus === 'on_duty' || s.dutyStatus === 'on_break'),
  ).length

  const depotDuties = duties.filter((d) => {
    const veh = d.vehicle
    if (!veh) return false
    const match = vehicles.find((v) => v.id === veh.id)
    return match?.homeDepotId === depotId || match?.currentDepotId === depotId
  })

  let runsCompleted = 0
  let runsRunning = 0
  let runsPending = 0
  for (const d of depotDuties) {
    const b = runBucket(d.status)
    if (b === 'completed') runsCompleted += 1
    else if (b === 'running') runsRunning += 1
    else runsPending += 1
  }

  const checksOutstanding = assigned.filter((v) => v.checksOverdue).length

  return {
    depotId,
    vehiclesAssigned: assigned.length,
    vehiclesAvailable: assigned.filter((v) => v.operationalStatus === 'available').length,
    vehiclesOut: assigned.filter((v) => OUT_YARD.has(v.yardStatus) || v.operationalStatus === 'in_service').length,
    vehiclesWorkshop: assigned.filter((v) => WORKSHOP_OPS.has(v.operationalStatus)).length,
    vehiclesVor: assigned.filter((v) => v.operationalStatus === 'vor').length,
    vehiclesOnSite: onSite.length,
    driversTotal: depotDrivers.length,
    driversActive,
    driversSick,
    driversLeave,
    yardStaffOnDuty,
    runsToday: depotDuties.length,
    runsCompleted,
    runsRunning,
    runsPending,
    defectsToday: input.defectsTodayCount ?? assigned.reduce((n, v) => n + v.openDefectCount, 0),
    checksOutstanding,
    calculatedAt: new Date().toISOString(),
  }
}
