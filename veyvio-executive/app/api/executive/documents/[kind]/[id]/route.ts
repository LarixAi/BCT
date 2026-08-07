import { getChatGPTUser } from "../../../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../../../security/executive-gateway";
import {
  assertSameOrigin,
  type ExecutiveAction,
  VeyvioAuthError,
} from "../../../../../security/veyvio-session";

export const dynamic = "force-dynamic";

const KIND_ACTIONS = {
  policies: "executive.policy.propose",
  records: "executive.accounts.manage",
} as const satisfies Record<string, ExecutiveAction>;

type Kind = keyof typeof KIND_ACTIONS;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    assertSameOrigin(request);
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

    const { kind: rawKind, id } = await context.params;
    const kind = rawKind as Kind;
    if (!(kind in KIND_ACTIONS)) {
      throw new VeyvioAuthError(
        "This Executive document type is not available.",
        404,
        "executive_document_kind_unknown",
      );
    }

    const gateway = await createExecutiveGatewayContext(outerUser, {
      action: KIND_ACTIONS[kind],
    });
    const accessToken = (
      await import("../../../../../security/veyvio-session")
    ).getExecutiveAccessToken;
    const token = await accessToken();
    if (!token) {
      throw new VeyvioAuthError(
        "A verified Veyvio Executive session is required.",
        401,
        "executive_session_required",
      );
    }

    const body = await request.json().catch(() => ({}));
    const apiUrl = process.env.VEYVIO_COMMAND_API_URL?.trim().replace(/\/$/u, "");
    const anonKey = process.env.VEYVIO_COMMAND_ANON_KEY?.trim();
    if (!apiUrl || !anonKey) {
      throw new VeyvioAuthError(
        "Executive identity service is not configured.",
        503,
        "identity_service_unavailable",
      );
    }

    const response = await fetch(
      `${apiUrl}/api/executive/${kind}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          "X-Veyvio-Request-Id": gateway.requestId,
        },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new VeyvioAuthError(
        String(payload.message ?? "Document could not be saved."),
        response.status,
        String(payload.code ?? "executive_document_save_failed"),
      );
    }

    return executiveGatewayJson(gateway, {
      ok: true,
      kind,
      id,
      document: payload,
    });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
