import type { StaffApplication, StaffProfile, StaffQualification, StaffTrainingRequirement, StaffTrainingStatus } from './types'

export interface TrainingRequirementDef {
  key: string
  label: string
  category: 'mandatory' | 'role' | 'depot' | 'application'
  requiredFor: string
  roles?: string[]
  departments?: string[]
  applications?: StaffApplication[]
  blocksPermission?: string
  renewalMonths: number | null
}

export const TRAINING_CATALOG: TrainingRequirementDef[] = [
  { key: 'company_induction', label: 'Company induction', category: 'mandatory', requiredFor: 'All staff', renewalMonths: null },
  { key: 'data_protection', label: 'Data protection', category: 'mandatory', requiredFor: 'All staff', renewalMonths: 24 },
  { key: 'information_security', label: 'Information security', category: 'mandatory', requiredFor: 'All staff', renewalMonths: 12 },
  { key: 'health_safety', label: 'Health and safety', category: 'mandatory', requiredFor: 'All staff', renewalMonths: 24 },
  { key: 'equality_diversity', label: 'Equality and diversity', category: 'mandatory', requiredFor: 'All staff', renewalMonths: 36 },
  { key: 'yard_safety', label: 'Yard safety', category: 'role', requiredFor: 'Yard operations', roles: ['yard_manager', 'yard_operative'], blocksPermission: 'yard.move_vehicle', renewalMonths: 12 },
  { key: 'vehicle_movement', label: 'Vehicle movement authorisation', category: 'role', requiredFor: 'Yard vehicle movement', roles: ['yard_manager', 'yard_operative'], blocksPermission: 'yard.move_vehicle', renewalMonths: 12 },
  { key: 'dispatch_training', label: 'Dispatch system training', category: 'role', requiredFor: 'Dispatch operations', roles: ['dispatcher', 'operations_manager'], renewalMonths: 24 },
  { key: 'emergency_response', label: 'Emergency response', category: 'role', requiredFor: 'Duty controller', roles: ['dispatcher', 'operations_manager'], blocksPermission: 'dispatch.duty_controller', renewalMonths: 12 },
  { key: 'driver_hours_awareness', label: 'Driver hours awareness', category: 'role', requiredFor: 'Dispatch', roles: ['dispatcher'], renewalMonths: 24 },
  { key: 'workshop_safety', label: 'Workshop safety', category: 'role', requiredFor: 'Maintenance workshop', roles: ['technician', 'maintenance_manager'], renewalMonths: 12 },
  { key: 'hybrid_vehicle', label: 'Hybrid vehicle awareness', category: 'role', requiredFor: 'Technician — EV/hybrid', roles: ['technician'], renewalMonths: 24 },
  { key: 'safeguarding_children', label: 'Safeguarding children', category: 'role', requiredFor: 'Safeguarding', roles: ['safeguarding_officer'], blocksPermission: 'safeguarding.view', renewalMonths: 12 },
  { key: 'safeguarding_adults', label: 'Safeguarding adults', category: 'role', requiredFor: 'Safeguarding', roles: ['safeguarding_officer'], blocksPermission: 'safeguarding.view', renewalMonths: 12 },
  { key: 'disability_awareness', label: 'Disability awareness', category: 'role', requiredFor: 'Passenger care', roles: ['passenger_assistant'], renewalMonths: 24 },
  { key: 'school_transport', label: 'School transport procedures', category: 'application', requiredFor: 'School contracts', applications: ['command'], departments: ['dept-operations'], renewalMonths: 12 },
]

const EXPIRING_SOON_DAYS = 30

function daysUntil(date: string | null): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function qualStatus(expiryDate: string | null, verified: boolean): StaffTrainingRequirement['status'] {
  if (!verified) return 'awaiting_verification'
  if (!expiryDate) return 'valid'
  const days = daysUntil(expiryDate)
  if (days != null && days < 0) return 'expired'
  if (days != null && days <= EXPIRING_SOON_DAYS) return 'expiring_soon'
  return 'valid'
}

function findQualification(qualifications: StaffQualification[], key: string): StaffQualification | undefined {
  return qualifications.find((q) => q.trainingType.toLowerCase().includes(key.replace(/_/g, ' ')) || q.id.includes(key))
}

function appliesToProfile(def: TrainingRequirementDef, profile: StaffProfile): boolean {
  const roleKeys = profile.roleAssignments.map((r) => r.roleKey)
  if (!def.roles && !def.departments && !def.applications) return def.category === 'mandatory'
  if (def.roles?.some((r) => roleKeys.includes(r))) return true
  if (def.departments?.includes(profile.departmentId)) return true
  if (def.applications?.some((a) => profile.applications.some((app) => app.enabled && app.application === a))) return true
  return false
}

