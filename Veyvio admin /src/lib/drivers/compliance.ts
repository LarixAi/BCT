import type { ComplianceStatus, DriverDocument, DriverProfile, TrainingRequirement } from './types'

export const REQUIREMENT_TYPE_OPTIONS: { type: string; label: string }[] = [
  { type: 'driving_licence', label: 'Driving licence' },
  { type: 'cpc', label: 'Driver CPC' },
  { type: 'dbs', label: 'DBS / safeguarding' },
  { type: 'medical', label: 'Medical certificate' },
  { type: 'right_to_work', label: 'Right to work' },
  { type: 'safeguarding_training', label: 'Safeguarding training' },
  { type: 'wheelchair_training', label: 'Wheelchair restraint training' },
  { type: 'first_aid', label: 'First aid' },
]

export const RESTRICTION_TYPE_OPTIONS: { type: string; label: string }[] = [
  { type: 'no_school', label: 'No school contracts' },
  { type: 'no_wheelchair', label: 'No wheelchair work' },
  { type: 'automatic_only', label: 'Automatic vehicles only' },
  { type: 'no_night_work', label: 'No night work' },
  { type: 'supervised_only', label: 'Supervised duties only' },
  { type: 'depot_restricted', label: 'Restricted depot' },
]

const EXPIRY_FIELD_MAP: Record<string, keyof Pick<DriverProfile, 'licenceExpiry' | 'cpcExpiry' | 'dbsExpiry' | 'medicalExpiry'>> = {
  driving_licence: 'licenceExpiry',
  cpc: 'cpcExpiry',
  dbs: 'dbsExpiry',
  medical: 'medicalExpiry',
}

export function deriveComplianceStatus(documents: DriverDocument[]): ComplianceStatus {
  if (documents.some((d) => d.verificationStatus === 'rejected')) return 'verification_failed'
  if (documents.some((d) => d.verificationStatus === 'expired')) return 'non_compliant'
  if (documents.some((d) => d.verificationStatus === 'awaiting_review' || d.verificationStatus === 'uploaded')) {
    return 'under_review'
  }
  if (documents.some((d) => d.verificationStatus === 'expiring_soon')) return 'documents_expiring_soon'
  if (documents.length === 0) return 'missing_information'
  if (documents.some((d) => d.verificationStatus !== 'verified')) return 'missing_information'
  return 'compliant'
}

export function applyVerifiedDocumentToProfile(
  profile: DriverProfile,
  doc: DriverDocument,
): Partial<DriverProfile> {
  const patch: Partial<DriverProfile> = {}
  const field = EXPIRY_FIELD_MAP[doc.requirementType]
  if (field && doc.expiryDate) {
    patch[field] = doc.expiryDate
  }
  if (doc.requirementType === 'driving_licence' && doc.referenceNumber) {
    patch.licenceNumber = doc.referenceNumber
  }
  patch.complianceStatus = deriveComplianceStatus(
    profile.documents.map((d) => (d.id === doc.id ? { ...d, verificationStatus: 'verified' } : d)),
  )
  return patch
}

export function buildTrainingRequirements(profile: DriverProfile): TrainingRequirement[] {
  const reqs: TrainingRequirement[] = []
  const enabled = new Set(profile.workPermissions.filter((p) => p.enabled).map((p) => p.key))

  const add = (
    key: string,
    label: string,
    requiredFor: string,
    status: TrainingRequirement['status'],
    expiresAt: string | null = null,
  ) => {
    reqs.push({
      id: `tr-${key}`,
      key,
      label,
      requiredFor,
      status,
      completedAt: status === 'complete' ? '2025-06-01' : null,
      expiresAt,
      trainer: status === 'complete' ? 'Metro Training' : null,
    })
  }

  if (enabled.has('school')) {
    const safeguardingDoc = profile.documents.find((d) => d.requirementType === 'safeguarding_training')
    add(
      'safeguarding_training',
      'Safeguarding training',
      'School transport',
      safeguardingDoc?.verificationStatus === 'verified' ? 'complete' : profile.employmentStatus === 'onboarding' ? 'missing' : 'due_soon',
      '2026-12-01',
    )
  }
  if (enabled.has('wheelchair')) {
    add(
      'wheelchair_restraint',
      'Wheelchair restraint training',
      'Wheelchair passengers',
      profile.documents.some((d) => d.requirementType === 'wheelchair_training' && d.verificationStatus === 'verified')
        ? 'complete'
        : 'missing',
      '2027-06-01',
    )
  }
  if (enabled.has('accessible')) {
    add(
      'disability_awareness',
      'Disability awareness',
      'Accessible transport',
      'complete',
      '2027-03-01',
    )
  }
  add('company_induction', 'Company induction', 'All drivers', profile.employmentStatus === 'onboarding' ? 'missing' : 'complete', null)

  return reqs
}
