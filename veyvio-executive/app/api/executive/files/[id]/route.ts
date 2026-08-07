import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../../security/executive-gateway";
import {
  assertSameOrigin,
  createCommandClient,
  getExecutiveAccessToken,
  readSmallJson,
  VeyvioAuthError,
} from "../../../../security/veyvio-session";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
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
    const { id } = await context.params;
    const gateway = await createExecutiveGatewayContext(outerUser, {
      action: "executive.accounts.manage",
      confirmActiveSession: true,
    });
    const accessToken =
      gateway.renewedTokens?.accessToken ?? (await getExecutiveAccessToken());
    if (!accessToken) {
      throw new VeyvioAuthError(
        "The central Executive session has ended.",
        401,
        "central_session_revoked",
      );
    }
    const input = await readSmallJson(request).catch(() => ({}));
    const result = await createCommandClient(
      accessToken,
      gateway.requestId,
    ).request<Record<string, unknown>>(
      `/executive/documents/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { "X-Veyvio-Session-Id": gateway.session.security.id },
        body: JSON.stringify(input),
      },
    );
    return executiveGatewayJson(gateway, { ok: true, ...result });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
