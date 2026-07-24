/**
 * Organisation-scoped offline storage keys for Driver app.
 * Every persisted queue/cache must include company + membership to prevent cross-tenant bleed.
 */
export function driverWorkspaceStorageKey(companyId, membershipId, suffix) {
  const company = String(companyId ?? "").trim() || "_no_company";
  const membership = String(membershipId ?? "").trim() || "_no_membership";
  return `driver:${company}:${membership}:${suffix}`;
}

export function parseDriverWorkspaceStorageKey(key) {
  const match = /^driver:([^:]+):([^:]+):(.+)$/.exec(String(key ?? ""));
  if (!match) return null;
  return { companyId: match[1], membershipId: match[2], suffix: match[3] };
}

/** Resolve org + membership for offline queues from driver/session payloads. */
export function resolveDriverWorkspaceScope(driver, session) {
  const companyId =
    session?.activeCompanyId ??
    session?.companyId ??
    driver?.organisation_id ??
    driver?.organisationId ??
    null;
  const membershipId =
    session?.membershipId ??
    session?.userId ??
    driver?.user_id ??
    driver?.id ??
    null;
  return { companyId, membershipId };
}
