/** Command read-model projections over shared platform tables. */
import { resolveProjectionDb } from './db-authority.ts'

function projDb(companyId: string) {
  return resolveProjectionDb(companyId, 'projections_read')
}

import {
  groupVehicleEquipmentItems,
  listEquipmentRowsForCompany,
} from './equipment-assets.ts'
import { createTenantSignedUrl } from './signed-storage.ts'

type Row = Record<string, unknown>

function iso(value: unknown, fallback = new Date().toISOString()) {
  if (!value) return fallback
  return String(value)
}

/** Signed URL for a driver profile photo stored in `driver-documents`. */
export async function signedDriverProfilePhotoUrl(
  companyId: string,
  storageKey: unknown,
  expiresInSeconds = 60 * 60 * 12,
): Promise<string | null> {
  const key = storageKey ? String(storageKey).trim() : ''
  if (!key) return null
  try {
    const { signedUrl } = await createTenantSignedUrl({
      bucket: 'driver-documents',
      storageKey: key,
      companyId,
      expiresInSeconds,
    })
    return signedUrl
  } catch (error) {
    console.error('driver profile photo signed url failed', error)
    return null
  }
}

function projectedDocumentExpiry(row: Row, requirementType: unknown, docExpiry: unknown): string | null {
  if (docExpiry) return String(docExpiry).slice(0, 10)
  const t = String(requirementType ?? '').toLowerCase()
  if (['driving_licence', 'licence', 'licence_front', 'licence_back', 'dvla_check'].includes(t)) {
    return row.licence_expiry_date ? String(row.licence_expiry_date).slice(0, 10) : null
  }
  if (['dqc', 'cpc', 'dqc_front', 'dqc_back', 'dqc_cpc'].includes(t)) {
    return row.cpc_expiry_date ? String(row.cpc_expiry_date).slice(0, 10) : null
  }
  if (t === 'dbs') return row.dbs_expiry_date ? String(row.dbs_expiry_date).slice(0, 10) : null
  if (t === 'medical') return row.medical_expiry_date ? String(row.medical_expiry_date).slice(0, 10) : null
  if (t === 'tachograph' || t === 'tacho') {
    return row.tacho_card_expiry ? String(row.tacho_card_expiry).slice(0, 10) : null
  }
  return null
}

function mapEmploymentType(value: unknown): string {
  const v = String(value ?? 'employee')
  if (['employee', 'contractor', 'agency', 'temporary'].includes(v)) return v
  return 'employee'
}

function mapDriverEmploymentStatus(status: unknown): string {
  const s = String(status ?? 'active')
  if (s === 'active') return 'employed'
  if (s === 'probation') return 'onboarding'
  if (s === 'suspended') return 'suspended'
  if (s === 'left') return 'employment_ended'
  if (s === 'contractor') return 'contractor'
  return 'employed'
}

function mapDutyStatusFromDuty(status: unknown): string {
  if (status == null || status === '') return 'off_duty'
  const s = String(status)
  if (s === 'signed_on' || s === 'in_progress') return 'on_trip'
  if (s === 'signed_off') return 'signed_out'
  if (s === 'cancelled' || s === 'unassigned') return 'off_duty'
  if (s === 'planned' || s === 'assigned') return 'scheduled'
  return 'scheduled'
}

function nearestExpiryFromProfile(profile: Row): { date: string | null; label: string | null } {
  const candidates: Array<{ date: string; label: string }> = []
  const push = (date: unknown, label: string) => {
    if (!date) return
    const value = String(date)
    if (!value || Number.isNaN(new Date(value).getTime())) return
    candidates.push({ date: value, label })
  }

  push(profile.licenceExpiry, 'Driving licence')
  push(profile.cpcExpiry, 'CPC / DQC')
  push(profile.dbsExpiry, 'DBS')
  push(profile.medicalExpiry, 'Medical')
  push(profile.tachoCardExpiry, 'Tachograph card')

  for (const doc of Array.isArray(profile.documents) ? (profile.documents as Row[]) : []) {
    push(doc.expiryDate ?? doc.expiry_date, String(doc.label ?? doc.requirementType ?? 'Document'))
  }

  if (!candidates.length) return { date: null, label: null }
  candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return candidates[0]
}

function mapVehicleOpStatus(status: unknown): string {
  const s = String(status ?? 'available')
  if (s === 'maintenance') return 'in_workshop'
  if (s === 'awaiting_check') return 'under_inspection'
  if (s === 'quarantined') return 'vor'
  if (s === 'restricted') return 'awaiting_driver'
  if (s === 'draft' || s === 'onboarding') return 'available'
  if (s === 'decommissioned') return 'vor'
  return s
}

/** Map DB / legacy account statuses onto the Command Access & Security lifecycle. */
function mapDriverAccountStatus(status: unknown): string {
  const s = String(status ?? 'not_created')
  if (s === 'not_created') return 'draft'
  if (s === 'invite_pending' || s === 'invitation_sent') return 'invitation_pending'
  if (s === 'registration_started') return 'setup_incomplete'
  if (s === 'suspended') return 'temporarily_suspended'
  if (s === 'disabled') return 'archived'
  return s
}


function formatDriverAuditAction(action: string): string {
  const labels: Record<string, string> = {
    'driver.biometric_enabled': 'Biometric sign-in enabled',
    'driver.biometric_disabled': 'Biometric sign-in disabled',
    'driver.biometric_unlock_succeeded': 'Biometric unlock succeeded',
    'driver.biometric_unlock_failed': 'Biometric unlock failed',
    'driver.biometric_fallback_used': 'Biometric fallback used',
    'driver.biometric_credential_invalidated': 'Biometric credential invalidated',
    'driver.device_revoked': 'Driver device revoked',
    'driver.password_reauthentication_required': 'Password re-authentication required',
    'driver.onboarding_profile_updated': 'Onboarding: personal profile saved (Driver app)',
    'driver.onboarding_contact_updated': 'Onboarding: address and emergency contact saved (Driver app)',
    'driver.onboarding_step_completed': 'Onboarding: step completed (Driver app)',
    'driver.onboarding_submitted': 'Onboarding submitted (Driver app)',
    'driver.onboarding.evidence_submitted': 'Onboarding evidence submitted (Driver app)',
  }
  if (labels[action]) return labels[action]
  return action.replace(/^driver\./, '').replaceAll('_', ' ')
}

function emptyDriverAccount(overrides: Row = {}) {
  return {
    userAccountId: null,
    accountStatus: 'draft',
    invitationStatus: 'not_sent',
    invitationSentAt: null,
    invitationExpiresAt: null,
    invitationDestination: null,
    invitationChannel: null,
    registrationCompletedAt: null,
    emailVerified: false,
    phoneVerified: false,
    mfaEnabled: false,
    authenticationMethod: 'none',
    passkeyEnabled: false,
    lastLoginAt: null,
    lastFailedLoginAt: null,
    failedLoginCount: 0,
    accountLocked: false,
    lastPasswordResetAt: null,
    lastAppActivityAt: null,
    activeSessionCount: 0,
    registeredDeviceCount: 0,
    pushNotificationsEnabled: false,
    appVersion: null,
    operatingSystem: null,
    lastAppSyncAt: null,
    locationPermissionGranted: false,
    cameraPermissionGranted: false,
    devices: [],
    sessions: [],
    invitationHistory: [],
    suspension: null,
    devInvitationToken: null,
    ...overrides,
  }
}

function mapOperationalStatus(row: Row): string {
  const op = String(row.operational_status ?? '')
  if (op) return op
  const s = String(row.status ?? 'active')
  if (s === 'draft') return 'draft'
  if (s === 'onboarding' || s === 'pending_compliance') return s
  if (s === 'suspended') return 'suspended'
  if (s === 'inactive') return 'inactive'
  if (s === 'left') return 'left_company'
  if (s === 'restricted') return 'restricted'
  if (s === 'eligible') return 'eligible'
  return 'eligible'
}

function mapEmploymentFromDriver(row: Row, staff: Row): string {
  const op = mapOperationalStatus(row)
  if (op === 'draft') return 'applicant'
  if (op === 'onboarding' || op === 'pending_compliance') return 'onboarding'
  if (op === 'suspended') return 'suspended'
  if (op === 'left_company') return 'employment_ended'
  return mapDriverEmploymentStatus(staff.employment_status ?? row.status)
}

function workPermissionsFromKeys(keys: unknown): { key: string; label: string; enabled: boolean }[] {
  const selected = Array.isArray(keys) ? keys.map(String) : []
  const catalogue: Record<string, string> = {
    psv: 'PSV / coach',
    phv: 'Private hire',
    school: 'School transport',
    send: 'SEND transport',
    accessible: 'Accessible transport',
    wheelchair: 'Wheelchair passengers',
    elderly: 'Elderly passenger transport',
    hospital: 'Hospital transport',
    community: 'Community transport',
    minibus: 'Minibus',
    coach: 'Coach',
    passenger_lift: 'Passenger lift trained',
    first_aid: 'First aid trained',
    safeguarding: 'Safeguarding trained',
    manual_handling: 'Manual handling trained',
    contract: 'Contract work',
    night_work: 'Night work',
    manual_vehicle: 'Manual vehicles',
  }
  // Default Section 19/22 community profile when none set yet
  const base = selected.length ? selected : ['community', 'minibus']
  return base.map((key) => ({ key, label: catalogue[key] ?? key, enabled: true }))
}

/** Mirrored from admin `lib/drivers/training.ts` — keep Deno edge self-contained. */
const DRIVER_TRAINING_CATALOG: Array<{
  key: string
  label: string
  category: 'mandatory' | 'vehicle' | 'role' | 'development'
  requiredFor: string
  permissions: string[]
  documentTypes?: string[]
}> = [
  // Level 1 — mandatory before first shift
  { key: 'company_induction', label: 'Company induction', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [] },
  { key: 'driver_app', label: 'Driver app training', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [] },
  { key: 'daily_vehicle_checks', label: 'Daily vehicle check training', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [] },
  { key: 'health_safety', label: 'Health and safety', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [], documentTypes: ['manual_handling'] },
  { key: 'safeguarding', label: 'Safeguarding', category: 'mandatory', requiredFor: 'All drivers — Section 19/22 essential', permissions: [], documentTypes: ['safeguarding_training', 'safeguarding_adults'] },
  { key: 'emergency_procedures', label: 'Emergency procedures', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [] },
  { key: 'data_protection_gdpr', label: 'Data protection (GDPR)', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [] },
  { key: 'driver_declaration', label: 'Driver declaration', category: 'mandatory', requiredFor: 'All drivers — before first shift', permissions: [] },
  // Level 2 — vehicle-specific
  { key: 'midas_standard', label: 'MiDAS Standard', category: 'vehicle', requiredFor: 'Minibus / community transport vehicles', permissions: ['community', 'minibus'], documentTypes: ['midas', 'midas_standard'] },
  { key: 'midas_accessible', label: 'MiDAS Accessible', category: 'vehicle', requiredFor: 'Wheelchair / accessible vehicles', permissions: ['wheelchair', 'accessible', 'passenger_lift'], documentTypes: ['midas_accessible', 'wheelchair_training'] },
  { key: 'wheelchair_restraint', label: 'Wheelchair restraint systems', category: 'vehicle', requiredFor: 'Wheelchair passengers', permissions: ['wheelchair', 'accessible'], documentTypes: ['wheelchair_training'] },
  { key: 'lift_ramp_operation', label: 'Lift and ramp operation', category: 'vehicle', requiredFor: 'Accessible vehicles with lift or ramp', permissions: ['wheelchair', 'accessible', 'passenger_lift'], documentTypes: ['wheelchair_training', 'passenger_lift'] },
  { key: 'driver_cpc', label: 'Driver CPC (periodic training)', category: 'vehicle', requiredFor: 'PSV / coach', permissions: ['psv', 'coach'], documentTypes: ['cpc', 'dqc'] },
  // Level 4 — role-specific
  { key: 'first_aid_efaw', label: 'Emergency First Aid at Work', category: 'role', requiredFor: 'First-aid designated duties', permissions: ['first_aid', 'hospital', 'school'], documentTypes: ['first_aid'] },
  { key: 'safeguarding_children', label: 'Safeguarding children', category: 'role', requiredFor: 'School / SEND transport', permissions: ['school', 'send', 'safeguarding'], documentTypes: ['safeguarding_training', 'safeguarding_children'] },
  { key: 'send_autism_awareness', label: 'SEND / autism awareness', category: 'role', requiredFor: 'SEND transport', permissions: ['send', 'school'] },
  { key: 'behaviour_management', label: 'Behaviour management', category: 'role', requiredFor: 'SEND / school transport', permissions: ['send', 'school'] },
  { key: 'infection_prevention', label: 'Infection prevention and control', category: 'role', requiredFor: 'Hospital transport', permissions: ['hospital'] },
  { key: 'dementia_awareness', label: 'Dementia awareness', category: 'role', requiredFor: 'Hospital / elderly transport', permissions: ['hospital', 'elderly'] },
  { key: 'passenger_assistant', label: 'Passenger assistant', category: 'role', requiredFor: 'Escort / PA duties', permissions: ['escort', 'passenger_assistant'] },
  { key: 'school_transport', label: 'School transport', category: 'role', requiredFor: 'School contracts', permissions: ['school'] },
  { key: 'adult_social_care', label: 'Adult social care', category: 'role', requiredFor: 'Adult social care contracts', permissions: ['elderly', 'hospital', 'adult_care'] },
  { key: 'mental_health_awareness', label: 'Mental health awareness', category: 'role', requiredFor: 'Hospital / vulnerable adult transport', permissions: ['hospital', 'adult_care'] },
  { key: 'medication_awareness', label: 'Medication awareness', category: 'role', requiredFor: 'Roles handling medication handovers', permissions: ['hospital', 'adult_care'] },
  { key: 'conflict_management', label: 'Conflict management', category: 'role', requiredFor: 'Front-line passenger duties', permissions: ['school', 'hospital', 'community'] },
  // Level 5 — optional development (always offered)
  { key: 'eco_driving', label: 'Eco driving', category: 'development', requiredFor: 'Optional development', permissions: [] },
  { key: 'customer_excellence', label: 'Customer excellence', category: 'development', requiredFor: 'Optional development', permissions: [] },
  { key: 'advanced_driving', label: 'Advanced driving', category: 'development', requiredFor: 'Optional development', permissions: [] },
  { key: 'driver_mentor', label: 'Driver mentor', category: 'development', requiredFor: 'Optional development', permissions: [] },
  { key: 'leadership', label: 'Leadership', category: 'development', requiredFor: 'Optional development', permissions: [] },
]

function catalogApplies(
  def: (typeof DRIVER_TRAINING_CATALOG)[number],
  enabled: Set<string>,
): boolean {
  if (def.category === 'mandatory' || def.category === 'development') return true
  if (!def.permissions.length) return true
  return def.permissions.some((p) => enabled.has(p))
}

