import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ChatGPTUser } from "../chatgpt-auth";
import {
  assessExecutiveAccess,
  signPayload,
  verifySignedPayload,
} from "./auth-policy.mjs";
import {
  assessSameOriginMutation,
  buildSecurityHeaders,
} from "./edge-protection.mjs";

export const EXECUTIVE_COOKIES_HOST = {
  access: "__Host-veyvio-executive-access",
  refresh: "__Host-veyvio-executive-refresh",
  binding: "__Host-veyvio-executive-binding",
  pendingAccess: "__Host-veyvio-executive-pending-access",
  pendingRefresh: "__Host-veyvio-executive-pending-refresh",
  challenge: "__Host-veyvio-executive-challenge",
} as const;

/** HTTP localhost cannot set `__Host-` / Secure cookies; local demo only. */
const EXECUTIVE_COOKIES_LOCAL = {
  access: "veyvio-executive-access",
  refresh: "veyvio-executive-refresh",
  binding: "veyvio-executive-binding",
  pendingAccess: "veyvio-executive-pending-access",
  pendingRefresh: "veyvio-executive-pending-refresh",
  challenge: "veyvio-executive-challenge",
} as const;

function localHttpCookieModeEnabled(): boolean {
  const flag = process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function executiveCookies() {
  return localHttpCookieModeEnabled()
    ? EXECUTIVE_COOKIES_LOCAL
    : EXECUTIVE_COOKIES_HOST;
}

/** @deprecated Prefer executiveCookies(); kept for tests that assert Host names. */
export const EXECUTIVE_COOKIES = EXECUTIVE_COOKIES_HOST;

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type ApplicationAccess = {
  companyId?: string;
  membershipId?: string;
  roles?: string[];
  applications?: string[];
};

export type ExecutiveAction =
  | "executive.session.read"
  | "executive.session.confirm"
  | "executive.dashboard.read"
  | "executive.company.read"
  | "executive.branch.read"
  | "executive.budget.read"
  | "executive.budget.propose"
  | "executive.budget.review"
  | "executive.budget.approve"
  | "executive.policy.read"
  | "executive.policy.propose"
  | "executive.policy.approve"
  | "executive.board.read"
  | "executive.audit.read"
  | "executive.accounts.read"
  | "executive.accounts.manage"
  | "executive.safety_stop.read"
  | "executive.safety_stop.override"
  | "executive.board_reserved.approve";

type ExecutiveAuthorisation = {
  allowed: true;
  companyId: string;
  membershipId: string;
  roles: string[];
  canonicalRoles: string[];
  capabilities: ExecutiveAction[];
  action: ExecutiveAction;
};

export type VeyvioSessionStatus = {
  id: string;
  authStrength: string;
  assuranceLevel: "aal1" | "aal2";
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  idleMinutes: number;
  absoluteHours: number;
  concurrentSessionLimit: number;
  stepUpFresh: boolean;
  stepUpMinutes: number;
};

export type VeyvioExecutiveUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  activeCompanyId: string;
  tenantName: string | null;
  roles: string[];
  mfaEnabled?: boolean;
};

export type VerifiedExecutiveSession = {
  user: VeyvioExecutiveUser;
  access: ApplicationAccess;
  authorisation: ExecutiveAuthorisation;
  security: VeyvioSessionStatus;
};

export class VeyvioAuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
    readonly code = "authentication_failed",
  ) {
    super(message);
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new VeyvioAuthError(
      "Executive identity service is not configured.",
      503,
      "identity_service_unavailable",
    );
  }
  return value;
}

export function isCommandIdentityConfigured(): boolean {
  return Boolean(
    process.env.VEYVIO_COMMAND_API_URL?.trim() &&
      process.env.VEYVIO_SUPABASE_URL?.trim() &&
      (process.env.VEYVIO_COMMAND_PUBLISHABLE_KEY?.trim() ||
        process.env.VEYVIO_COMMAND_ANON_KEY?.trim()) &&
      process.env.VEYVIO_EXECUTIVE_SESSION_SECRET?.trim(),
  );
}

