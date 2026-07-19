import type { ComplianceStatus, DriverDocument, DriverProfile } from './types'

export {
  buildDriverTrainingRequirements,
  buildTrainingRequirements,
  DRIVER_TRAINING_CATALOG,
  summariseDriverTraining,
} from './training'

export const REQUIREMENT_TYPE_OPTIONS: { type: string; label: string }[] = [
  { type: 'driving_licence', label: 'Driving licence' },
  { type: 'cpc', label: 'Driver CPC' },
  { type: 'dbs', label: 'DBS / safeguarding' },
  { type: 'medical', label: 'Medical certificate' },
  { type: 'right_to_work', label: 'Right to work' },
  { type: 'safeguarding_training', label: 'Safeguarding training' },
  { type: 'safeguarding_adults', label: 'Safeguarding adults certificate' },
  { type: 'safeguarding_children', label: 'Safeguarding children certificate' },
  { type: 'wheelchair_training', label: 'Wheelchair restraint training' },
  { type: 'midas_standard', label: 'MiDAS Standard certificate' },
  { type: 'midas_accessible', label: 'MiDAS Accessible certificate' },
  { type: 'first_aid', label: 'First aid' },
  { type: 'manual_handling', label: 'Manual handling certificate' },
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