function buildProjectedTrainingRequirements(
  workPermissions: Array<{ key: string; enabled: boolean }>,
  documents: Row[],
  trainingRows: Row[],
): Row[] {
  const enabled = new Set(workPermissions.filter((p) => p.enabled).map((p) => p.key))
  const byKey = new Map(trainingRows.map((r) => [String(r.training_key), r]))
  const EXPIRING_SOON_DAYS = 90

  // Legacy course keys still count toward current Level 1 modules
  if (!byKey.has('safeguarding') && byKey.has('safeguarding_adults')) {
    byKey.set('safeguarding', byKey.get('safeguarding_adults')!)
  }
  if (!byKey.has('health_safety') && byKey.has('manual_handling')) {
    byKey.set('health_safety', byKey.get('manual_handling')!)
  }
  if (!byKey.has('driver_app') && byKey.has('using_veyvio_driver')) {
    byKey.set('driver_app', byKey.get('using_veyvio_driver')!)
  }

  return DRIVER_TRAINING_CATALOG.filter((def) => catalogApplies(def, enabled)).map((def) => {
    const record = byKey.get(def.key)
    const doc = (def.documentTypes ?? []).length
      ? documents.find((d) => def.documentTypes!.includes(String(d.requirementType ?? d.requirement_type ?? '')))
      : undefined

    const expiresAt = record?.expires_at ? String(record.expires_at) : doc?.expiryDate ? String(doc.expiryDate) : doc?.expiry_date ? String(doc.expiry_date) : null
    const completedAt = record?.completed_at
      ? String(record.completed_at)
      : doc && String(doc.verificationStatus ?? doc.verification_status) === 'verified'
        ? String(doc.verifiedAt ?? doc.verified_at ?? '').slice(0, 10) || null
        : null
    const trainer = record?.trainer ? String(record.trainer) : null
    const recordStatus = String(record?.status ?? '').toLowerCase()
    const verifiedDoc =
      doc &&
      ['verified', 'expiring_soon', 'expired'].includes(String(doc.verificationStatus ?? doc.verification_status ?? ''))
    const hasCompleteRecord =
      recordStatus === 'complete' ||
      recordStatus === 'completed' ||
      recordStatus === 'valid' ||
      Boolean(record?.completed_at && !['missing', 'failed'].includes(recordStatus))

    let status = 'missing'
    if (recordStatus === 'failed') status = 'failed'
    else if (hasCompleteRecord || verifiedDoc) {
      if (expiresAt) {
        const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        if (days < 0) status = 'expired'
        else if (days <= EXPIRING_SOON_DAYS) status = 'due_soon'
        else status = 'complete'
      } else {
        status = 'complete'
      }
      if (String(doc?.verificationStatus ?? doc?.verification_status) === 'expired') status = 'expired'
      if (String(doc?.verificationStatus ?? doc?.verification_status) === 'expiring_soon') status = 'due_soon'
    } else if (recordStatus === 'assigned' || recordStatus === 'training_assigned') {
      status = 'assigned'
    } else if (
      recordStatus === 'in_progress' ||
      recordStatus === 'assessment_required' ||
      recordStatus === 'started'
    ) {
      status = 'in_progress'
    }

    return {
      id: record?.id ? String(record.id) : `tr-${def.key}`,
      key: def.key,
      label: def.label,
      requiredFor: def.requiredFor,
      category: def.category,
      status,
      completedAt: status === 'missing' ? null : completedAt,
      expiresAt: status === 'missing' ? null : expiresAt,
      trainer: status === 'missing' ? null : trainer,
      progressPercentage:
        record?.progress_percentage != null ? Number(record.progress_percentage) : null,
      assessmentScore: record?.assessment_score != null ? Number(record.assessment_score) : null,
    }
  })
}

function isDocumentPendingAdminReview(status: string): boolean {
  return status === 'awaiting_review' || status === 'uploaded'
}

function deriveProjectedComplianceStatus(docs: Row[]): string {
  if (!docs.length) return 'missing_information'
  const statuses = docs.map((d) => String(d.verificationStatus ?? d.verification_status ?? ''))
  if (statuses.some((s) => s === 'rejected')) return 'verification_failed'
  if (statuses.some((s) => s === 'expired')) return 'non_compliant'
  if (statuses.some((s) => isDocumentPendingAdminReview(s))) return 'under_review'
  if (statuses.some((s) => s === 'expiring_soon')) return 'documents_expiring_soon'
  if (statuses.every((s) => s === 'verified' || s === 'expiring_soon')) return 'compliant'
  return 'missing_information'
}

function buildDriverEligibility(profile: Row) {
  const failures: Row[] = []
  const warnings: Row[] = []
  const name = `${profile.firstName} ${profile.lastName}`
  const docs = Array.isArray(profile.documents) ? (profile.documents as Row[]) : []
  const licenceFromDoc = docs.find(
    (d) =>
      ['driving_licence', 'licence'].includes(String(d.requirementType ?? d.requirement_type ?? '')) &&
      (d.expiryDate || d.expiry_date),
  )
  const licenceExpiry = profile.licenceExpiry
    ? String(profile.licenceExpiry)
    : licenceFromDoc
      ? String(licenceFromDoc.expiryDate ?? licenceFromDoc.expiry_date)
      : null
  const op = String(profile.operationalStatus ?? 'draft')

  const pendingReview = docs.filter((d) =>
    isDocumentPendingAdminReview(String(d.verificationStatus ?? d.verification_status ?? '')),
  )
  if (pendingReview.length) {
    failures.push({
      code: 'documents_pending_review',
      message: `${name}: ${pendingReview.length} document${pendingReview.length === 1 ? '' : 's'} awaiting admin review — open Compliance to approve or decline`,
      severity: 'block',
      category: 'compliance',
    })
  }

  if (!licenceExpiry) {
    failures.push({ code: 'licence_missing', message: `${name}: driving licence expiry is required`, severity: 'block', category: 'compliance' })
  } else if (new Date(licenceExpiry).getTime() < Date.now()) {
    failures.push({ code: 'licence_expired', message: `${name}: driving licence expired`, severity: 'block', category: 'compliance' })
  }

  if (op === 'suspended') {
    failures.push({ code: 'employment_blocked', message: `${name}: employment status is suspended`, severity: 'block', category: 'employment' })
  }
  // Onboarding / draft are not assignment-ready even when documents look complete
  if (op === 'draft' || op === 'onboarding' || op === 'pending_compliance') {
    failures.push({
      code: 'onboarding_incomplete',
      message: pendingReview.length
        ? `${name}: finish onboarding after admin review in Compliance`
        : pendingReview.length === 0 && docs.some((d) => String(d.verificationStatus ?? d.verification_status) === 'verified')
          ? `${name}: completing activation training in the Driver app — not yet eligible for dispatch`
          : `${name}: onboarding is not complete — finish onboarding and activate for dispatch`,
      severity: 'block',
      category: 'employment',
    })
  }

  // Level 1 mandatory training — must be complete for RELEASE STATUS = Eligible
  const training = Array.isArray(profile.trainingRequirements) ? (profile.trainingRequirements as Row[]) : []
  const outstanding = (status: string) =>
    status === 'missing' ||
    status === 'expired' ||
    status === 'failed' ||
    status === 'assigned' ||
    status === 'in_progress'

  const mandatoryGaps = training.filter((req) => {
    if (String(req.category) !== 'mandatory') return false
    return outstanding(String(req.status ?? ''))
  })
  const vehicleGaps = training.filter((req) => {
    if (String(req.category) !== 'vehicle') return false
    return outstanding(String(req.status ?? ''))
  })

  if (mandatoryGaps.length > 0) {
    failures.push({
      code: 'training_not_started',
      message:
        mandatoryGaps.length === 1
          ? `${String(mandatoryGaps[0]!.label)} is still outstanding — complete it under Training before release`
          : `${mandatoryGaps.length} mandatory training courses still outstanding — complete them under Training before release`,
      severity: 'block',
      category: 'compliance',
    })
  } else if (vehicleGaps.length > 0) {
    warnings.push({
      code: 'vehicle_training_incomplete',
      message: `${vehicleGaps.length} vehicle-specific course${vehicleGaps.length === 1 ? '' : 's'} still outstanding (e.g. MiDAS) — some vehicle types stay blocked`,
      severity: 'warning',
      category: 'compliance',
    })
  }

  const canAssign = failures.length === 0
  return {
    operationalEligibility: canAssign ? (warnings.length ? 'eligible_with_warning' : 'eligible') : 'not_eligible',
    failures,
    warnings,
    canAssign,
    canStartTrip: canAssign,
    summary: canAssign ? (warnings.length ? 'Eligible with warnings' : 'Eligible for work') : 'Not eligible for assignment',
  }
}

function approvedOnboarding() {
  const stages = [
    'identity',
    'registration_and_vin',
    'ownership',
    'depot_assignment',
    'capacity',
    'accessibility',
    'documents',
    'baseline_body_inspection',
    'safety_equipment',
    'telematics',
    'maintenance_schedule',
    'final_readiness_review',
  ].map((id) => ({
    id,
    label: id.replaceAll('_', ' '),
    status: 'complete',
    completedAt: new Date().toISOString(),
    completedBy: 'system',
  }))
  return {
    currentStage: 'approved',
    stages,
    approvedAt: new Date().toISOString(),
    approvedBy: 'system',
  }
}

