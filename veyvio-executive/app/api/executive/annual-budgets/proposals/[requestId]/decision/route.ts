import { getChatGPTUser } from "../../../../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../../../../security/executive-gateway";
import {
  assertSameOrigin,
  fetchCommandMutation,
  getExecutiveAccessToken,
  readSmallJson,
  VeyvioAuthError,
} from "../../../../../../security/veyvio-session";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
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
    const { requestId } = await context.params;
    if (!UUID_PATTERN.test(requestId)) {
      throw new VeyvioAuthError(
        "Annual-budget proposal not found.",
        404,
        "sensitive_action_not_found",
      );
    }

    const gateway = await createExecutiveGatewayContext(outerUser, {
      action: "executive.budget.review",
      confirmActiveSession: true,
    });
    const accessToken =
      gateway.renewedTokens?.accessToken ??
      (await getExecutiveAccessToken());
    if (!accessToken) {
      throw new VeyvioAuthError(
        "The central Executive session has ended.",
        401,
        "central_session_revoked",
      );
    }

    const input = await readSmallJson(request);
    const result = await fetchCommandMutation<Record<string, unknown>>(
      accessToken,
      `/executive/annual-budgets/proposals/${encodeURIComponent(requestId)}/decision`,
      input,
      gateway.session.security.id,
      gateway.requestId,
    );
    return executiveGatewayJson(gateway, { ok: true, ...result });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
