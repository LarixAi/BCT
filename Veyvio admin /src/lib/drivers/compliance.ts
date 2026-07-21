import type { ComplianceStatus, DriverDocument, DriverProfile } from './types'

export {
  buildDriverTrainingRequirements,
  buildTrainingRequirements,
  DRIVER_TRAINING_CATALOG,
  summariseDriverTraining,
} from './training'

export const REQUIREMENT_TYPE_OPTIONS: { type: string; label: string }[] = [
  { type: 'driving_licence', label: 'Driving licence' },
  { type: 'dqc', label: 'Driver CPC / DQC' },
  { type: 'tachograph', label: 'Tachograph card' },
  { type: 'dbs', label: 'DBS check' },
  { type: 'right_to_work', label: 'Right to work' },
  { type: 'medical', label: 'Medical certificate' },
  { type: 'safeguarding_training', label: 'Safeguarding training' },
  { type: 'safeguarding_adults', label: 'Safeguarding adults certificate' },
  { type: 'safeguarding_children', label: 'Safeguarding children certificate' },
  { type: 'wheelchair_training', label: 'Wheelchair restraint training' },
  { type: 'midas_standard', label: 'MiDAS Standard certificate' },
  { type: 'midas_accessible', label: 'MiDAS Accessible certificate' },
  { type: 'first_aid', label: 'First aid' },
  { type: 'manual_handling', label: 'Manual handling certificate' },
]

/** Maps uploaded document types to activation requirement keys (e.g. licence photos → driving_licence). */
export function definitionKeyForDocumentRequirementType(requirementType: string): string {
  const aliases: Record<string, string> = {
    licence_front: 'driving_licence',
    licence_back: 'driving_licence',
    dvla_check: 'driving_licence',
    licence: 'driving_licence',
    dqc_front: 'dqc',
    dqc_back: 'dqc',
    dqc_cpc: 'dqc',
    cpc: 'dqc',
    tacho: 'tachograph',
    tacho_card: 'tachograph',
  }
  return aliases[requirementType] ?? requirementType
}

export function documentMatchesComplianceKey(doc: DriverDocument, definitionKey: string): boolean {
  const mapped = definitionKeyForDocumentRequirementType(doc.requirementType)
  return mapped === definitionKey || doc.requirementType === definitionKey
}

export type ComplianceRequirementSlot = {
  definitionKey: string
  label: string
  documents: DriverDocument[]
  primary: DriverDocument | null
  status: 'missing' | 'under_review' | 'verified' | 'rejected' | 'expired' | 'expiring_soon' | 'request_sent'
  lastRequestedAt?: string | null
}

/** Always show core compliance types (licence, DQC, tacho, DBS, RTW, medical) even with no upload. */
/** Uploads that are not the primary evidence row for a core compliance slot. */
export function listSupplementaryComplianceDocuments(
  documents: DriverDocument[],
  coreSlots: ComplianceRequirementSlot[],
): DriverDocument[] {
  const primaryIds = new Set(
    coreSlots.map((slot) => slot.primary?.id).filter((id): id is string => Boolean(id)),
  )
  return documents.filter((doc) => !primaryIds.has(doc.id))
}

export function buildCoreComplianceSlots(driver: DriverProfile): ComplianceRequirementSlot[] {
  const core = [
    { type: 'driving_licence', label: 'Driving licence' },
    { type: 'dqc', label: 'Driver CPC / DQC' },
    { type: 'tachograph', label: 'Tachograph card' },
    { type: 'dbs', label: 'DBS check' },
    { type: 'right_to_work', label: 'Right to work' },
    { type: 'medical', label: 'Medical certificate' },
  ]
  const docs = driver.documents ?? []

  return core.map((def) => {
    const matches = docs.filter((d) => documentMatchesComplianceKey(d, def.type))
    const rank = (status: string) => {
      if (status === 'verified' || status === 'expiring_soon') return 0
      if (status === 'awaiting_review' || status === 'uploaded') return 1
      if (status === 'rejected' || status === 'expired') return 2
      return 3
    }
    const sorted = [...matches].sort(
      (a, b) =>
        rank(String(a.verificationStatus)) - rank(String(b.verificationStatus)) ||
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )
    const primary = sorted[0] ?? null
    let status: ComplianceRequirementSlot['status'] = 'missing'
    if (primary) {
      const v = primary.verificationStatus
      if (v === 'verified') status = 'verified'
      else if (v === 'expiring_soon') status = 'expiring_soon'
      else if (v === 'expired') status = 'expired'
      else if (v === 'rejected') status = 'rejected'
      else status = 'under_review'
    }
    return {
      definitionKey: def.type,
      label: def.label,
      documents: sorted,
      primary,
      status,
    }
  })
}

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

export function isDocumentPendingAdminReview(status: string | undefined | null): boolean {
  return status === 'awaiting_review' || status === 'uploaded'
}

export function countDocumentsPendingAdminReview(documents: DriverDocument[]): number {
  return documents.filter((d) => isDocumentPendingAdminReview(d.verificationStatus)).length
}

export function deriveComplianceStatus(documents: DriverDocument[]): ComplianceStatus {
  if (documents.some((d) => d.verificationStatus === 'rejected')) return 'verification_failed'
  if (documents.some((d) => d.verificationStatus === 'expired')) return 'non_compliant'
  if (documents.some((d) => isDocumentPendingAdminReview(d.verificationStatus))) {
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