async function loadDriverRows(companyId: string, driverId?: string) {
  let embedded = projDb(companyId)
    .from('drivers')
    .select('*, staff_members(*), depots(id, name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (driverId) embedded = embedded.eq('id', driverId)

  const embeddedResult = await embedded
  if (!embeddedResult.error) return (embeddedResult.data ?? []) as Row[]

  // Fallback when PostgREST cannot resolve embeds (schema cache / missing FK).
  let plain = projDb(companyId).from('drivers').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
  if (driverId) plain = plain.eq('id', driverId)
  const { data, error } = await plain
  if (error) throw new Error(error.message || embeddedResult.error.message)

  const rows = (data ?? []) as Row[]
  const staffIds = [...new Set(rows.map((r) => r.staff_id).filter(Boolean).map(String))]
  const depotIds = [...new Set(rows.map((r) => r.primary_depot_id).filter(Boolean).map(String))]

  const [staffRes, depotRes] = await Promise.all([
    staffIds.length
      ? projDb(companyId).from('staff_members').select('*').in('id', staffIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    depotIds.length
      ? projDb(companyId).from('depots').select('id, name').in('id', depotIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
  ])

  const staffById = new Map((staffRes.data ?? []).map((s: Row) => [String(s.id), s]))
  const depotById = new Map((depotRes.data ?? []).map((d: Row) => [String(d.id), d]))

  return rows.map((row) => ({
    ...row,
    staff_members: row.staff_id ? staffById.get(String(row.staff_id)) ?? null : null,
    depots: row.primary_depot_id ? depotById.get(String(row.primary_depot_id)) ?? null : null,
  }))
}

export async function projectDriverProfile(companyId: string, driverId?: string) {
  const data = await loadDriverRows(companyId, driverId)

  const driverIds = data.map((row) => String(row.id))
  const today = new Date().toISOString().slice(0, 10)

  const [dutiesRes, docsRes, restrictionsRes, accountsRes, trainingRes, auditRes, devicesRes] = await Promise.all([
    projDb(companyId)
      .from('duties')
      .select('id, driver_id, service_date, planned_sign_on_at, status')
      .eq('company_id', companyId)
      .gte('service_date', today)
      .order('service_date', { ascending: true })
      .limit(200),
    driverIds.length
      ? projDb(companyId).from('driver_documents').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? projDb(companyId).from('driver_restrictions').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? projDb(companyId).from('driver_app_accounts').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? projDb(companyId).from('driver_training').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    // Detail only — keep directory list light
    driverId
      ? projDb(companyId)
          .from('audit_events')
          .select('id, action, actor_id, occurred_at, created_at, before_snapshot, after_snapshot, reason')
          .eq('company_id', companyId)
          .eq('entity_type', 'driver')
          .eq('entity_id', driverId)
          .order('occurred_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? projDb(companyId)
          .from('driver_app_devices')
          .select('*')
          .eq('company_id', companyId)
          .in('driver_id', driverIds)
          .order('last_seen_at', { ascending: false })
      : Promise.resolve({ data: [] as Row[], error: null }),
  ])

  const duties = dutiesRes.error ? [] : dutiesRes.data ?? []
  const documents = docsRes.error ? [] : docsRes.data ?? []
  const restrictions = restrictionsRes.error ? [] : restrictionsRes.data ?? []
  const appAccounts = accountsRes.error ? [] : accountsRes.data ?? []
  const trainingRows = trainingRes.error ? [] : trainingRes.data ?? []
  const auditRows = auditRes.error ? [] : auditRes.data ?? []
  const deviceRows = devicesRes.error ? [] : devicesRes.data ?? []

  const actorIds = [...new Set(auditRows.map((a) => a.actor_id).filter(Boolean).map(String))]
  const { data: actorUsers } = actorIds.length
    ? await projDb(companyId).from('users').select('id, first_name, last_name, email').in('id', actorIds)
    : { data: [] as Row[] }
  const actorNameById = new Map(
    (actorUsers ?? []).map((u: Row) => [
      String(u.id),
      [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || String(u.email ?? 'Administrator'),
    ]),
  )

  const notesFromAudit = auditRows
    .filter((a) => String(a.action) === 'driver.note_added')
    .map((a) => {
      const after = (a.after_snapshot as Row | null) ?? {}
      return {
        id: String(a.id),
        category: String(after.category ?? 'general'),
        body: String(after.body ?? a.reason ?? ''),
        author: String(after.authorName ?? actorNameById.get(String(a.actor_id ?? '')) ?? 'Administrator'),
        createdAt: iso(a.occurred_at ?? a.created_at),
        visibleToDriver: Boolean(after.visibleToDriver),
      }
    })

  const auditEventsProjected = auditRows.map((a) => {
    const before = (a.before_snapshot as Row | null) ?? {}
    const after = (a.after_snapshot as Row | null) ?? {}
    const previousValue =
      before.operationalStatus != null
        ? String(before.operationalStatus)
        : before.accountStatus != null
          ? String(before.accountStatus)
          : null
    const newValue =
      after.operationalStatus != null
        ? String(after.operationalStatus)
        : after.accountStatus != null
          ? String(after.accountStatus)
          : after.channel != null
            ? String(after.channel)
            : null
    return {
      id: String(a.id),
      action: formatDriverAuditAction(String(a.action)),
      actor: actorNameById.get(String(a.actor_id ?? '')) ?? 'Administrator',
      actorRole: 'Command',
      createdAt: iso(a.occurred_at ?? a.created_at),
      previousValue,
      newValue,
      reason: a.reason ? String(a.reason) : null,
    }
  })

  const dutyByDriver = new Map<string, Row>()
  for (const duty of duties) {
    const id = String(duty.driver_id)
    if (!dutyByDriver.has(id)) dutyByDriver.set(id, duty)
  }
  const docsByDriver = new Map<string, Row[]>()
  for (const doc of documents ?? []) {
    const id = String(doc.driver_id)
    const list = docsByDriver.get(id) ?? []
    list.push(doc)
    docsByDriver.set(id, list)
  }
  const restrictionsByDriver = new Map<string, Row[]>()
  for (const r of restrictions ?? []) {
    const id = String(r.driver_id)
    const list = restrictionsByDriver.get(id) ?? []
    list.push(r)
    restrictionsByDriver.set(id, list)
  }
  const accountByDriver = new Map<string, Row>()
  for (const a of appAccounts ?? []) {
    accountByDriver.set(String(a.driver_id), a)
  }
  const trainingByDriver = new Map<string, Row[]>()
  for (const t of trainingRows ?? []) {
    const id = String(t.driver_id)
    const list = trainingByDriver.get(id) ?? []
    list.push(t)
    trainingByDriver.set(id, list)
  }
  const devicesByDriver = new Map<string, Row[]>()
  for (const d of deviceRows ?? []) {
    const id = String(d.driver_id)
    const list = devicesByDriver.get(id) ?? []
    list.push(d)
    devicesByDriver.set(id, list)
  }

  const profiles = data.map((row: Row) => {
    const staff = (row.staff_members as Row | null) ?? {}
    const depot = (row.depots as Row | null) ?? {}
    const nextDuty = dutyByDriver.get(String(row.id))
    const operationalStatus = mapOperationalStatus(row)
    const firstName = String(staff.first_name ?? 'Driver')
    const lastName = String(staff.last_name ?? row.driver_number ?? '')
    const docs = (docsByDriver.get(String(row.id)) ?? [])
      .map((d) => ({
        id: d.id,
        requirementType: d.requirement_type,
        label: d.label,
        referenceNumber: d.reference_number ?? null,
        issuingOrganisation: d.issuing_organisation ?? null,
        issueDate: d.issue_date ?? null,
        expiryDate: projectedDocumentExpiry(row, d.requirement_type, d.expiry_date),
        verificationStatus: d.verification_status,
        verifiedBy: d.verified_by ?? null,
        verifiedAt: d.verified_at ? iso(d.verified_at) : null,
        rejectionReason: d.rejection_reason ?? null,
        notes: d.notes ?? null,
        fileName: d.file_name ?? null,
        fileObjectId: d.file_object_id ?? null,
        createdAt: iso(d.created_at),
        updatedAt: d.updated_at ? iso(d.updated_at) : iso(d.created_at),
        sourceApp: d.source_app ? String(d.source_app) : d.file_object_id ? 'DRIVER' : 'COMMAND',
      }))
      .sort(
        (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
      )
    const app = accountByDriver.get(String(row.id))
    const rawAccountStatus = String(app?.account_status ?? row.account_status ?? 'not_created')
    // Once Command has activated for dispatch, directory must not keep showing Setup incomplete.
    let accountStatus = mapDriverAccountStatus(rawAccountStatus)
    if (
      (operationalStatus === 'eligible' || operationalStatus === 'restricted') &&
      ['setup_incomplete', 'registration_started', 'invitation_pending', 'draft'].includes(accountStatus)
    ) {
      accountStatus = 'active'
      if (app?.id && String(app.account_status) !== 'active') {
        void projDb(companyId)
          .from('driver_app_accounts')
          .update({
            account_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', app.id)
      }
    }
    const invitationSent =
      rawAccountStatus === 'invitation_sent' ||
      accountStatus === 'invitation_pending' ||
      Boolean(app?.invitation_sent_at ?? row.invitation_sent_at)
    const invitationHistory = invitationSent
      ? [
          {
            id: `invh-${row.id}-sent`,
            stage: 'invitation_sent',
            channel: app?.invitation_channel ?? row.invitation_channel ?? 'email',
            destination: staff.email ?? null,
            createdAt: app?.invitation_sent_at
              ? iso(app.invitation_sent_at)
              : row.invitation_sent_at
                ? iso(row.invitation_sent_at)
                : iso(new Date().toISOString()),
            actor: null,
            detail: null,
          },
        ]
      : []
    if (accountStatus === 'setup_incomplete' || accountStatus === 'active') {
      invitationHistory.push({
        id: `invh-${row.id}-accepted`,
        stage: accountStatus === 'active' ? 'activated' : 'password_created',
        channel: app?.invitation_channel ?? row.invitation_channel ?? 'email',
        destination: staff.email ?? null,
        createdAt: app?.registration_completed_at
          ? iso(app.registration_completed_at)
          : iso(new Date().toISOString()),
        actor: null,
        detail: null,
      })
    }
    const account = emptyDriverAccount({
      userAccountId: app?.user_id ?? staff.user_id ?? null,
      accountStatus,
      invitationStatus: invitationSent
        ? accountStatus === 'setup_incomplete' || accountStatus === 'active'
          ? 'completed'
          : 'sent'
        : accountStatus === 'draft'
          ? 'not_sent'
          : 'pending',
      invitationSentAt: app?.invitation_sent_at ? iso(app.invitation_sent_at) : row.invitation_sent_at ? iso(row.invitation_sent_at) : null,
      invitationExpiresAt: app?.invitation_expires_at ? iso(app.invitation_expires_at) : row.invitation_expires_at ? iso(row.invitation_expires_at) : null,
      invitationDestination: staff.email ?? null,
      invitationChannel: app?.invitation_channel ?? row.invitation_channel ?? null,
      registrationCompletedAt: app?.registration_completed_at ? iso(app.registration_completed_at) : null,
      emailVerified: Boolean(app?.user_id),
      authenticationMethod: app?.user_id ? 'password' : 'none',
      mfaEnabled: Boolean(app?.mfa_enabled),
      lastLoginAt: app?.last_login_at ? iso(app.last_login_at) : null,
      lastAppActivityAt: app?.last_app_sync_at ? iso(app.last_app_sync_at) : app?.last_login_at ? iso(app.last_login_at) : null,
      activeSessionCount: Number(app?.active_session_count ?? 0),
      registeredDeviceCount: (devicesByDriver.get(String(row.id)) ?? []).filter(
        (d) => String(d.security_status) !== 'revoked',
      ).length || Number(app?.registered_device_count ?? 0),
      appVersion: app?.app_version ?? null,
      operatingSystem: app?.operating_system ?? null,
      lastAppSyncAt: app?.last_app_sync_at ? iso(app.last_app_sync_at) : null,
      invitationHistory,
      devices: (devicesByDriver.get(String(row.id)) ?? []).map((d) => ({
        id: String(d.id),
        label: String(d.label ?? 'Driver phone'),
        platform: String(d.platform ?? 'unknown'),
        appVersion: d.app_version ? String(d.app_version) : null,
        operatingSystem: d.operating_system ? String(d.operating_system) : null,
        registeredAt: iso(d.registered_at ?? d.created_at),
        lastSeenAt: iso(d.last_seen_at ?? d.updated_at ?? d.registered_at),
        trusted: String(d.security_status) === 'trusted',
        biometricUnlock: Boolean(d.biometric_unlock),
        biometricMethod: d.biometric_method ? String(d.biometric_method) : null,
        biometricEnabledAt: d.biometric_enabled_at ? iso(d.biometric_enabled_at) : null,
        lastBiometricUnlockAt: d.last_biometric_unlock_at ? iso(d.last_biometric_unlock_at) : null,
        pushNotificationsEnabled: Boolean(d.push_notifications_enabled),
        locationAccess: String(d.location_access ?? 'unknown'),
        securityStatus: String(d.security_status ?? 'trusted'),
        requirePasswordNextLogin: Boolean(d.require_password_next_login),
      })),
    })

    const profile: Row = {
      id: row.id,
      reference: row.driver_number,
      firstName,
      lastName,
      preferredName: staff.preferred_name ?? null,
      photoUrl: null,
      profilePhotoStorageKey: row.profile_photo_storage_key
        ? String(row.profile_photo_storage_key)
        : null,
      dateOfBirth: staff.date_of_birth ?? null,
      status: mapDutyStatusFromDuty(nextDuty?.status),
      email: staff.email ?? null,
      phone: staff.phone ?? null,
      depotId: row.primary_depot_id ?? null,
      depotName: depot.name ?? null,
      secondaryDepotIds: row.secondary_depot_ids ?? [],
      secondaryDepotNames: [],
      employeeNumber: staff.employee_number ?? row.driver_number,
      employmentType: mapEmploymentType(row.employment_type),
      employmentStatus: mapEmploymentFromDriver(row, staff),
      operationalStatus,
      onboardingStep: row.onboarding_step ?? 'personal',
      complianceStatus: deriveProjectedComplianceStatus(docs),
      dutyStatus: mapDutyStatusFromDuty(nextDuty?.status),
      availabilityStatus: ['eligible', 'restricted'].includes(operationalStatus) ? 'available' : 'unavailable',
      startDate: row.start_date ?? null,
      managerName: row.manager_name ?? null,
      homeAddress: staff.home_address ?? null,
      emergencyContact: staff.emergency_contact ?? null,
      licenceNumber: null,
      licenceCountry: row.licence_country ?? 'GB',
      licenceCategories: row.licence_categories ?? null,
      licenceExpiry:
        row.licence_expiry_date ??
        docs.find((d) => d.requirementType === 'driving_licence' || d.requirementType === 'licence')?.expiryDate ??
        null,
      dqcNumber: row.dqc_number ?? null,
      cpcExpiry:
        row.cpc_expiry_date ??
        docs.find((d) => d.requirementType === 'dqc' || d.requirementType === 'cpc')?.expiryDate ??
        null,
      dbsExpiry: row.dbs_expiry_date ?? docs.find((d) => d.requirementType === 'dbs')?.expiryDate ?? null,
      medicalExpiry: row.medical_expiry_date ?? docs.find((d) => d.requirementType === 'medical')?.expiryDate ?? null,
      tachoCardNumber: row.tacho_card_number ?? null,
      tachoCardExpiry: row.tacho_card_expiry ?? null,
      rightToWorkStatus: row.right_to_work_status ?? null,
      workPermissions: workPermissionsFromKeys(row.work_permission_keys),
      account,
      restrictions: (restrictionsByDriver.get(String(row.id)) ?? []).map((r) => ({
        id: r.id,
        type: r.restriction_type,
        label: r.label,
        reason: r.reason,
        status: r.status,
        effectiveFrom: r.effective_from ?? null,
        effectiveTo: r.effective_to ?? null,
      })),
      documents: docs,
      documentVersions: [],
      trainingRequirements: buildProjectedTrainingRequirements(
        workPermissionsFromKeys(row.work_permission_keys),
        docs,
        trainingByDriver.get(String(row.id)) ?? [],
      ),
      eligibilityOverrides: [],
      notes: driverId ? notesFromAudit : [],
      auditEvents: driverId ? auditEventsProjected : [],
      nextDutyReference: nextDuty ? `DUTY-${String(nextDuty.id).slice(0, 8)}` : null,
      nextDutyTime: nextDuty?.planned_sign_on_at
        ? new Date(String(nextDuty.planned_sign_on_at)).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
      nearestExpiryDate: null,
      nearestExpiryLabel: null,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }

    const nearest = nearestExpiryFromProfile(profile)
    profile.nearestExpiryDate = nearest.date
    profile.nearestExpiryLabel = nearest.label

    const eligibility = buildDriverEligibility(profile)
    profile.eligibility = eligibility
    profile.operationalEligibility = eligibility.operationalEligibility
    return profile
  })

  await Promise.all(
    profiles.map(async (profile) => {
      const key = profile.profilePhotoStorageKey
      profile.photoUrl = await signedDriverProfilePhotoUrl(companyId, key)
      delete profile.profilePhotoStorageKey
    }),
  )

  if (driverId) {
    if (!profiles.length) return null
    return profiles[0]
  }
  return profiles
}

export function summariseDrivers(profiles: Row[]) {
  return {
    totalActive: profiles.filter((p) => p.employmentStatus !== 'employment_ended').length,
    eligibleToday: profiles.filter((p) => p.operationalEligibility === 'eligible').length,
    notEligible: profiles.filter((p) => p.operationalEligibility === 'not_eligible').length,
    documentsExpiringSoon: profiles.filter((p) => p.nearestExpiryDate).length,
    invitePending: profiles.filter((p) => (p.account as Row)?.invitationStatus === 'sent').length,
    onDuty: profiles.filter((p) => ['scheduled', 'on_trip', 'available'].includes(String(p.dutyStatus))).length,
    onTrip: profiles.filter((p) => p.dutyStatus === 'on_trip').length,
    suspendedOrRestricted: profiles.filter((p) =>
      ['suspended', 'restricted'].includes(String(p.employmentStatus)) ||
      p.operationalEligibility === 'restricted'
    ).length,
    appNotRecentlySynced: profiles.length,
  }
}

function mapProfileCheckType(value: unknown): string {
  const raw = String(value ?? 'driver_pre_use').toLowerCase()
  const allowed = new Set([
    'driver_pre_use',
    'driver_changeover',
    'yard_return',
    'yard_release',
    'pmi',
    'specialist_lift',
    'specialist_restraint',
  ])
  if (allowed.has(raw)) return raw
  if (raw === 'daily' || raw === 'walkaround' || raw === 'pre_use' || raw === 'preuse') return 'driver_pre_use'
  if (raw === 'changeover') return 'driver_changeover'
  if (raw === 'return') return 'yard_return'
  if (raw === 'release') return 'yard_release'
  return 'driver_pre_use'
}

function mapProfileCheckResult(value: unknown): 'pass' | 'fail' | 'pass_with_advisory' {
  const result = String(value ?? 'pass').toLowerCase()
  if (result === 'fail' || result === 'failed') return 'fail'
  if (result === 'pass_with_advisory') return 'pass_with_advisory'
  return 'pass'
}

function mapProfileCheckSource(value: unknown): 'driver' | 'yard' | 'maintenance' | 'command' {
  const source = String(value ?? 'driver').toLowerCase()
  if (source === 'yard') return 'yard'
  if (source === 'maintenance') return 'maintenance'
  if (source === 'command' || source === 'admin') return 'command'
  return 'driver'
}

function mapVehicleCheckEntry(row: Row) {
  const staff = ((row.drivers as Row | null)?.staff_members as Row | null) ?? null
  const performedBy = staff
    ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || 'Driver'
    : 'Driver'
  const checkType = mapProfileCheckType(row.check_type)
  const fuelRaw = row.fuel_level
  const fuelLevel =
    fuelRaw != null && fuelRaw !== '' && Number.isFinite(Number(fuelRaw)) ? Number(fuelRaw) : null
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id ?? ''),
    checkType,
    checkDate: iso(row.submitted_at ?? row.created_at),
    result: mapProfileCheckResult(row.result),
    performedBy,
    sourceApplication: mapProfileCheckSource(row.source_app),
    mileage: row.odometer != null && row.odometer !== '' ? Number(row.odometer) : null,
    fuelLevel,
    notes: row.ops_outcome ? String(row.ops_outcome) : null,
    defectIds: [] as string[],
  }
}

async function loadVehicleCheckEntries(companyId: string, vehicleId?: string) {
  let query = projDb(companyId)
    .from('vehicle_checks')
    .select(
      'id, vehicle_id, check_type, result, ops_outcome, odometer, fuel_level, submitted_at, created_at, source_app, drivers(staff_members(first_name, last_name))',
    )
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false })
    .limit(vehicleId ? 100 : 300)
  if (vehicleId) query = query.eq('vehicle_id', vehicleId)

  const { data, error } = await query
  if (error) {
    console.error('vehicle_checks profile query failed', error.message)
    return [] as ReturnType<typeof mapVehicleCheckEntry>[]
  }
  return (data ?? []).map((row: Row) => mapVehicleCheckEntry(row))
}

function driverDisplayName(driver: Row | null | undefined): string | null {
  if (!driver) return null
  const staff = (driver.staff_members as Row | null) ?? null
  const name = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim()
  if (name) return name
  if (driver.driver_number) return String(driver.driver_number)
  return null
}

function ukDepartureLabel(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/London',
  })
}

type VehicleOpsContext = {
  currentDriverId: string | null
  currentDriverName: string | null
  currentRunId: string | null
  currentRunReference: string | null
  nextDriverName: string | null
  nextRunReference: string | null
  nextDepartureTime: string | null
  mileage: number | null
  fuelLevelPercent: number | null
}

type VehicleOpsSlot = {
  atMs: number
  serviceDate: string
  status: string
  active: boolean
  done: boolean
  driverId: string | null
  driverName: string | null
  runId: string | null
  runReference: string | null
  departureAt: string | null
}

/** Current / next allocation + latest mileage/fuel from duties, runs, assignments and checks. */
async function loadVehicleOperationalContexts(
  companyId: string,
  vehicleIds: string[],
  checksByVehicle: Map<string, Array<{ mileage: number | null; checkDate: string; fuelLevel?: number | null }>>,
): Promise<Map<string, VehicleOpsContext>> {
  const out = new Map<string, VehicleOpsContext>()
  for (const id of vehicleIds) {
    const checks = checksByVehicle.get(id) ?? []
    const withMiles = checks.find((c) => c.mileage != null && Number.isFinite(c.mileage))
    const withFuel = checks.find((c) => c.fuelLevel != null && Number.isFinite(c.fuelLevel))
    out.set(id, {
      currentDriverId: null,
      currentDriverName: null,
      currentRunId: null,
      currentRunReference: null,
      nextDriverName: null,
      nextRunReference: null,
      nextDepartureTime: null,
      mileage: withMiles?.mileage ?? null,
      fuelLevelPercent: withFuel?.fuelLevel ?? null,
    })
  }
  if (!vehicleIds.length) return out

  const today = new Date().toISOString().slice(0, 10)
  const nowMs = Date.now()
  const slotsByVehicle = new Map<string, VehicleOpsSlot[]>()

  const pushSlot = (vehicleId: string, slot: VehicleOpsSlot) => {
    const list = slotsByVehicle.get(vehicleId) ?? []
    list.push(slot)
    slotsByVehicle.set(vehicleId, list)
  }

  const [{ data: runs }, { data: duties }, { data: assignments }, { data: fuelRows }, { data: adblueRows }] =
    await Promise.all([
      projDb(companyId)
        .from('runs')
        .select(
          'id, run_reference, service_date, planned_start_at, status, vehicle_id, driver_id, drivers(id, driver_number, staff_members(first_name, last_name))',
        )
        .eq('company_id', companyId)
        .in('vehicle_id', vehicleIds)
        .gte('service_date', today)
        .order('planned_start_at', { ascending: true })
        .limit(400),
      projDb(companyId)
        .from('duties')
        .select(
          'id, service_date, planned_sign_on_at, status, vehicle_id, driver_id, drivers(id, driver_number, staff_members(first_name, last_name))',
        )
        .eq('company_id', companyId)
        .in('vehicle_id', vehicleIds)
        .gte('service_date', today)
        .order('planned_sign_on_at', { ascending: true })
        .limit(400),
      projDb(companyId)
        .from('trip_assignments')
        .select(
          'id, status, vehicle_id, driver_id, run_id, assigned_at, effective_from, drivers(id, driver_number, staff_members(first_name, last_name)), runs(id, run_reference, service_date, planned_start_at, status), trips(id, trip_reference, planned_pickup_at, status)',
        )
        .eq('company_id', companyId)
        .in('vehicle_id', vehicleIds)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(400),
      projDb(companyId)
        .from('fuel_records')
        .select('vehicle_id, odometer, recorded_at')
        .eq('company_id', companyId)
        .in('vehicle_id', vehicleIds)
        .not('odometer', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(200),
      projDb(companyId)
        .from('adblue_records')
        .select('vehicle_id, mileage, top_up_at')
        .eq('company_id', companyId)
        .in('vehicle_id', vehicleIds)
        .not('mileage', 'is', null)
        .order('top_up_at', { ascending: false })
        .limit(200),
    ])

  for (const row of runs ?? []) {
    const vehicleId = String(row.vehicle_id ?? '')
    if (!vehicleId) continue
    const status = String(row.status ?? 'planned')
    const start = row.planned_start_at ? String(row.planned_start_at) : `${String(row.service_date)}T08:00:00.000Z`
    const driver = (row.drivers as Row | null) ?? null
    pushSlot(vehicleId, {
      atMs: new Date(start).getTime() || nowMs,
      serviceDate: String(row.service_date ?? today),
      status,
      active: ['assigned', 'in_progress'].includes(status),
      done: ['completed', 'cancelled'].includes(status),
      driverId: row.driver_id ? String(row.driver_id) : driver?.id ? String(driver.id) : null,
      driverName: driverDisplayName(driver),
      runId: String(row.id),
      runReference: row.run_reference ? String(row.run_reference) : null,
      departureAt: start,
    })
  }

  for (const row of duties ?? []) {
    const vehicleId = String(row.vehicle_id ?? '')
    if (!vehicleId) continue
    const status = String(row.status ?? 'planned')
    const start = row.planned_sign_on_at
      ? String(row.planned_sign_on_at)
      : `${String(row.service_date)}T08:00:00.000Z`
    const driver = (row.drivers as Row | null) ?? null
    pushSlot(vehicleId, {
      atMs: new Date(start).getTime() || nowMs,
      serviceDate: String(row.service_date ?? today),
      status,
      active: ['signed_on', 'in_progress'].includes(status),
      done: ['signed_off', 'cancelled'].includes(status),
      driverId: row.driver_id ? String(row.driver_id) : driver?.id ? String(driver.id) : null,
      driverName: driverDisplayName(driver),
      runId: null,
      runReference: `DUTY-${String(row.id).slice(0, 8).toUpperCase()}`,
      departureAt: start,
    })
  }

  // Duties that only link the vehicle via duty_runs → runs.vehicle_id
  const runIds = [...new Set((runs ?? []).map((row: Row) => String(row.id)).filter(Boolean))]
  if (runIds.length) {
    const { data: dutyLinks } = await projDb(companyId)
      .from('duty_runs')
      .select('duty_id, run_id, sequence, runs(id, vehicle_id, run_reference)')
      .in('run_id', runIds)
    const dutyIds = [...new Set((dutyLinks ?? []).map((link: Row) => String(link.duty_id)).filter(Boolean))]
    if (dutyIds.length) {
      const { data: linkedDuties } = await projDb(companyId)
        .from('duties')
        .select(
          'id, service_date, planned_sign_on_at, status, vehicle_id, driver_id, drivers(id, driver_number, staff_members(first_name, last_name))',
        )
        .eq('company_id', companyId)
        .in('id', dutyIds)
        .gte('service_date', today)
      const runVehicleByDuty = new Map<string, { vehicleId: string; runId: string; runReference: string | null }>()
      for (const link of dutyLinks ?? []) {
        const run = (link.runs as Row | null) ?? null
        const vehicleId = String(run?.vehicle_id ?? '')
        if (!vehicleId || !vehicleIds.includes(vehicleId)) continue
        const dutyId = String(link.duty_id)
        if (!runVehicleByDuty.has(dutyId) || Number(link.sequence) === 1) {
          runVehicleByDuty.set(dutyId, {
            vehicleId,
            runId: String(run?.id ?? link.run_id ?? ''),
            runReference: run?.run_reference ? String(run.run_reference) : null,
          })
        }
      }
      for (const row of linkedDuties ?? []) {
        const linked = runVehicleByDuty.get(String(row.id))
        if (!linked) continue
        // Prefer direct duty.vehicle_id slots already pushed above.
        if (row.vehicle_id && String(row.vehicle_id) === linked.vehicleId) continue
        const status = String(row.status ?? 'planned')
        const start = row.planned_sign_on_at
          ? String(row.planned_sign_on_at)
          : `${String(row.service_date)}T08:00:00.000Z`
        const driver = (row.drivers as Row | null) ?? null
        pushSlot(linked.vehicleId, {
          atMs: new Date(start).getTime() || nowMs,
          serviceDate: String(row.service_date ?? today),
          status,
          active: ['signed_on', 'in_progress'].includes(status),
          done: ['signed_off', 'cancelled'].includes(status),
          driverId: row.driver_id ? String(row.driver_id) : driver?.id ? String(driver.id) : null,
          driverName: driverDisplayName(driver),
          runId: linked.runId || null,
          runReference: linked.runReference ?? `DUTY-${String(row.id).slice(0, 8).toUpperCase()}`,
          departureAt: start,
        })
      }
    }
  }

  for (const row of assignments ?? []) {
    const vehicleId = String(row.vehicle_id ?? '')
    if (!vehicleId) continue
    const run = (row.runs as Row | null) ?? null
    const trip = (row.trips as Row | null) ?? null
    const driver = (row.drivers as Row | null) ?? null
    const start =
      (run?.planned_start_at ? String(run.planned_start_at) : null) ??
      (trip?.planned_pickup_at ? String(trip.planned_pickup_at) : null) ??
      (row.effective_from ? String(row.effective_from) : null) ??
      (row.assigned_at ? String(row.assigned_at) : null)
    if (!start) continue
    const serviceDate = String(run?.service_date ?? start.slice(0, 10))
    if (serviceDate < today) continue
    const status = String(run?.status ?? trip?.status ?? 'assigned')
    pushSlot(vehicleId, {
      atMs: new Date(start).getTime() || nowMs,
      serviceDate,
      status,
      active: ['assigned', 'in_progress', 'active'].includes(status),
      done: ['completed', 'cancelled', 'no_show', 'aborted'].includes(status),
      driverId: row.driver_id ? String(row.driver_id) : driver?.id ? String(driver.id) : null,
      driverName: driverDisplayName(driver),
      runId: run?.id ? String(run.id) : row.run_id ? String(row.run_id) : null,
      runReference:
        (run?.run_reference ? String(run.run_reference) : null) ??
        (trip?.trip_reference ? String(trip.trip_reference) : null),
      departureAt: start,
    })
  }

  for (const row of fuelRows ?? []) {
    const vehicleId = String(row.vehicle_id ?? '')
    const ctx = out.get(vehicleId)
    if (!ctx || ctx.mileage != null) continue
    const miles = Number(row.odometer)
    if (Number.isFinite(miles)) ctx.mileage = miles
  }
  for (const row of adblueRows ?? []) {
    const vehicleId = String(row.vehicle_id ?? '')
    const ctx = out.get(vehicleId)
    if (!ctx || ctx.mileage != null) continue
    const miles = Number(row.mileage)
    if (Number.isFinite(miles)) ctx.mileage = miles
  }

  for (const [vehicleId, slots] of slotsByVehicle) {
    const ctx = out.get(vehicleId)
    if (!ctx) continue
    const usable = slots
      .filter((s) => !s.done && Number.isFinite(s.atMs))
      .sort((a, b) => a.atMs - b.atMs)

    const current =
      usable.find((s) => s.active) ??
      usable.find((s) => s.serviceDate === today && s.atMs <= nowMs) ??
      usable.find((s) => s.serviceDate === today) ??
      null

    const next =
      usable.find((s) => {
        if (!current) return s.atMs > nowMs || s.serviceDate > today
        if (s.runId && current.runId && s.runId === current.runId) return false
        if (s.runReference && current.runReference && s.runReference === current.runReference && s.atMs === current.atMs) {
          return false
        }
        return s.atMs > current.atMs
      }) ?? null

    if (current) {
      ctx.currentDriverId = current.driverId
      ctx.currentDriverName = current.driverName
      ctx.currentRunId = current.runId
      ctx.currentRunReference = current.runReference
    }
    if (next) {
      ctx.nextDriverName = next.driverName
      ctx.nextRunReference = next.runReference
      ctx.nextDepartureTime = ukDepartureLabel(next.departureAt)
    } else if (!current && usable[0] && usable[0].serviceDate > today) {
      const upcoming = usable[0]
      ctx.nextDriverName = upcoming.driverName
      ctx.nextRunReference = upcoming.runReference
      ctx.nextDepartureTime = ukDepartureLabel(upcoming.departureAt)
    }
  }

  return out
}

export async function projectVehicleProfile(companyId: string, vehicleId?: string) {
  let query = projDb(companyId)
    .from('vehicles')
    .select('*, depots(id, name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (vehicleId) query = query.eq('id', vehicleId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const [{ data: defectCounts }, checkEntries, equipmentRows] = await Promise.all([
    projDb(companyId)
      .from('defects')
      .select('vehicle_id, severity, status')
      .eq('company_id', companyId)
      .not('status', 'in', '("closed","rejected")'),
    loadVehicleCheckEntries(companyId, vehicleId),
    listEquipmentRowsForCompany(companyId),
  ])

  const equipmentByVehicle = groupVehicleEquipmentItems(
    vehicleId ? equipmentRows.filter((row) => String(row.vehicle_id ?? '') === vehicleId) : equipmentRows,
  )

  const openByVehicle = new Map<string, { open: number; critical: number }>()
  for (const defect of defectCounts ?? []) {
    const id = String(defect.vehicle_id)
    const current = openByVehicle.get(id) ?? { open: 0, critical: 0 }
    current.open += 1
    if (['critical', 'dangerous', 'major'].includes(String(defect.severity))) current.critical += 1
    openByVehicle.set(id, current)
  }

  const checksByVehicle = new Map<string, ReturnType<typeof mapVehicleCheckEntry>[]>()
  for (const entry of checkEntries) {
    if (!entry.vehicleId) continue
    const list = checksByVehicle.get(entry.vehicleId) ?? []
    list.push(entry)
    checksByVehicle.set(entry.vehicleId, list)
  }

  const vehicleIds = (data ?? []).map((row: Row) => String(row.id))
  const opsByVehicle = await loadVehicleOperationalContexts(companyId, vehicleIds, checksByVehicle)

  const profiles = (data ?? []).map((row: Row) => {
    const depot = (row.depots as Row | null) ?? {}
    const depotId = String(row.primary_depot_id ?? depot.id ?? '')
    const depotName = String(depot.name ?? 'Depot')
    const op = mapVehicleOpStatus(row.operational_status)
    const counts = openByVehicle.get(String(row.id)) ?? { open: 0, critical: 0 }
    const vor = op === 'vor'
    const regLabel = String(row.registration ?? '').trim()
    const complianceFailures = vehicleDocumentExpiryFailures(row, regLabel)
    const failures: Array<{ code: string; message: string; severity: string; category: string }> = []
    if (vor) {
      failures.push({ code: 'vor', message: 'Vehicle is VOR', severity: 'block', category: 'operational' })
    }
    failures.push(...complianceFailures)
    const blocked = failures.some((f) => f.severity === 'block')
    const releaseDecision = blocked ? 'blocked' : counts.critical > 0 ? 'restricted_use' : 'released'
    const conditionStatus =
      counts.critical > 0 ? 'safety_critical' : counts.open > 0 ? 'repair_required' : 'no_known_issues'
    const lifecycleStatus = row.operational_status === 'decommissioned' ? 'archived' : 'active'
    const complianceStatus = complianceFailures.length ? 'non_compliant' : 'compliant'
    const release = {
      releaseDecision,
      failures,
      warnings: [],
      canAllocate: !blocked && counts.critical === 0,
      canLeaveYard: !vor && !blocked,
      canAcceptPassengers: !blocked && counts.critical === 0,
      summary: blocked
        ? `Blocked — ${failures[0]?.message ?? 'compliance'}`
        : counts.critical > 0
          ? 'Restricted use'
          : 'Released for service',
      evaluatedAt: new Date().toISOString(),
    }
    const readiness = {
      vehicleId: row.id,
      lifecycleStatus,
      operationalStatus: op,
      complianceStatus,
      conditionStatus,
      assignmentEligible: release.canAllocate,
      blockingReasons: release.failures.map((f: { message: string }) => f.message),
      warningReasons: [] as string[],
      calculatedAt: release.evaluatedAt,
      releaseDecision,
    }
    const checks = (checksByVehicle.get(String(row.id)) ?? []).map(
      ({ vehicleId: _vehicleId, fuelLevel: _fuelLevel, ...entry }) => entry,
    )
    const latestCheck = checks[0]
    const ops = opsByVehicle.get(String(row.id))
    const motExpiry = row.mot_expiry ? iso(row.mot_expiry).slice(0, 10) : null
    const insuranceExpiry = row.insurance_expiry ? iso(row.insurance_expiry).slice(0, 10) : null
    const taxExpiry = row.tax_expiry ? iso(row.tax_expiry).slice(0, 10) : null
    const tachographCalibrationExpiry = row.tachograph_calibration_expiry
      ? iso(row.tachograph_calibration_expiry).slice(0, 10)
      : null
    const pmiDueAt = row.pmi_due_at ? iso(row.pmi_due_at).slice(0, 10) : null
    const nextServiceDueAt = row.next_service_due_at ? iso(row.next_service_due_at).slice(0, 10) : null
    const documents = buildVehicleComplianceDocuments(row, String(row.id))
    const nearest = nearestVehicleComplianceExpiry(row)
    return {
      id: row.id,
      reference: row.fleet_number,
      registrationNumber: row.registration,
      previousRegistrations: [],
      vin: null,
      fleetNumber: row.fleet_number,
      make: row.make ?? 'Unknown',
      model: row.model ?? 'Unknown',
      modelYear: row.year ?? null,
      vehicleCategory: row.vehicle_class ?? 'minibus',
      colour: row.colour ?? null,
      ownershipType: row.ownership_type ?? 'owned',
      ownerName: null,
      homeDepotId: depotId,
      homeDepotName: depotName,
      currentDepotId: depotId,
      currentDepotName: depotName,
      currentLocationLabel: depotName,
      parkingBay: null,
      seatingCapacity: row.seat_capacity ?? 0,
      wheelchairCapacity: row.wheelchair_capacity ?? 0,
      standingCapacity: row.standing_capacity ?? 0,
      fuelType: row.fuel_type ?? 'diesel',
      fuelLevelPercent: ops?.fuelLevelPercent ?? null,
      batteryLevelPercent: null,
      mileage: ops?.mileage ?? null,
      lifecycleStatus,
      operationalStatus: op,
      complianceStatus,
      conditionStatus,
      yardStatus: vor ? 'workshop' : 'in_yard',
      readinessStatus: blocked ? 'not_ready' : vor ? 'cleaning_required' : 'ready',
      releaseDecision,
      readiness,
      capabilities: [],
      motExpiry,
      insuranceExpiry,
      taxExpiry,
      tachographCalibrationExpiry,
      pmiDueAt,
      nextServiceDueAt,
      wheelRetorqueDueAt: row.wheel_retorque_due_at ? iso(row.wheel_retorque_due_at) : null,
      currentDriverId: ops?.currentDriverId ?? null,
      currentDriverName: ops?.currentDriverName ?? null,
      currentRunId: ops?.currentRunId ?? null,
      currentRunReference: ops?.currentRunReference ?? null,
      nextDriverName: ops?.nextDriverName ?? null,
      nextRunReference: ops?.nextRunReference ?? null,
      nextDepartureTime: ops?.nextDepartureTime ?? null,
      lastCheckAt: latestCheck?.checkDate ?? null,
      lastCheckType: latestCheck?.checkType ?? null,
      // PMI due date is the authoritative next maintenance window for schedule cards.
      nextMaintenanceDate: pmiDueAt ?? nextServiceDueAt,
      nextMaintenanceMileage: null,
      openDefectCount: counts.open,
      criticalDefectCount: counts.critical,
      checksOverdue: false,
      dateAddedToFleet: iso(row.commissioned_at ?? row.created_at).slice(0, 10),
      documents,
      restrictions: [],
      vorRecords: [],
      notes: [],
      auditEvents: [],
      checks,
      defects: [],
      workOrders: [],
      downtimeEvents: [],
      wheelLayout: [],
      retorqueTasks: [],
      equipment: equipmentByVehicle.get(String(row.id)) ?? [],
      tachograph: null,
      onboarding: approvedOnboarding(),
      damageRecords: [],
      telematics: null,
      platformEvents: [],
      release,
      nearestExpiryDate: nearest.date,
      nearestExpiryLabel: nearest.label,
      status: op,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }
  })

  if (vehicleId) {
    if (!profiles.length) return null
    return profiles[0]
  }
  return profiles
}

export function summariseVehicles(profiles: Row[]) {
  return {
    totalActive: profiles.filter((p) => p.lifecycleStatus === 'active').length,
    availableNow: profiles.filter((p) => p.operationalStatus === 'available').length,
    currentlyAllocated: profiles.filter((p) => p.operationalStatus === 'allocated').length,
    inService: profiles.filter((p) => p.operationalStatus === 'in_service').length,
    vor: profiles.filter((p) => p.operationalStatus === 'vor').length,
    inMaintenance: profiles.filter((p) =>
      ['in_workshop', 'awaiting_parts', 'under_inspection'].includes(String(p.operationalStatus))
    ).length,
    checksOverdue: profiles.filter((p) => p.checksOverdue).length,
    complianceExpiring: 0,
    motDue: 0,
    tachographDue: 0,
    wheelRetorqueDue: 0,
    unknownLocation: profiles.filter((p) => p.yardStatus === 'unknown_location').length,
  }
}

function documentStatusFromExpiry(expiryIso: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'unknown' {
  if (!expiryIso) return 'unknown'
  const expiry = new Date(expiryIso)
  if (Number.isNaN(expiry.getTime())) return 'unknown'
  const now = Date.now()
  if (expiry.getTime() < now) return 'expired'
  const days = (expiry.getTime() - now) / (24 * 60 * 60 * 1000)
  if (days <= 42) return 'expiring'
  return 'valid'
}

/** Compliance cabinet rows derived from vehicle schedule date columns (one operational truth). */
function buildVehicleComplianceDocuments(row: Row, vehicleId: string): Row[] {
  const docs: Row[] = []
  const push = (requirementType: string, label: string, expiry: unknown) => {
    if (expiry == null || expiry === '') return
    const expiryDate = iso(expiry).slice(0, 10)
    if (!expiryDate || Number.isNaN(new Date(expiryDate).getTime())) return
    const status = documentStatusFromExpiry(expiryDate)
    docs.push({
      id: `${vehicleId}-${requirementType}`,
      requirementType,
      label,
      referenceNumber: null,
      issuingOrganisation: null,
      issueDate: null,
      expiryDate,
      verificationStatus: status === 'expired' ? 'rejected' : 'verified',
      verifiedBy: 'Command schedule',
      verifiedAt: null,
      rejectionReason: status === 'expired' ? 'Past expiry on vehicle schedule' : null,
      notes: 'Synced from vehicle compliance dates',
      fileName: null,
    })
  }

  push('mot', 'MOT / annual test', row.mot_expiry)
  push('insurance', 'Fleet insurance', row.insurance_expiry)
  push('tax', 'Road tax', row.tax_expiry)
  push('tachograph_calibration', 'Tachograph calibration', row.tachograph_calibration_expiry)
  push('pmi', 'PMI / safety inspection', row.pmi_due_at)
  push('service', 'Next service due', row.next_service_due_at)
  return docs
}

function nearestVehicleComplianceExpiry(row: Row): { date: string | null; label: string | null } {
  const candidates: Array<{ date: string; label: string }> = []
  const push = (date: unknown, label: string) => {
    if (date == null || date === '') return
    const value = iso(date).slice(0, 10)
    if (!value || Number.isNaN(new Date(value).getTime())) return
    candidates.push({ date: value, label })
  }

  push(row.mot_expiry, 'MOT')
  push(row.insurance_expiry, 'Insurance')
  push(row.tax_expiry, 'Tax')
  push(row.tachograph_calibration_expiry, 'Tachograph')
  push(row.pmi_due_at, 'PMI')
  push(row.next_service_due_at, 'Service')

  if (!candidates.length) return { date: null, label: null }
  candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return candidates[0]!
}

/** MOT / PMI / tax / insurance / tyres past due → hard block on allocate/dispatch. */
function vehicleDocumentExpiryFailures(
  row: Row,
  registration: string,
): Array<{ code: string; message: string; severity: string; category: string }> {
  const prefix = registration ? `Vehicle ${registration}` : 'Vehicle'
  const out: Array<{ code: string; message: string; severity: string; category: string }> = []
  const pushExpired = (raw: unknown, code: string, label: string) => {
    if (raw == null || raw === '') return
    const status = documentStatusFromExpiry(String(raw))
    if (status !== 'expired') return
    out.push({
      code,
      message: `${prefix}: ${label} expired — cannot assign or dispatch.`,
      severity: 'block',
      category: 'compliance',
    })
  }
  pushExpired(row.mot_expiry, 'mot_expired', 'MOT')
  pushExpired(row.insurance_expiry, 'insurance_expired', 'Insurance')
  pushExpired(row.tax_expiry, 'tax_expired', 'Road tax')
  pushExpired(row.tachograph_calibration_expiry, 'tacho_cal_expired', 'Tachograph calibration')
  pushExpired(row.pmi_due_at, 'pmi_overdue', 'PMI / safety inspection')
  pushExpired(row.next_service_due_at, 'service_overdue', 'Next service')
  pushExpired(row.wheel_retorque_due_at, 'tyre_retorque_overdue', 'Wheel re-torque')
  return out
}

function formatUkExpiryLabel(expiryIso: string | null | undefined): string {
  if (!expiryIso) return 'Not on record in Command'
  const expiry = new Date(expiryIso)
  if (Number.isNaN(expiry.getTime())) return 'Not on record in Command'
  return `Valid until ${expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

/** Driver-safe vehicle readiness slice — no admin-only fields. */
export async function projectDriverVehicleReadiness(companyId: string, vehicleId: string) {
  const profile = (await projectVehicleProfile(companyId, vehicleId)) as Row | null
  if (!profile) return null

  const readiness = (profile.readiness as Row | undefined) ?? {}
  const documents: Row[] = []
  const pushDoc = (id: string, label: string, expiry: unknown) => {
    if (!expiry) return
    const expiryDate = String(expiry)
    const status = documentStatusFromExpiry(expiryDate)
    documents.push({
      id,
      label,
      expiryDate,
      status,
      detail: formatUkExpiryLabel(expiryDate),
    })
  }

  pushDoc('mot', 'MOT certificate', profile.motExpiry)
  pushDoc('insurance', 'Insurance', profile.insuranceExpiry)
  pushDoc('tax', 'Road tax', profile.taxExpiry)
  pushDoc('tachograph', 'Tachograph calibration', profile.tachographCalibrationExpiry)
  pushDoc('pmi', 'PMI / safety inspection', profile.pmiDueAt ?? profile.nextMaintenanceDate)
  pushDoc('service', 'Next service due', profile.nextServiceDueAt)
  pushDoc('tyres', 'Wheel re-torque due', profile.wheelRetorqueDueAt)

  for (const doc of Array.isArray(profile.documents) ? (profile.documents as Row[]) : []) {
    const id = String(doc.id ?? doc.type ?? doc.label ?? 'document')
    documents.push({
      id,
      label: String(doc.label ?? doc.type ?? 'Document'),
      expiryDate: doc.expiryDate ? String(doc.expiryDate) : null,
      status: documentStatusFromExpiry(doc.expiryDate ? String(doc.expiryDate) : null),
      detail: doc.detail ? String(doc.detail) : formatUkExpiryLabel(doc.expiryDate ? String(doc.expiryDate) : null),
    })
  }

  return {
    vehicleId: String(profile.id),
    registrationNumber: String(profile.registrationNumber ?? ''),
    fleetNumber: profile.fleetNumber ? String(profile.fleetNumber) : null,
    make: profile.make ? String(profile.make) : null,
    model: profile.model ? String(profile.model) : null,
    operationalStatus: String(profile.operationalStatus ?? 'unknown'),
    conditionStatus: String(profile.conditionStatus ?? 'unknown'),
    releaseDecision: String(profile.releaseDecision ?? 'released'),
    assignmentEligible: Boolean(readiness.assignmentEligible),
    blockingReasons: Array.isArray(readiness.blockingReasons)
      ? (readiness.blockingReasons as string[]).map(String)
      : [],
    warningReasons: Array.isArray(readiness.warningReasons)
      ? (readiness.warningReasons as string[]).map(String)
      : [],
    openDefectCount: Number(profile.openDefectCount ?? 0),
    criticalDefectCount: Number(profile.criticalDefectCount ?? 0),
    motExpiry: profile.motExpiry ? String(profile.motExpiry) : null,
    insuranceExpiry: profile.insuranceExpiry ? String(profile.insuranceExpiry) : null,
    taxExpiry: profile.taxExpiry ? String(profile.taxExpiry) : null,
    pmiDueAt: profile.pmiDueAt ? String(profile.pmiDueAt) : null,
    nextServiceDueAt: profile.nextServiceDueAt ? String(profile.nextServiceDueAt) : null,
    wheelRetorqueDueAt: profile.wheelRetorqueDueAt ? String(profile.wheelRetorqueDueAt) : null,
    lastCheckAt: profile.lastCheckAt ? String(profile.lastCheckAt) : null,
    lastCheckType: profile.lastCheckType ? String(profile.lastCheckType) : null,
    documents,
    evaluatedAt: readiness.calculatedAt ? String(readiness.calculatedAt) : new Date().toISOString(),
  }
}

export type DriverVehicleTimelineEvent = {
  id: string
  occurredAt: string
  category: 'check' | 'defect' | 'yard' | 'handback' | 'fuel' | 'adblue' | 'report' | 'maintenance' | 'rts'
  title: string
  detail: string | null
  actorName: string | null
}

function pushDriverTimelineEvent(events: DriverVehicleTimelineEvent[], event: DriverVehicleTimelineEvent) {
  if (!event.occurredAt || Number.isNaN(new Date(event.occurredAt).getTime())) return
  events.push(event)
}

export async function nextVehicleReportReference(companyId: string): Promise<string> {
  const { count } = await projDb(companyId)
    .from('vehicle_reports')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
  return `VR-${String((count ?? 0) + 1).padStart(5, '0')}`
}

export async function recordDriverVehicleHandbackReport(input: {
  companyId: string
  depotId: string
  vehicleId: string
  registration: string
  driverId: string
  driverName: string
  dutyId?: string | null
  movementId?: string | null
  endMileage?: number | null
  fuelLevel?: string | null
  parkingLocation?: string | null
  notes?: string | null
  handbackChecks?: Record<string, boolean>
  keysReturned?: boolean
  keyLocation?: string | null
  occurredAt?: string
}) {
  const occurredAt = input.occurredAt ?? new Date().toISOString()
  const checks = input.handbackChecks ?? {}
  const checkSummary = Object.entries(checks)
    .filter(([, done]) => Boolean(done))
    .map(([key]) => key.replaceAll('_', ' '))
    .join(', ')
  const descriptionParts = [
    input.parkingLocation ? `Parked at ${input.parkingLocation}` : null,
    input.fuelLevel ? `Fuel / charge: ${input.fuelLevel}` : null,
    input.keysReturned === false ? 'Keys not returned' : input.keyLocation ? `Keys: ${input.keyLocation}` : null,
    checkSummary ? `Return checks: ${checkSummary}` : null,
    input.notes?.trim() ? input.notes.trim() : null,
  ].filter(Boolean)

  const reference = await nextVehicleReportReference(input.companyId)
  const { data, error } = await projDb(companyId)
    .from('vehicle_reports')
    .insert({
      company_id: input.companyId,
      depot_id: input.depotId,
      vehicle_id: input.vehicleId,
      reference,
      report_type: 'handback',
      report_category: 'end_of_duty',
      severity: 'minor',
      stage: 'reported',
      status: 'closed',
      title: `End of duty handback — ${input.registration}`,
      description: descriptionParts.join(' · ') || 'Driver completed vehicle handback.',
      reported_by: input.driverName,
      reported_by_role: 'driver',
      reported_at: occurredAt,
      mileage: input.endMileage ?? null,
      location: input.parkingLocation ?? null,
      linked_check_id: null,
      closed_at: occurredAt,
      created_by: null,
      updated_by: null,
    })
    .select('id, reference')
    .single()

  if (error) throw new Error(error.message)

  await projDb(companyId).from('vehicle_report_status_history').insert({
    company_id: input.companyId,
    report_id: data.id,
    action: 'recorded',
    actor_name: input.driverName,
    occurred_at: occurredAt,
    detail: input.dutyId ? `Duty ${input.dutyId}` : null,
  })

  let fuelReportReference: string | null = null
  if (input.fuelLevel) {
    fuelReportReference = await nextVehicleReportReference(input.companyId)
    await projDb(companyId).from('vehicle_reports').insert({
      company_id: input.companyId,
      depot_id: input.depotId,
      vehicle_id: input.vehicleId,
      reference: fuelReportReference,
      report_type: 'fuel_reading',
      report_category: 'fluids',
      severity: input.fuelLevel.toLowerCase().includes('low') ? 'moderate' : 'minor',
      stage: 'reported',
      status: 'closed',
      title: `Fuel level — ${input.registration}`,
      description: `Driver reported ${input.fuelLevel} at handback.`,
      reported_by: input.driverName,
      reported_by_role: 'driver',
      reported_at: occurredAt,
      mileage: input.endMileage ?? null,
      location: input.parkingLocation ?? null,
      closed_at: occurredAt,
    })
  }

  return {
    handbackReportId: String(data.id),
    handbackReference: String(data.reference),
    fuelReportReference,
  }
}

export async function projectDriverVehicleTimeline(
  companyId: string,
  vehicleId: string,
  limit = 25,
): Promise<DriverVehicleTimelineEvent[]> {
  const [
    { data: checks },
    { data: defects },
    { data: movements },
    { data: reports },
    { data: adblueRows },
    { data: fuelRows },
  ] =
    await Promise.all([
    projDb(companyId)
      .from('vehicle_checks')
      .select('id, check_type, result, fuel_level, odometer, submitted_at, drivers(staff_members(first_name, last_name))')
      .eq('company_id', companyId)
      .eq('vehicle_id', vehicleId)
      .order('submitted_at', { ascending: false })
      .limit(limit),
    projDb(companyId)
      .from('defects')
      .select('id, category, component, description, severity, status, reported_at')
      .eq('company_id', companyId)
      .eq('vehicle_id', vehicleId)
      .order('reported_at', { ascending: false })
      .limit(limit),
    projDb(companyId)
      .from('yard_movements')
      .select('id, to_location, reason, completed_at, completed_by, note')
      .eq('company_id', companyId)
      .eq('vehicle_id', vehicleId)
      .order('completed_at', { ascending: false })
      .limit(limit),
    projDb(companyId)
      .from('vehicle_reports')
      .select(
        'id, reference, report_type, report_category, title, description, reported_at, reported_by, mileage, linked_work_order_id, status, stage',
      )
      .eq('company_id', companyId)
      .eq('vehicle_id', vehicleId)
      .order('reported_at', { ascending: false })
      .limit(limit),
    projDb(companyId)
      .from('adblue_records')
      .select('id, amount_litres, mileage, top_up_at, recorded_by_name, warning_before, warning_cleared')
      .eq('company_id', companyId)
      .eq('vehicle_id', vehicleId)
      .order('top_up_at', { ascending: false })
      .limit(limit),
    projDb(companyId)
      .from('fuel_records')
      .select('id, litres, odometer, fuel_type, recorded_at, notes')
      .eq('company_id', companyId)
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: false })
      .limit(limit),
  ])

  const events: DriverVehicleTimelineEvent[] = []

  for (const row of checks ?? []) {
    const staff = ((row.drivers as Row | null)?.staff_members as Row | null) ?? {}
    const actor = [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || 'Driver'
    pushDriverTimelineEvent(events, {
      id: `check-${row.id}`,
      occurredAt: String(row.submitted_at ?? ''),
      category: 'check',
      title: `Walkaround — ${String(row.check_type ?? 'check').replaceAll('_', ' ')}`,
      detail: [row.result ? String(row.result) : null, row.fuel_level ? `Fuel ${row.fuel_level}` : null]
        .filter(Boolean)
        .join(' · ') || null,
      actorName: actor,
    })
  }

  for (const row of defects ?? []) {
    const component = row.component ? String(row.component) : row.category ? String(row.category) : 'Defect'
    pushDriverTimelineEvent(events, {
      id: `defect-${row.id}`,
      occurredAt: String(row.reported_at ?? ''),
      category: 'defect',
      title: `Defect — ${component}`,
      detail: [row.severity ? String(row.severity) : null, row.status ? String(row.status) : null, row.description ? String(row.description) : null]
        .filter(Boolean)
        .join(' · ') || null,
      actorName: null,
    })
  }

  for (const row of movements ?? []) {
    pushDriverTimelineEvent(events, {
      id: `movement-${row.id}`,
      occurredAt: String(row.completed_at ?? ''),
      category: 'yard',
      title: String(row.reason ?? 'Yard movement'),
      detail: [row.to_location ? String(row.to_location) : null, row.note ? String(row.note) : null]
        .filter(Boolean)
        .join(' · ') || null,
      actorName: row.completed_by ? String(row.completed_by) : null,
    })
  }

  for (const row of reports ?? []) {
    const reportType = String(row.report_type ?? 'report')
    const category = String(row.report_category ?? '')
    const linkedWo = row.linked_work_order_id ? String(row.linked_work_order_id) : null
    let eventCategory: DriverVehicleTimelineEvent['category'] = 'report'
    if (reportType === 'fuel_reading' || category === 'fuel_purchase') eventCategory = 'fuel'
    else if (reportType === 'handback') eventCategory = 'handback'
    else if (linkedWo || category.includes('work_order') || category.includes('maintenance')) {
      eventCategory = 'maintenance'
    } else if (category.includes('rts') || String(row.title ?? '').toLowerCase().includes('return to service')) {
      eventCategory = 'rts'
    }

    pushDriverTimelineEvent(events, {
      id: `report-${row.id}`,
      occurredAt: String(row.reported_at ?? ''),
      category: eventCategory,
      title: String(row.title ?? 'Vehicle report'),
      detail: [
        row.reference ? String(row.reference) : null,
        linkedWo ? `WO ${linkedWo}` : null,
        row.description ? String(row.description) : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
      actorName: row.reported_by ? String(row.reported_by) : null,
    })
  }

  for (const row of adblueRows ?? []) {
    pushDriverTimelineEvent(events, {
      id: `adblue-${row.id}`,
      occurredAt: String(row.top_up_at ?? ''),
      category: 'adblue',
      title: `AdBlue refill — ${Number(row.amount_litres)} L`,
      detail: [
        row.mileage != null ? `${Number(row.mileage).toLocaleString('en-GB')} miles` : null,
        row.warning_cleared ? `Warning ${String(row.warning_cleared).replaceAll('_', ' ')}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
      actorName: row.recorded_by_name ? String(row.recorded_by_name) : null,
    })
  }

  for (const row of fuelRows ?? []) {
    pushDriverTimelineEvent(events, {
      id: `fuel-${row.id}`,
      occurredAt: String(row.recorded_at ?? ''),
      category: 'fuel',
      title: `Fuel refill${row.litres != null ? ` — ${Number(row.litres)} L` : ''}`,
      detail: [
        row.fuel_type ? String(row.fuel_type) : null,
        row.odometer != null ? `${Number(row.odometer).toLocaleString('en-GB')} miles` : null,
        row.notes ? String(row.notes) : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
      actorName: null,
    })
  }

  return events
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit)
}

