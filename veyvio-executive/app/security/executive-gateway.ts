import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { ChatGPTUser } from "../chatgpt-auth";
import {
  assessCentrallyVerifiedJwt,
  assessExecutiveSessionStatus,
  executiveProjection,
  privateNoStoreHeaders,
  safeRequestId,
} from "./gateway-policy.mjs";
import {
  getExecutiveAccessToken,
  refreshAndVerifyExecutiveSession,
  requireVerifiedExecutiveSession,
  setExecutiveTokenCookies,
  type ExecutiveAction,
  type TokenPair,
  VeyvioAuthError,
  type VerifiedExecutiveSession,
} from "./veyvio-session";

export type ExecutiveGatewayContext = {
  requestId: string;
  outerUser: ChatGPTUser;
  session: VerifiedExecutiveSession;
  projection: ReturnType<typeof executiveProjection>;
  assuranceLevel: "aal1" | "aal2" | null;
  renewedTokens: TokenPair | null;
  action: ExecutiveAction;
};

function expectedIssuer() {
  const supabaseUrl = process.env.VEYVIO_SUPABASE_URL?.trim().replace(/\/$/u, "");
  if (!supabaseUrl) {
    throw new VeyvioAuthError(
      "Executive identity service is not configured.",
      503,
      "identity_service_unavailable",
    );
  }
  return `${supabaseUrl}/auth/v1`;
}

async function currentRequestId() {
  const requestHeaders = await headers();
  return safeRequestId(requestHeaders.get("x-veyvio-request-id"));
}

/**
 * Create a new request-scoped Executive gateway context. No user client,
 * credential, company choice or authorisation decision is shared globally.
 */
export async function createExecutiveGatewayContext(
  outerUser: ChatGPTUser,
  options: {
    action: ExecutiveAction;
    confirmActiveSession?: boolean;
  },
): Promise<ExecutiveGatewayContext> {
  const requestId = await currentRequestId();
  const renewed = options.confirmActiveSession
    ? await refreshAndVerifyExecutiveSession(
        outerUser,
        options.action,
        requestId,
      )
    : null;
  const session =
    renewed?.session ??
    (await requireVerifiedExecutiveSession(
      outerUser,
      options.action,
      requestId,
    ));
  const accessToken =
    renewed?.tokens.accessToken ?? (await getExecutiveAccessToken());

  if (!session || !accessToken) {
    throw new VeyvioAuthError(
      "A verified Veyvio Executive session is required.",
      401,
      "executive_session_required",
    );
  }

  // getVerifiedExecutiveSession has already sent the access token to the
  // central Veyvio API. That API uses Supabase Auth getUser(), which verifies
  // the JWT signature and active user before returning identity or grant data.
  const jwt = assessCentrallyVerifiedJwt(accessToken, {
    expectedIssuer: expectedIssuer(),
    expectedUserId: session.user.id,
  });
  if (!jwt.allowed) {
    throw new VeyvioAuthError(jwt.message, 401, jwt.code);
  }
  const sessionPolicy = assessExecutiveSessionStatus(session.security, {
    requireRecentStepUp: options.confirmActiveSession === true,
  });
  if (!sessionPolicy.allowed) {
    throw new VeyvioAuthError(
      sessionPolicy.message,
      401,
      sessionPolicy.code,
    );
  }

  return {
    requestId,
    outerUser,
    session,
    projection: executiveProjection(session),
    assuranceLevel: "aal2",
    renewedTokens: renewed?.tokens ?? null,
    action: options.action,
  };
}

export function executiveGatewayJson(
  context: ExecutiveGatewayContext,
  body: Record<string, unknown>,
  status = 200,
) {
  const response = NextResponse.json(body, {
    status,
    headers: privateNoStoreHeaders(context.requestId),
  });
  if (context.renewedTokens) {
    setExecutiveTokenCookies(response, context.renewedTokens);
  }
  return response;
}

export function executiveGatewayError(error: unknown, requestId?: string) {
  const authError =
    error instanceof VeyvioAuthError
      ? error
      : new VeyvioAuthError(
          "The Executive gateway could not complete the request.",
          500,
          "executive_gateway_failed",
        );

  return NextResponse.json(
    {
      ok: false,
      code: authError.code,
      message: authError.message,
    },
    {
      status: authError.status,
      headers: privateNoStoreHeaders(requestId),
    },
  );
}
