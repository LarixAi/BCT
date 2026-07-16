export const BRAND_PROMISE = "Move smarter. Operate safer.";
export const BRAND_CAMPAIGN = "Every vehicle. Ready and accounted for.";
export const BRAND_PRODUCT = "Veyvio Yard";
export const BRAND_FOCUSED_PROMISE = "Know the yard. Control the day.";

/** Canonical browser / app title: "Screen — Veyvio Yard" */
export function yardPageTitle(screen: string): string {
  const name = screen.trim();
  if (!name || name === BRAND_PRODUCT) return BRAND_PRODUCT;
  if (name.endsWith(`— ${BRAND_PRODUCT}`) || name.endsWith(`- ${BRAND_PRODUCT}`)) return name;
  return `${name} — ${BRAND_PRODUCT}`;
}