export async function projectBookingList(companyId: string) {
  const { data: bookings, error } = await projDb(companyId)
    .from('bookings')
    .select('*, customers(trading_name, legal_name), depots(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const { data: trips } = await projDb(companyId).from('trips').select('id, booking_id').eq('company_id', companyId)
  const tripCount = new Map<string, number>()
  for (const trip of trips ?? []) {
    const id = String(trip.booking_id ?? '')
    if (!id) continue
    tripCount.set(id, (tripCount.get(id) ?? 0) + 1)
  }

  return (bookings ?? []).map((row: Row) => {
    const customer = (row.customers as Row | null) ?? {}
    const depot = (row.depots as Row | null) ?? {}
    const passengerIds = (row.passenger_ids as string[] | null) ?? []
    return {
      id: row.id,
      reference: row.booking_reference,
      customerName: customer.trading_name ?? customer.legal_name ?? 'Customer',
      passengerSummary: passengerIds.length ? `${passengerIds.length} passenger(s)` : 'No passengers',
      bookingType: String(row.booking_type ?? 'single').replace('_', '-'),
      firstJourneyDate: row.requested_date ?? iso(row.created_at).slice(0, 10),
      tripCount: tripCount.get(String(row.id)) ?? 0,
      serviceRequirement: 'standard',
      status: row.status,
      schedulingStatus: ['assigned', 'in_progress', 'completed'].includes(String(row.status))
        ? 'scheduled'
        : 'unscheduled',
      billingStatus: 'not_billed',
      depotName: depot.name ?? null,
      warningCount: 0,
      owner: null,
    }
  })
}

export async function projectSchoolRouteList(companyId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: bookings, error } = await projDb(companyId)
    .from('bookings')
    .select('id, booking_reference, status, requested_date, passenger_ids, notes, customers(trading_name, legal_name)')
    .eq('company_id', companyId)
    .eq('booking_type', 'school_route')
    .order('requested_date', { ascending: false })
  if (error) throw new Error(error.message)

  const bookingIds = (bookings ?? []).map((row: Row) => String(row.id))
  const tripDatesByBooking = new Map<string, string[]>()
  if (bookingIds.length) {
    const { data: trips } = await projDb(companyId)
      .from('trips')
      .select('booking_id, service_date')
      .eq('company_id', companyId)
      .in('booking_id', bookingIds)
    for (const trip of trips ?? []) {
      const bookingId = String(trip.booking_id ?? '')
      const serviceDate = trip.service_date ? String(trip.service_date).slice(0, 10) : ''
      if (!bookingId || !serviceDate) continue
      const list = tripDatesByBooking.get(bookingId) ?? []
      list.push(serviceDate)
      tripDatesByBooking.set(bookingId, list)
    }
  }

  return (bookings ?? []).map((row: Row) => {
    const customer = (row.customers as Row | null) ?? {}
    const passengerIds = (row.passenger_ids as string[] | null) ?? []
    const notes = String(row.notes ?? '')
    const directionLabel = /pm|afternoon/i.test(notes)
      ? 'PM'
      : /am|morning/i.test(notes)
        ? 'AM'
        : 'AM'
    const tripDates = [...(tripDatesByBooking.get(String(row.id)) ?? [])].sort()
    const requestedDate = row.requested_date ? String(row.requested_date).slice(0, 10) : null
    const nextService =
      tripDates.find((date) => date >= today) ?? tripDates[0] ?? requestedDate

    return {
      id: row.id,
      reference: row.booking_reference,
      schoolName: customer.trading_name ?? customer.legal_name ?? 'School',
      directionLabel,
      pupilCount: passengerIds.length,
      daysLabel: 'Term time',
      vehicleRequirement: 'Section 19',
      driverName: null,
      assistantRequired: false,
      nextService,
      status: row.status === 'draft' ? 'draft' : 'published',
      warningCount: 0,
    }
  })
}

