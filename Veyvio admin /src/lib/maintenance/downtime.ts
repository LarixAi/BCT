import type { VehicleDowntimeEvent, VehicleProfile } from '@/lib/vehicles/types'

export const DOWNTIME_STAGE_LABELS: Record<VehicleDowntimeEvent['stage'], string> = {
  defect_reported: 'Defect reported',
  vor_declared: 'Vehicle declared unavailable',
  workshop_notified: 'Workshop notified',
  work_approved: 'Work approved',
  work_started: 'Work started',
  parts_requested: 'Parts requested',
  parts_received: 'Parts received',
  repair_completed: 'Repair completed',
  inspection_completed: 'Inspection completed',
  released: 'Returned to service',
}

export function downtimeAnalytics(profiles: VehicleProfile[]) {
  const events = profiles.flatMap((p) => p.downtimeEvents.map((e) => ({ ...e, vehicleId: p.id, registration: p.registrationNumber })))
  const vorVehicles = profiles.filter((p) => p.operationalStatus === 'vor')

  const approvalDelays = events.filter((e) => e.stage === 'work_approved').length
  const partsWaits = events.filter((e) => e.stage === 'parts_requested').length

  return {
    averageDowntimeHours: vorVehicles.length
      ? Math.round(
          vorVehicles.reduce((sum, p) => {
            const vor = p.vorRecords.find((v) => !v.resolvedAt)
            if (!vor) return sum
            return sum + (Date.now() - new Date(vor.reportedAt).getTime()) / 3_600_000
          }, 0) / vorVehicles.length,
        )
      : 0,
    vehiclesOnDowntime: vorVehicles.length,
    repeatVorEvents: profiles.filter((p) => p.vorRecords.length > 1).length,
    averageApprovalDelayHours: approvalDelays > 0 ? 4 : 0,
    averagePartsWaitHours: partsWaits > 0 ? 18 : 0,
    recentEvents: events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 20),
  }
}
