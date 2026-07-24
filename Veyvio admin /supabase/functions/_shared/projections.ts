/** Command read-model projections over shared platform tables. */
import { admin } from './supabase.ts'

type Row = Record<string, unknown>

function iso(value: unknown, fallback = new Date().toISOString()) {
  if (!value) return fallback
  return String(value)
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
  let embedded = admin
    .from('drivers')
    .select('*, staff_members(*), depots(id, name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (driverId) embedded = embedded.eq('id', driverId)

  const embeddedResult = await embedded
  if (!embeddedResult.error) return (embeddedResult.data ?? []) as Row[]

  // Fallback when PostgREST cannot resolve embeds (schema cache / missing FK).
  let plain = admin.from('drivers').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
  if (driverId) plain = plain.eq('id', driverId)
  const { data, error } = await plain
  if (error) throw new Error(error.message || embeddedResult.error.message)

  const rows = (data ?? []) as Row[]
  const staffIds = [...new Set(rows.map((r) => r.staff_id).filter(Boolean).map(String))]
  const depotIds = [...new Set(rows.map((r) => r.primary_depot_id).filter(Boolean).map(String))]

  const [staffRes, depotRes] = await Promise.all([
    staffIds.length
      ? admin.from('staff_members').select('*').in('id', staffIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    depotIds.length
      ? admin.from('depots').select('id, name').in('id', depotIds)
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
    admin
      .from('duties')
      .select('id, driver_id, service_date, planned_sign_on_at, status')
      .eq('company_id', companyId)
      .gte('service_date', today)
      .order('service_date', { ascending: true })
      .limit(200),
    driverIds.length
      ? admin.from('driver_documents').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? admin.from('driver_restrictions').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? admin.from('driver_app_accounts').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? admin.from('driver_training').select('*').eq('company_id', companyId).in('driver_id', driverIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    // Detail only — keep directory list light
    driverId
      ? admin
          .from('audit_events')
          .select('id, action, actor_id, occurred_at, created_at, before_snapshot, after_snapshot, reason')
          .eq('company_id', companyId)
          .eq('entity_type', 'driver')
          .eq('entity_id', driverId)
          .order('occurred_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as Row[], error: null }),
    driverIds.length
      ? admin
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
    ? await admin.from('users').select('id, first_name, last_name, email').in('id', actorIds)
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
        void admin
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
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id ?? ''),
    checkType,
    checkDate: iso(row.submitted_at ?? row.created_at),
    result: mapProfileCheckResult(row.result),
    performedBy,
    sourceApplication: mapProfileCheckSource(row.source_app),
    mileage: row.odometer != null && row.odometer !== '' ? Number(row.odometer) : null,
    notes: row.ops_outcome ? String(row.ops_outcome) : null,
    defectIds: [] as string[],
  }
}

async function loadVehicleCheckEntries(companyId: string, vehicleId?: string) {
  let query = admin
    .from('vehicle_checks')
    .select(
      'id, vehicle_id, check_type, result, ops_outcome, odometer, submitted_at, created_at, source_app, drivers(staff_members(first_name, last_name))',
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

export async function projectVehicleProfile(companyId: string, vehicleId?: string) {
  let query = admin
    .from('vehicles')
    .select('*, depots(id, name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (vehicleId) query = query.eq('id', vehicleId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const [{ data: defectCounts }, checkEntries] = await Promise.all([
    admin
      .from('defects')
      .select('vehicle_id, severity, status')
      .eq('company_id', companyId)
      .not('status', 'in', '("closed","rejected")'),
    loadVehicleCheckEntries(companyId, vehicleId),
  ])

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

  const profiles = (data ?? []).map((row: Row) => {
    const depot = (row.depots as Row | null) ?? {}
    const depotId = String(row.primary_depot_id ?? depot.id ?? '')
    const depotName = String(depot.name ?? 'Depot')
    const op = mapVehicleOpStatus(row.operational_status)
    const counts = openByVehicle.get(String(row.id)) ?? { open: 0, critical: 0 }
    const vor = op === 'vor'
    const releaseDecision = vor ? 'blocked' : counts.critical > 0 ? 'restricted_use' : 'released'
    const conditionStatus =
      counts.critical > 0 ? 'safety_critical' : counts.open > 0 ? 'repair_required' : 'no_known_issues'
    const lifecycleStatus = row.operational_status === 'decommissioned' ? 'archived' : 'active'
    const complianceStatus = 'compliant'
    const release = {
      releaseDecision,
      failures: vor
        ? [{ code: 'vor', message: 'Vehicle is VOR', severity: 'block', category: 'operational' }]
        : [],
      warnings: [],
      canAllocate: !vor && counts.critical === 0,
      canLeaveYard: !vor,
      canAcceptPassengers: !vor && counts.critical === 0,
      summary: vor ? 'Blocked — VOR' : counts.critical > 0 ? 'Restricted use' : 'Released for service',
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
    const checks = (checksByVehicle.get(String(row.id)) ?? []).map(({ vehicleId: _vehicleId, ...entry }) => entry)
    const latestCheck = checks[0]
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
      fuelLevelPercent: null,
      batteryLevelPercent: null,
      mileage: null,
      lifecycleStatus,
      operationalStatus: op,
      complianceStatus,
      conditionStatus,
      yardStatus: vor ? 'workshop' : 'in_yard',
      readinessStatus: vor ? 'cleaning_required' : 'ready',
      releaseDecision,
      readiness,
      capabilities: [],
      motExpiry: null,
      insuranceExpiry: null,
      taxExpiry: null,
      tachographCalibrationExpiry: null,
      wheelRetorqueDueAt: null,
      currentDriverId: null,
      currentDriverName: null,
      currentRunId: null,
      currentRunReference: null,
      nextDriverName: null,
      nextRunReference: null,
      nextDepartureTime: null,
      lastCheckAt: latestCheck?.checkDate ?? null,
      lastCheckType: latestCheck?.checkType ?? null,
      nextMaintenanceDate: null,
      nextMaintenanceMileage: null,
      openDefectCount: counts.open,
      criticalDefectCount: counts.critical,
      checksOverdue: false,
      dateAddedToFleet: iso(row.commissioned_at ?? row.created_at).slice(0, 10),
      documents: [],
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
      equipment: [],
      tachograph: null,
      onboarding: approvedOnboarding(),
      damageRecords: [],
      telematics: null,
      platformEvents: [],
      release,
      nearestExpiryDate: null,
      nearestExpiryLabel: null,
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

export async function projectBookingList(companyId: string) {
  const { data: bookings, error } = await admin
    .from('bookings')
    .select('*, customers(trading_name, legal_name), depots(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const { data: trips } = await admin.from('trips').select('id, booking_id').eq('company_id', companyId)
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
  const { data: booking, error } = await admin
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
    admin
      .from('booking_legs')
      .select('*')
      .eq('company_id', companyId)
      .eq('booking_id', bookingId)
      .order('sequence', { ascending: true }),
    admin
      .from('trips')
      .select('*')
      .eq('company_id', companyId)
      .eq('booking_id', bookingId)
      .order('service_date', { ascending: true }),
  ])

  const passengerIds = (booking.passenger_ids as string[] | null) ?? []
  let passengerRows: Row[] = []
  if (passengerIds.length) {
    const { data } = await admin
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
  let query = admin
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
    ? await admin.from('duty_runs').select('duty_id, run_id, sequence, runs(id, run_reference, vehicle_id, vehicles(id, registration, operational_status))').in('duty_id', dutyIds)
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
    const { data: runTrips } = await admin
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
    ? await admin
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

  const { data: live } = await admin
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
    depotId: null,
    depotName: null,
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

export async function projectOperationalTrips(companyId: string, tripId?: string) {
  let query = admin
    .from('trips')
    .select('*')
    .eq('company_id', companyId)
    .order('planned_pickup_at', { ascending: true })
  if (tripId) query = query.eq('id', tripId)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const tripIds = rows.map((row: Row) => String(row.id))

  const [{ data: assignments }, { data: runLinks }] = await Promise.all([
    tripIds.length
      ? admin
          .from('trip_assignments')
          .select(
            'trip_id, run_id, driver_id, vehicle_id, status, drivers(id, staff_members(first_name, last_name)), vehicles(id, registration)',
          )
          .eq('company_id', companyId)
          .eq('status', 'active')
          .in('trip_id', tripIds)
      : Promise.resolve({ data: [] as Row[] }),
    tripIds.length
      ? admin.from('run_trips').select('trip_id, run_id, runs(id, run_reference)').in('trip_id', tripIds)
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

  const runIds = [...new Set((runLinks ?? []).map((row: Row) => String(row.run_id)).filter(Boolean))]
  const { data: dutyLinks } = runIds.length
    ? await admin.from('duty_runs').select('duty_id, run_id').in('run_id', runIds)
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
    const { data: passengers } = await admin
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
    ? await admin
        .from('duty_live_positions')
        .select('duty_id, latitude, longitude, recorded_at')
        .in('duty_id', dutyIdsForGps)
    : { data: [] as Row[] }
  const liveByDuty = new Map<string, Row>()
  for (const row of liveRows ?? []) liveByDuty.set(String(row.duty_id), row)

  const projected = rows.map((row: Row) => {
    const assignment = assignmentByTrip.get(String(row.id))
    const driver = (assignment?.drivers as Row | null) ?? null
    const staff = (driver?.staff_members as Row | null) ?? {}
    const vehicle = (assignment?.vehicles as Row | null) ?? null
    const runLink = runByTrip.get(String(row.id))
    const run = (runLink?.runs as Row | null) ?? null
    const dutyIdForTrip = runLink ? dutyByRun.get(String(runLink.run_id)) ?? null : null
    const pickup = (row.pickup_location as Row | null) ?? {}
    const destination = (row.destination_location as Row | null) ?? {}
    const passengerIds = (row.passenger_ids as string[] | null) ?? []
    const live = dutyIdForTrip ? liveByDuty.get(dutyIdForTrip) : null

    const jobs = passengerIds.map((passengerId, index) => ({
      id: `${row.id}-pax-${index + 1}`,
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
      depotId: row.depot_id ?? null,
      depotName: null,
      assignmentStatus: assignment?.driver_id ? 'assigned' : 'unassigned',
      acceptedAt: null,
      acknowledgedAt: null,
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
      routeName: run?.run_reference ?? null,
      bookingId: row.booking_id ?? null,
      serviceDate: row.service_date,
      plannedPickupAt: row.planned_pickup_at,
      plannedArrivalAt: row.planned_arrival_at,
    }
  })

  if (tripId) {
    const found = projected[0] ?? null
    if (found) return found
    // Allow Manage Assignment to open against a duty id when no trip row exists.
    const duty = await projectDuties(companyId, null, tripId)
    return duty ? operationalTripFromDutyRow(duty as Row) : null
  }
  return projected
}

export async function projectOperationalTripByDuty(companyId: string, dutyId: string) {
  const { data: dutyRuns } = await admin
    .from('duty_runs')
    .select('run_id, sequence')
    .eq('duty_id', dutyId)
    .order('sequence', { ascending: true })
  const runIds = (dutyRuns ?? []).map((row: Row) => String(row.run_id))
  if (runIds.length) {
    const { data: runTrips } = await admin
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
