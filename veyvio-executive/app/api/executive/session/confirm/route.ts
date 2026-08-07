import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../../security/executive-gateway";
import {
  assertSameOrigin,
  VeyvioAuthError,
} from "../../../../security/veyvio-session";

export const dynamic = "force-dynamic";

/**
 * Sensitive Executive handlers call the same confirmActiveSession mode inside
 * their request before a write. This route exposes the check for explicit
 * revalidation and operational testing; it performs no business mutation.
 */
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
      action: "executive.session.confirm",
      confirmActiveSession: true,
    });
    return executiveGatewayJson(context, {
      ok: true,
      state: "active",
      assuranceLevel: context.assuranceLevel,
    });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
