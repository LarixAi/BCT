import { Capacitor } from "@capacitor/core";

export function isMediaCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|dismiss|abort|user cancelled|No (image|photo)|User cancelled/i.test(message);
}

async function fileFromWebPath(webPath: string, basename: string): Promise<File> {
  const response = await fetch(webPath);
  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : "jpg";
  return new File([blob], `${basename}-${Date.now()}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
}

/**
 * Capture a photo with the device camera (native Capacitor Camera plugin).
 * Returns null on web — use the file input capture fallback in UI.
 */
export async function captureDevicePhoto(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const photo = await Camera.getPhoto({
    quality: 88,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    saveToGallery: false,
    correctOrientation: true,
  });

  if (!photo.webPath) return null;
  return fileFromWebPath(photo.webPath, "capture");
}

/**
 * Pick an existing image from the photo library / gallery.
 * Returns null on web — use the file input upload fallback in UI.
 */
export async function pickDeviceImage(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const photo = await Camera.getPhoto({
    quality: 88,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
    saveToGallery: false,
    correctOrientation: true,
  });

  if (!photo.webPath) return null;
  return fileFromWebPath(photo.webPath, "upload");
}

/** Accept for evidence image file inputs (camera + gallery). */
export const EVIDENCE_IMAGE_ACCEPT = "image/*";
