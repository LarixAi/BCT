import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../security/executive-gateway";
import {
  assertSameOrigin,
  getExecutiveAccessToken,
  readSmallJson,
  VeyvioAuthError,
} from "../../../security/veyvio-session";

export const dynamic = "force-dynamic";

const DEPARTMENT_APPS = new Set(["COMMAND", "FINANCE", "HR"]);

const DEFAULT_ROLE_BY_APP: Record<string, string> = {
  COMMAND: "transport_manager",
  FINANCE: "finance_director",
  HR: "hr_manager",
};

export async function POST(request: Request) {
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

    // AAL2 + EXECUTIVE accounts.manage is required. Do not demand a fresh
    // MFA step-up here — that blocked invites after ~10 minutes of use and
    // meant no email was sent. File exports / payments keep confirmActiveSession.
    const gateway = await createExecutiveGatewayContext(outerUser, {
      action: "executive.accounts.manage",
    });
    const token = await getExecutiveAccessToken();
    if (!token) {
      throw new VeyvioAuthError(
        "A verified Veyvio Executive session is required.",
        401,
        "executive_session_required",
      );
    }

    const body = await readSmallJson(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    const appType = String(body.appType ?? "").trim().toUpperCase();
    const roleName = String(
      body.roleName ?? DEFAULT_ROLE_BY_APP[appType] ?? "",
    )
      .trim()
      .toLowerCase();

    if (!email.includes("@")) {
      throw new VeyvioAuthError(
        "A valid work email is required.",
        400,
        "invalid_email",
      );
    }
    if (!DEPARTMENT_APPS.has(appType)) {
      throw new VeyvioAuthError(
        "From Executive you can only invite people to Command, Finance or HR. Driver and Yard accounts are created in Command.",
        403,
        "executive_invite_app_forbidden",
      );
    }
    if (!roleName) {
      throw new VeyvioAuthError(
        "A role is required for the invitation.",
        400,
        "invalid_role",
      );
    }

    const apiUrl = process.env.VEYVIO_COMMAND_API_URL?.trim().replace(/\/$/u, "");
    const anonKey =
      process.env.VEYVIO_COMMAND_ANON_KEY?.trim() ||
      process.env.VEYVIO_COMMAND_PUBLISHABLE_KEY?.trim();
    if (!apiUrl || !anonKey) {
      throw new VeyvioAuthError(
        "Executive identity service is not configured.",
        503,
        "identity_service_unavailable",
      );
    }

    const response = await fetch(`${apiUrl}/settings/invitations`, {
      method: "POST",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        "X-Veyvio-Request-Id": gateway.requestId,
      },
      body: JSON.stringify({
        email,
        appType,
        roleName,
        sourceApp: "EXECUTIVE",
        expiresInDays: 7,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new VeyvioAuthError(
        String(
          payload.message ??
            payload.error ??
            "The invitation could not be created.",
        ),
        response.status >= 400 && response.status < 600 ? response.status : 502,
        String(payload.code ?? "invitation_create_failed"),
      );
    }

    return executiveGatewayJson(gateway, {
      ok: true,
      invitation: payload.invitation ?? payload,
      invitationToken:
        payload.invitationToken ?? payload.devInvitationToken ?? null,
      acceptUrl: payload.acceptUrl ?? null,
      emailDelivered: Boolean(payload.emailDelivered),
      emailError: payload.emailError ?? null,
    });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
