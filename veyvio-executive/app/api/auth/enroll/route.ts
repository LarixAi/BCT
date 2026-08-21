import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  assertSameOrigin,
  authErrorResponse,
  beginVeyvioMfaEnrollment,
  clearExecutiveCookies,
  confirmVeyvioMfaEnrollment,
  getPendingTokenCookies,
  noStoreJson,
  readSmallJson,
  revokeVeyvioSession,
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

    const pending = await getPendingTokenCookies();
    if (!pending.accessToken || !pending.refreshToken) {
      throw new VeyvioAuthError(
        "The MFA setup session has expired. Sign in again.",
        401,
        "mfa_enrollment_session_expired",
      );
    }

    const input = await readSmallJson(request);
    const code = String(input.code ?? "").trim();
    if (!code) {
      const enrollment = await beginVeyvioMfaEnrollment(pending.accessToken);
      return noStoreJson({
        ok: true,
        state: "mfa_enrollment_setup",
        secret: String(enrollment.secret ?? ""),
        otpauthUri: String(enrollment.otpauthUri ?? ""),
      });
    }
    if (!/^\d{6}$/u.test(code)) {
      throw new VeyvioAuthError(
        "Enter the 6-digit code from your authenticator app.",
        400,
        "invalid_verification_code",
      );
    }

    const confirmed = await confirmVeyvioMfaEnrollment(
      pending.accessToken,
      code,
    );
    const recoveryCodes = Array.isArray(confirmed.recoveryCodes)
      ? confirmed.recoveryCodes
          .filter((value): value is string => typeof value === "string")
          .slice(0, 8)
      : [];
    if (confirmed.mfaEnabled !== true || recoveryCodes.length !== 8) {
      throw new VeyvioAuthError(
        "MFA was enabled, but recovery codes could not be issued safely.",
        502,
        "recovery_codes_missing",
      );
    }

    await revokeVeyvioSession(pending.accessToken);
    const response = noStoreJson({
      ok: true,
      state: "mfa_enrollment_complete",
      recoveryCodes,
    });
    clearExecutiveCookies(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
