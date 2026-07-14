import { describe, expect, it } from "vitest";
import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  validateDocumentUpload,
} from "@/domain/more/document-upload";

describe("validateDocumentUpload", () => {
  it("accepts a JPEG image", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "licence.jpg", { type: "image/jpeg" });
    expect(validateDocumentUpload(file)).toEqual({ ok: true });
  });

  it("accepts a PDF by extension when type is missing", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "certificate.pdf", { type: "" });
    expect(validateDocumentUpload(file)).toEqual({ ok: true });
  });

  it("rejects unsupported file types", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "notes.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateDocumentUpload(file)).toEqual({
      ok: false,
      reason: "Use a JPG, PNG, HEIC, or PDF file.",
    });
  });

  it("rejects files over the size limit", () => {
    const file = new File([new Uint8Array(DOCUMENT_UPLOAD_MAX_BYTES + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    expect(validateDocumentUpload(file)).toEqual({
      ok: false,
      reason: "File is too large. Maximum size is 10 MB.",
    });
  });
});
