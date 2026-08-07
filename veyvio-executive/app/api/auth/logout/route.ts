import { NextResponse } from "next/server";
import { chatGPTSignOutPath } from "../../../chatgpt-auth";
import { safeAppReturnPath } from "../../../security/auth-policy.mjs";
import {
  assertSameOrigin,
  authErrorResponse,
  clearExecutiveCookies,
  EXECUTIVE_COOKIES,
  revokeVeyvioSession,
} from "../../../security/veyvio-session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const returnTo = safeAppReturnPath(String(form.get("return_to") ?? "/"));
    const store = await cookies();
    const accessToken = store.get(EXECUTIVE_COOKIES.access)?.value;
    await revokeVeyvioSession(accessToken);

    const response = NextResponse.redirect(
      new URL(chatGPTSignOutPath(returnTo), request.url),
      303,
    );
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    clearExecutiveCookies(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