export async function projectSchoolRouteSummary(companyId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const routes = await projectSchoolRouteList(companyId)
  const activeRoutes = routes.filter((route) => route.status !== 'draft' && route.status !== 'archived').length
  const pupilsToday = routes
    .filter((route) => route.nextService === today)
    .reduce((sum, route) => sum + Number(route.pupilCount ?? 0), 0)

  const routeBookingIds = routes.map((route) => String(route.id))
  let unscheduledJobs = 0
  if (routeBookingIds.length) {
    const { data: trips } = await projDb(companyId)
      .from('trips')
      .select('id, booking_id')
      .eq('company_id', companyId)
      .eq('service_date', today)
      .in('booking_id', routeBookingIds)
    const tripIds = (trips ?? []).map((trip: Row) => String(trip.id))
    if (tripIds.length) {
      const { data: linked } = await projDb(companyId).from('run_trips').select('trip_id').in('trip_id', tripIds)
      const linkedTripIds = new Set((linked ?? []).map((row: Row) => String(row.trip_id)))
      unscheduledJobs = tripIds.filter((tripId) => !linkedTripIds.has(tripId)).length
    }
  }

  return {
    activeRoutes,
    pupilsToday,
    unscheduledJobs,
    exceptions: 0,
  }
}

function mapBookingTypeToUi(raw: unknown): string {
  const value = String(raw ?? 'single')
  switch (value) {
    case 'single':
      return 'one_way'
    case 'school_route':
      return 'school'
    case 'urgent':
      return 'replacement'
    default:
      return value
  }
}

