import type { VehicleProfile } from '@/lib/vehicles/types'
import type { DefectRegisterRow, DefectWorkflowStatus, VehicleAvailability } from './types'
import type { VehicleDefectEntry } from '@/lib/vehicles/types'
import { activeVehicleRestrictions } from './restrictions'

export function defectRef(id: string): string {
  const num = id.replace(/\D/g, '').padStart(3, '0')
  return `DF-${num}`
}

export function deriveWorkflowStatus(d: VehicleDefectEntry, workOrderStatus?: string | null): DefectWorkflowStatus {
  if (d.status === 'closed') return 'closed'
  if (d.triageStatus === 'rejected') return 'rejected'
  if (d.triageStatus === 'duplicate') return 'duplicate'
  if (d.triageStatus === 'pending') return 'awaiting_triage'
  if (d.status === 'awaiting_verification') return 'awaiting_verification'
  if (d.verificationResult === 'fail') return 'reopened'
  if (d.status === 'in_repair' && workOrderStatus === 'awaiting_parts') return 'awaiting_parts'
  if (d.status === 'in_repair') return 'repair_in_progress'
  if (d.status === 'awaiting_repair' && workOrderStatus === 'awaiting_parts') return 'awaiting_parts'
  if (d.status === 'awaiting_repair') return 'scheduled_for_repair'
  if (d.status === 'vor') return 'action_required'
  if (d.linkedWorkOrderId) return 'assigned'
  if (d.triageStatus === 'deferred') return 'deferred'
  if (d.triageStatus === 'validated') return 'action_required'
  return 'new'
}

export function deriveVehicleAvailability(profile: VehicleProfile, d: VehicleDefectEntry): VehicleAvailability {
  if (profile.operationalStatus === 'vor' || d.vorApplied) return 'vor'
  if (d.severity === 'dangerous') return 'vor'
  if (d.status === 'awaiting_verification') return 'awaiting_road_test'
  if (activeVehicleRestrictions(profile).length > 0) return 'available_with_restriction'
  if (d.severity === 'major' && d.status !== 'closed') return 'pending_safety_assessment'
  if (profile.operationalStatus === 'in_workshop') return 'workshop_movement_authorised'
  return 'available'
}

export function computeAgeMinutes(reportedAt: string): number {
  return Math.round((Date.now() - new Date(reportedAt).getTime()) / 60000)
}

export function computeUrgency(row: Partial<DefectRegisterRow>): number {
  let score = 0
  if (row.severity === 'dangerous') score += 100
  if (row.severity === 'major') score += 60
  if (row.vehicleAvailability === 'vor') score += 40
  if (row.assignedRunReference || row.nextDepartureTime) score += 35
  if (row.workflowStatus === 'awaiting_triage') score += 25
  if (row.isOverdue) score += 20
  return score
}

export function isOverdueRepair(d: VehicleDefectEntry, deadline: string | null): boolean {
  if (!deadline) return false
  return d.status !== 'closed' && new Date(deadline).getTime() < Date.now()
}
