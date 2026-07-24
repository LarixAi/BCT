import type { DriverDocument, DriverProfile, TrainingRequirement } from './types'

/**
 * Five-level Section 19/22 compliance model.
 *
 * Level 1 `mandatory`     — Mandatory before first shift (blocks all duty)
 * Level 2 `vehicle`       — Required for specific vehicle / permission types
 * Level 3                 — Legal documents (not training; see compliance slots)
 * Level 4 `role`          — Role / duty-specific training (restricts duties)
 * Level 5 `development`   — Optional professional development (no eligibility effect)
 */
export type DriverTrainingCategory = 'mandatory' | 'vehicle' | 'role' | 'development'

export type TrainingEligibilityEffect =
  | 'block_all_work'
  | 'block_vehicle_type'
  | 'block_specific_work'
  | 'none'

export type DriverDutyEligibility =
  | 'eligible'
  | 'eligible_with_restrictions'
  | 'not_eligible'

export interface DriverTrainingCatalogDef {
  key: string
  label: string
  category: DriverTrainingCategory
  requiredFor: string
  /** Empty = always required for every driver (Level 1) or always offered (Level 5) */
  permissions: string[]
  renewalMonths: number | null
  /** Matching driver_documents.requirement_type values that count as evidence */
  documentTypes?: string[]
  /** How incomplete / expired status affects duty eligibility */
  eligibilityEffect: TrainingEligibilityEffect
  /** Short operational description shown in the Training centre */
  description?: string
  /** Topic bullets for the course outline */
  topics?: string[]
}

/** Stored evidence from driver_training table (or equivalent). */
export interface DriverTrainingRecord {
  trainingKey: string
  status?: string | null
  completedAt?: string | null
  expiresAt?: string | null
  trainer?: string | null
  progressPercentage?: number | null
  assessmentScore?: number | null
}

export interface TrainingRequirementWithCategory extends TrainingRequirement {
  category: DriverTrainingCategory
  eligibilityEffect: TrainingEligibilityEffect
  description?: string
  topics?: string[]
}

const EXPIRING_SOON_DAYS = 90

/**
 * Section 19/22 community-transport first selection — MiDAS-centred.
 * Organisations can later override via a company matrix; this is the default rulebook.
 */
