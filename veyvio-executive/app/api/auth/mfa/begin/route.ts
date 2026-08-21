import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  assertSameOrigin,
  authErrorResponse,
  beginVeyvioMfaEnrollment,
  getPendingTokenCookies,
  noStoreJson,
  readSmallJson,
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

    // Body is unused; read for size limit consistency.
    await readSmallJson(request).catch(() => ({}));

    const pending = await getPendingTokenCookies();
    if (!pending.accessToken) {
      throw new VeyvioAuthError(
        "The MFA setup session has expired. Sign in again.",
        401,
        "pending_session_expired",
      );
    }

    const result = await beginVeyvioMfaEnrollment(pending.accessToken);
    return noStoreJson({
      ok: true,
      state: "mfa_enrollment_started",
      otpauthUri: result.otpauthUri ?? null,
      // Secret is shown once so the user can enter it manually if QR is unavailable.
      secret: result.secret ?? null,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