function mapTripStatusToUi(raw: unknown): string {
  const value = String(raw ?? 'planned')
  if (value === 'planned') return 'unassigned'
  return value
}

function defaultBookingPricing(): Row {
  return {
    baseFare: 0,
    distanceCharge: 0,
    supplements: 0,
    totalPrice: 0,
    estimatedCost: 0,
    margin: 0,
    marginPct: 0,
    contractRef: null,
    billingNote: null,
    poRequired: false,
    poNumber: null,
    priceOverride: null,
    overrideReason: null,
  }
}

function defaultBookingRequirements(): Row {
  return {
    vehicleType: 'minibus',
    wheelchairAccessible: false,
    wheelchairPositions: 0,
    passengerAssistant: false,
    childSeat: false,
    boosterSeat: false,
    lowFloor: false,
    luggageCapacity: 'standard',
    staffingNotes: '',
  }
}

function defaultBookingRecurrence(): Row {
  return {
    enabled: false,
    startDate: '',
    endDate: '',
    daysOfWeek: [],
    termTimeOnly: false,
    morningPickupTime: '07:45',
    morningArrivalTime: '08:30',
    afternoonPickupTime: '15:15',
    afternoonDropoffTime: '16:00',
  }
}

function legToBookingTrip(leg: Row, index: number, serviceDate: string): Row {
  const pickup = (leg.pickup_location as Row | null) ?? {}
  const destination = (leg.destination_location as Row | null) ?? {}
  const pickupTime = isoTimeLabel(leg.requested_pickup_time)
  const arrivalTime = isoTimeLabel(leg.requested_arrival_time)
  return {
    id: String(leg.id),
    label: index === 0 ? 'Outbound' : `Leg ${index + 1}`,
    direction: index === 0 ? 'outbound' : index === 1 ? 'return' : undefined,
    pickupDate: serviceDate,
    schedulingMode: arrivalTime && !pickupTime ? 'arrival_led' : 'pickup_led',
    requestedPickupTime: pickupTime,
    requiredArrivalTime: arrivalTime,
    calculatedPickupTime: pickupTime,
    calculatedArrivalTime: arrivalTime,
    stops: [
      {
        id: `${leg.id}-pickup`,
        sequence: 1,
        type: 'pickup',
        name: locationField(pickup, ['name', 'label']) ?? 'Pickup',
        address: locationField(pickup, ['address', 'formattedAddress', 'name']) ?? 'Address to be confirmed',
        scheduledTime: pickupTime,
      },
      {
        id: `${leg.id}-dropoff`,
        sequence: 2,
        type: 'dropoff',
        name: locationField(destination, ['name', 'label']) ?? 'Drop-off',
        address: locationField(destination, ['address', 'formattedAddress', 'name']) ?? 'Address to be confirmed',
        scheduledTime: arrivalTime,
      },
    ],
    status: mapTripStatusToUi(leg.status),
  }
}

function dbTripToBookingTrip(trip: Row, index: number): Row {
  const pickup = (trip.pickup_location as Row | null) ?? {}
  const destination = (trip.destination_location as Row | null) ?? {}
  const pickupTime = isoTimeLabel(trip.planned_pickup_at)
  const arrivalTime = isoTimeLabel(trip.planned_arrival_at)
  const serviceDate = trip.service_date ? String(trip.service_date).slice(0, 10) : new Date().toISOString().slice(0, 10)
  return {
    id: String(trip.id),
    label: trip.trip_reference ? String(trip.trip_reference) : index === 0 ? 'Outbound' : `Trip ${index + 1}`,
    direction: index === 0 ? 'outbound' : undefined,
    pickupDate: serviceDate,
    schedulingMode: arrivalTime && !pickupTime ? 'arrival_led' : 'pickup_led',
    requestedPickupTime: pickupTime,
    requiredArrivalTime: arrivalTime,
    calculatedPickupTime: pickupTime,
    calculatedArrivalTime: arrivalTime,
    stops: [
      {
        id: `${trip.id}-pickup`,
        sequence: 1,
        type: 'pickup',
        name: locationField(pickup, ['name', 'label']) ?? 'Pickup',
        address: locationField(pickup, ['address', 'formattedAddress', 'name']) ?? 'Address to be confirmed',
        scheduledTime: pickupTime,
      },
      {
        id: `${trip.id}-dropoff`,
        sequence: 2,
        type: 'dropoff',
        name: locationField(destination, ['name', 'label']) ?? 'Drop-off',
        address: locationField(destination, ['address', 'formattedAddress', 'name']) ?? 'Address to be confirmed',
        scheduledTime: arrivalTime,
      },
    ],
    status: mapTripStatusToUi(trip.status),
  }
}

