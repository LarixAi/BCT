type Row = Record<string, unknown>

/** Reconcile stored verification status with expiry date (admin may renew expiry after an old upload). */
export function effectiveDocumentVerificationStatus(
  verificationStatus: unknown,
  expiryDate: unknown,
): string {
  const status = String(verificationStatus ?? 'uploaded').toLowerCase()
  const expiry = expiryDate ? String(expiryDate).slice(0, 10) : null
  if (!expiry) return status

  const today = new Date().toISOString().slice(0, 10)
  if (expiry >= today) {
    if (status === 'expired') return 'verified'
    if (status === 'verified') {
      const days = daysUntil(expiry)
      if (days !== null && days <= 30) return 'expiring_soon'
      return 'verified'
    }
    return status
  }

  if (status === 'verified' || status === 'expiring_soon') return 'expired'
  return status
}

function daysUntil(dateStr: string): number | null {
  const target = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function projectedDocumentExpiry(
  row: Row,
  requirementType: unknown,
  docExpiry: unknown,
): string | null {
  if (docExpiry) return String(docExpiry).slice(0, 10)
  const t = String(requirementType ?? '').toLowerCase()
  if (['driving_licence', 'licence', 'licence_front', 'licence_back', 'dvla_check'].includes(t)) {
    return row.licence_expiry_date ? String(row.licence_expiry_date).slice(0, 10) : null
  }
  if (['dqc', 'cpc', 'dqc_front', 'dqc_back', 'dqc_cpc'].includes(t)) {
    return row.cpc_expiry_date ? String(row.cpc_expiry_date).slice(0, 10) : null
  }
  if (t === 'dbs' || t === 'dbs_safeguarding' || t === 'safeguarding') {
    return row.dbs_expiry_date ? String(row.dbs_expiry_date).slice(0, 10) : null
  }
  if (t === 'medical' || t === 'medical_certificate') {
    return row.medical_expiry_date ? String(row.medical_expiry_date).slice(0, 10) : null
  }
  if (t === 'tachograph' || t === 'tacho' || t === 'tacho_card') {
    return row.tacho_card_expiry ? String(row.tacho_card_expiry).slice(0, 10) : null
  }
  return null
}

/** Prefer the later of document vs profile expiry — admin may renew on the driver row first. */
export function resolveProjectedDocumentExpiry(
  row: Row,
  requirementType: unknown,
  docExpiry: unknown,
): string | null {
  const docIso = docExpiry ? String(docExpiry).slice(0, 10) : null
  const profileIso = projectedDocumentExpiry(row, requirementType, null)
  if (!profileIso) return docIso
  if (!docIso) return profileIso
  return profileIso >= docIso ? profileIso : docIso
}
