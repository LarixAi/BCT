import type { AutoPlanProposal, BookingDraft } from './types'
import type { DriverProfile } from '@/lib/drivers/types'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { evaluateDriverEligibility, jobContextFromBookingRequirements } from '@/lib/eligibility/engine'
import { evaluateVehicleRelease } from '@/lib/vehicles/release'

export function generateAutoPlanProposal(
  draft: BookingDraft,
  driverProfiles: DriverProfile[],
  vehicleProfiles: VehicleProfile[],
): AutoPlanProposal | null {
  const jobCtx = jobContextFromBookingRequirements({
    wheelchairAccessible: draft.requirements.wheelchairAccessible,
    safeguardingRequired: draft.passengers.some((p) => p.safeguardingFlag),
    schoolContract: draft.bookingType === 'school',
    escortRequired: draft.requirements.passengerAssistant,
  })

  const vehicleCtx = {
    wheelchairRequired: jobCtx.wheelchairRequired,
    schoolContract: jobCtx.schoolContract,
    minSeatingCapacity: draft.passengers.length || undefined,
  }

  const suitableVehicles = vehicleProfiles.filter((v) => evaluateVehicleRelease(v, vehicleCtx).canAllocate)

  const eligibleDriver = driverProfiles.find((d) => evaluateDriverEligibility(d, jobCtx).canAssign)
  const vehicle = suitableVehicles[0]
  if (!eligibleDriver || !vehicle) return null

  const stops = draft.trips.flatMap((t) => t.stops.filter((s) => s.type === 'pickup').map((s) => s.name))

  return {
    driverId: eligibleDriver.id,
    driverName: `${eligibleDriver.firstName} ${eligibleDriver.lastName}`,
    vehicleId: vehicle.id,
    vehicleRegistration: vehicle.registrationNumber,
    runReference: `RUN-PROP-${Date.now().toString().slice(-4)}`,
    punctualityScore: 92,
    deadMileageKm: 4.2,
    estimatedCost: draft.pricing.estimatedCost || 54,
    pickupSequence: stops.length ? stops : ['Pickup 1', 'Pickup 2', 'School drop-off'],
    notes: 'Proposal requires dispatcher approval. Driver passed eligibility checks for this booking.',
  }
}
