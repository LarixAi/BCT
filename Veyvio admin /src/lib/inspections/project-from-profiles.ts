import type { VehicleProfile } from '@/lib/vehicles/types'
import { buildInspectionsHub } from './aggregate'
import { INSPECTION_PROVIDERS } from './seed'
import type { InspectionRecord, InspectionsHubData } from './types'

const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

/** Live / empty-backend projection: formal inspection stubs from vehicle compliance dates. */
export function projectInspectionsFromProfiles(profiles: VehicleProfile[]): InspectionsHubData {
  const register: InspectionRecord[] = []
  const nowIso = new Date().toISOString()
  const list = Array.isArray(profiles) ? profiles : []

  for (const p of list) {
    if (!p?.id || !p.registrationNumber) continue
    if (p.lifecycleStatus && p.lifecycleStatus !== 'active' && p.lifecycleStatus !== 'awaiting_onboarding') {
      continue
    }

    if (p.nextMaintenanceDate) {
      const due = String(p.nextMaintenanceDate).slice(0, 10)
      const overdue = due < daysFromNow(0)
      register.push({
        id: `live-pmi-${p.id}`,
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber ?? null,
        vehicleType: p.vehicleCategory ?? 'vehicle',
        depot: p.currentDepotName || p.homeDepotName || 'Depot',
        inspectionType: 'safety_pmi',
        intervalWeeks: p.pmiInterval?.intervalWeeks ?? 8,
        dueDate: due,
        bookedDate: overdue ? null : due,
        odometer: p.mileage ?? null,
        scheduledMileage: p.nextMaintenanceMileage ?? null,
        provider: 'Fleet Workshop',
        inspectorName: null,
        bookingStatus: overdue ? 'unscheduled' : 'booked',
        status: overdue ? 'due' : 'scheduled',
        outcome: 'pending',
        operationalStatus: p.operationalStatus ?? 'available',
        previousInspectionDate: p.pmiInterval?.lastCompletedAt ?? null,
        nextProjectedDate: due,
        linkedDefects: [],
        linkedWorkOrders: [],
        checklist: null,
        evidenceSummary: [],
        signedOffAt: null,
        signedOffBy: null,
        importFileName: null,
        driverInstruction: overdue
          ? 'Return to depot — Safety Inspection (PMI) is overdue.'
          : 'Return to depot by the booked PMI date.',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    }

    if (p.motExpiry) {
      const due = String(p.motExpiry).slice(0, 10)
      register.push({
        id: `live-annual-${p.id}`,
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber ?? null,
        vehicleType: p.vehicleCategory ?? 'vehicle',
        depot: p.currentDepotName || p.homeDepotName || 'Depot',
        inspectionType: 'annual_prep',
        intervalWeeks: null,
        dueDate: due,
        bookedDate: due,
        odometer: p.mileage ?? null,
        scheduledMileage: null,
        provider: 'DVSA approved test station',
        inspectorName: null,
        bookingStatus: 'booked',
        status: due < daysFromNow(0) ? 'due' : 'scheduled',
        outcome: 'pending',
        operationalStatus: p.operationalStatus ?? 'available',
        previousInspectionDate: null,
        nextProjectedDate: due,
        linkedDefects: [],
        linkedWorkOrders: [],
        checklist: null,
        evidenceSummary: [],
        signedOffAt: null,
        signedOffBy: null,
        importFileName: null,
        driverInstruction: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    }
  }

  if (register.length === 0) {
    return {
      summary: {
        dueToday: 0,
        dueWithin7Days: 0,
        overdue: 0,
        inProgress: 0,
        awaitingRectification: 0,
        awaitingSignOff: 0,
        failedVor: 0,
        complianceRate90d: 100,
      },
      register: [],
      calendar: [],
      providers: INSPECTION_PROVIDERS,
    }
  }

  return buildInspectionsHub(register, list)
}
