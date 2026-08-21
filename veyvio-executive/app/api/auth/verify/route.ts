import { getChatGPTUser } from "../../../chatgpt-auth";
import { safeAppReturnPath } from "../../../security/auth-policy.mjs";
import {
  assertSameOrigin,
  authErrorResponse,
  authenticatedResponse,
  confirmVeyvioMfa,
  getMfaChallenge,
  noStoreJson,
  publicMemberships,
  readSmallJson,
  sessionProofFrom,
  setPendingTokenCookies,
  tokenPairFrom,
  VeyvioAuthError,
} from "../../../security/veyvio-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const outerUser = await getChatGPTUser();
    if (!outerUser) {
      throw new VeyvioAuthError(
        "Workspace sign-in is required.",
        401,
        "outer_identity_required",
      );
    }

    const challengeId = await getMfaChallenge(outerUser);
    if (!challengeId) {
      throw new VeyvioAuthError(
        "The verification challenge has expired. Sign in again.",
        401,
        "mfa_challenge_expired",
      );
    }

    const input = await readSmallJson(request);
    const code = String(input.code ?? "").trim();
    const companyId = String(input.companyId ?? "").trim() || undefined;
    const returnTo = safeAppReturnPath(String(input.returnTo ?? "/"));
    if (!/^(?:\d{6}|[A-Fa-f0-9]{8})$/u.test(code)) {
      throw new VeyvioAuthError(
        "Enter a 6-digit authenticator code or an 8-character recovery code.",
        400,
        "invalid_verification_code",
      );
    }

    const result = await confirmVeyvioMfa({
      challengeId,
      code,
      companyId,
    });
    const tokens = tokenPairFrom(result);
    if (!tokens) {
      throw new VeyvioAuthError(
        "The identity service returned an incomplete session.",
        502,
        "incomplete_identity_session",
      );
    }

    if (result.requiresTenantSelection === true) {
      const response = noStoreJson({
        ok: true,
        state: "company_required",
        memberships: publicMemberships(result),
      });
      setPendingTokenCookies(
        response,
        tokens.accessToken,
        tokens.refreshToken,
      );
      return response;
    }

    const sessionProof = sessionProofFrom(result);
    if (!sessionProof || sessionProof.assuranceLevel !== "aal2") {
      throw new VeyvioAuthError(
        "Multi-factor authentication is required for Executive.",
        403,
        "executive_aal2_required",
      );
    }
    return authenticatedResponse(outerUser, tokens, returnTo, sessionProof);
  } catch (error) {
    return authErrorResponse(error);
  }
}
