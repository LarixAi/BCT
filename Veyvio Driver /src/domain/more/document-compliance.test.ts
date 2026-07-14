import { describe, expect, it } from "vitest";
import {
  applyDocumentCompliance,
  getCaptureProgress,
  getDocumentActionRequired,
} from "@/domain/more/document-compliance";
import type { ComplianceDocument } from "@/types/more";

function licenceDoc(overrides: Partial<ComplianceDocument> = {}): ComplianceDocument {
  return applyDocumentCompliance({
    id: "doc_licence",
    name: "Driving licence",
    documentTypeId: "driving_licence",
    category: "Licence",
    status: "expiring_soon",
    expiryDate: "2026-08-02",
    sides: [
      { sideId: "front", status: "missing" },
      { sideId: "back", status: "missing" },
    ],
    ...overrides,
  });
}

describe("document compliance", () => {
  it("tracks front and back capture progress for driving licence", () => {
    const document = licenceDoc({
      sides: [
        { sideId: "front", status: "pending_review", fileName: "front.jpg" },
        { sideId: "back", status: "missing" },
      ],
    });

    expect(getCaptureProgress(document)).toEqual({
      submitted: 1,
      required: 2,
      label: "1 of 2 sides captured",
    });
    expect(getDocumentActionRequired(document)).toBe("Still needed: back");
    expect(document.status).toBe("draft");
  });

  it("marks document pending review when all required sides are submitted", () => {
    const document = licenceDoc({
      sides: [
        { sideId: "front", status: "pending_review", fileName: "front.jpg" },
        { sideId: "back", status: "pending_review", fileName: "back.jpg" },
      ],
    });

    expect(document.status).toBe("pending_review");
    expect(getDocumentActionRequired(document)).toBeUndefined();
  });

  it("keeps single-sided documents on one capture slot", () => {
    const document = applyDocumentCompliance({
      id: "doc_dbs",
      name: "DBS certificate",
      documentTypeId: "dbs_certificate",
      category: "Safeguarding",
      status: "expiring_soon",
      sides: [{ sideId: "full", status: "missing" }],
    });

    expect(getCaptureProgress(document)).toEqual({
      submitted: 0,
      required: 1,
      label: "Evidence required",
    });
  });
});