function commandPublicKey() {
  return (
    process.env.VEYVIO_COMMAND_PUBLISHABLE_KEY?.trim() ||
    process.env.VEYVIO_COMMAND_ANON_KEY?.trim() ||
    ""
  );
}

function config() {
  const anonKey = commandPublicKey();
  if (!anonKey) {
    throw new VeyvioAuthError(
      "Executive identity service is not configured.",
      503,
      "identity_service_unavailable",
    );
  }
  return {
    apiUrl: requiredEnvironment("VEYVIO_COMMAND_API_URL").replace(/\/$/u, ""),
    supabaseUrl: requiredEnvironment("VEYVIO_SUPABASE_URL").replace(/\/$/u, ""),
    anonKey,
    sessionSecret: requiredEnvironment("VEYVIO_EXECUTIVE_SESSION_SECRET"),
  };
}

function cookieOptions(maxAge: number) {
  const localHttp = localHttpCookieModeEnabled();
  return {
    httpOnly: true,
    // `__Host-` cookies require Secure; local HTTP demo must not use Secure.
    secure: !localHttp,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

export function noStoreHeaders() {
  return buildSecurityHeaders({
    isHttps: true,
    includePrivateCache: true,
  });
}

export function noStoreJson(
  body: Record<string, unknown>,
  init?: { status?: number },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: noStoreHeaders(),
  });
}

export function assertSameOrigin(request: Request) {
  const decision = assessSameOriginMutation(request);
  if (!decision.allowed) {
    throw new VeyvioAuthError(decision.message, 403, decision.code);
  }
}

export async function readSmallJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_384) {
    throw new VeyvioAuthError("Request is too large.", 413, "request_too_large");
  }
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new VeyvioAuthError("Request body is invalid.", 400, "invalid_request");
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof VeyvioAuthError) {
    return noStoreJson(
      { ok: false, code: error.code, message: error.message },
      { status: error.status },
    );
  }
  return noStoreJson(
    {
      ok: false,
      code: "authentication_failed",
      message: "The secure sign-in could not be completed.",
    },
    { status: 500 },
  );
}

export function createCommandClient(accessToken?: string, requestId?: string) {
  const runtime = config();
  return {
    async request<T>(path: string, init: RequestInit): Promise<T> {
      const response = await fetch(`${runtime.apiUrl}/api${path}`, {
        ...init,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: {
          "Content-Type": "application/json",
          apikey: runtime.anonKey,
          Authorization: `Bearer ${accessToken ?? runtime.anonKey}`,
          ...(requestId ? { "X-Veyvio-Request-Id": requestId } : {}),
          ...(init.headers ?? {}),
        },
      });
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        const publicCredentialFailure =
          path === "/auth/login" &&
          (response.status === 400 || response.status === 401);
        throw new VeyvioAuthError(
          publicCredentialFailure
            ? "The email address or password could not be verified."
            : String(
                payload.message ?? "Veyvio account access could not be verified.",
              ),
          response.status,
          String(payload.code ?? "veyvio_identity_rejected"),
        );
      }
      return payload as T;
    },
  };
}

export async function fetchCommandJson<T>(
  accessToken: string,
  path: string,
  requestId?: string,
): Promise<T> {
  return createCommandClient(accessToken, requestId).request<T>(path, {
    method: "GET",
  });
}

export async function fetchCommandMutation<T>(
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
  veyvioSessionId: string,
  requestId?: string,
): Promise<T> {
  return createCommandClient(accessToken, requestId).request<T>(path, {
    method: "POST",
    headers: { "X-Veyvio-Session-Id": veyvioSessionId },
    body: JSON.stringify(body),
  });
}

export function loginToVeyvio(email: string, password: string) {
  return createCommandClient().request<Record<string, unknown>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, appType: "EXECUTIVE" }),
  });
}

