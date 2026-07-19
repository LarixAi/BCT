import { instantiatePmiChecklist } from '@/lib/maintenance/pmi-checklist'
import { validateReleaseChecklist } from '@/lib/maintenance/release-checklist'
import type { ReturnToServiceInput, VehicleProfile, WorkOrderStatus, MaintenanceWorkOrder } from './types'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  requested: 'Requested',
  awaiting_review: 'Awaiting review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  vehicle_awaiting_workshop: 'Vehicle awaiting workshop',
  in_progress: 'In progress',
  awaiting_parts: 'Awaiting parts',
  awaiting_authorisation: 'Awaiting authorisation',
  quality_check: 'Quality check',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function normalizeWorkOrder(
  partial: Partial<MaintenanceWorkOrder> & Pick<MaintenanceWorkOrder, 'id' | 'type' | 'title' | 'status' | 'createdAt' | 'createdBy'>,
): MaintenanceWorkOrder {
  const merged = {
    scheduledDate: null,
    targetCompletionDate: null,
    completedDate: null,
    provider: null,
    estimatedCost: null,
    actualCost: null,
    labourCost: null,
    partsCost: null,
    labourHours: null,
    defectId: null,
    technicianName: null,
    managerName: null,
    creationSource: 'command',
    diagnosis: null,
    workCompleted: null,
    notes: null,
    roadTestRequired: false,
    parts: [],
    pmiChecklist: null as MaintenanceWorkOrder['pmiChecklist'],
    estimate: null as MaintenanceWorkOrder['estimate'],
    returnToServiceApproved: false,
    ...partial,
  }
  if (merged.type === 'pmi' && !merged.pmiChecklist) {
    merged.pmiChecklist = instantiatePmiChecklist()
  }
  return merged
}

export function canReturnToService(profile: VehicleProfile, input: ReturnToServiceInput): string[] {
  const blockers: string[] = []
  if (profile.openDefectCount > 0) blockers.push('Open defects must be closed first')
  if (profile.criticalDefectCount > 0) blockers.push('Dangerous defects must be resolved')
  if (!input.postRepairCheckComplete) blockers.push('Post-repair inspection required')
  if (profile.wheelRetorqueDueAt && new Date(profile.wheelRetorqueDueAt).getTime() < Date.now() && !input.wheelRetorqueComplete) {
    blockers.push('Wheel re-torque overdue — complete before release')
  }
  if (!input.technicianSignOff.trim()) blockers.push('Technician sign-off required')
  const openVor = profile.vorRecords.some((v) => !v.resolvedAt)
  if (openVor) {
    if (!(input.workPerformed?.trim() || input.reason.trim())) {
      blockers.push('Record the work completed before return to road')
    }
    if (input.verificationResult === 'fail') {
      blockers.push('Verification failed — vehicle cannot return to road')
    }
  }
  const openOrders = profile.workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status))
  if (openOrders.length > 0) blockers.push(`${openOrders.length} open work order(s)`)
  const repairType = input.repairType ?? openOrders[0]?.type
  blockers.push(...validateReleaseChecklist(repairType, input.checklist))
  return blockers
}
