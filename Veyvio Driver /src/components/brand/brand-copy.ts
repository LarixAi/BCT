export const BRAND_PROMISE = "Move smarter. Operate safer.";
export const BRAND_CAMPAIGN = "Know your vehicle before you move.";
export const BRAND_PRODUCT = "Veyvio Driver";

/** Canonical browser / app title: "Screen — Veyvio Driver" */
export function driverPageTitle(screen: string): string {
  const name = screen.trim();
  if (!name || name === BRAND_PRODUCT) return BRAND_PRODUCT;
  if (name.endsWith(`— ${BRAND_PRODUCT}`) || name.endsWith(`- ${BRAND_PRODUCT}`)) return name;
  return `${name} — ${BRAND_PRODUCT}`;
}
