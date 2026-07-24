import {
  commandApiUrl,
  getSupabaseAnonKey,
  isMockAuth,
  resolveSupabaseProjectUrl,
} from "@/platform/auth/auth-config";
import type { YardRole } from "@/types/permissions";

export interface CommandAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  platformRole: string | null;
  activeTenantId: string | null;
  tenantName: string | null;
  tenantStatus?: string | null;
  planCode?: string | null;
  subscriptionStatus?: string | null;
  enabledModules?: string[];
  mfaEnabled?: boolean;
  role: string | null;
  permissions: string[];
}

export interface TenantMembershipOption {
  tenantId: string;
  tenantName: string;
  role: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  requiresTenantSelection?: boolean;
  requiresMfaChallenge?: boolean;
  mfaChallengeId?: string;
  devMfaCode?: string;
  pendingCompanyId?: string | null;
  memberships?: TenantMembershipOption[];
  user?: CommandAuthUser;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: CommandAuthUser;
  requiresTenantSelection?: boolean;
  memberships?: TenantMembershipOption[];
}

export interface CommandDepotRecord {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  status?: string | null;
  companyId?: string | null;
}

export interface YardHubVehicle {
  vehicleId: string;
  registrationNumber: string;
  fleetNumber?: string | null;
  vehicleCategory?: string | null;
  makeModel?: string | null;
  depotId?: string | null;
  depotName?: string | null;
  zone?: string | null;
  bay?: string | null;
  readinessState?: string | null;
  presenceState?: string | null;
  exceptionLabels?: string[];
  lastUpdatedAt?: string | null;
}

export interface YardHubTask {
  id: string;
  depotId: string;
  vehicleId: string;
  registrationNumber: string;
  taskType: string;
  title: string;
  priority: string;
  status: string;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  dueAt?: string | null;
  instructions?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
}

export interface YardHubMovement {
  id: string;
  vehicleId: string;
  registrationNumber: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
  status: string;
  requestedBy: string;
  completedBy?: string | null;
  startedAt: string;
  completedAt?: string | null;
  depotId: string;
  depotName: string;
}

export interface YardHubResponse {
  depotId: string;
  depotName: string;
  depotCode?: string | null;
  yardMapEnabled?: boolean;
  yardLayout?: import("@veyvio/yard").YardHubLayoutSnapshot | null;
  shiftLabel?: string;
  operationalDate?: string;
  summary?: Record<string, number>;
  vehicles: YardHubVehicle[];
  movements?: YardHubMovement[];
  tasks?: YardHubTask[];
  exceptions?: unknown[];
  bodyworkReports?: unknown[];
  bodyCondition?: {
    inspections?: unknown[];
    damageRecords?: unknown[];
    damageObservations?: unknown[];
    inspectionMedia?: unknown[];
    acknowledgements?: unknown[];
  };
  driverMessages?: unknown[];
  vehicleChecks?: unknown[];
  platformEvents?: HubPlatformEventPayload[];
}

export type HubPlatformEventPayload = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  tenantId: string;
  depotId: string;
  actorId: string;
  correlationId: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: unknown;
  consumers?: string[];
}

function apiErrorMessage(err: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(err.message)) return err.message.join(", ");
  return err.message ?? fallback;
}

function publicHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const anon = getSupabaseAnonKey();
  if (anon) {
    headers.apikey = anon;
    headers.Authorization = `Bearer ${anon}`;
  }
  return headers;
}

function authedHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  const anon = getSupabaseAnonKey();
  if (anon) headers.apikey = anon;
  return headers;
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const message = apiErrorMessage(err, fallback);
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export async function commandRefreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const supabaseUrl = resolveSupabaseProjectUrl();
  const anon = getSupabaseAnonKey();
  if (!supabaseUrl || !anon) {
    throw new Error("Sign-in service is not configured");
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    throw Object.assign(new Error("Could not reach sign-in service — check your connection"), { status: 0 });
  }

  if (!res.ok) {
    throw Object.assign(new Error("Session expired — sign in again"), { status: 401 });
  }

  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!data.access_token) {
    throw Object.assign(new Error("Session expired — sign in again"), { status: 401 });
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
  };
}

export async function commandLogin(
  email: string,
  password: string,
  rememberMe = false,
): Promise<LoginResponse> {
  const res = await fetch(commandApiUrl("/auth/login"), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ email, password, rememberMe }),
  });
  return parseJson<LoginResponse>(res, "Sign in failed");
}

