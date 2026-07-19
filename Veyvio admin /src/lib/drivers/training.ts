import type { DriverDocument, DriverProfile, TrainingRequirement } from './types'

export type DriverTrainingCategory = 'mandatory' | 'role'

export interface DriverTrainingCatalogDef {
  key: string
  label: string
  category: DriverTrainingCategory
  requiredFor: string
  /** Empty = always required for every driver */
  permissions: string[]
  renewalMonths: number | null
  /** Matching driver_documents.requirement_type values that count as evidence */
  documentTypes?: string[]
}

/** Stored evidence from driver_training table (or equivalent). */
export interface DriverTrainingRecord {
  trainingKey: string
  status?: string | null
  completedAt?: string | null
  expiresAt?: string | null
  trainer?: string | null
}

export interface TrainingRequirementWithCategory extends TrainingRequirement {
  category: DriverTrainingCategory
}

const EXPIRING_SOON_DAYS = 90

/**
 * Section 19/22 community-transport first selection — MiDAS-centred.
 * Organisations can later override via a company matrix; this is the default rulebook.
 */
export const DRIVER_TRAINING_CATALOG: DriverTrainingCatalogDef[] = [
  // Always required
  {
    key: 'company_induction',
    label: 'Company induction',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: null,
  },
  {
    key: 'driver_app',
    label: 'Using Veyvio Driver',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: null,
  },
  {
    key: 'daily_vehicle_checks',
    label: 'Daily vehicle checks',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: 12,
  },
  {
    key: 'health_safety',
    label: 'Health and safety',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: 36,
  },
  {
    key: 'emergency_procedures',
    label: 'Emergency / accident procedures',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: 12,
  },
  {
    key: 'manual_handling',
    label: 'Manual handling',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: 36,
    documentTypes: ['manual_handling'],
  },
  {
    key: 'midas_standard',
    label: 'MiDAS Standard',
    category: 'mandatory',
    requiredFor: 'Minibus / community transport',
    permissions: [],
    renewalMonths: 48,
    documentTypes: ['midas', 'midas_standard'],
  },
  {
    key: 'safeguarding_adults',
    label: 'Safeguarding adults',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: 36,
    documentTypes: ['safeguarding_training', 'safeguarding_adults'],
  },
  {
    key: 'first_aid_efaw',
    label: 'Emergency First Aid at Work',
    category: 'mandatory',
    requiredFor: 'All drivers',
    permissions: [],
    renewalMonths: 36,
    documentTypes: ['first_aid'],
  },

  // Role / permission specific
  {
    key: 'midas_accessible',
    label: 'MiDAS Accessible module',
    category: 'role',
    requiredFor: 'Wheelchair / accessible transport',
    permissions: ['wheelchair', 'accessible', 'passenger_lift'],
    renewalMonths: 48,
    documentTypes: ['midas_accessible', 'wheelchair_training'],
  },
  {
    key: 'wheelchair_restraint',
    label: 'Wheelchair restraint systems',
    category: 'role',
    requiredFor: 'Wheelchair passengers',
    permissions: ['wheelchair', 'accessible'],
    renewalMonths: 36,
    documentTypes: ['wheelchair_training'],
  },
  {
    key: 'lift_ramp_operation',
    label: 'Lift and ramp operation',
    category: 'role',
    requiredFor: 'Accessible vehicles',
    permissions: ['wheelchair', 'accessible', 'passenger_lift'],
    renewalMonths: 36,
    documentTypes: ['wheelchair_training', 'passenger_lift'],
  },
  {
    key: 'safeguarding_children',
    label: 'Safeguarding children',
    category: 'role',
    requiredFor: 'School / SEND transport',
    permissions: ['school', 'send', 'safeguarding'],
    renewalMonths: 36,
    documentTypes: ['safeguarding_training', 'safeguarding_children'],
  },
  {
    key: 'send_autism_awareness',
    label: 'SEND / autism awareness',
    category: 'role',
    requiredFor: 'SEND transport',
    permissions: ['send', 'school'],
    renewalMonths: 36,
  },
  {
    key: 'behaviour_management',
    label: 'Behaviour management',
    category: 'role',
    requiredFor: 'SEND / school transport',
    permissions: ['send', 'school'],
    renewalMonths: 36,
  },
  {
    key: 'infection_prevention',
    label: 'Infection prevention and control',
    category: 'role',
    requiredFor: 'Hospital transport',
    permissions: ['hospital'],
    renewalMonths: 24,
  },
  {
    key: 'dementia_awareness',
    label: 'Dementia awareness',
    category: 'role',
    requiredFor: 'Hospital / elderly transport',
    permissions: ['hospital', 'elderly'],
    renewalMonths: 36,
  },
  {
    key: 'driver_cpc',
    label: 'Driver CPC (periodic training)',
    category: 'role',
    requiredFor: 'PSV / coach',
    permissions: ['psv', 'coach'],
    renewalMonths: 60,
    documentTypes: ['cpc', 'dqc'],
  },
]

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const ms = new Date(date).getTime()
  if (Number.isNaN(ms)) return null
  return Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000))
}

function appliesToPermissions(def: DriverTrainingCatalogDef, enabled: Set<string>): boolean {
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
    recordStatus === 'complete' || recordStatus === 'valid' || Boolean(record?.completedAt && !['missing', 'failed'].includes(recordStatus))

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
      })
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
      ...evidence,
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

export type TrainingSummary = {
  mandatoryTotal: number
  mandatoryComplete: number
  mandatoryMissing: number
  roleTotal: number
  roleComplete: number
  expiringSoon: number
  fullyTrained: boolean
}

export function summariseDriverTraining(reqs: TrainingRequirementWithCategory[]): TrainingSummary {
  const mandatory = reqs.filter((r) => r.category === 'mandatory')
  const role = reqs.filter((r) => r.category === 'role')
  const isDone = (r: TrainingRequirement) => r.status === 'complete' || r.status === 'due_soon'
  const mandatoryComplete = mandatory.filter(isDone).length
  const mandatoryMissing = mandatory.filter((r) => r.status === 'missing' || r.status === 'expired' || r.status === 'failed').length
  return {
    mandatoryTotal: mandatory.length,
    mandatoryComplete,
    mandatoryMissing,
    roleTotal: role.length,
    roleComplete: role.filter(isDone).length,
    expiringSoon: reqs.filter((r) => r.status === 'due_soon').length,
    fullyTrained: mandatoryMissing === 0 && mandatory.length > 0,
  }
}

export function isMandatoryTrainingKey(key: string): boolean {
  return DRIVER_TRAINING_CATALOG.some((d) => d.key === key && d.category === 'mandatory')
}

export function getTrainingCatalogDef(key: string): DriverTrainingCatalogDef | undefined {
  return DRIVER_TRAINING_CATALOG.find((d) => d.key === key)
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
