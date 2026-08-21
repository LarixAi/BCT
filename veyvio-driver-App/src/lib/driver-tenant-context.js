/**
 * Wave 3A — authoritative Driver tenant context helpers (pure, fail-closed).
 * Company and membership must come from verified Command/session identity —
 * never from silent “first company” fallbacks or user-id substitution.
 */

/**
 * Decide whether JWT company activation may proceed without an explicit picker.
 * @param {Array<string|null|undefined>} companyIds
 * @returns {{ action: 'none' } | { action: 'activate', companyId: string } | { action: 'require_selection', companyIds: string[] }}
 */
export function resolveCompanyAutoActivationPolicy(companyIds) {
  const unique = [
    ...new Set(
      (Array.isArray(companyIds) ? companyIds : [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (unique.length === 0) return { action: "none" };
  if (unique.length === 1) return { action: "activate", companyId: unique[0] };
  return { action: "require_selection", companyIds: unique };
}

/**
 * Normalize tenant fields onto one authoritative company id + membership id.
 * Membership must be a company_memberships.id — never userId / driverId.
 */
export function normalizeDriverTenantFields({
  companyId = null,
  organisationId = null,
  activeCompanyId = null,
  membershipId = null,
  userId = null,
  driverId = null,
} = {}) {
  const company = String(companyId ?? activeCompanyId ?? organisationId ?? "").trim() || null;
  let membership = String(membershipId ?? "").trim() || null;
  const user = String(userId ?? "").trim() || null;
  const driver = String(driverId ?? "").trim() || null;

  if (membership && (membership === user || membership === driver || membership === company)) {
    membership = null;
  }

  return {
    companyId: company,
    activeCompanyId: company,
    organisationId: company,
    membershipId: membership,
  };
}

/**
 * Fail closed before opening operational Driver surface.
 * @returns {{ ok: true, tenant: ReturnType<typeof normalizeDriverTenantFields> } | { ok: false, code: string, message: string }}
 */
export function assertDriverTenantContextReady(input = {}) {
  const tenant = normalizeDriverTenantFields(input);
  if (!tenant.companyId) {
    return {
      ok: false,
      code: "company_required",
      message: "Select a company before continuing.",
    };
  }
  if (!tenant.membershipId) {
    return {
      ok: false,
      code: "membership_required",
      message: "Company membership is required before using Driver.",
    };
  }
  return { ok: true, tenant };
}
