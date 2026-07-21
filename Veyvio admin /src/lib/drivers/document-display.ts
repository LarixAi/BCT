import { deriveComplianceStatus } from './compliance'
import { reconcileDriverProfile } from './eligibility-reconcile'
import type { DriverDocument, DriverProfile } from './types'

/** Human-readable label for camera-style filenames (e.g. 1784530023095.jpeg). */
export function driverDocumentFileLabel(doc: {
  label: string
  requirementType?: string
  fileName?: string | null
}): string {
  const raw = String(doc.fileName ?? '').trim()
  if (raw && !/^\d{10,}\.(jpe?g|png|webp|heic|heif)$/i.test(raw)) return raw
  return doc.label || doc.requirementType?.replace(/_/g, ' ') || 'Document'
}

type RawDocument = DriverDocument & {
  created_at?: string
  updated_at?: string
  source_app?: string
}

function profileExpiryForRequirementType(
  requirementType: string,
  driver: DriverProfile,
): string | null {
  const t = requirementType.toLowerCase()
  if (['driving_licence', 'licence', 'licence_front', 'licence_back', 'dvla_check'].includes(t)) {
    return driver.licenceExpiry ?? null
  }
  if (['dqc', 'cpc', 'dqc_front', 'dqc_back', 'dqc_cpc'].includes(t)) {
    return driver.cpcExpiry ?? null
  }
  if (t === 'dbs') return driver.dbsExpiry ?? null
  if (t === 'medical') return driver.medicalExpiry ?? null
  if (t === 'tachograph' || t === 'tacho') return driver.tachoCardExpiry ?? null
  return null
}

function inferDocumentSourceApp(doc: DriverDocument): string {
  if (doc.fileObjectId) return 'DRIVER'
  const name = String(doc.fileName ?? '').toLowerCase()
  if (name.endsWith('-upload.pdf')) return 'COMMAND'
  return 'DRIVER'
}

/** Fill submitted / source / expiry for compliance table when API or uploads omit fields. */
export function enrichDriverDocument(doc: DriverDocument, driver: DriverProfile): DriverDocument {
  const raw = doc as RawDocument
  const createdAt =
    doc.createdAt ??
    raw.created_at ??
    doc.updatedAt ??
    raw.updated_at ??
    doc.verifiedAt ??
    undefined
  const sourceApp = doc.sourceApp ?? raw.source_app ?? inferDocumentSourceApp(doc)
  const expiryDate = doc.expiryDate ?? profileExpiryForRequirementType(doc.requirementType, driver)

  return {
    ...doc,
    createdAt,
    updatedAt: doc.updatedAt ?? raw.updated_at,
    sourceApp,
    expiryDate,
  }
}

export function enrichDriverDocumentsForCompliance(driver: DriverProfile): DriverDocument[] {
  return (driver.documents ?? []).map((doc) => enrichDriverDocument(doc, driver))
}

export function normalizeDriverProfileDocuments(profile: DriverProfile): DriverProfile {
  const documents = enrichDriverDocumentsForCompliance(profile)
  const withDocs = {
    ...profile,
    documents,
    complianceStatus: deriveComplianceStatus(documents),
  }
  return reconcileDriverProfile(withDocs)
}

export function formatDocumentSubmittedAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDocumentExpiry(date: string | null | undefined): string {
  if (!date) return 'Not on file'
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return 'Not on file'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
