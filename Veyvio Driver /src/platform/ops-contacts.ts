/**
 * Central emergency / Operations contact actions — every screen should use these.
 */

export const OPS_PHONE_E164 = import.meta.env.VITE_OPS_PHONE_E164 ?? "";
export const EMERGENCY_NUMBER = "999";

export function callEmergency999(): void {
  if (typeof window === "undefined") return;
  window.location.href = `tel:${EMERGENCY_NUMBER}`;
}

export function callOperations(): { started: boolean; reason?: string } {
  if (typeof window === "undefined") {
    return { started: false, reason: "Phone calls are not available here." };
  }
  if (!OPS_PHONE_E164.trim()) {
    return {
      started: false,
      reason: "Operations phone number is not configured for this operator.",
    };
  }
  window.location.href = `tel:${OPS_PHONE_E164}`;
  return { started: true };
}

export function operationsTelHref(): string | null {
  const n = OPS_PHONE_E164.trim();
  return n ? `tel:${n}` : null;
}

export function emergencyTelHref(): string {
  return `tel:${EMERGENCY_NUMBER}`;
}
