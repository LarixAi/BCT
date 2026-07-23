import { describe, expect, it } from "vitest";
import {
  effectiveDocumentVerificationStatus,
  enrichDocumentWithDriverProfile,
  resolveDocumentExpiry,
} from "./document-verification-status";

describe("effectiveDocumentVerificationStatus", () => {
  it("heals stale expired status when expiry is in the future", () => {
    expect(effectiveDocumentVerificationStatus("expired", "2030-06-01")).toBe("verified");
  });

  it("does not heal rejected status when expiry is in the future", () => {
    expect(effectiveDocumentVerificationStatus("rejected", "2030-06-01")).toBe("rejected");
  });

  it("marks verified as expired when expiry is in the past", () => {
    expect(effectiveDocumentVerificationStatus("verified", "2020-01-01")).toBe("expired");
  });
});

describe("resolveDocumentExpiry", () => {
  it("prefers later profile expiry over stale document expiry", () => {
    const driver = { dbsExpiryDate: "2030-12-01" };
    const doc = { requirementType: "dbs", expiryDate: "2024-01-01" };
    expect(resolveDocumentExpiry(doc, driver)).toBe("2030-12-01");
  });
});

describe("enrichDocumentWithDriverProfile", () => {
  it("reconciles expired DBS document with renewed driver profile expiry", () => {
    const driver = { dbsExpiryDate: "2030-12-01" };
    const doc = {
      requirementType: "dbs",
      verificationStatus: "expired",
      expiryDate: "2024-01-01",
    };
    const enriched = enrichDocumentWithDriverProfile(doc, driver);
    expect(enriched.expiryDate).toBe("2030-12-01");
    expect(enriched.verificationStatus).toBe("verified");
  });
});
