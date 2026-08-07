import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  executiveGatewayError,
  executiveGatewayJson,
  type ExecutiveGatewayContext,
} from "../../../../security/executive-gateway";
import {
  assessCentrallyVerifiedJwt,
  assessExecutiveSessionStatus,
  executiveProjection,
  safeRequestId,
} from "../../../../security/gateway-policy.mjs";
import {
  fetchExecutivePagePayload,
  type ExecutiveAction,
  VeyvioAuthError,
} from "../../../../security/veyvio-session";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const PAGE_ACTIONS = {
  overview: "executive.dashboard.read",
  company: "executive.company.read",
  organisation: "executive.accounts.read",
  applications: "executive.accounts.read",
  security: "executive.audit.read",
  branches: "executive.branch.read",
  governance: "executive.board.read",
  decisions: "executive.board.read",
  policies: "executive.policy.read",
  records: "executive.company.read",
  budget: "executive.budget.read",
} as const satisfies Record<string, ExecutiveAction>;

type PageKey = keyof typeof PAGE_ACTIONS;

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ page: string }> },
) {
  try {
    const outerUser = await getChatGPTUser();
    if (!outerUser) {
      return executiveGatewayError(
        new VeyvioAuthError(
          "Workspace sign-in is required.",
          401,
          "outer_identity_required",
        ),
      );
    }

    const { page: rawPage } = await context.params;
    const page = rawPage as PageKey;
    if (!(page in PAGE_ACTIONS)) {
      throw new VeyvioAuthError(
        "This Executive page is not available.",
        404,
        "executive_page_not_found",
      );
    }

    const action = PAGE_ACTIONS[page];
    const requestHeaders = await headers();
    const requestId = safeRequestId(requestHeaders.get("x-veyvio-request-id"));

    // One Command round-trip when deployed; internal fallback if needed.
    const loaded = await fetchExecutivePagePayload(
      outerUser,
      page,
      action,
      requestId,
    );
    const jwt = assessCentrallyVerifiedJwt(loaded.accessToken, {
      expectedIssuer: expectedIssuer(),
      expectedUserId: loaded.session.user.id,
    });
    if (!jwt.allowed) {
      throw new VeyvioAuthError(jwt.message, 401, jwt.code);
    }
    const sessionPolicy = assessExecutiveSessionStatus(loaded.session.security);
    if (!sessionPolicy.allowed) {
      throw new VeyvioAuthError(
        sessionPolicy.message,
        401,
        sessionPolicy.code,
      );
    }

    const gateway = {
      requestId,
      outerUser,
      session: loaded.session,
      projection: executiveProjection(loaded.session),
      assuranceLevel: "aal2" as const,
      renewedTokens: null,
      action,
    } satisfies ExecutiveGatewayContext;

    return executiveGatewayJson(gateway, {
      ok: true,
      page,
      ...loaded.payload,
      identity: gateway.projection.identity,
      assuranceLevel: gateway.assuranceLevel,
    });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