export async function projectBookingDetail(companyId: string, bookingId: string) {
  const { data: booking, error } = await projDb(companyId)
    .from('bookings')
    .select('*, customers(trading_name, legal_name), depots(name), contracts(contract_number, name)')
    .eq('company_id', companyId)
    .eq('id', bookingId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!booking) return null

  const serviceDate = booking.requested_date
    ? String(booking.requested_date).slice(0, 10)
    : iso(booking.created_at).slice(0, 10)

  const [{ data: legs }, { data: trips }] = await Promise.all([
    projDb(companyId)
      .from('booking_legs')
      .select('*')
      .eq('company_id', companyId)
      .eq('booking_id', bookingId)
      .order('sequence', { ascending: true }),
    projDb(companyId)
      .from('trips')
      .select('*')
      .eq('company_id', companyId)
      .eq('booking_id', bookingId)
      .order('service_date', { ascending: true }),
  ])

  const passengerIds = (booking.passenger_ids as string[] | null) ?? []
  let passengerRows: Row[] = []
  if (passengerIds.length) {
    const { data } = await projDb(companyId)
      .from('passengers')
      .select('id, first_name, last_name, safeguarding_flag, mobility_requirements')
      .eq('company_id', companyId)
      .in('id', passengerIds)
    passengerRows = (data ?? []) as Row[]
  }

  const customer = (booking.customers as Row | null) ?? {}
  const depot = (booking.depots as Row | null) ?? {}
  const contract = (booking.contracts as Row | null) ?? {}
  const contractRef = contract.contract_number ? String(contract.contract_number) : null

  let bookingTrips: Row[] = []
  if (legs?.length) {
    bookingTrips = legs.map((leg, index) => legToBookingTrip(leg as Row, index, serviceDate))
  } else if (trips?.length) {
    bookingTrips = trips.map((trip, index) => dbTripToBookingTrip(trip as Row, index))
  } else {
    bookingTrips = [
      {
        id: `trip-${booking.id}`,
        label: 'Outbound',
        direction: 'outbound',
        pickupDate: serviceDate,
        schedulingMode: 'pickup_led',
        requestedPickupTime: null,
        requiredArrivalTime: null,
        calculatedPickupTime: null,
        calculatedArrivalTime: null,
        stops: [
          {
            id: `trip-${booking.id}-pickup`,
            sequence: 1,
            type: 'pickup',
            name: 'Pickup',
            address: 'Address to be confirmed',
            scheduledTime: null,
          },
          {
            id: `trip-${booking.id}-dropoff`,
            sequence: 2,
            type: 'dropoff',
            name: 'Drop-off',
            address: 'Address to be confirmed',
            scheduledTime: null,
          },
        ],
        status: 'unassigned',
      },
    ]
  }

  const passengers = passengerRows.map((p) => ({
    passengerId: String(p.id),
    firstName: String(p.first_name ?? 'Passenger'),
    lastName: String(p.last_name ?? ''),
    requirements: Array.isArray(p.mobility_requirements)
      ? (p.mobility_requirements as unknown[]).map(String)
      : [],
    safeguardingFlag: Boolean(p.safeguarding_flag),
  }))

  const vehicleRequirements = ((legs?.[0] as Row | undefined)?.vehicle_requirements as Row | null) ?? {}
  const escortRequirements = ((legs?.[0] as Row | undefined)?.escort_requirements as Row | null) ?? {}

  const requirements = {
    ...defaultBookingRequirements(),
    wheelchairAccessible: Boolean(vehicleRequirements.wheelchairAccessible ?? vehicleRequirements.wheelchair_accessible),
    wheelchairPositions: Number(vehicleRequirements.wheelchairPositions ?? vehicleRequirements.wheelchair_positions ?? 0),
    passengerAssistant: Boolean(escortRequirements.passengerAssistant ?? escortRequirements.passenger_assistant),
    vehicleType: String(vehicleRequirements.vehicleType ?? vehicleRequirements.vehicle_type ?? 'minibus'),
  }

  const pricing = {
    ...defaultBookingPricing(),
    contractRef,
    poRequired: Boolean(booking.purchase_order_number),
    poNumber: booking.purchase_order_number ? String(booking.purchase_order_number) : null,
    billingNote: booking.notes ? String(booking.notes) : null,
  }

  const schedulingStatus = ['assigned', 'in_progress', 'completed', 'partially_assigned'].includes(String(booking.status))
    ? 'scheduled'
    : 'unscheduled'

  return {
    id: booking.id,
    reference: booking.booking_reference,
    bookingType: mapBookingTypeToUi(booking.booking_type),
    status: booking.status,
    customerId: booking.customer_id ? String(booking.customer_id) : null,
    customerName: customer.trading_name ?? customer.legal_name ?? null,
    passengers,
    trips: bookingTrips,
    requirements,
    recurrence: defaultBookingRecurrence(),
    pricing,
    dispatch: {
      mode: 'send_to_dispatch',
      depotId: booking.depot_id ? String(booking.depot_id) : null,
      driverId: null,
      vehicleId: null,
      assistantId: null,
    },
    journeyPurpose: '',
    pickupInstructions: '',
    dropoffInstructions: '',
    pickupContact: '',
    dropoffContact: '',
    currentStep: 8,
    ownerName: null,
    priority: booking.priority === 'urgent' ? 'urgent' : 'normal',
    schedulingStatus,
    billingStatus: contractRef ? 'contract' : 'not_billed',
    depotName: depot.name ?? null,
    warningCount: 0,
    createdAt: iso(booking.created_at),
    updatedAt: iso(booking.updated_at),
  }
}

function isoTimeLabel(value: unknown): string | null {
  if (!value) return null
  const raw = String(value)
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(11, 16)
}

function locationField(location: unknown, keys: string[]): string | null {
  if (!location || typeof location !== 'object') return null
  const row = location as Row
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim()) return String(value)
  }
  return null
}

function locationCoord(location: unknown, keys: string[]): number | null {
  if (!location || typeof location !== 'object') return null
  const row = location as Row
  for (const key of keys) {
    const n = Number(row[key])
    if (Number.isFinite(n)) return n
  }
  return null
}

/** Command route stops from linked trips (pickup sequence + shared school drop). */
function buildCommandRouteStops(trips: Row[]): Row[] {
  const stops: Row[] = []
  let order = 1
  let school: Row | null = null
  let schoolArrival: string | null = null

  for (const trip of trips) {
    const pickup = (trip.pickup_location as Row | null) ?? {}
    const destination = (trip.destination_location as Row | null) ?? {}
    const pickupTime = isoTimeLabel(trip.planned_pickup_at)
    const arrivalTime = isoTimeLabel(trip.planned_arrival_at)
    const lat = locationCoord(pickup, ['lat', 'latitude'])
    const lng = locationCoord(pickup, ['lng', 'longitude'])
    stops.push({
      id: `stop-pickup-${trip.id}`,
      stopOrder: order++,
      name: locationField(pickup, ['name', 'address']) ?? 'Pickup',
      address: locationField(pickup, ['address', 'name']),
      latitude: lat,
      longitude: lng,
      pickupTime,
      dropoffTime: null,
    })
    if (!school && Object.keys(destination).length) {
      school = destination
      schoolArrival = arrivalTime
    }
  }

  if (school) {
    stops.push({
      id: `stop-school-${String(trips[0]?.id ?? 'drop')}`,
      stopOrder: order,
      name: locationField(school, ['name', 'address']) ?? 'Drop-off',
      address: locationField(school, ['address', 'name']),
      latitude: locationCoord(school, ['lat', 'latitude']),
      longitude: locationCoord(school, ['lng', 'longitude']),
      pickupTime: null,
      dropoffTime: schoolArrival,
    })
  }

  return stops
}

function passengerDisplayName(passengerId: string, pickup: Row, names: Map<string, string>): string {
  if (names.has(passengerId)) return names.get(passengerId)!
  const labeled = locationField(pickup, ['name'])
  if (labeled?.includes('—')) return labeled.split('—').pop()!.trim()
  if (labeled?.includes('-')) {
    const parts = labeled.split('-')
    if (parts.length > 1) return parts[parts.length - 1]!.trim()
  }
  return 'Passenger'
}

export async function projectDuties(companyId: string, date?: string | null, dutyId?: string) {
  let query = projDb(companyId)
    .from('duties')
    .select(
      '*, drivers(id, driver_number, staff_members(first_name, last_name), status), depots(id, name), vehicles(id, registration, operational_status)',
    )
    .eq('company_id', companyId)
    .order('planned_sign_on_at', { ascending: true })
  if (dutyId) query = query.eq('id', dutyId)
  if (date && !dutyId) query = query.eq('service_date', date)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const dutyIds = (data ?? []).map((d: Row) => d.id as string)
  const { data: dutyRuns } = dutyIds.length
    ? await projDb(companyId).from('duty_runs').select('duty_id, run_id, sequence, runs(id, run_reference, vehicle_id, vehicles(id, registration, operational_status))').in('duty_id', dutyIds)
    : { data: [] as Row[] }

  const runsByDuty = new Map<string, Row>()
  const runIds: string[] = []
  for (const link of dutyRuns ?? []) {
    const id = String(link.duty_id)
    if (!runsByDuty.has(id) || Number(link.sequence) === 1) runsByDuty.set(id, link)
    if (link.run_id) runIds.push(String(link.run_id))
  }

  const tripsByRun = new Map<string, Row[]>()
  if (runIds.length) {
    const { data: runTrips } = await projDb(companyId)
      .from('run_trips')
      .select(
        'run_id, sequence, trips(id, trip_reference, planned_pickup_at, planned_arrival_at, pickup_location, destination_location, passenger_ids, status)',
      )
      .in('run_id', [...new Set(runIds)])
      .order('sequence', { ascending: true })
    for (const link of runTrips ?? []) {
      const runId = String(link.run_id)
      const trip = (link.trips as Row | null) ?? null
      if (!trip) continue
      const list = tripsByRun.get(runId) ?? []
      list.push(trip)
      tripsByRun.set(runId, list)
    }
  }

  const { data: livePositions } = dutyIds.length
    ? await projDb(companyId)
        .from('duty_live_positions')
        .select('duty_id, latitude, longitude, recorded_at, updated_at')
        .in('duty_id', dutyIds)
    : { data: [] as Row[] }
  const liveByDuty = new Map<string, Row>()
  for (const row of livePositions ?? []) {
    liveByDuty.set(String(row.duty_id), row)
  }

  const projected = (data ?? []).map((row: Row) => {
    const driver = (row.drivers as Row | null) ?? null
    const staff = (driver?.staff_members as Row | null) ?? {}
    const link = runsByDuty.get(String(row.id))
    const run = (link?.runs as Row | null) ?? null
    const runVehicle = (run?.vehicles as Row | null) ?? null
    const dutyVehicle = (row.vehicles as Row | null) ?? null
    const vehicle = dutyVehicle ?? runVehicle
    const runId = run?.id ? String(run.id) : link?.run_id ? String(link.run_id) : null
    const trips = runId ? tripsByRun.get(runId) ?? [] : []
    const live = liveByDuty.get(String(row.id))
    return {
      id: row.id,
      reference: `DUTY-${String(row.id).slice(0, 8).toUpperCase()}`,
      dutyDate: row.service_date,
      startTime: row.planned_sign_on_at ?? null,
      endTime: row.planned_sign_off_at ?? null,
      status: row.status,
      publicationStatus: row.publication_status ?? 'draft',
      publishedAt: row.published_at ?? null,
      acknowledgementRequired: row.acknowledgement_required ?? true,
      acknowledgementDeadline: row.acknowledgement_deadline ?? null,
      driverLifecycleStatus: row.driver_lifecycle_status ?? null,
      specialInstructions: row.special_instructions ?? null,
      version: row.version ?? 1,
      notes: null,
      lastLatitude: live?.latitude != null ? Number(live.latitude) : null,
      lastLongitude: live?.longitude != null ? Number(live.longitude) : null,
      lastPositionAt: live?.recorded_at ?? live?.updated_at ?? null,
      route: run
        ? {
            id: run.id,
            name: run.run_reference,
            stops: buildCommandRouteStops(trips),
          }
        : null,
      driver: driver
        ? {
            id: driver.id,
            firstName: staff.first_name ?? 'Driver',
            lastName: staff.last_name ?? String(driver.driver_number ?? ''),
            status: driver.status,
          }
        : null,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            registrationNumber: vehicle.registration,
            status: vehicle.operational_status,
          }
        : null,
      passengerAssistant: null,
    }
  })

  if (dutyId) return projected[0] ?? null
  return projected
}

/** Live GPS trail for a duty (current position; history table not required). */
export async function projectDutyTrack(companyId: string, dutyId: string) {
  const duty = await projectDuties(companyId, null, dutyId)
  if (!duty) return null

  const { data: live } = await projDb(companyId)
    .from('duty_live_positions')
    .select('duty_id, latitude, longitude, recorded_at, updated_at, speed_mps, accuracy_meters')
    .eq('company_id', companyId)
    .eq('duty_id', dutyId)
    .maybeSingle()

  const pings =
    live?.latitude != null && live?.longitude != null
      ? [
          {
            id: `live-${dutyId}`,
            latitude: Number(live.latitude),
            longitude: Number(live.longitude),
            recordedAt: String(live.recorded_at ?? live.updated_at ?? new Date().toISOString()),
            speedKph:
              live.speed_mps != null && Number.isFinite(Number(live.speed_mps))
                ? Math.round(Number(live.speed_mps) * 3.6)
                : null,
          },
        ]
      : []

  const stops = ((duty as Row).route as Row | null)?.stops
  const checkpoints = Array.isArray(stops)
    ? stops.map((stop: Row) => ({
        routeStopId: String(stop.id),
        name: String(stop.name ?? 'Stop'),
        stopOrder: Number(stop.stopOrder ?? 0),
        arrivedAt: null,
      }))
    : []

  return { duty, pings, checkpoints }
}

function mapTripStatus(status: unknown): string {
  const value = String(status ?? 'planned')
  if (['planned', 'assigned', 'accepted', 'released', 'in_progress', 'completed', 'cancelled'].includes(value)) {
    return value
  }
  if (value === 'en_route' || value === 'passenger_boarded') return 'in_progress'
  return 'planned'
}

