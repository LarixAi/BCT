const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
]);

export const DOCUMENT_UPLOAD_ACCEPT = "image/*,application/pdf,.pdf";
export const DOCUMENT_CAMERA_ACCEPT = "image/*";
export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export type DocumentUploadValidation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateDocumentUpload(file: File): DocumentUploadValidation {
  if (!file.size) {
    return { ok: false, reason: "Choose a photo or PDF to upload." };
  }

  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return { ok: false, reason: "File is too large. Maximum size is 10 MB." };
  }

  const type = file.type || guessTypeFromName(file.name);
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, reason: "Use a JPG, PNG, HEIC, or PDF file." };
  }

  return { ok: true };
}

function guessTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function isImageUpload(file: File): boolean {
  const type = file.type || guessTypeFromName(file.name);
  return type.startsWith("image/");
}

export async function simulateDocumentUpload(file: File): Promise<void> {
  const delay = Math.min(1800, 600 + Math.round(file.size / 20_000));
  await new Promise((resolve) => window.setTimeout(resolve, delay));
}