export function buildStaffTrainingRequirements(profile: StaffProfile): StaffTrainingRequirement[] {
  return TRAINING_CATALOG.filter((def) => appliesToProfile(def, profile)).map((def) => {
    const qual =
      findQualification(profile.qualifications, def.key) ??
      profile.qualifications.find((q) => q.trainingType === def.label)

    if (!qual) {
      return {
        id: `req-${def.key}`,
        key: def.key,
        label: def.label,
        requiredFor: def.requiredFor,
        category: def.category,
        status: 'missing',
        qualificationId: null,
        completedDate: null,
        expiryDate: null,
        blocksAccess: !!def.blocksPermission,
        blockedPermission: def.blocksPermission ?? null,
      }
    }

    const verified = qual.status !== 'awaiting_verification' && qual.verifiedBy != null
    const status = qualStatus(qual.expiryDate, verified)

    return {
      id: `req-${def.key}`,
      key: def.key,
      label: def.label,
      requiredFor: def.requiredFor,
      category: def.category,
      status,
      qualificationId: qual.id,
      completedDate: qual.completedDate,
      expiryDate: qual.expiryDate,
      blocksAccess: !!def.blocksPermission && (status === 'expired' || status === 'missing'),
      blockedPermission: def.blocksPermission ?? null,
    }
  })
}

export function deriveTrainingStatus(requirements: StaffTrainingRequirement[]): StaffTrainingStatus {
  if (requirements.length === 0) return 'not_required'
  if (requirements.some((r) => r.status === 'expired' || r.status === 'missing')) return requirements.some((r) => r.status === 'expired') ? 'expired' : 'missing'
  if (requirements.some((r) => r.status === 'expiring_soon')) return 'expiring_soon'
  if (requirements.some((r) => r.status === 'awaiting_verification')) return 'awaiting_verification'
  return 'valid'
}

export function trainingAccessBlocks(requirements: StaffTrainingRequirement[]): string[] {
  return requirements
    .filter((r) => r.blocksAccess && ['expired', 'missing'].includes(r.status))
    .map((r) => `${r.label} required — ${r.status === 'expired' ? 'certificate expired' : 'not recorded'}`)
}

export function trainingWarnings(requirements: StaffTrainingRequirement[]): string[] {
  return requirements
    .filter((r) => r.status === 'expiring_soon')
    .map((r) => `${r.label} expires in ${daysUntil(r.expiryDate)} days`)
}

export function enrichStaffTraining<T extends StaffProfile>(profile: T): T {
  const trainingRequirements = buildStaffTrainingRequirements(profile)
  const trainingStatus = deriveTrainingStatus(trainingRequirements)
  const blocks = trainingAccessBlocks(trainingRequirements)
  const warns = trainingWarnings(trainingRequirements)
  const operationalAlerts = [...new Set([...profile.operationalAlerts, ...blocks, ...warns])]

  return {
    ...profile,
    trainingRequirements,
    trainingStatus,
    trainingAccessBlocks: blocks,
    operationalAlerts,
  }
}

export function canStartDutyWithTraining(profile: StaffProfile): string[] {
  const blocks: string[] = []
  if (profile.roleAssignments.some((r) => ['dispatcher', 'operations_manager'].includes(r.roleKey))) {
    const emergency = profile.trainingRequirements.find((r) => r.key === 'emergency_response')
    if (emergency && ['expired', 'missing'].includes(emergency.status)) {
      blocks.push('Emergency response training required before duty controller shift')
    }
  }
  if (profile.roleAssignments.some((r) => ['yard_manager', 'yard_operative'].includes(r.roleKey))) {
    const yard = profile.trainingRequirements.find((r) => r.key === 'yard_safety')
    const movement = profile.trainingRequirements.find((r) => r.key === 'vehicle_movement')
    if (yard && ['expired', 'missing'].includes(yard.status)) blocks.push('Yard safety training required')
    if (movement && ['expired', 'missing'].includes(movement.status)) blocks.push('Vehicle movement authorisation required')
  }
  return blocks
}

export function refreshQualificationStatuses(qualifications: StaffQualification[]): StaffQualification[] {
  return qualifications.map((q) => {
    if (q.status === 'awaiting_verification' || !q.verifiedBy) return q
    const days = q.expiryDate ? daysUntil(q.expiryDate) : null
    let status: StaffQualification['status'] = 'valid'
    if (days != null && days < 0) status = 'expired'
    else if (days != null && days <= EXPIRING_SOON_DAYS) status = 'expiring_soon'
    return { ...q, status }
  })
}
