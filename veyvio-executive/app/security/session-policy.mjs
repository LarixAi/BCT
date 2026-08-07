/** Executive session policy — Phase 3 (SEC-0302, SEC-0306, SEC-0307). */

export const EXECUTIVE_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const EXECUTIVE_ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000;
export const EXECUTIVE_ACCESS_COOKIE_MAX_AGE_S = 15 * 60;
export const EXECUTIVE_REFRESH_COOKIE_MAX_AGE_S = 8 * 60 * 60;

/**
 * Assess the signed Executive binding for MFA assurance and session lifetime.
 * Password-only (`aal1`) sessions are denied before any Executive data is returned.
 */
export function assessExecutiveSessionPolicy(
  binding,
  { now = Date.now() } = {},
) {
  if (!binding || typeof binding !== "object") {
    return {
      allowed: false,
      code: "executive_binding_invalid",
      message: "The Executive session binding is invalid.",
    };
  }

  if (binding.assuranceLevel !== "aal2") {
    return {
      allowed: false,
      code: "executive_aal2_required",
      message:
        "Multi-factor authentication is required before Executive data can be opened.",
    };
  }

  const authenticatedAt = Number(binding.authenticatedAt ?? binding.issuedAt);
  const lastActivityAt = Number(
    binding.lastActivityAt ?? binding.authenticatedAt ?? binding.issuedAt,
  );

  if (!Number.isFinite(authenticatedAt) || !Number.isFinite(lastActivityAt)) {
    return {
      allowed: false,
      code: "executive_session_timestamps_invalid",
      message: "The Executive session timestamps are invalid.",
    };
  }

  if (now - authenticatedAt > EXECUTIVE_ABSOLUTE_LIFETIME_MS) {
    return {
      allowed: false,
      code: "executive_session_expired",
      message: "The Executive session has reached its absolute lifetime. Sign in again.",
    };
  }

  if (now - lastActivityAt > EXECUTIVE_IDLE_TIMEOUT_MS) {
    return {
      allowed: false,
      code: "executive_session_idle",
      message: "The Executive session timed out after inactivity. Sign in again.",
    };
  }

  return {
    allowed: true,
    code: "allowed",
    message: "Executive session policy satisfied.",
    authenticatedAt,
    lastActivityAt,
  };
}

export function nextExecutiveActivityBinding(binding, { now = Date.now() } = {}) {
  return {
    ...binding,
    lastActivityAt: now,
  };
}
