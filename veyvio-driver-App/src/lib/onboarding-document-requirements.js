/** Document types grouped by onboarding step (Command + legacy). */
export const STEP_DOCUMENT_TYPES = {
  right_to_work: ["right_to_work"],
  driving_licence: ["licence_front", "licence_back", "driving_licence"],
  dqc_cpc: ["dqc_front", "dqc_back", "dqc", "dqc_cpc"],
  dbs_safeguarding: ["dbs", "safeguarding", "dbs_certificate"],
};

/** Card-style onboarding uploads — front and back required per step. */
export const CARD_DOCUMENT_UPLOADS = {
  driving_licence: [
    {
      documentType: "licence_front",
      label: "Front of driving licence",
      helper: "Clear photo of the front of your photocard licence (name, photo, licence number).",
    },
    {
      documentType: "licence_back",
      label: "Back of driving licence",
      helper: "Clear photo of the back showing categories, expiry date, and penalty points.",
    },
  ],
  dqc_cpc: [
    {
      documentType: "dqc_front",
      label: "Front of DQC / CPC card",
      helper: "Clear photo of the front of your Driver Qualification Card.",
    },
    {
      documentType: "dqc_back",
      label: "Back of DQC / CPC card",
      helper: "Clear photo of the back showing expiry and any endorsements.",
    },
  ],
};

export function requiredDocumentTypesForStep(stepKey) {
  return CARD_DOCUMENT_UPLOADS[stepKey]?.map((item) => item.documentType) ?? [];
}

export function hasAllRequiredDocuments(stepKey, documentsByType) {
  const required = requiredDocumentTypesForStep(stepKey);
  if (required.length === 0) return Boolean(documentsByType?.[legacyDocumentTypeForStep(stepKey)]);
  return required.every((type) => {
    const doc = documentsByType?.[type];
    return doc && ["pending", "approved", "valid", "expiring_soon"].includes(doc.status);
  });
}

/** Legacy single-file types still accepted if already on file. */
function legacyDocumentTypeForStep(stepKey) {
  const map = {
    driving_licence: "driving_licence",
    dqc_cpc: "dqc",
    dbs_safeguarding: "dbs",
    right_to_work: "right_to_work",
  };
  return map[stepKey];
}

export function missingDocumentTypesForStep(stepKey, documentsByType) {
  const required = requiredDocumentTypesForStep(stepKey);
  if (required.length === 0) {
    const legacy = legacyDocumentTypeForStep(stepKey);
    return legacy && !documentsByType?.[legacy] ? [legacy] : [];
  }
  return required.filter((type) => !documentsByType?.[type]);
}
