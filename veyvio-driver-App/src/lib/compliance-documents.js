/**
 * Core compliance document slots — aligned with Admin Driver Compliance tab.
 * Always show these six types even when nothing is uploaded yet.
 */
import { effectiveDocumentVerificationStatus } from "@/lib/document-verification-status";

export const CORE_COMPLIANCE_DOCUMENTS = [
  {
    type: "driving_licence",
    label: "Driving licence",
    helper: "Clear photo of your photocard licence, including expiry date.",
  },
  {
    type: "dqc",
    label: "Driver CPC / DQC",
    helper: "Clear photo of your Driver Qualification Card, including expiry.",
  },
  {
    type: "tachograph",
    label: "Tachograph card",
    helper: "Clear photo of your tachograph card, including expiry date.",
  },
  {
    type: "dbs",
    label: "DBS check",
    helper: "Upload your DBS certificate or enhanced check confirmation.",
  },
  {
    type: "right_to_work",
    label: "Right to work",
    helper: "Passport, BRP, or share-code evidence of right to work.",
  },
  {
    type: "medical",
    label: "Medical certificate",
    helper: "Group 2 medical or occupational health certificate.",
  },
];

/** Map uploaded variants (front/back, aliases) onto the six admin core keys. */
export function definitionKeyForDocumentType(documentType) {
  const type = String(documentType ?? "").toLowerCase().trim();
  const aliases = {
    licence_front: "driving_licence",
    licence_back: "driving_licence",
    dvla_check: "driving_licence",
    licence: "driving_licence",
    driving_licence: "driving_licence",
    dqc_front: "dqc",
    dqc_back: "dqc",
    dqc_cpc: "dqc",
    cpc: "dqc",
    dqc: "dqc",
    tacho: "tachograph",
    tacho_card: "tachograph",
    tachograph: "tachograph",
    dbs: "dbs",
    dbs_certificate: "dbs",
    safeguarding: "dbs",
    right_to_work: "right_to_work",
    medical: "medical",
    medical_certificate: "medical",
  };
  return aliases[type] ?? type;
}

export function documentMatchesCoreKey(doc, definitionKey) {
  const raw = doc?.requirementType ?? doc?.document_type ?? doc?.documentType ?? "";
  const mapped = definitionKeyForDocumentType(raw);
  return mapped === definitionKey || String(raw) === definitionKey;
}

function verificationOf(doc) {
  const rawStatus = doc?.verificationStatus ?? doc?.status;
  const expiry = doc?.expiryDate ?? doc?.expires_on ?? doc?.expiresOn ?? null;
  const reconciled = effectiveDocumentVerificationStatus(rawStatus, expiry);
  if (reconciled === "verified") return "verified";
  if (reconciled === "rejected") return "rejected";
  if (reconciled === "expired") return "expired";
  if (reconciled === "expiring_soon") return "expiring_soon";
  if (reconciled === "awaiting_review" || reconciled === "uploaded" || reconciled === "pending") {
    return "awaiting_review";
  }
  return reconciled || "missing";
}

/**
 * @param {Array} documents — rows from loadDriverDocuments / Command
 * @returns {Array<{ definitionKey, label, helper, documents, primary, status }>}
 */
export function buildCoreComplianceSlots(documents = []) {
  return CORE_COMPLIANCE_DOCUMENTS.map((def) => {
    const matches = (documents ?? []).filter((d) => documentMatchesCoreKey(d, def.type));
    const rank = (doc) => {
      const v = verificationOf(doc);
      if (v === "verified" || v === "expiring_soon") return 0;
      if (v === "awaiting_review" || v === "uploaded") return 1;
      if (v === "rejected" || v === "expired") return 2;
      return 3;
    };
    const sorted = [...matches].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        new Date(b.created_at ?? b.createdAt ?? 0).getTime() -
          new Date(a.created_at ?? a.createdAt ?? 0).getTime(),
    );
    const primary = sorted[0] ?? null;
    let status = "missing";
    if (primary) {
      const v = verificationOf(primary);
      if (v === "verified") status = "verified";
      else if (v === "expiring_soon") status = "expiring_soon";
      else if (v === "expired") status = "expired";
      else if (v === "rejected") status = "rejected";
      else status = "under_review";
    }
    return {
      definitionKey: def.type,
      label: def.label,
      helper: def.helper,
      documents: sorted,
      primary,
      status,
    };
  });
}

export function coreSlotStatusLabel(status) {
  switch (status) {
    case "verified":
      return "Verified";
    case "under_review":
      return "Under review";
    case "expiring_soon":
      return "Expiring soon";
    case "expired":
      return "Expired";
    case "rejected":
      return "Needs re-upload";
    case "request_sent":
      return "Request sent";
    case "missing":
    default:
      return "Missing";
  }
}

export function coreSlotStatusTone(status) {
  switch (status) {
    case "verified":
      return "good";
    case "under_review":
    case "request_sent":
      return "info";
    case "expiring_soon":
      return "attention";
    case "expired":
    case "rejected":
      return "critical";
    case "missing":
    default:
      return "muted";
  }
}

export function formatDocumentExpiry(value) {
  if (!value) return "Not on file";
  const iso = String(value).slice(0, 10);
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
