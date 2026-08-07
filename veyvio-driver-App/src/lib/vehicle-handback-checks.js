/** End-of-duty return checks — driver confirms vehicle condition before custody ends. */
export const VEHICLE_HAND_BACK_CHECKS = [
  { id: "interior", label: "Interior left clean and clear" },
  { id: "bodywork", label: "No new body damage" },
  { id: "equipment", label: "All equipment returned" },
  { id: "lost_property", label: "No lost property remains" },
];

export function emptyHandbackChecks() {
  return Object.fromEntries(VEHICLE_HAND_BACK_CHECKS.map((c) => [c.id, false]));
}

/** Parse "Return checks: interior, bodywork, …" from Command timeline detail. */
export function parseHandbackChecksFromDetail(detail) {
  const text = String(detail ?? "");
  const match = text.match(/Return checks:\s*([^.·]+)/i);
  if (!match) return null;
  const tokens = match[1]
    .split(/[,;]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return null;

  const checks = emptyHandbackChecks();
  for (const item of VEHICLE_HAND_BACK_CHECKS) {
    const key = item.id.replace(/_/g, " ");
    if (tokens.some((token) => token === item.id || token.includes(key) || key.includes(token))) {
      checks[item.id] = true;
    }
  }
  return checks;
}
