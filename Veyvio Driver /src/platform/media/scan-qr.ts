import { Capacitor } from "@capacitor/core";
import { isMediaCancelled } from "@/platform/media/capture-photo";

export type VehicleQrPayload = {
  registration: string;
  fleetNumber?: string;
  raw: string;
};

export function normaliseRegistration(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Display formatting for common UK plates (AB12 CDE). */
export function formatRegistration(value: string): string {
  const compact = normaliseRegistration(value);
  const modern = compact.match(/^([A-Z]{2})(\d{2})([A-Z]{3})$/);
  if (modern) return `${modern[1]}${modern[2]} ${modern[3]}`;
  return compact;
}

/**
 * Parse vehicle QR / barcode text used on depot vehicles.
 * Accepted forms:
 * - plain registration: `LK23 ABC` or `LK23ABC`
 * - Veyvio tag: `VEYVIO:VEH:LK23ABC:042`
 * - JSON: `{"registration":"LK23 ABC","fleetNumber":"042"}`
 * - query URL: `...?registration=LK23+ABC&fleet=042`
 */
export function parseVehicleQrPayload(raw: string): VehicleQrPayload | null {
  const text = raw.trim();
  if (!text) return null;

  if (text.startsWith("{")) {
    try {
      const json = JSON.parse(text) as {
        registration?: string;
        reg?: string;
        fleetNumber?: string;
        fleet?: string;
      };
      const registration = formatRegistration(json.registration ?? json.reg ?? "");
      if (normaliseRegistration(registration).length < 4) return null;
      return {
        registration,
        fleetNumber: (json.fleetNumber ?? json.fleet)?.trim() || undefined,
        raw: text,
      };
    } catch {
      /* fall through */
    }
  }

  const veyvio = text.match(/^VEYVIO:VEH:([^:]+)(?::([^:]+))?$/i);
  if (veyvio) {
    const registration = formatRegistration(veyvio[1] ?? "");
    if (normaliseRegistration(registration).length < 4) return null;
    return {
      registration,
      fleetNumber: veyvio[2]?.trim() || undefined,
      raw: text,
    };
  }

  try {
    const url = new URL(text);
    const registration = formatRegistration(
      url.searchParams.get("registration") ?? url.searchParams.get("reg") ?? "",
    );
    if (normaliseRegistration(registration).length >= 4) {
      return {
        registration,
        fleetNumber:
          url.searchParams.get("fleetNumber") ??
          url.searchParams.get("fleet") ??
          undefined,
        raw: text,
      };
    }
  } catch {
    /* not a URL */
  }

  const registration = formatRegistration(text);
  if (normaliseRegistration(registration).length < 4) return null;
  return { registration, raw: text };
}

/**
 * Open the device QR / barcode scanner.
 * Native: ML Kit. Web: BarcodeDetector + getUserMedia when available.
 */
export async function scanQrCode(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    return scanNativeQr();
  }
  return scanWebQr();
}

async function scanNativeQr(): Promise<string | null> {
  const { BarcodeScanner, BarcodeFormat } = await import("@capacitor-mlkit/barcode-scanning");

  const permission = await BarcodeScanner.checkPermissions();
  if (permission.camera !== "granted") {
    const requested = await BarcodeScanner.requestPermissions();
    if (requested.camera !== "granted") {
      throw new Error("Camera permission is required to scan the vehicle QR code.");
    }
  }

  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.DataMatrix],
    });
    const value = barcodes[0]?.rawValue?.trim();
    return value || null;
  } catch (error) {
    if (isMediaCancelled(error)) return null;
    throw error;
  }
}

async function scanWebQr(): Promise<string | null> {
  // Chromium BarcodeDetector + camera stream — best-effort browser support
  const Detector = (window as unknown as {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }).BarcodeDetector;

  if (!Detector || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "QR scanning needs the phone camera app. On this browser, type the registration or tap Demo mismatch in DEV.",
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  const detector = new Detector({ formats: ["qr_code"] });
  const started = performance.now();

  try {
    while (performance.now() - started < 20_000) {
      if (video.readyState >= 2) {
        const codes = await detector.detect(video);
        const value = codes[0]?.rawValue?.trim();
        if (value) return value;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}
