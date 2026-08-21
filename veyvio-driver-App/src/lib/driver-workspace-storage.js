/**
 * Organisation-scoped offline storage keys for Driver app.
 * Operational queues require companyId + company_memberships.id. Never use userId as membership.
 */
export class OfflineContextError extends Error {
  constructor(message = "Company and membership context is required before saving offline work.") {
    super(message)
    this.name = "OfflineContextError"
    this.code = "OFFLINE_CONTEXT_NOT_READY"
  }
}

function isUsableId(value) {
  return Boolean(String(value ?? "").trim())
}

export function driverWorkspaceStorageKey(companyId, membershipId, suffix) {
  const company = String(companyId ?? "").trim()
  const membership = String(membershipId ?? "").trim()
  if (!company || !membership) {
    throw new OfflineContextError()
  }
  return `driver:${company}:${membership}:${suffix}`
}

export function parseDriverWorkspaceStorageKey(key) {
  const match = /^driver:([^:]+):([^:]+):(.+)$/.exec(String(key ?? ""))
  if (!match) return null
  return { companyId: match[1], membershipId: match[2], suffix: match[3] }
}

/** Resolve org + membership for offline queues. Membership is company_memberships.id only. */
export function resolveDriverWorkspaceScope(driver, session) {
  const companyId =
    session?.activeCompanyId ??
    session?.companyId ??
    session?.organisationId ??
    driver?.organisation_id ??
    driver?.organisationId ??
    null
  const membershipId = session?.membershipId ?? driver?.membership_id ?? driver?.membershipId ?? null
  return { companyId, membershipId: isUsableId(membershipId) ? String(membershipId).trim() : null }
}

export function requireDriverWorkspaceScope(driver, session) {
  const scope = resolveDriverWorkspaceScope(driver, session)
  const companyId = String(scope.companyId ?? "").trim()
  const membershipId = String(scope.membershipId ?? "").trim()
  if (!companyId || !membershipId) {
    throw new OfflineContextError()
  }
  return { companyId, membershipId }
}

export function requireWorkspaceIds(companyId, membershipId) {
  const company = String(companyId ?? "").trim()
  const membership = String(membershipId ?? "").trim()
  if (!company || !membership) {
    throw new OfflineContextError()
  }
  return { companyId: company, membershipId: membership }
}