export interface ForgotPasswordResponse {
  ok: boolean;
  message: string;
  devResetToken: string | null;
}

export async function commandForgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const res = await fetch(commandApiUrl("/auth/forgot-password"), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  return parseJson<ForgotPasswordResponse>(res, "Could not start password reset");
}

export async function commandResetPassword(token: string, password: string): Promise<{ ok: boolean }> {
  const res = await fetch(commandApiUrl("/auth/reset-password"), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({ token, password }),
  });
  return parseJson<{ ok: boolean }>(res, "Password could not be reset");
}

export async function commandConfirmMfa(input: {
  challengeId: string;
  code: string;
  companyId?: string | null;
}): Promise<AuthTokensResponse> {
  const res = await fetch(commandApiUrl("/auth/login/confirm"), {
    method: "POST",
    headers: publicHeaders(),
    body: JSON.stringify({
      challengeId: input.challengeId,
      code: input.code,
      companyId: input.companyId ?? undefined,
    }),
  });
  return parseJson<AuthTokensResponse>(res, "MFA verification failed");
}

export async function commandSelectTenant(
  tenantId: string,
  refreshToken: string | null,
  accessToken?: string | null,
): Promise<AuthTokensResponse> {
  if (!refreshToken) {
    throw Object.assign(new Error("Session expired — sign in again to select a company"), { status: 401 });
  }

  const headers = accessToken ? authedHeaders(accessToken) : publicHeaders();
  let res: Response;
  try {
    res = await fetch(commandApiUrl("/auth/select-tenant"), {
      method: "POST",
      headers,
      body: JSON.stringify({ companyId: tenantId, tenantId, refreshToken }),
    });
  } catch {
    throw Object.assign(new Error("Could not reach Command — check your connection"), { status: 0 });
  }
  return parseJson<AuthTokensResponse>(res, "Could not select company");
}

export interface MembershipsResponse {
  memberships: TenantMembershipOption[];
}

export async function commandListMemberships(accessToken: string): Promise<TenantMembershipOption[]> {
  const res = await fetch(commandApiUrl("/auth/memberships"), {
    method: "GET",
    headers: authedHeaders(accessToken),
  });
  const data = await parseJson<MembershipsResponse>(res, "Could not load companies");
  return Array.isArray(data.memberships) ? data.memberships : [];
}

export async function commandGetMe(accessToken: string): Promise<CommandAuthUser> {
  const res = await fetch(commandApiUrl("/auth/me"), {
    method: "GET",
    headers: authedHeaders(accessToken),
  });
  return parseJson<CommandAuthUser>(res, "Could not load profile");
}

export async function commandListDepots(accessToken: string): Promise<CommandDepotRecord[]> {
  const res = await fetch(commandApiUrl("/yard/depots"), {
    method: "GET",
    headers: authedHeaders(accessToken),
  });
  const data = await parseJson<CommandDepotRecord[] | { depots?: CommandDepotRecord[] }>(
    res,
    "Could not load depots",
  );
  if (Array.isArray(data)) return data;
  return Array.isArray(data.depots) ? data.depots : [];
}

export async function commandFetchYardHub(
  accessToken: string,
  depotId?: string,
): Promise<YardHubResponse> {
  const qs = depotId ? `?depotId=${encodeURIComponent(depotId)}` : "";
  const res = await fetch(commandApiUrl(`/yard/hub${qs}`), {
    method: "GET",
    headers: authedHeaders(accessToken),
  });
  return parseJson<YardHubResponse>(res, "Could not load yard hub");
}

/** Map Command company role → Yard permission role. */
export function mapCommandRoleToYardRole(role: string | null | undefined): YardRole {
  const r = (role ?? "").toLowerCase();
  if (r.includes("yard_operative") || r === "operative") return "yard_operative";
  if (r.includes("maintenance")) return "maintenance_user";
  if (r.includes("operations") || r.includes("dispatcher") || r.includes("transport")) {
    return "operations_manager";
  }
  if (r.includes("admin") || r.includes("owner") || r.includes("company")) {
    return "company_administrator";
  }
  if (r.includes("auditor") || r.includes("read")) return "read_only_auditor";
  return "yard_manager";
}

export function expiresAtFromJwt(accessToken: string, fallbackHours = 8): string {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) throw new Error("no payload");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    if (json.exp) return new Date(json.exp * 1000).toISOString();
  } catch {
    /* fall through */
  }
  return new Date(Date.now() + fallbackHours * 60 * 60 * 1000).toISOString();
}

export { isMockAuth };
