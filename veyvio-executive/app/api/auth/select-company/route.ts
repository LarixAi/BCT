import { getChatGPTUser } from "../../../chatgpt-auth";
import { safeAppReturnPath } from "../../../security/auth-policy.mjs";
import {
  assertSameOrigin,
  authErrorResponse,
  authenticatedResponse,
  getPendingTokenCookies,
  noStoreJson,
  readSmallJson,
  sessionProofFrom,
  selectVeyvioCompany,
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

    const input = await readSmallJson(request);
    const companyId = String(input.companyId ?? "").trim();
    const returnTo = safeAppReturnPath(String(input.returnTo ?? "/"));
    if (!companyId) {
      throw new VeyvioAuthError(
        "Choose a Veyvio company.",
        400,
        "company_required",
      );
    }

    const pending = await getPendingTokenCookies();
    if (!pending.accessToken || !pending.refreshToken) {
      throw new VeyvioAuthError(
        "The company-selection session has expired. Sign in again.",
        401,
        "pending_session_expired",
      );
    }

    const result = await selectVeyvioCompany(
      pending.accessToken,
      pending.refreshToken,
      companyId,
    );
    const tokens = tokenPairFrom(result);
    if (!tokens) {
      throw new VeyvioAuthError(
        "The identity service returned an incomplete session.",
        502,
        "incomplete_identity_session",
      );
    }
    const resultUser =
      result.user && typeof result.user === "object"
        ? (result.user as Record<string, unknown>)
        : null;
    if (resultUser?.mfaEnabled !== true) {
      const response = noStoreJson({
        ok: true,
        state: "mfa_enrollment_required",
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