function operationalTripFromDutyRow(duty: Row): Row {
  const driver = duty.driver as Row | null
  const vehicle = duty.vehicle as Row | null
  const depot = (duty.depot as Row | null) ?? (duty.depots as Row | null) ?? null
  return {
    id: duty.id,
    reference: duty.reference,
    dutyId: duty.id,
    runReference: duty.reference,
    status: mapTripStatus(duty.status),
    driverId: driver?.id ?? null,
    driverName: driver ? `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() || null : null,
    vehicleId: vehicle?.id ?? null,
    vehicleRegistration: vehicle?.registrationNumber ?? null,
    depotId: duty.depotId ?? duty.depot_id ?? depot?.id ?? null,
    depotName: duty.depotName ?? depot?.name ?? null,
    dispatcherName: null,
    assignmentStatus: driver ? 'assigned' : 'unassigned',
    acceptedAt: null,
    acknowledgedAt: null,
    manifestVersion: duty.version ?? 1,
    lastAppSync: null,
    delayMinutes: 0,
    passengersOnboard: 0,
    completedJobCount: 0,
    totalJobCount: 0,
    activeJobId: null,
    jobs: [],
    gpsLat: null,
    gpsLng: null,
    driverOnline: false,
    routeName: (duty.route as Row | null)?.name ?? null,
    bookingId: null,
  }
}

export function toOperationalPosition(trip: Row): Row {
  const jobs = Array.isArray(trip.jobs) ? (trip.jobs as Row[]) : []
  return {
    trip: { ...trip, jobs },
    completedJobs: jobs.filter((j) => j.status === 'completed'),
    activeJob:
      jobs.find((j) => j.id === trip.activeJobId) ??
      jobs.find((j) => j.status === 'onboard') ??
      null,
    remainingJobs: jobs.filter((j) => j.status === 'unstarted' || j.status === 'waiting'),
    onboardPassengers: jobs.filter((j) => j.status === 'onboard'),
  }
}

export async function projectOperationalTrips(
  companyId: string,
  tripId?: string,
  options?: { serviceDate?: string | null; bookingId?: string | null },
) {
  let query = projDb(companyId)
    .from('trips')
    .select('*')
    .eq('company_id', companyId)
    .order('planned_pickup_at', { ascending: true })
  if (tripId) {
    query = query.eq('id', tripId)
  } else if (options?.bookingId) {
    query = query.eq('booking_id', String(options.bookingId))
  } else {
    // Default list to one service day — otherwise historical assigned trips look like "today's" work.
    const serviceDate = (options?.serviceDate && String(options.serviceDate).slice(0, 10)) ||
      new Date().toISOString().slice(0, 10)
    query = query.eq('service_date', serviceDate)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const tripIds = rows.map((row: Row) => String(row.id))

  const bookingIds = [...new Set(rows.map((row: Row) => String(row.booking_id ?? '')).filter(Boolean))]
  const bookingMeta = new Map<string, { type: string; reference: string; depotId: string | null }>()
  if (bookingIds.length) {
    const { data: bookings } = await projDb(companyId)
      .from('bookings')
      .select('id, booking_type, booking_reference, depot_id')
      .eq('company_id', companyId)
      .in('id', bookingIds)
    for (const booking of bookings ?? []) {
      bookingMeta.set(String(booking.id), {
        type: String(booking.booking_type ?? 'single'),
        reference: String(booking.booking_reference ?? ''),
        depotId: booking.depot_id ? String(booking.depot_id) : null,
      })
    }
  }

  const [{ data: assignments }, { data: runLinks }] = await Promise.all([
    tripIds.length
      ? projDb(companyId)
          .from('trip_assignments')
          .select(
            'trip_id, run_id, driver_id, vehicle_id, status, assigned_at, assigned_by, drivers(id, primary_depot_id, staff_members(first_name, last_name)), vehicles(id, registration, primary_depot_id)',
          )
          .eq('company_id', companyId)
          .eq('status', 'active')
          .in('trip_id', tripIds)
      : Promise.resolve({ data: [] as Row[] }),
    tripIds.length
      ? projDb(companyId)
          .from('run_trips')
          .select('trip_id, run_id, runs(id, run_reference, depot_id)')
          .in('trip_id', tripIds)
      : Promise.resolve({ data: [] as Row[] }),
  ])

  const assignmentByTrip = new Map<string, Row>()
  for (const row of assignments ?? []) {
    assignmentByTrip.set(String(row.trip_id), row)
  }
  const runByTrip = new Map<string, Row>()
  for (const row of runLinks ?? []) {
    if (!runByTrip.has(String(row.trip_id))) runByTrip.set(String(row.trip_id), row)
  }

  const depotIds = new Set<string>()
  const dispatcherIds = new Set<string>()
  for (const row of rows) {
    if (row.depot_id) depotIds.add(String(row.depot_id))
    if (row.created_by) dispatcherIds.add(String(row.created_by))
    if (row.updated_by) dispatcherIds.add(String(row.updated_by))
    const bookingDepotId = row.booking_id
      ? bookingMeta.get(String(row.booking_id))?.depotId ?? null
      : null
    if (bookingDepotId) depotIds.add(bookingDepotId)
  }
  for (const row of assignments ?? []) {
    if (row.assigned_by) dispatcherIds.add(String(row.assigned_by))
    const driver = (row.drivers as Row | null) ?? null
    const vehicle = (row.vehicles as Row | null) ?? null
    if (driver?.primary_depot_id) depotIds.add(String(driver.primary_depot_id))
    if (vehicle?.primary_depot_id) depotIds.add(String(vehicle.primary_depot_id))
  }
  for (const row of runLinks ?? []) {
    const run = (row.runs as Row | null) ?? null
    if (run?.depot_id) depotIds.add(String(run.depot_id))
  }

  const [{ data: depotRows }, { data: userRows }] = await Promise.all([
    depotIds.size
      ? projDb(companyId).from('depots').select('id, name').eq('company_id', companyId).in('id', [...depotIds])
      : Promise.resolve({ data: [] as Row[] }),
    dispatcherIds.size
      ? projDb(companyId).from('users').select('id, first_name, last_name, email').in('id', [...dispatcherIds])
      : Promise.resolve({ data: [] as Row[] }),
  ])
  const depotNameById = new Map<string, string>()
  for (const depot of depotRows ?? []) {
    depotNameById.set(String(depot.id), String(depot.name ?? 'Depot'))
  }
  const userNameById = new Map<string, string>()
  for (const user of userRows ?? []) {
    const name = `${String(user.first_name ?? '')} ${String(user.last_name ?? '')}`.trim()
    userNameById.set(String(user.id), name || String(user.email ?? 'Dispatcher'))
  }

  const runIds = [...new Set((runLinks ?? []).map((row: Row) => String(row.run_id)).filter(Boolean))]
  const { data: dutyLinks } = runIds.length
    ? await projDb(companyId).from('duty_runs').select('duty_id, run_id').in('run_id', runIds)
    : { data: [] as Row[] }
  const dutyByRun = new Map<string, string>()
  for (const row of dutyLinks ?? []) {
    dutyByRun.set(String(row.run_id), String(row.duty_id))
  }

  const allPassengerIds = new Set<string>()
  for (const row of rows) {
    for (const pid of (row.passenger_ids as string[] | null) ?? []) allPassengerIds.add(String(pid))
  }
  const passengerNames = new Map<string, string>()
  if (allPassengerIds.size) {
    const { data: passengers } = await projDb(companyId)
      .from('passengers')
      .select('id, first_name, last_name, preferred_name')
      .eq('company_id', companyId)
      .in('id', [...allPassengerIds])
    for (const passenger of passengers ?? []) {
      const preferred = passenger.preferred_name ? String(passenger.preferred_name) : ''
      const full = [passenger.first_name, passenger.last_name].filter(Boolean).join(' ').trim()
      passengerNames.set(String(passenger.id), preferred || full || 'Passenger')
    }
  }

  const dutyIdsForGps = [...new Set([...dutyByRun.values()])]
  const { data: liveRows } = dutyIdsForGps.length
    ? await projDb(companyId)
        .from('duty_live_positions')
        .select('duty_id, latitude, longitude, recorded_at')
        .in('duty_id', dutyIdsForGps)
    : { data: [] as Row[] }
  const liveByDuty = new Map<string, Row>()
  for (const row of liveRows ?? []) liveByDuty.set(String(row.duty_id), row)

  const [{ data: dutyLifecycleRows }, { data: dutyAckRows }] = await Promise.all([
    dutyIdsForGps.length
      ? projDb(companyId)
          .from('duties')
          .select('id, driver_lifecycle_status, updated_at')
          .eq('company_id', companyId)
          .in('id', dutyIdsForGps)
      : Promise.resolve({ data: [] as Row[] }),
    dutyIdsForGps.length
      ? projDb(companyId)
          .from('duty_acknowledgements')
          .select('duty_id, acknowledged_at')
          .eq('company_id', companyId)
          .in('duty_id', dutyIdsForGps)
      : Promise.resolve({ data: [] as Row[] }),
  ])
  const lifecycleByDuty = new Map<string, Row>()
  for (const row of dutyLifecycleRows ?? []) lifecycleByDuty.set(String(row.id), row)
  const ackAtByDuty = new Map<string, string>()
  for (const row of dutyAckRows ?? []) {
    if (row.acknowledged_at) ackAtByDuty.set(String(row.duty_id), String(row.acknowledged_at))
  }

  const projected = rows.map((row: Row) => {
    const assignment = assignmentByTrip.get(String(row.id))
    const driver = (assignment?.drivers as Row | null) ?? null
    const staff = (driver?.staff_members as Row | null) ?? {}
    const vehicle = (assignment?.vehicles as Row | null) ?? null
    const runLink = runByTrip.get(String(row.id))
    const run = (runLink?.runs as Row | null) ?? null
    const dutyIdForTrip = runLink ? dutyByRun.get(String(runLink.run_id)) ?? null : null
    const booking = row.booking_id ? bookingMeta.get(String(row.booking_id)) : null
    const pickup = (row.pickup_location as Row | null) ?? {}
    const destination = (row.destination_location as Row | null) ?? {}
    const passengerIds = (row.passenger_ids as string[] | null) ?? []
    const live = dutyIdForTrip ? liveByDuty.get(dutyIdForTrip) : null
    const dutyLifecycle = dutyIdForTrip ? lifecycleByDuty.get(dutyIdForTrip) : null
    const acknowledgedAt =
      (dutyIdForTrip ? ackAtByDuty.get(dutyIdForTrip) ?? null : null) ??
      (String(dutyLifecycle?.driver_lifecycle_status ?? '') === 'acknowledged'
        ? dutyLifecycle?.updated_at
          ? String(dutyLifecycle.updated_at)
          : new Date().toISOString()
        : null)
    const depotId =
      (row.depot_id ? String(row.depot_id) : null) ??
      (run?.depot_id ? String(run.depot_id) : null) ??
      (booking?.depotId ?? null) ??
      (driver?.primary_depot_id ? String(driver.primary_depot_id) : null) ??
      (vehicle?.primary_depot_id ? String(vehicle.primary_depot_id) : null)
    const dispatcherId =
      (assignment?.assigned_by ? String(assignment.assigned_by) : null) ??
      (row.updated_by ? String(row.updated_by) : null) ??
      (row.created_by ? String(row.created_by) : null)

    const jobs = passengerIds.map((passengerId, index) => ({
      id: `${row.id}-pax-${passengerId}`,
      tripId: row.id,
      sequence: index + 1,
      passengerId,
      passengerName: passengerDisplayName(String(passengerId), pickup, passengerNames),
      pickupAddress: String(pickup.address ?? pickup.name ?? 'Pickup'),
      dropoffAddress: String(destination.address ?? destination.name ?? 'Drop-off'),
      plannedPickupTime: isoTimeLabel(row.planned_pickup_at) ?? '08:00',
      plannedDropoffTime: isoTimeLabel(row.planned_arrival_at),
      pickupLatitude: locationCoord(pickup, ['lat', 'latitude']),
      pickupLongitude: locationCoord(pickup, ['lng', 'longitude']),
      dropoffLatitude: locationCoord(destination, ['lat', 'latitude']),
      dropoffLongitude: locationCoord(destination, ['lng', 'longitude']),
      status: 'unstarted',
      wheelchairRequired: false,
      escortRequired: false,
      safeguardingFlag: false,
    }))

    return {
      id: row.id,
      reference: row.trip_reference,
      dutyId: dutyIdForTrip,
      runReference: run?.run_reference ?? null,
      status: mapTripStatus(row.status),
      driverId: assignment?.driver_id ?? driver?.id ?? null,
      driverName: driver
        ? `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || null
        : null,
      vehicleId: assignment?.vehicle_id ?? vehicle?.id ?? null,
      vehicleRegistration: vehicle?.registration ?? null,
      depotId,
      depotName: depotId ? depotNameById.get(depotId) ?? null : null,
      dispatcherName: dispatcherId ? userNameById.get(dispatcherId) ?? null : null,
      assignmentStatus: assignment?.driver_id ? 'assigned' : 'unassigned',
      acceptedAt: assignment?.assigned_at ? String(assignment.assigned_at) : null,
      acknowledgedAt,
      manifestVersion: row.version ?? 1,
      lastAppSync: null,
      delayMinutes: 0,
      passengersOnboard: 0,
      completedJobCount: 0,
      totalJobCount: jobs.length,
      activeJobId: null,
      jobs,
      gpsLat: live?.latitude != null ? Number(live.latitude) : null,
      gpsLng: live?.longitude != null ? Number(live.longitude) : null,
      driverOnline: Boolean(live),
      routeName:
        run?.run_reference ??
        (booking?.type === 'school_route'
          ? `School route ${booking.reference}`
          : booking?.type === 'dial_a_ride'
            ? `Dial-a-Ride ${booking.reference}`
            : null),
      bookingId: row.booking_id ?? null,
      serviceDate: row.service_date,
      plannedPickupAt: row.planned_pickup_at,
      plannedArrivalAt: row.planned_arrival_at,
    }
  })

  if (tripId) {
    const found = projected[0] ?? null
    if (found) return found
    // Booking detail previously linked booking UUIDs into /live-operations/trips/:id.
    const byBooking = (await projectOperationalTrips(companyId, undefined, {
      bookingId: tripId,
    })) as Row[]
    if (byBooking.length > 0) return byBooking[0]!
    // Allow Manage Assignment to open against a duty id when no trip row exists.
    const duty = await projectDuties(companyId, null, tripId)
    return duty ? operationalTripFromDutyRow(duty as Row) : null
  }
  return projected
}

export async function projectOperationalTripsByBooking(companyId: string, bookingId: string) {
  return projectOperationalTrips(companyId, undefined, { bookingId }) as Promise<Row[]>
}

export async function projectOperationalTripByDuty(companyId: string, dutyId: string) {
  const { data: dutyRuns } = await projDb(companyId)
    .from('duty_runs')
    .select('run_id, sequence')
    .eq('duty_id', dutyId)
    .order('sequence', { ascending: true })
  const runIds = (dutyRuns ?? []).map((row: Row) => String(row.run_id))
  if (runIds.length) {
    const { data: runTrips } = await projDb(companyId)
      .from('run_trips')
      .select('trip_id, sequence')
      .in('run_id', runIds)
      .order('sequence', { ascending: true })
    const tripIds = (runTrips ?? [])
      .map((row: Row) => (row.trip_id ? String(row.trip_id) : ''))
      .filter(Boolean)
    if (tripIds.length) {
      const ordered: Row[] = []
      for (const id of tripIds) {
        const trip = (await projectOperationalTrips(companyId, id)) as Row | null
        if (trip) ordered.push(trip)
      }
      if (ordered.length) {
        const head = ordered[0]!
        const jobs: Row[] = []
        let sequence = 1
        for (const trip of ordered) {
          for (const job of (trip.jobs as Row[]) ?? []) {
            jobs.push({ ...job, sequence: sequence++ })
          }
        }
        return {
          ...head,
          dutyId,
          reference: head.runReference ?? head.reference,
          totalJobCount: jobs.length,
          jobs,
        }
      }
    }
  }

  const duty = await projectDuties(companyId, null, dutyId)
  if (!duty) return null
  return operationalTripFromDutyRow(duty as Row)
}

function staffDisplayName(staff: Row | null | undefined): string | null {
  if (!staff) return null
  const name = `${String(staff.first_name ?? '')} ${String(staff.last_name ?? '')}`.trim()
  return name || null
}

function assignmentChangeType(previous: Row | null, current: Row): string {
  if (!previous) return current.driver_id || current.vehicle_id ? 'Assigned' : 'Assignment recorded'
  const driverChanged = String(previous.driver_id ?? '') !== String(current.driver_id ?? '')
  const vehicleChanged = String(previous.vehicle_id ?? '') !== String(current.vehicle_id ?? '')
  if (driverChanged && vehicleChanged) return 'Driver and vehicle reassigned'
  if (driverChanged) return 'Driver reassigned'
  if (vehicleChanged) return 'Vehicle changed'
  if (String(previous.status ?? '') !== String(current.status ?? '')) {
    return `Assignment ${String(current.status ?? 'updated')}`
  }
  return 'Assignment updated'
}

/** Immutable assignment change list for Trip Assignments / Change history. */
export async function projectAssignmentHistory(companyId: string, tripId: string) {
  const { data: trip, error: tripError } = await projDb(companyId)
    .from('trips')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', tripId)
    .maybeSingle()
  if (tripError) throw new Error(tripError.message)
  if (!trip) return null

  const { data: rows, error } = await projDb(companyId)
    .from('trip_assignments')
    .select(
      'id, trip_id, run_id, driver_id, vehicle_id, status, assigned_at, assigned_by, created_at, drivers(id, staff_members(first_name, last_name)), vehicles(id, registration)',
    )
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .order('assigned_at', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const assignments = rows ?? []
  const runIds = [...new Set(assignments.map((row: Row) => (row.run_id ? String(row.run_id) : '')).filter(Boolean))]
  const { data: dutyLinks } = runIds.length
    ? await projDb(companyId).from('duty_runs').select('duty_id, run_id').in('run_id', runIds)
    : { data: [] as Row[] }
  const dutyByRun = new Map<string, string>()
  for (const row of dutyLinks ?? []) {
    dutyByRun.set(String(row.run_id), String(row.duty_id))
  }

  const adminIds = [
    ...new Set(
      assignments
        .map((row: Row) => (row.assigned_by ? String(row.assigned_by) : ''))
        .filter(Boolean),
    ),
  ]
  const { data: userRows } = adminIds.length
    ? await projDb(companyId).from('users').select('id, first_name, last_name, email').in('id', adminIds)
    : { data: [] as Row[] }
  const adminNameById = new Map<string, string>()
  for (const user of userRows ?? []) {
    const name = `${String(user.first_name ?? '')} ${String(user.last_name ?? '')}`.trim()
    adminNameById.set(String(user.id), name || String(user.email ?? 'Dispatcher'))
  }

  const history: Row[] = []
  for (let index = 0; index < assignments.length; index++) {
    const current = assignments[index]!
    const previous = index > 0 ? assignments[index - 1]! : null
    const currentDriver = (current.drivers as Row | null) ?? null
    const previousDriver = (previous?.drivers as Row | null) ?? null
    const currentStaff = (currentDriver?.staff_members as Row | null) ?? null
    const previousStaff = (previousDriver?.staff_members as Row | null) ?? null
    const currentVehicle = (current.vehicles as Row | null) ?? null
    const previousVehicle = (previous?.vehicles as Row | null) ?? null
    const dutyId = current.run_id ? dutyByRun.get(String(current.run_id)) ?? null : null
    const adminId = current.assigned_by ? String(current.assigned_by) : null

    history.push({
      id: String(current.id),
      tripId,
      dutyId,
      changeType: assignmentChangeType(previous, current),
      fromDriverId: previous?.driver_id ? String(previous.driver_id) : null,
      fromDriverName: staffDisplayName(previousStaff),
      toDriverId: current.driver_id ? String(current.driver_id) : null,
      toDriverName: staffDisplayName(currentStaff),
      fromVehicleId: previous?.vehicle_id ? String(previous.vehicle_id) : null,
      fromVehicleRegistration: previousVehicle?.registration
        ? String(previousVehicle.registration)
        : null,
      toVehicleId: current.vehicle_id ? String(current.vehicle_id) : null,
      toVehicleRegistration: currentVehicle?.registration
        ? String(currentVehicle.registration)
        : null,
      reason: String(current.status ?? 'recorded'),
      adminName: adminId ? adminNameById.get(adminId) ?? 'Dispatcher' : 'System',
      at: String(current.assigned_at ?? current.created_at ?? new Date().toISOString()),
      transferId: null,
      immutable: true,
    })
  }

  return history.reverse()
}
