import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  assertSameOrigin,
  authErrorResponse,
  clearExecutiveCookies,
  confirmVeyvioMfaEnrollment,
  getPendingTokenCookies,
  noStoreJson,
  readSmallJson,
  revokeVeyvioSession,
  VeyvioAuthError,
} from "../../../../security/veyvio-session";

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
    const code = String(input.code ?? "").trim();
    if (!/^\d{6}$/u.test(code)) {
      throw new VeyvioAuthError(
        "Enter the 6-digit authenticator code.",
        400,
        "invalid_verification_code",
      );
    }

    const pending = await getPendingTokenCookies();
    if (!pending.accessToken) {
      throw new VeyvioAuthError(
        "The MFA setup session has expired. Sign in again.",
        401,
        "pending_session_expired",
      );
    }

    const result = await confirmVeyvioMfaEnrollment(pending.accessToken, code);
    await revokeVeyvioSession(pending.accessToken);

    const recoveryCodes = Array.isArray(result.recoveryCodes)
      ? result.recoveryCodes.map(String)
      : [];

    const response = noStoreJson({
      ok: true,
      state: "mfa_enrolled",
      message:
        "Authenticator MFA is enabled. Store the recovery codes securely, then sign in again to complete Executive access.",
      recoveryCodes,
    });
    clearExecutiveCookies(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
