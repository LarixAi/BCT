export function formatFuelPct(pct?: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  return `${pct}%`;
}
