import { Capacitor } from "@capacitor/core";
import { validateDocumentUpload } from "@/domain/more/document-upload";

export function isDocumentPickerCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|dismiss|abort|user cancelled/i.test(message);
}

export async function pickDocumentPhoto(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    saveToGallery: false,
  });

  if (!photo.webPath) return null;

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : "jpg";
  const file = new File([blob], `document-${Date.now()}.${extension}`, {
    type: blob.type || "image/jpeg",
  });

  const validation = validateDocumentUpload(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  return file;
}
