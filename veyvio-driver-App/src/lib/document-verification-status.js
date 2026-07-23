/** Reconcile stored verification status with expiry date (admin may renew expiry after an old upload). */
export function effectiveDocumentVerificationStatus(verificationStatus, expiryDate) {
  const status = String(verificationStatus ?? "uploaded").toLowerCase();
  const expiry = expiryDate ? String(expiryDate).slice(0, 10) : null;
  if (!expiry) return status;

  const today = new Date().toISOString().slice(0, 10);
  if (expiry >= today) {
    if (status === "expired") return "verified";
    if (status === "verified") {
      const days = daysUntil(expiry);
      if (days !== null && days <= 30) return "expiring_soon";
      return "verified";
    }
    return status;
  }

  if (status === "verified" || status === "expiring_soon") return "expired";
  return status;
}

function daysUntil(dateStr) {
  const target = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Driver profile expiry for a requirement type — matches Admin document-display enrichment. */
export function profileExpiryForRequirementType(requirementType, driver) {
  if (!driver) return null;
  const t = String(requirementType ?? "").toLowerCase();
  if (["driving_licence", "licence", "licence_front", "licence_back", "dvla_check"].includes(t)) {
    return driver.licenceExpiryDate ?? null;
  }
  if (["dqc", "cpc", "dqc_front", "dqc_back", "dqc_cpc"].includes(t)) {
    return driver.dqcExpiryDate ?? null;
  }
  if (t === "dbs" || t === "dbs_safeguarding" || t === "safeguarding" || t === "dbs_certificate") {
    return driver.dbsExpiryDate ?? null;
  }
  if (t === "medical" || t === "medical_certificate") {
    return driver.medicalExpiryDate ?? null;
  }
  if (t === "tachograph" || t === "tacho" || t === "tacho_card") {
    return driver.tachoCardExpiry ?? null;
  }
  return null;
}

/** Prefer the later of document vs profile expiry — admin may renew on the driver row first. */
export function resolveDocumentExpiry(doc, driver) {
  const docExpiry = doc?.expiryDate ?? doc?.expires_on ?? doc?.expiresOn ?? null;
  const profileExpiry = profileExpiryForRequirementType(
    doc?.requirementType ?? doc?.document_type ?? doc?.documentType,
    driver,
  );
  const docIso = docExpiry ? String(docExpiry).slice(0, 10) : null;
  const profileIso = profileExpiry ? String(profileExpiry).slice(0, 10) : null;
  if (!profileIso) return docIso;
  if (!docIso) return profileIso;
  return profileIso >= docIso ? profileIso : docIso;
}

export function enrichDocumentWithDriverProfile(doc, driver) {
  if (!doc) return doc;
  const expiryDate = resolveDocumentExpiry(doc, driver);
  const verificationStatus = effectiveDocumentVerificationStatus(
    doc.verificationStatus ?? doc.status,
    expiryDate,
  );
  return {
    ...doc,
    expiryDate: expiryDate ?? doc.expiryDate ?? null,
    expires_on: expiryDate ?? doc.expires_on ?? null,
    verificationStatus,
  };
}
