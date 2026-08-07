import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  createExecutiveGatewayContext,
  executiveGatewayError,
  executiveGatewayJson,
} from "../../../security/executive-gateway";
import { VeyvioAuthError } from "../../../security/veyvio-session";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const context = await createExecutiveGatewayContext(outerUser, {
      action: "executive.session.read",
    });
    return executiveGatewayJson(context, {
      ok: true,
      identity: context.projection.identity,
      dataMode: context.projection.dataMode,
      assuranceLevel: context.assuranceLevel,
    });
  } catch (error) {
    return executiveGatewayError(error);
  }
}
