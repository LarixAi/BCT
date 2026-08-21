import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { safeAppReturnPath } from "../../../security/auth-policy.mjs";
import {
  assertSameOrigin,
  authErrorResponse,
  authenticatedResponse,
  loginToVeyvio,
  noStoreJson,
  publicMemberships,
  readSmallJson,
  sessionProofFrom,
  setMfaChallengeCookie,
  setPendingTokenCookies,
  tokenPairFrom,
  VeyvioAuthError,
} from "../../../security/veyvio-session";

export const dynamic = "force-dynamic";

/** Visiting this API URL in the browser is not a valid sign-in path. */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    // Browser form navigation must never be treated as the API contract.
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/login", request.url), 303);
    }

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
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const returnTo = safeAppReturnPath(String(input.returnTo ?? "/"));
    if (!email || password.length < 8 || password.length > 256) {
      throw new VeyvioAuthError(
        "Enter a valid Veyvio email address and password.",
        400,
        "invalid_credentials",
      );
    }

    const result = await loginToVeyvio(email, password);
    if (
      result.requiresMfaChallenge === true &&
      typeof result.mfaChallengeId === "string"
    ) {
      const response = noStoreJson({
        ok: true,
        state: "mfa_required",
        memberships: publicMemberships(result),
      });
      await setMfaChallengeCookie(
        response,
        outerUser,
        result.mfaChallengeId,
      );
      return response;
    }

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
