import { Capacitor } from "@capacitor/core";
import { validateDocumentUpload } from "@/domain/more/document-upload";
import {
  captureDevicePhoto,
  isMediaCancelled,
} from "@/platform/media/capture-photo";

export { isMediaCancelled as isDocumentPickerCancelled };

export async function pickDocumentPhoto(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const file = await captureDevicePhoto();
  if (!file) return null;

  const validation = validateDocumentUpload(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  return file;
}
