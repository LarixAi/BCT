import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../security/executive-gateway";
import {
  assertSameOrigin,
  createCommandClient,
  fetchCommandMutation,
  getExecutiveAccessToken,
  readSmallJson,
  VeyvioAuthError,
} from "../../../security/veyvio-session";

export const dynamic = "force-dynamic";

async function requireGateway(request: Request, action: "executive.board.read" | "executive.accounts.manage") {
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
    action,
    confirmActiveSession: true,
  });
  const accessToken =
    context.renewedTokens?.accessToken ?? (await getExecutiveAccessToken());
  if (!accessToken) {
    throw new VeyvioAuthError(
      "The central Executive session has ended.",
      401,
      "central_session_revoked",
    );
  }
  return { context, accessToken };
}

export async function GET(request: Request) {
  try {
    const { context, accessToken } = await requireGateway(
      request,
      "executive.board.read",
    );
    const result = await createCommandClient(
      accessToken,
      context.requestId,
    ).request<Record<string, unknown>>("/executive/documents", {
      method: "GET",
      headers: { "X-Veyvio-Session-Id": context.session.security.id },
    });
    // Never forward storage keys if a future API regression adds them.
    const documents = Array.isArray(result.documents)
      ? result.documents.map((row) => {
          const doc = { ...(row as Record<string, unknown>) };
          delete doc.storageKey;
          delete doc.signedUrl;
          delete doc.permanentUrl;
          return doc;
        })
      : [];
    return executiveGatewayJson(context, { ok: true, documents });
  } catch (error) {
    return executiveGatewayError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { context, accessToken } = await requireGateway(
      request,
      "executive.accounts.manage",
    );

    const contentType = request.headers.get("content-type") ?? "";
    let body: Record<string, unknown>;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        throw new VeyvioAuthError(
          "A file upload is required.",
          400,
          "file_required",
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      body = {
        contentBase64: btoa(binary),
        filename: String(form.get("filename") ?? file.name),
        mimeType: file.type || null,
        entityType: String(form.get("entityType") ?? "executive_other"),
        entityId: form.get("entityId") ? String(form.get("entityId")) : null,
        classification: String(
          form.get("classification") ?? "executive_restricted",
        ),
        purpose: form.get("purpose") ? String(form.get("purpose")) : null,
        watermarkRequired: String(form.get("watermarkRequired") ?? "") === "true",
        retentionCategory: form.get("retentionCategory")
          ? String(form.get("retentionCategory"))
          : null,
      };
    } else {
      body = await readSmallJson(request);
    }

    const result = await fetchCommandMutation<Record<string, unknown>>(
      accessToken,
      "/executive/documents",
      body,
      context.session.security.id,
      context.requestId,
    );
    return executiveGatewayJson(context, { ok: true, ...result }, 201);
  } catch (error) {
    return executiveGatewayError(error);
  }
}