export const DRIVER_TRAINING_CATALOG: DriverTrainingCatalogDef[] = [
  // ─── Level 1: Mandatory before first shift (blocks all work) ───
  {
    key: 'company_induction',
    label: 'Company induction',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'block_all_work',
    description: 'Company policies, conduct, passenger care and yard rules.',
    topics: [
      'Company policies',
      'Uniform and conduct',
      'Reporting defects',
      'Phone usage',
      'Working hours',
      'Lone working',
      'Passenger care',
      'GDPR overview',
      'Vehicle security',
    ],
  },
  {
    key: 'driver_app',
    label: 'Driver app training',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'block_all_work',
    description: 'Driver cannot work until they know how to use Veyvio Driver.',
    topics: [
      'Logging in',
      'Starting duty',
      'Completing checks',
      'Navigation',
      'Messaging',
      'Incident reporting',
      'Ending duty',
    ],
  },
  {
    key: 'daily_vehicle_checks',
    label: 'Daily vehicle check training',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: 12,
    eligibilityEffect: 'block_all_work',
    description: 'Walkaround inspection, defects, VOR and safety-critical defects.',
    topics: [
      'Walkaround inspection',
      'Recording defects',
      'VOR',
      'Safety-critical defects',
    ],
  },
  {
    key: 'health_safety',
    label: 'Health and safety',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: 36,
    eligibilityEffect: 'block_all_work',
    documentTypes: ['manual_handling'],
    description: 'Core H&S awareness for yard and road work.',
    topics: [
      'Manual handling awareness',
      'Slips, trips and falls',
      'PPE',
      'Fire safety',
      'Emergency evacuation',
    ],
  },
  {
    key: 'safeguarding',
    label: 'Safeguarding',
    category: 'mandatory',
    requiredFor: 'All drivers — Section 19/22 essential',
    permissions: [],
    renewalMonths: 36,
    eligibilityEffect: 'block_all_work',
    documentTypes: ['safeguarding_training', 'safeguarding_adults'],
    description: 'Essential for community transport — children, adults and reporting.',
    topics: [
      'Children',
      'Adults',
      'Reporting concerns',
      'Whistleblowing',
    ],
  },
  {
    key: 'emergency_procedures',
    label: 'Emergency procedures',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: 12,
    eligibilityEffect: 'block_all_work',
    description: 'What to do when something goes wrong on the road or with a passenger.',
    topics: [
      'Passenger collapses',
      'Road traffic collision',
      'Fire',
      'Breakdown',
      'Wheelchair incident',
      'Missing passenger',
    ],
  },
  {
    key: 'data_protection_gdpr',
    label: 'Data protection (GDPR)',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: 36,
    eligibilityEffect: 'block_all_work',
    description: 'Handling passenger information, confidentiality and medical data.',
    topics: [
      'Handling passenger information',
      'Confidentiality',
      'Photos',
      'Medical information',
    ],
  },
  {
    key: 'driver_declaration',
    label: 'Driver declaration',
    category: 'mandatory',
    requiredFor: 'All drivers — before first shift',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'block_all_work',
    description: 'Electronic signature confirming understanding of company policies.',
    topics: ['I understand the company policies'],
  },

  // ─── Level 2: Vehicle-specific (blocks assignment to that vehicle type) ───
  {
    key: 'midas_standard',
    label: 'MiDAS Standard',
    category: 'vehicle',
    requiredFor: 'Minibus / community transport vehicles',
    permissions: ['community', 'minibus'],
    renewalMonths: 48,
    eligibilityEffect: 'block_vehicle_type',
    documentTypes: ['midas', 'midas_standard'],
    description: 'Required before assignment to a minibus.',
    topics: ['Minibus driving standards', 'Passenger safety', 'Vehicle familiarisation'],
  },
  {
    key: 'midas_accessible',
    label: 'MiDAS Accessible',
    category: 'vehicle',
    requiredFor: 'Wheelchair / accessible vehicles',
    permissions: ['wheelchair', 'accessible', 'passenger_lift'],
    renewalMonths: 48,
    eligibilityEffect: 'block_vehicle_type',
    documentTypes: ['midas_accessible', 'wheelchair_training'],
    description: 'Required before assignment to a wheelchair-accessible vehicle.',
    topics: ['Accessible passenger care', 'Boarding and alighting', 'Communication'],
  },
  {
    key: 'wheelchair_restraint',
    label: 'Wheelchair restraint systems',
    category: 'vehicle',
    requiredFor: 'Wheelchair passengers',
    permissions: ['wheelchair', 'accessible'],
    renewalMonths: 36,
    eligibilityEffect: 'block_vehicle_type',
    documentTypes: ['wheelchair_training'],
    description: 'Correct use of restraint systems on accessible vehicles.',
    topics: ['Restraint equipment', 'Secure positioning', 'Passenger comfort'],
  },
  {
    key: 'lift_ramp_operation',
    label: 'Lift and ramp operation',
    category: 'vehicle',
    requiredFor: 'Accessible vehicles with lift or ramp',
    permissions: ['wheelchair', 'accessible', 'passenger_lift'],
    renewalMonths: 36,
    eligibilityEffect: 'block_vehicle_type',
    documentTypes: ['wheelchair_training', 'passenger_lift'],
    description: 'Safe operation of passenger lifts and ramps.',
    topics: ['Lift operation', 'Ramp deployment', 'Emergency stop'],
  },
  {
    key: 'driver_cpc',
    label: 'Driver CPC (periodic training)',
    category: 'vehicle',
    requiredFor: 'PSV / coach',
    permissions: ['psv', 'coach'],
    renewalMonths: 60,
    eligibilityEffect: 'block_vehicle_type',
    documentTypes: ['cpc', 'dqc'],
    description: 'Legally required periodic training for PSV drivers.',
    topics: ['Periodic CPC hours', 'DQC validity'],
  },

  // ─── Level 4: Role-specific (restricts certain duties, not employment) ───
  {
    key: 'first_aid_efaw',
    label: 'Emergency First Aid at Work',
    category: 'role',
    requiredFor: 'First-aid designated duties',
    permissions: ['first_aid', 'hospital', 'school'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    documentTypes: ['first_aid'],
    description: 'Required where the role needs a designated first aider.',
    topics: ['Primary survey', 'CPR awareness', 'Bleeding and shock'],
  },
  {
    key: 'safeguarding_children',
    label: 'Safeguarding children',
    category: 'role',
    requiredFor: 'School / SEND transport',
    permissions: ['school', 'send', 'safeguarding'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    documentTypes: ['safeguarding_training', 'safeguarding_children'],
    description: 'Required for school and SEND contracts.',
    topics: ['Child protection', 'Reporting', 'Safer recruitment awareness'],
  },
  {
    key: 'send_autism_awareness',
    label: 'SEND / autism awareness',
    category: 'role',
    requiredFor: 'SEND transport',
    permissions: ['send', 'school'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'Supporting passengers with SEND and autism.',
    topics: ['Communication', 'Sensory needs', 'Routine and predictability'],
  },
  {
    key: 'behaviour_management',
    label: 'Behaviour management',
    category: 'role',
    requiredFor: 'SEND / school transport',
    permissions: ['send', 'school'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'De-escalation and safe behaviour support on school runs.',
    topics: ['De-escalation', 'Triggers', 'When to stop the vehicle'],
  },
  {
    key: 'infection_prevention',
    label: 'Infection prevention and control',
    category: 'role',
    requiredFor: 'Hospital transport',
    permissions: ['hospital'],
    renewalMonths: 24,
    eligibilityEffect: 'block_specific_work',
    description: 'Hygiene and infection control for hospital discharge work.',
    topics: ['Hand hygiene', 'PPE', 'Contamination control'],
  },
  {
    key: 'dementia_awareness',
    label: 'Dementia awareness',
    category: 'role',
    requiredFor: 'Hospital / elderly transport',
    permissions: ['hospital', 'elderly'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'Supporting passengers living with dementia.',
    topics: ['Communication', 'Orientation', 'Dignity and patience'],
  },
  {
    key: 'passenger_assistant',
    label: 'Passenger assistant',
    category: 'role',
    requiredFor: 'Escort / PA duties',
    permissions: ['escort', 'passenger_assistant'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'Duties and boundaries for passenger assistants.',
    topics: ['Role boundaries', 'Boarding support', 'Handover'],
  },
  {
    key: 'school_transport',
    label: 'School transport',
    category: 'role',
    requiredFor: 'School contracts',
    permissions: ['school'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'School contract procedures and pupil care.',
    topics: ['Pickup and drop-off', 'Registers', 'Late pupils'],
  },
  {
    key: 'adult_social_care',
    label: 'Adult social care',
    category: 'role',
    requiredFor: 'Adult social care contracts',
    permissions: ['elderly', 'hospital', 'adult_care'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'Supporting adults receiving social care transport.',
    topics: ['Dignity', 'Mobility support', 'Confidentiality'],
  },
  {
    key: 'mental_health_awareness',
    label: 'Mental health awareness',
    category: 'role',
    requiredFor: 'Hospital / vulnerable adult transport',
    permissions: ['hospital', 'adult_care'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'Recognising and responding to mental health needs.',
    topics: ['Signs of distress', 'De-escalation', 'When to escalate'],
  },
  {
    key: 'medication_awareness',
    label: 'Medication awareness',
    category: 'role',
    requiredFor: 'Roles handling medication handovers',
    permissions: ['hospital', 'adult_care'],
    renewalMonths: 24,
    eligibilityEffect: 'block_specific_work',
    description: 'Boundaries around medication — observe, do not administer unless authorised.',
    topics: ['Handover only', 'Storage', 'Never administer unless authorised'],
  },
  {
    key: 'conflict_management',
    label: 'Conflict management',
    category: 'role',
    requiredFor: 'Front-line passenger duties',
    permissions: ['school', 'hospital', 'community'],
    renewalMonths: 36,
    eligibilityEffect: 'block_specific_work',
    description: 'Staying calm and safe when conflict arises.',
    topics: ['Verbal de-escalation', 'Personal safety', 'Reporting'],
  },

  // ─── Level 5: Optional professional development (no eligibility effect) ───
  {
    key: 'eco_driving',
    label: 'Eco driving',
    category: 'development',
    requiredFor: 'Optional development',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'none',
    description: 'Fuel efficiency and smoother driving habits.',
    topics: ['Anticipation', 'Idle time', 'Gear and speed'],
  },
  {
    key: 'customer_excellence',
    label: 'Customer excellence',
    category: 'development',
    requiredFor: 'Optional development',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'none',
    description: 'Service quality that builds passenger confidence.',
    topics: ['First impressions', 'Communication', 'Recovery from problems'],
  },
  {
    key: 'advanced_driving',
    label: 'Advanced driving',
    category: 'development',
    requiredFor: 'Optional development',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'none',
    description: 'Higher driving standards beyond the mandatory baseline.',
    topics: ['Observation', 'Space planning', 'Hazard perception'],
  },
  {
    key: 'driver_mentor',
    label: 'Driver mentor',
    category: 'development',
    requiredFor: 'Optional development',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'none',
    description: 'Supporting new drivers through their first weeks.',
    topics: ['Coaching', 'Feedback', 'Shadowing'],
  },
  {
    key: 'leadership',
    label: 'Leadership',
    category: 'development',
    requiredFor: 'Optional development',
    permissions: [],
    renewalMonths: null,
    eligibilityEffect: 'none',
    description: 'Leading a shift or small team with calm operational judgment.',
    topics: ['Decision making', 'Briefings', 'Accountability'],
  },
]

export const TRAINING_SECTION_META: Record<
  DriverTrainingCategory,
  { level: number; title: string; description: string }
> = {
  mandatory: {
    level: 1,
    title: 'Mandatory before first shift',
    description: 'Blocks the driver completely until complete. Only then can they be assigned to a vehicle.',
  },
  vehicle: {
    level: 2,
    title: 'Vehicle-specific',
    description: 'Required for the vehicle types this driver is cleared to drive. Incomplete modules block assignment to those vehicles.',
  },
  role: {
    level: 4,
    title: 'Role-specific',
    description: 'Does not stop employment, but blocks certain duties until complete.',
  },
  development: {
    level: 5,
    title: 'Professional development',
    description: 'Improves service quality. Does not affect eligibility.',
  },
}

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const ms = new Date(date).getTime()
  if (Number.isNaN(ms)) return null
  return Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000))
}

function appliesToPermissions(def: DriverTrainingCatalogDef, enabled: Set<string>): boolean {
  // Level 1 mandatory and Level 5 development always apply (development always offered)
  if (def.category === 'mandatory' || def.category === 'development') return true
  if (!def.permissions.length) return true
  return def.permissions.some((p) => enabled.has(p))
}

function findDocumentEvidence(docs: DriverDocument[], types: string[] | undefined): DriverDocument | undefined {
  if (!types?.length) return undefined
  return docs.find((d) => types.includes(d.requirementType))
}

function statusFromEvidence(
  record: DriverTrainingRecord | undefined,
  doc: DriverDocument | undefined,
): Pick<TrainingRequirement, 'status' | 'completedAt' | 'expiresAt' | 'trainer'> {
  const expiresAt = record?.expiresAt ?? doc?.expiryDate ?? null
  const completedAt = record?.completedAt ?? (doc?.verificationStatus === 'verified' ? doc.verifiedAt?.slice(0, 10) ?? null : null)
  const trainer = record?.trainer ?? null

  const recordStatus = String(record?.status ?? '').toLowerCase()
  if (recordStatus === 'failed') {
    return { status: 'failed', completedAt, expiresAt, trainer }
  }

  const verifiedDoc =
    doc &&
    (doc.verificationStatus === 'verified' ||
      doc.verificationStatus === 'expiring_soon' ||
      doc.verificationStatus === 'expired')

  const hasCompleteRecord =
    recordStatus === 'complete' ||
    recordStatus === 'completed' ||
    recordStatus === 'valid' ||
    Boolean(record?.completedAt && !['missing', 'failed'].includes(recordStatus))

  if (!hasCompleteRecord && !verifiedDoc) {
    return { status: 'missing', completedAt: null, expiresAt: null, trainer: null }
  }

  const days = daysUntil(expiresAt)
  if (days != null && days < 0) {
    return { status: 'expired', completedAt, expiresAt, trainer }
  }
  if (days != null && days <= EXPIRING_SOON_DAYS) {
    return { status: 'due_soon', completedAt, expiresAt, trainer }
  }
  if (doc?.verificationStatus === 'expired') {
    return { status: 'expired', completedAt, expiresAt, trainer }
  }
  if (doc?.verificationStatus === 'expiring_soon') {
    return { status: 'due_soon', completedAt, expiresAt, trainer }
  }

  return { status: 'complete', completedAt, expiresAt, trainer }
}

export function catalogDefsForPermissions(enabledKeys: string[]): DriverTrainingCatalogDef[] {
  const enabled = new Set(enabledKeys)
  return DRIVER_TRAINING_CATALOG.filter((def) => appliesToPermissions(def, enabled))
}

export function buildDriverTrainingRequirements(
  profile: Pick<DriverProfile, 'workPermissions' | 'documents' | 'trainingRequirements'>,
  records: DriverTrainingRecord[] = [],
): TrainingRequirementWithCategory[] {
  const enabled = new Set(
    (profile.workPermissions ?? []).filter((p) => p.enabled).map((p) => p.key),
  )
  const docs = profile.documents ?? []
  const byKey = new Map(records.map((r) => [r.trainingKey, r]))

  // Prefer projected / stored rows when they match catalogue keys
  for (const existing of profile.trainingRequirements ?? []) {
    if (!byKey.has(existing.key)) {
      byKey.set(existing.key, {
        trainingKey: existing.key,
        status: existing.status,
        completedAt: existing.completedAt,
        expiresAt: existing.expiresAt,
        trainer: existing.trainer,
        progressPercentage: existing.progressPercentage ?? null,
        assessmentScore: existing.assessmentScore ?? null,
      })
    }
  }

  // Legacy course keys → current Level 1 keys (existing certificates / records still count)
  const legacyAliases: Record<string, string[]> = {
    safeguarding: ['safeguarding_adults'],
    health_safety: ['manual_handling'],
    driver_app: ['using_veyvio_driver'],
  }
  for (const [canonical, aliases] of Object.entries(legacyAliases)) {
    if (byKey.has(canonical)) continue
    for (const alias of aliases) {
      const legacy = byKey.get(alias)
      if (legacy) {
        byKey.set(canonical, { ...legacy, trainingKey: canonical })
        break
      }
    }
  }

  return catalogDefsForPermissions([...enabled]).map((def) => {
    const record = byKey.get(def.key)
    const doc = findDocumentEvidence(docs, def.documentTypes)
    const evidence = statusFromEvidence(record, doc)
    return {
      id: `tr-${def.key}`,
      key: def.key,
      label: def.label,
      requiredFor: def.requiredFor,
      category: def.category,
      eligibilityEffect: def.eligibilityEffect,
      description: def.description,
      topics: def.topics,
      ...evidence,
      progressPercentage: record?.progressPercentage ?? null,
      assessmentScore: record?.assessmentScore ?? null,
    }
  })
}

/** @deprecated use buildDriverTrainingRequirements — kept for existing imports */
export function buildTrainingRequirements(
  profile: Pick<DriverProfile, 'workPermissions' | 'documents' | 'trainingRequirements'>,
  records?: DriverTrainingRecord[],
): TrainingRequirement[] {
  return buildDriverTrainingRequirements(profile, records)
}

function isSatisfied(r: TrainingRequirement): boolean {
  return r.status === 'complete' || r.status === 'due_soon'
}

function isOutstanding(r: TrainingRequirement): boolean {
  return (
    r.status === 'missing' ||
    r.status === 'expired' ||
    r.status === 'failed' ||
    r.status === 'assigned' ||
    r.status === 'in_progress'
  )
}

export type TrainingSummary = {
  mandatoryTotal: number
  mandatoryComplete: number
  mandatoryMissing: number
  vehicleTotal: number
  vehicleComplete: number
  roleTotal: number
  roleComplete: number
  developmentTotal: number
  developmentComplete: number
  expiringSoon: number
  fullyTrained: boolean
  /** 0–100 weighted compliance score across Levels 1–4 + legal docs when provided */
  complianceScore: number
}

export function summariseDriverTraining(reqs: TrainingRequirementWithCategory[]): TrainingSummary {
  const mandatory = reqs.filter((r) => r.category === 'mandatory')
  const vehicle = reqs.filter((r) => r.category === 'vehicle')
  const role = reqs.filter((r) => r.category === 'role')
  const development = reqs.filter((r) => r.category === 'development')
  const mandatoryComplete = mandatory.filter(isSatisfied).length
  const mandatoryMissing = mandatory.filter(isOutstanding).length

  const scored = [...mandatory, ...vehicle, ...role]
  const scoreComplete = scored.filter(isSatisfied).length
  const complianceScore =
    scored.length === 0 ? 100 : Math.round((scoreComplete / scored.length) * 100)

  return {
    mandatoryTotal: mandatory.length,
    mandatoryComplete,
    mandatoryMissing,
    vehicleTotal: vehicle.length,
    vehicleComplete: vehicle.filter(isSatisfied).length,
    roleTotal: role.length,
    roleComplete: role.filter(isSatisfied).length,
    developmentTotal: development.length,
    developmentComplete: development.filter(isSatisfied).length,
    expiringSoon: reqs.filter((r) => r.status === 'due_soon').length,
    fullyTrained: mandatoryMissing === 0 && mandatory.length > 0,
    complianceScore,
  }
}

export { isSatisfied as isTrainingSatisfied, isOutstanding as isTrainingOutstanding, daysUntil as trainingDaysUntil }

/** Level 1 catalogue keys that block all work when incomplete. */
export function isMandatoryTrainingKey(key: string): boolean {
  return DRIVER_TRAINING_CATALOG.some(
    (d) => d.key === key && (d.category === 'mandatory' || d.eligibilityEffect === 'block_all_work'),
  )
}

export function isVehicleTrainingKey(key: string): boolean {
  return DRIVER_TRAINING_CATALOG.some((d) => d.key === key && d.category === 'vehicle')
}

export function getTrainingCatalogDef(key: string): DriverTrainingCatalogDef | undefined {
  return DRIVER_TRAINING_CATALOG.find((d) => d.key === key)
}

export function getTrainingEligibilityEffect(key: string): TrainingEligibilityEffect {
  return getTrainingCatalogDef(key)?.eligibilityEffect ?? 'none'
}

/** Compute default expiry from catalogue renewalMonths (null = no expiry). */
export function defaultTrainingExpiry(trainingKey: string, completedAt: string): string | null {
  const def = getTrainingCatalogDef(trainingKey)
  if (!def?.renewalMonths) return null
  const base = new Date(`${completedAt}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) return null
  base.setUTCMonth(base.getUTCMonth() + def.renewalMonths)
  return base.toISOString().slice(0, 10)
}
