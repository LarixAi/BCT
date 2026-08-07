import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../../security/executive-gateway";
import {
  assertSameOrigin,
  fetchCommandMutation,
  getExecutiveAccessToken,
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

    const context = await createExecutiveGatewayContext(outerUser, {
      action: "executive.budget.propose",
      confirmActiveSession: true,
    });
    const accessToken =
      context.renewedTokens?.accessToken ??
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
      "/executive/annual-budgets/proposals",
      input,
      context.session.security.id,
      context.requestId,
    );
    return executiveGatewayJson(context, { ok: true, ...result }, 201);
  } catch (error) {
    return executiveGatewayError(error);
  }
}
