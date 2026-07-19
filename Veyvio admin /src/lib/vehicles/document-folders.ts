import type { VehicleDocument } from './types'

export type DocumentFolderId = 'vehicle' | 'compliance' | 'manufacturer' | 'other'

export interface DocumentFolder {
  id: DocumentFolderId
  label: string
  description: string
  requirementTypes: string[]
}

export const DOCUMENT_FOLDERS: DocumentFolder[] = [
  {
    id: 'vehicle',
    label: 'Vehicle documents',
    description: 'Registration, finance, purchase and ownership',
    requirementTypes: ['v5c', 'finance', 'purchase_invoice', 'warranty', 'registration'],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'MOT, insurance, tax, PMI, lift and tachograph certificates',
    requirementTypes: [
      'mot',
      'insurance',
      'tax',
      'tachograph_calibration',
      'psv_licence',
      'lift_inspection',
      'pmi',
      'loler',
      'brake_test',
      'emission',
    ],
  },
  {
    id: 'manufacturer',
    label: 'Manufacturer',
    description: 'Service manuals, recalls and technical bulletins',
    requirementTypes: ['service_manual', 'recall', 'technical_bulletin', 'parts_catalogue'],
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Unclassified uploads',
    requirementTypes: [],
  },
]

export function folderForDocument(doc: VehicleDocument): DocumentFolderId {
  const type = doc.requirementType.toLowerCase()
  for (const folder of DOCUMENT_FOLDERS) {
    if (folder.id === 'other') continue
    if (folder.requirementTypes.includes(type)) return folder.id
  }
  return 'other'
}

export function groupDocumentsByFolder(documents: VehicleDocument[] | null | undefined) {
  const groups: Record<DocumentFolderId, VehicleDocument[]> = {
    vehicle: [],
    compliance: [],
    manufacturer: [],
    other: [],
  }
  for (const doc of Array.isArray(documents) ? documents : []) {
    groups[folderForDocument(doc)].push(doc)
  }
  return groups
}
