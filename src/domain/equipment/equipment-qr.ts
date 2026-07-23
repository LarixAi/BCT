/** Scannable payload encoded in equipment sticker QR codes. */
import { normalizeScanInput } from "@/domain/scan/normalize-scan-input";

export function buildEquipmentQrPayload(assetId: string): string {
  return `veyvio:equipment:${assetId.trim()}`;
}

export function parseEquipmentQrPayload(input: string): string | null {
  const trimmed = normalizeScanInput(input);
  const match = trimmed.match(/^(?:veyvio:)?equipment[:/]([A-Za-z0-9_-]+)$/i);
  return match?.[1] ?? null;
}

/** Human-readable code printed under the QR (also used as asset id when not overridden). */
export function buildEquipmentStickerCode(prefix: string): string {
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EQ-${prefix}-${token}`;
}
