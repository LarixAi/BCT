import type { BookingDraft, BookingRecord, EditImpact } from './types'

export function calculateEditImpact(
  original: BookingRecord,
  updated: BookingDraft,
  assignments?: { driverName?: string; vehicleReg?: string; runRef?: string },
): EditImpact {
  const origTrip = original.trips[0]
  const newTrip = updated.trips[0]
  const origPickup = origTrip?.requestedPickupTime ?? origTrip?.calculatedPickupTime ?? '07:45'
  const newPickup = newTrip?.requestedPickupTime ?? newTrip?.calculatedPickupTime ?? origPickup

  const origMins = timeToMinutes(origPickup)
  const newMins = timeToMinutes(newPickup)
  const timeShiftMinutes = newMins - origMins

  const items: string[] = []
  if (timeShiftMinutes !== 0) {
    items.push(`Pickup time shift of approximately ${Math.abs(timeShiftMinutes)} minutes`)
  }
  if (updated.passengers.length !== original.passengers.length) {
    items.push(`${updated.passengers.length} passenger(s) on booking`)
  }
  if (assignments?.driverName) {
    items.push(`Driver assignment: ${assignments.driverName}`)
  }
  if (assignments?.vehicleReg) {
    items.push(`Vehicle: ${assignments.vehicleReg}`)
  }
  if (assignments?.runRef) {
    items.push(`Run ${assignments.runRef} may need replanning`)
  }
  if (timeShiftMinutes > 10) {
    items.push('School arrival time may be affected')
  }
  if (timeShiftMinutes > 0) {
    items.push('Following pickup on shared run may be delayed')
  }

  return {
    affectedPassengers: updated.passengers.length,
    affectedDrivers: assignments?.driverName ? [assignments.driverName] : [],
    affectedVehicles: assignments?.vehicleReg ? [assignments.vehicleReg] : [],
    affectedRuns: assignments?.runRef ? [assignments.runRef] : [],
    timeShiftMinutes,
    items: items.length ? items : ['No significant operational impact detected'],
  }
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
