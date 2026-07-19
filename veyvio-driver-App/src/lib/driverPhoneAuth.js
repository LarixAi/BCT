const UK_DIAL = "+44";

export function normalizeUkMobileInput(raw) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("44")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function toUkE164(nationalDigits) {
  const normalized = normalizeUkMobileInput(nationalDigits);
  if (!normalized) return "";
  return `${UK_DIAL}${normalized}`;
}

export function isValidUkMobile(nationalDigits) {
  const normalized = normalizeUkMobileInput(nationalDigits);
  return /^7\d{9}$/.test(normalized);
}

export function formatUkMobileDisplay(nationalDigits) {
  const n = normalizeUkMobileInput(nationalDigits);
  if (n.length <= 4) return n;
  if (n.length <= 7) return `${n.slice(0, 4)} ${n.slice(4)}`;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7, 11)}`;
}
