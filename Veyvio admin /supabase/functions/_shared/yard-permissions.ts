/**
 * Yard permission matrix for Command hub projection (Blueprint F-11 / TD-008).
 * Keep aligned with `src/types/permissions.ts` in Veyvio Yard.
 */
import { roleGrantsCommandScope } from './application-scopes.ts'
import { apiError } from './http.ts'

type Row = Record<string, unknown>

const YARD_OPERATIVE = [
  'vehicle.view',
  'vehicle.move',
  'check.complete',
  'equipment.assign',
  'equipment.transfer',
  'handover.complete',
  'plan.view',
] as const

const YARD_MANAGER = [
  'vehicle.view',
  'vehicle.move',
  'vehicle.mark_vor',
  'vehicle.release_vor',
  'check.complete',
  'check.spot_audit',
  'check.override',
  'defect.resolve',
  'equipment.assign',
  'equipment.transfer',
  'task.assign',
  'handover.complete',
  'incident.create',
  'audit.view',
  'plan.view',
  'plan.acknowledge',
] as const

const MAINTENANCE_USER = [
  'vehicle.view',
  'vehicle.mark_vor',
  'vehicle.release_vor',
  'check.complete',
  'defect.resolve',
  'equipment.assign',
  'audit.view',
  'plan.view',
] as const

const OPERATIONS_MANAGER = [...YARD_MANAGER] as const

const COMPANY_ADMIN = [...YARD_MANAGER, 'equipment.write_off'] as const

const READ_ONLY = ['vehicle.view', 'audit.view', 'plan.view'] as const

const YARD_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  yard_operative: YARD_OPERATIVE,
  yard_manager: YARD_MANAGER,
  contractor: YARD_OPERATIVE,
  maintenance_user: MAINTENANCE_USER,
  operations_manager: OPERATIONS_MANAGER,
  company_administrator: COMPANY_ADMIN,
  company_owner: COMPANY_ADMIN,
  transport_manager: OPERATIONS_MANAGER,
  dispatcher: OPERATIONS_MANAGER,
  compliance_manager: READ_ONLY,
  safeguarding_lead: READ_ONLY,
  read_only_auditor: READ_ONLY,
  support: YARD_MANAGER,
}

export function yardPermissionsForRole(roleKey: string): string[] {
  const key = String(roleKey ?? '').trim()
  const direct = YARD_ROLE_PERMISSIONS[key]
  if (direct) return [...direct]
  if (roleGrantsCommandScope(key)) return [...YARD_MANAGER]
  return [...READ_ONLY]
}

export function yardPermissionForMutationType(type: string, payload: Row = {}): string | null {
  switch (String(type ?? '')) {
    case 'vehicle.move':
      return 'vehicle.move'
    case 'check.complete':
      return 'check.complete'
    case 'task.create':
      return 'task.assign'
    case 'task.update':
      return 'task.assign'
    case 'inspection.start':
    case 'inspection.media':
    case 'inspection.complete':
      return 'check.complete'
    case 'inspection.approve':
      return 'check.override'
    case 'damage.report':
      return 'incident.create'
    case 'damage.review':
    case 'repair.request':
      return 'defect.resolve'
    case 'vehicle.mark_vor':
      return 'vehicle.mark_vor'
    case 'vehicle.release_vor':
      return 'vehicle.release_vor'
    case 'defect.create':
      return 'incident.create'
    case 'defect.resolve':
    case 'repair.start':
    case 'repair.complete':
    case 'repair.verify':
      return 'defect.resolve'
    case 'equipment.assign':
    case 'equipment.restock':
      return 'equipment.assign'
    case 'equipment.transfer':
      return 'equipment.transfer'
    case 'plan.acknowledge':
    case 'departure.release':
    case 'departure.complete':
      return 'plan.acknowledge'
    case 'handover.complete':
      return 'handover.complete'
    default:
      return null
  }
}

export function yardPermissionDeniedResponse(roleKey: string, permission: string) {
  if (yardPermissionsForRole(roleKey).includes(permission)) return null
  return apiError(
    403,
    `You do not have permission for this yard action (${permission.replace('.', ' ')})`,
    'yard_permission_denied',
  )
}
