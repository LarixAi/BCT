import type { DocumentSideId, DocumentTypeId } from "@/types/more";

export interface DocumentSideDefinition {
  id: DocumentSideId;
  label: string;
  hint: string;
  photographLabel: string;
  required: boolean;
}

export interface DocumentTypeDefinition {
  id: DocumentTypeId;
  category: string;
  captureLabel: string;
  guidance: string;
  renewalGuidance: string;
  sides: DocumentSideDefinition[];
}

export const DOCUMENT_CATALOG: Record<DocumentTypeId, DocumentTypeDefinition> = {
  driving_licence: {
    id: "driving_licence",
    category: "Licence",
    captureLabel: "Front and back required",
    guidance:
      "Photograph both sides of your UK photocard licence. Name, licence number, expiry date, categories, and endorsements must be readable.",
    renewalGuidance:
      "Upload renewed front and back images before your current licence expires. Operations will review before approval.",
    sides: [
      {
        id: "front",
        label: "Front",
        hint: "Photo, full name, licence number, and expiry date must be visible.",
        photographLabel: "Photograph front",
        required: true,
      },
      {
        id: "back",
        label: "Back",
        hint: "Categories, endorsements, and issue details must be visible.",
        photographLabel: "Photograph back",
        required: true,
      },
    ],
  },
  dbs_certificate: {
    id: "dbs_certificate",
    category: "Safeguarding",
    captureLabel: "Certificate image required",
    guidance:
      "Photograph or upload the full DBS certificate. Certificate number, issue date, and your name must be readable.",
    renewalGuidance: "Upload your renewed DBS certificate for office review before it lapses.",
    sides: [
      {
        id: "full",
        label: "Certificate",
        hint: "Full certificate with certificate number and issue date visible.",
        photographLabel: "Photograph certificate",
        required: true,
      },
    ],
  },
  driver_cpc: {
    id: "driver_cpc",
    category: "Qualification",
    captureLabel: "Front and back required",
    guidance:
      "Driver CPC cards need clear images of both sides. Name, card number, expiry date, and training record must be readable.",
    renewalGuidance: "Upload renewed CPC front and back before your card expires.",
    sides: [
      {
        id: "front",
        label: "Front",
        hint: "Driver name, card number, and expiry date must be visible.",
        photographLabel: "Photograph front",
        required: true,
      },
      {
        id: "back",
        label: "Back",
        hint: "Training hours and qualification details must be visible.",
        photographLabel: "Photograph back",
        required: true,
      },
    ],
  },
  right_to_work: {
    id: "right_to_work",
    category: "Compliance",
    captureLabel: "Evidence image required",
    guidance:
      "Upload a passport biographic page, visa vignette, or Home Office share-code PDF. Your name and right-to-work status must be visible.",
    renewalGuidance: "Upload updated right-to-work evidence when your permission changes or expires.",
    sides: [
      {
        id: "full",
        label: "Evidence",
        hint: "Passport page, visa, or share-code proof with your name visible.",
        photographLabel: "Photograph evidence",
        required: true,
      },
    ],
  },
  medical_declaration: {
    id: "medical_declaration",
    category: "Fitness to drive",
    captureLabel: "Declaration required",
    guidance:
      "Photograph or upload your signed medical declaration. Signature, date, and fitness confirmation must be readable.",
    renewalGuidance: "Upload a new signed declaration before your current one expires.",
    sides: [
      {
        id: "full",
        label: "Declaration",
        hint: "Signed declaration with date and fitness confirmation visible.",
        photographLabel: "Photograph declaration",
        required: true,
      },
    ],
  },
  safeguarding_certificate: {
    id: "safeguarding_certificate",
    category: "Training",
    captureLabel: "Certificate required",
    guidance:
      "Photograph or upload your safeguarding training certificate. Course title, completion date, and your name must be visible.",
    renewalGuidance: "Upload renewed safeguarding evidence before expiry.",
    sides: [
      {
        id: "full",
        label: "Certificate",
        hint: "Course title, completion date, and your name must be visible.",
        photographLabel: "Photograph certificate",
        required: true,
      },
    ],
  },
};

export function getDocumentTypeDefinition(typeId: DocumentTypeId): DocumentTypeDefinition {
  return DOCUMENT_CATALOG[typeId];
}
