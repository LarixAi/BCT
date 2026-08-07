import { buildSecurityHeaders } from "./edge-protection.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_JWT_ALGORITHMS = new Set(["ES256", "HS256", "RS256"]);
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function decodeBase64UrlJson(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)),
    ),
  );
}

function deny(code, message) {
  return { allowed: false, code, message };
}

/**
 * Validate the security-relevant claims only after the central identity service
 * has authenticated the token. The central service is the signature authority;
 * this policy independently binds its verified result to this BFF request.
 */
export function assessCentrallyVerifiedJwt(
  token,
  {
    expectedIssuer,
    expectedUserId,
    nowSeconds = Math.floor(Date.now() / 1000),
  },
) {
  if (typeof token !== "string") {
    return deny("jwt_missing", "A central Veyvio session is required.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return deny("jwt_malformed", "The central Veyvio session is malformed.");
  }

  let header;
  let claims;
  try {
    header = decodeBase64UrlJson(parts[0]);
    claims = decodeBase64UrlJson(parts[1]);
  } catch {
    return deny("jwt_malformed", "The central Veyvio session is malformed.");
  }

  if (
    !header ||
    typeof header !== "object" ||
    !ALLOWED_JWT_ALGORITHMS.has(String(header.alg ?? ""))
  ) {
    return deny("jwt_algorithm_rejected", "The session signing algorithm is not allowed.");
  }
  if (header.typ != null && String(header.typ).toUpperCase() !== "JWT") {
    return deny("jwt_type_rejected", "The session token type is not allowed.");
  }
  if (!claims || typeof claims !== "object") {
    return deny("jwt_claims_missing", "The session claims are unavailable.");
  }
  if (claims.iss !== expectedIssuer) {
    return deny("jwt_issuer_rejected", "The session issuer is not trusted.");
  }

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes("authenticated")) {
    return deny("jwt_audience_rejected", "The session audience is not allowed.");
  }
  if (claims.role != null && claims.role !== "authenticated") {
    return deny("jwt_role_rejected", "The session role is not allowed.");
  }
  if (
    typeof claims.exp !== "number" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= nowSeconds
  ) {
    return deny("jwt_expired", "The central Veyvio session has expired.");
  }
  if (
    typeof claims.iat !== "number" ||
    !Number.isFinite(claims.iat) ||
    claims.iat > nowSeconds + 60
  ) {
    return deny("jwt_issued_at_rejected", "The session issue time is invalid.");
  }
  if (
    !UUID_PATTERN.test(String(claims.sub ?? "")) ||
    claims.sub !== expectedUserId
  ) {
    return deny("jwt_subject_mismatch", "The session user does not match Veyvio.");
  }
  if (!UUID_PATTERN.test(String(claims.session_id ?? ""))) {
    return deny("jwt_session_required", "A revocable Veyvio session is required.");
  }

  return {
    allowed: true,
    code: "allowed",
    message: "The centrally verified session is bound to this request.",
    claims: {
      subject: claims.sub,
      sessionId: claims.session_id,
      expiresAt: claims.exp,
      assuranceLevel:
        claims.aal === "aal1" || claims.aal === "aal2" ? claims.aal : null,
    },
  };
}

export function safeRequestId(value, fallback = crypto.randomUUID()) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value
    : fallback;
}

export function assessExecutiveSessionStatus(
  status,
  {
    nowMs = Date.now(),
    requireRecentStepUp = false,
  } = {},
) {
  if (
    !status ||
    status.assuranceLevel !== "aal2" ||
    !UUID_PATTERN.test(String(status.id ?? "")) ||
    ![
      "password_mfa",
      "passkey",
      "phishing_resistant_mfa",
    ].includes(String(status.authStrength ?? ""))
  ) {
    return deny(
      "executive_aal2_required",
      "Multi-factor authentication is required for Executive.",
    );
  }

  const createdAt = Date.parse(String(status.createdAt ?? ""));
  const lastUsedAt = Date.parse(String(status.lastUsedAt ?? ""));
  const expiresAt = Date.parse(String(status.expiresAt ?? ""));
  const idleMinutes = Number(status.idleMinutes);
  const absoluteHours = Number(status.absoluteHours);
  const concurrentSessionLimit = Number(status.concurrentSessionLimit);
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(lastUsedAt) ||
    !Number.isFinite(expiresAt) ||
    createdAt > nowMs + 60_000 ||
    lastUsedAt > nowMs + 60_000 ||
    expiresAt <= nowMs ||
    nowMs - createdAt > 8 * 60 * 60_000 ||
    nowMs - lastUsedAt > 15 * 60_000
  ) {
    return deny(
      "executive_session_window_rejected",
      "The Executive session has expired or become idle.",
    );
  }
  if (
    !Number.isFinite(idleMinutes) ||
    idleMinutes <= 0 ||
    idleMinutes > 15 ||
    !Number.isFinite(absoluteHours) ||
    absoluteHours <= 0 ||
    absoluteHours > 8 ||
    !Number.isFinite(concurrentSessionLimit) ||
    concurrentSessionLimit <= 0 ||
    concurrentSessionLimit > 2
  ) {
    return deny(
      "executive_session_policy_rejected",
      "The Executive session does not meet the required security policy.",
    );
  }
  if (
    requireRecentStepUp &&
    (status.stepUpFresh !== true ||
      nowMs - createdAt > 10 * 60_000 ||
      Number(status.stepUpMinutes) > 10)
  ) {
    return deny(
      "executive_step_up_required",
      "Sign in with multi-factor authentication again to continue.",
    );
  }

  return {
    allowed: true,
    code: "allowed",
    message: "The Executive AAL2 session meets the required time limits.",
  };
}

export function executiveProjection(session) {
  const displayName = [session?.user?.firstName, session?.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    identity: {
      displayName: displayName || "Executive user",
      role: String(session?.user?.roles?.[0] ?? "Executive user"),
      companyName: String(session?.user?.tenantName ?? "Veyvio company"),
    },
    dataMode: "live",
  };
}

export function privateNoStoreHeaders(requestId) {
  return {
    ...buildSecurityHeaders({
      requestId: safeRequestId(requestId),
      isHttps: true,
      includePrivateCache: true,
    }),
    Vary: "Cookie, oai-authenticated-user-email, Origin",
  };
}
