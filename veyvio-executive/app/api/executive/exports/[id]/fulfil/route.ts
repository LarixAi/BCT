import { getChatGPTUser } from "../../../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../../../security/executive-gateway";
import {
  assertSameOrigin,
  fetchCommandMutation,
  getExecutiveAccessToken,
  readSmallJson,
  VeyvioAuthError,
} from "../../../../../security/veyvio-session";

export const dynamic = "force-dynamic";

export async function POST(
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
      action: "executive.export.propose",
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
    const input = await readSmallJson(request);
    const result = await fetchCommandMutation<Record<string, unknown>>(
      accessToken,
      `/executive/exports/${encodeURIComponent(id)}/fulfil`,
      input,
      gateway.session.security.id,
      gateway.requestId,
    );
    const safe = { ...result };
    if (safe.download && typeof safe.download === "object") {
      const download = { ...(safe.download as Record<string, unknown>) };
      delete download.storageKey;
      delete download.permanentUrl;
      safe.download = download;
    }
    return executiveGatewayJson(gateway, { ok: true, ...safe });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
