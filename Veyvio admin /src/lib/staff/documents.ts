import type { StaffDocument } from './types'

export const STAFF_DOCUMENT_TYPES = [
  { type: 'employment_contract', label: 'Employment or contractor agreement', sensitive: false },
  { type: 'right_to_work', label: 'Right-to-work evidence', sensitive: true },
  { type: 'dbs', label: 'DBS documentation', sensitive: true },
  { type: 'training_certificate', label: 'Training certificate', sensitive: false },
  { type: 'identification', label: 'Identification document', sensitive: true },
  { type: 'professional_qualification', label: 'Professional qualification', sensitive: false },
  { type: 'depot_authorisation', label: 'Depot authorisation', sensitive: false },
  { type: 'confidentiality', label: 'Confidentiality agreement', sensitive: false },
  { type: 'equipment_issue', label: 'Equipment issue form', sensitive: false },
] as const

export function documentTypeLabel(type: string): string {
  return STAFF_DOCUMENT_TYPES.find((d) => d.type === type)?.label ?? type.replace(/_/g, ' ')
}

export function isSensitiveDocument(type: string): boolean {
  return STAFF_DOCUMENT_TYPES.find((d) => d.type === type)?.sensitive ?? false
}

export function documentsRequiringAction(documents: StaffDocument[]): StaffDocument[] {
  return documents.filter((d) => d.verificationStatus === 'awaiting_review' || d.verificationStatus === 'rejected')
}