export function confirmVeyvioMfa(input: {
  challengeId: string;
  code: string;
  companyId?: string;
}) {
  return createCommandClient().request<Record<string, unknown>>(
    "/auth/login/confirm",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function beginVeyvioMfaEnrollment(accessToken: string) {
  return createCommandClient(accessToken).request<Record<string, unknown>>(
    "/auth/mfa/enable",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function confirmVeyvioMfaEnrollment(
  accessToken: string,
  code: string,
) {
  return createCommandClient(accessToken).request<Record<string, unknown>>(
    "/auth/mfa/enable",
    {
      method: "POST",
      body: JSON.stringify({ code }),
    },
  );
}

export function selectVeyvioCompany(
  accessToken: string,
  refreshToken: string,
  companyId: string,
) {
  return createCommandClient(accessToken).request<Record<string, unknown>>(
    "/auth/select-company",
    {
      method: "POST",
      body: JSON.stringify({ companyId, refreshToken }),
    },
  );
}

function assertVerifiedExecutiveBundle(input: {
  action: ExecutiveAction;
  user: VeyvioExecutiveUser;
  access: ApplicationAccess;
  authorisation: ExecutiveAuthorisation;
  security: VeyvioSessionStatus;
}): VerifiedExecutiveSession {
  const { action, user, access, authorisation, security } = input;
  const decision = assessExecutiveAccess({
    userId: user.id,
    companyId: access.companyId ?? user.activeCompanyId,
    membershipId: access.membershipId,
    applications: access.applications,
  });
  if (!decision.allowed) {
    throw new VeyvioAuthError(decision.message, 403, decision.code);
  }
  if (
    user.activeCompanyId !== access.companyId ||
    !access.roles?.length ||
    authorisation.allowed !== true ||
    authorisation.action !== action ||
    authorisation.companyId !== access.companyId ||
    authorisation.membershipId !== access.membershipId
  ) {
    throw new VeyvioAuthError(
      "The Veyvio company identity is incomplete.",
      403,
      "company_identity_mismatch",
    );
  }

  if (security.assuranceLevel !== "aal2") {
    throw new VeyvioAuthError(
      "Multi-factor authentication is required for Executive.",
      403,
      "executive_aal2_required",
    );
  }

  return { user, access, authorisation, security };
}

async function validateExecutiveTokens(
  tokens: TokenPair,
  requestId?: string,
  veyvioSessionId?: string,
  action: ExecutiveAction = "executive.session.read",
): Promise<VerifiedExecutiveSession> {
  if (!veyvioSessionId) {
    throw new VeyvioAuthError(
      "A central Executive session proof is required.",
      401,
      "executive_session_proof_required",
    );
  }
  const client = createCommandClient(tokens.accessToken, requestId);
  const sessionHeaders = { "X-Veyvio-Session-Id": veyvioSessionId };

  // Prefer one Command round-trip. Fall back to the legacy four-call path if
  // the combined endpoint is not deployed yet.
  try {
    const bundle = await client.request<{
      user: VeyvioExecutiveUser;
      access: ApplicationAccess;
      authorisation: ExecutiveAuthorisation;
      security: VeyvioSessionStatus;
    }>(`/executive/session/context?action=${encodeURIComponent(action)}`, {
      method: "GET",
      headers: sessionHeaders,
    });
    return assertVerifiedExecutiveBundle({
      action,
      user: bundle.user,
      access: bundle.access,
      authorisation: bundle.authorisation,
      security: bundle.security,
    });
  } catch (error) {
    if (!(error instanceof VeyvioAuthError) || error.status !== 404) {
      throw error;
    }
  }

  const [applicationAccess, user, security, authorisation] = await Promise.all([
    client.request<ApplicationAccess>("/auth/application-access", {
      method: "GET",
    }),
    client.request<VeyvioExecutiveUser>("/auth/me", { method: "GET" }),
    client.request<VeyvioSessionStatus>("/auth/executive-session", {
      method: "GET",
      headers: sessionHeaders,
    }),
    client.request<ExecutiveAuthorisation>(
      `/executive/authorisation?action=${encodeURIComponent(action)}`,
      { method: "GET" },
    ),
  ]);

  return assertVerifiedExecutiveBundle({
    action,
    user,
    access: applicationAccess,
    authorisation,
    security,
  });
}

export async function fetchExecutivePagePayload(
  outerUser: ChatGPTUser,
  page: string,
  action: ExecutiveAction,
  requestId?: string,
): Promise<{
  session: VerifiedExecutiveSession;
  accessToken: string;
  payload: Record<string, unknown>;
}> {
  const store = await cookies();
  const accessToken = store.get(executiveCookies().access)?.value;
  const refreshToken = store.get(executiveCookies().refresh)?.value;
  const binding = store.get(executiveCookies().binding)?.value;
  if (!accessToken || !refreshToken || !binding) {
    throw new VeyvioAuthError(
      "A verified Veyvio Executive session is required.",
      401,
      "executive_session_required",
    );
  }

  const bindingPayload = await verifySignedPayload(binding, config().sessionSecret);
  if (
    bindingPayload?.kind !== "executive_session" ||
    bindingPayload.outerEmail !== outerUser.email.toLowerCase() ||
    typeof bindingPayload.veyvioSessionId !== "string"
  ) {
    throw new VeyvioAuthError(
      "The Executive session binding is invalid.",
      401,
      "executive_binding_invalid",
    );
  }

  const client = createCommandClient(accessToken, requestId);
  const response = await client.request<Record<string, unknown>>(
    `/executive/pages/${encodeURIComponent(page)}?action=${encodeURIComponent(action)}`,
    {
      method: "GET",
      headers: { "X-Veyvio-Session-Id": bindingPayload.veyvioSessionId },
    },
  );

  const gateway = response.gateway;
  if (!gateway || typeof gateway !== "object") {
    // Older Command deploy: fall back to separate validation + page fetch.
    const session = await validateExecutiveTokens(
      { accessToken, refreshToken },
      requestId,
      bindingPayload.veyvioSessionId,
      action,
    );
    return { session, accessToken, payload: response };
  }

  const bundle = gateway as {
    user: VeyvioExecutiveUser;
    access: ApplicationAccess;
    authorisation: ExecutiveAuthorisation;
    security: VeyvioSessionStatus;
  };
  const session = assertVerifiedExecutiveBundle({
    action,
    user: bundle.user,
    access: bundle.access,
    authorisation: bundle.authorisation,
    security: bundle.security,
  });

  if (
    bindingPayload.userId !== session.user.id ||
    bindingPayload.companyId !== session.access.companyId ||
    bindingPayload.membershipId !== session.access.membershipId ||
    bindingPayload.veyvioSessionId !== session.security.id ||
    bindingPayload.authStrength !== session.security.authStrength
  ) {
    throw new VeyvioAuthError(
      "The Executive session no longer matches the active Veyvio company.",
      401,
      "executive_binding_mismatch",
    );
  }

  const { gateway: _gateway, ...payload } = response;
  return { session, accessToken, payload };
}

export async function revokeVeyvioSession(accessToken: string | undefined) {
  if (!accessToken) return;
  try {
    const runtime = config();
    await fetch(`${runtime.supabaseUrl}/auth/v1/logout?scope=local`, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        apikey: runtime.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Local cookies are still cleared. The short-lived access token expires
    // independently if the upstream revocation service is unavailable.
  }
}

export async function refreshVeyvioTokens(
  refreshToken: string,
): Promise<TokenPair> {
  const runtime = config();
  const response = await fetch(
    `${runtime.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        apikey: runtime.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const accessToken = payload.access_token;
  const nextRefreshToken = payload.refresh_token;
  if (
    !response.ok ||
    typeof accessToken !== "string" ||
    typeof nextRefreshToken !== "string"
  ) {
    throw new VeyvioAuthError(
      "The central Veyvio session has ended. Sign in again.",
      401,
      "central_session_revoked",
    );
  }
  return { accessToken, refreshToken: nextRefreshToken };
}

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    ...cookieOptions(0),
    expires: new Date(0),
  });
}

export function clearExecutiveCookies(response: NextResponse) {
  const names = new Set<string>([
    ...Object.values(EXECUTIVE_COOKIES_HOST),
    ...Object.values(EXECUTIVE_COOKIES_LOCAL),
  ]);
  for (const name of names) {
    clearCookie(response, name);
  }
}

export function setExecutiveTokenCookies(
  response: NextResponse,
  tokens: TokenPair,
) {
  response.cookies.set(
    executiveCookies().access,
    tokens.accessToken,
    cookieOptions(60 * 60),
  );
  response.cookies.set(
    executiveCookies().refresh,
    tokens.refreshToken,
    cookieOptions(8 * 60 * 60),
  );
}

function clearPendingCookies(response: NextResponse) {
  clearCookie(response, executiveCookies().pendingAccess);
  clearCookie(response, executiveCookies().pendingRefresh);
  clearCookie(response, executiveCookies().challenge);
}

export function setPendingTokenCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  response.cookies.set(
    executiveCookies().pendingAccess,
    accessToken,
    cookieOptions(10 * 60),
  );
  response.cookies.set(
    executiveCookies().pendingRefresh,
    refreshToken,
    cookieOptions(10 * 60),
  );
}

export async function getPendingTokenCookies() {
  const store = await cookies();
  return {
    accessToken: store.get(executiveCookies().pendingAccess)?.value ?? "",
    refreshToken: store.get(executiveCookies().pendingRefresh)?.value ?? "",
  };
}

export async function setMfaChallengeCookie(
  response: NextResponse,
  outerUser: ChatGPTUser,
  challengeId: string,
) {
  const value = await signPayload(
    {
      kind: "mfa_challenge",
      outerEmail: outerUser.email.toLowerCase(),
      challengeId,
      issuedAt: Date.now(),
    },
    config().sessionSecret,
  );
  response.cookies.set(
    executiveCookies().challenge,
    value,
    cookieOptions(10 * 60),
  );
}

export async function getMfaChallenge(outerUser: ChatGPTUser) {
  const store = await cookies();
  const raw = store.get(executiveCookies().challenge)?.value;
  if (!raw) return null;
  const payload = await verifySignedPayload(raw, config().sessionSecret);
  if (
    payload?.kind !== "mfa_challenge" ||
    payload.outerEmail !== outerUser.email.toLowerCase() ||
    typeof payload.challengeId !== "string" ||
    typeof payload.issuedAt !== "number" ||
    Date.now() - payload.issuedAt > 10 * 60_000
  ) {
    return null;
  }
  return payload.challengeId;
}

export async function authenticatedResponse(
  outerUser: ChatGPTUser,
  tokens: TokenPair,
  returnTo: string,
  sessionProof: VeyvioSessionStatus,
) {
  let verified: VerifiedExecutiveSession;
  try {
    verified = await validateExecutiveTokens(
      tokens,
      undefined,
      sessionProof.id,
      "executive.session.read",
    );
  } catch (error) {
    await revokeVeyvioSession(tokens.accessToken);
    throw error;
  }

  const binding = await signPayload(
    {
      kind: "executive_session",
      outerEmail: outerUser.email.toLowerCase(),
      userId: verified.user.id,
      companyId: verified.access.companyId,
      membershipId: verified.access.membershipId,
      veyvioSessionId: verified.security.id,
      authStrength: verified.security.authStrength,
      issuedAt: Date.now(),
    },
    config().sessionSecret,
  );

  const response = noStoreJson({
    ok: true,
    state: "authenticated",
    returnTo,
  });
  setExecutiveTokenCookies(response, tokens);
  response.cookies.set(
    executiveCookies().binding,
    binding,
    cookieOptions(8 * 60 * 60),
  );
  clearPendingCookies(response);
  return response;
}

export async function requireVerifiedExecutiveSession(
  outerUser: ChatGPTUser,
  action: ExecutiveAction,
  requestId?: string,
): Promise<VerifiedExecutiveSession> {
  const store = await cookies();
  const accessToken = store.get(executiveCookies().access)?.value;
  const refreshToken = store.get(executiveCookies().refresh)?.value;
  const binding = store.get(executiveCookies().binding)?.value;
  if (!accessToken || !refreshToken || !binding) {
    throw new VeyvioAuthError(
      "A verified Veyvio Executive session is required.",
      401,
      "executive_session_required",
    );
  }

  const payload = await verifySignedPayload(binding, config().sessionSecret);
  if (
    payload?.kind !== "executive_session" ||
    payload.outerEmail !== outerUser.email.toLowerCase() ||
    typeof payload.veyvioSessionId !== "string"
  ) {
    throw new VeyvioAuthError(
      "The Executive session binding is invalid.",
      401,
      "executive_binding_invalid",
    );
  }

  const verified = await validateExecutiveTokens(
    { accessToken, refreshToken },
    requestId,
    payload.veyvioSessionId,
    action,
  );
  if (
    payload.userId !== verified.user.id ||
    payload.companyId !== verified.access.companyId ||
    payload.membershipId !== verified.access.membershipId ||
    payload.veyvioSessionId !== verified.security.id ||
    payload.authStrength !== verified.security.authStrength
  ) {
    throw new VeyvioAuthError(
      "The Executive session no longer matches the active Veyvio company.",
      401,
      "executive_binding_mismatch",
    );
  }
  return verified;
}

export async function getVerifiedExecutiveSession(
  outerUser: ChatGPTUser,
  action: ExecutiveAction,
  requestId?: string,
): Promise<VerifiedExecutiveSession | null> {
  try {
    return await requireVerifiedExecutiveSession(outerUser, action, requestId);
  } catch {
    return null;
  }
}

export async function getExecutiveAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(executiveCookies().access)?.value ?? null;
}

export async function refreshAndVerifyExecutiveSession(
  outerUser: ChatGPTUser,
  action: ExecutiveAction,
  requestId?: string,
): Promise<{ session: VerifiedExecutiveSession; tokens: TokenPair }> {
  const store = await cookies();
  const refreshToken = store.get(executiveCookies().refresh)?.value;
  if (!refreshToken) {
    throw new VeyvioAuthError(
      "A verified Veyvio Executive session is required.",
      401,
      "executive_session_required",
    );
  }

  // First verify the signed outer/company binding and current central identity.
  const current = await requireVerifiedExecutiveSession(
    outerUser,
    action,
    requestId,
  );
  const tokens = await refreshVeyvioTokens(refreshToken);
  const session = await validateExecutiveTokens(
    tokens,
    requestId,
    current.security.id,
    action,
  );

  if (
    session.user.id !== current.user.id ||
    session.access.companyId !== current.access.companyId ||
    session.access.membershipId !== current.access.membershipId
  ) {
    throw new VeyvioAuthError(
      "The refreshed session no longer matches the active Veyvio company.",
      401,
      "refreshed_session_mismatch",
    );
  }
  return { session, tokens };
}

export function tokenPairFrom(payload: Record<string, unknown>): TokenPair | null {
  const accessToken = payload.accessToken;
  const refreshToken = payload.refreshToken;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return null;
  }
  return { accessToken, refreshToken };
}

export function sessionProofFrom(
  payload: Record<string, unknown>,
): VeyvioSessionStatus | null {
  const proof = payload.veyvioSession;
  if (!proof || typeof proof !== "object") return null;
  const row = proof as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.authStrength !== "string" ||
    (row.assuranceLevel !== "aal1" && row.assuranceLevel !== "aal2")
  ) {
    return null;
  }
  return {
    id: row.id,
    authStrength: row.authStrength,
    assuranceLevel: row.assuranceLevel,
    createdAt: String(row.createdAt ?? ""),
    lastUsedAt: String(row.lastUsedAt ?? ""),
    expiresAt: String(row.expiresAt ?? ""),
    idleMinutes: Number(row.idleMinutes ?? 15),
    absoluteHours: Number(row.absoluteHours ?? 8),
    concurrentSessionLimit: Number(row.concurrentSessionLimit ?? 2),
    stepUpFresh: Boolean(row.stepUpFresh),
    stepUpMinutes: Number(row.stepUpMinutes ?? 10),
  };
}

export function publicMemberships(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.memberships)) return [];
  return payload.memberships.flatMap((membership) => {
    if (!membership || typeof membership !== "object") return [];
    const row = membership as Record<string, unknown>;
    const companyId = String(row.companyId ?? row.tenantId ?? "");
    if (!companyId) return [];
    return [
      {
        companyId,
        tenantName: String(row.tenantName ?? "Veyvio company"),
        role: String(row.role ?? "member"),
      },
    ];
  });
}
