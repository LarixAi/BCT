import type { EvidenceCategory, IncidentEvidence } from "@veyvio/incidents";
import { validateDocumentUpload } from "@/domain/more/document-upload";
import { pickDocumentPhoto } from "@/platform/documents/pick-document-file";
import { useSessionStore } from "@/platform/auth/session-store";

export function mapEvidenceCategory(fieldKey: string): EvidenceCategory {
  if (fieldKey.includes("damage")) return "vehicle_damage_photo";
  if (fieldKey.includes("location")) return "location_photo";
  if (fieldKey.includes("road")) return "road_condition_photo";
  if (fieldKey.includes("passenger")) return "passenger_area_photo";
  return "other";
}

export async function buildIncidentEvidenceFromFile(
  file: File,
  category: EvidenceCategory,
): Promise<IncidentEvidence> {
  const validation = validateDocumentUpload(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const session = useSessionStore.getState();
  const now = new Date().toISOString();

  return {
    id: `ev_${crypto.randomUUID().slice(0, 8)}`,
    category,
    mimeType: file.type || "application/octet-stream",
    originalFilename: file.name,
    captureTime: now,
    uploadedByUserId: session.user?.id ?? "unknown",
    confidentialityLevel: "standard",
    localOnly: true,
  };
}

export async function pickIncidentPhoto(): Promise<File | null> {
  const fromCamera = await pickDocumentPhoto();
  return fromCamera;
}
