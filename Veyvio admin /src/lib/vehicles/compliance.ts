import type { VehicleComplianceStatus, VehicleDocument, VehicleProfile } from './types'

const WARN_DAYS = 30

function isExpired(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

function isExpiringSoon(date: string | null | undefined): boolean {
  if (!date) return false
  const t = new Date(date).getTime()
  const now = Date.now()
  return t > now && t < now + WARN_DAYS * 24 * 60 * 60 * 1000
}

export function deriveVehicleComplianceStatus(documents: VehicleDocument[]): VehicleComplianceStatus {
  const dated = documents.filter((d) => d.expiryDate)
  if (dated.length === 0) return 'awaiting_verification'

  const hasExpired = dated.some((d) => isExpired(d.expiryDate))
  if (hasExpired) return 'non_compliant'

  const hasRejected = documents.some((d) => d.verificationStatus === 'rejected')
  if (hasRejected) return 'non_compliant'

  const hasUnverified = documents.some(
    (d) => d.verificationStatus === 'uploaded' || d.verificationStatus === 'awaiting_review',
  )
  if (hasUnverified) return 'awaiting_verification'

  const hasExpiring = dated.some((d) => isExpiringSoon(d.expiryDate))
  if (hasExpiring) return 'expiring_soon'

  const hasWarning = documents.some((d) => d.verificationStatus === 'not_supplied')
  if (hasWarning) return 'warning'

  return 'compliant'
}

export const REQUIREMENT_TYPE_OPTIONS = [
  { type: 'mot', label: 'MOT / annual test' },
  { type: 'insurance', label: 'Fleet insurance' },
  { type: 'tax', label: 'Road tax' },
  { type: 'tachograph_calibration', label: 'Tachograph calibration' },
  { type: 'psv_licence', label: 'PSV licence association' },
  { type: 'lift_inspection', label: 'Wheelchair lift inspection' },
]

export function applyVerifiedDocumentToProfile(
  profile: VehicleProfile,
  doc: VehicleDocument,
): VehicleProfile {
  const documents = profile.documents.map((d) => (d.requirementType === doc.requirementType ? doc : d))
  const missing = !documents.some((d) => d.requirementType === doc.requirementType)
  const nextDocs = missing ? [...documents, doc] : documents

  const patch: Partial<VehicleProfile> = { documents: nextDocs }
  if (doc.requirementType === 'mot') patch.motExpiry = doc.expiryDate
  if (doc.requirementType === 'insurance') patch.insuranceExpiry = doc.expiryDate
  if (doc.requirementType === 'tax') patch.taxExpiry = doc.expiryDate
  if (doc.requirementType === 'tachograph_calibration') patch.tachographCalibrationExpiry = doc.expiryDate

  return { ...profile, ...patch }
}

export function nearestVehicleExpiry(
  profile: Pick<VehicleProfile, 'motExpiry' | 'insuranceExpiry' | 'taxExpiry' | 'tachographCalibrationExpiry'>,
) {
  const entries = [
    { label: 'MOT', date: profile.motExpiry },
    { label: 'Insurance', date: profile.insuranceExpiry },
    { label: 'Tax', date: profile.taxExpiry },
    { label: 'Tachograph', date: profile.tachographCalibrationExpiry },
  ].filter((e) => e.date) as { label: string; date: string }[]

  if (entries.length === 0) return { date: null, label: null }
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return { date: entries[0]!.date, label: entries[0]!.label }
}
