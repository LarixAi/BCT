import { getApiBaseUrl, usesCommandYardApi } from "./config";
import { isProductionBuild } from "@/platform/api/production-guards";
import { mapYardHubToBootstrap } from "./map-yard-hub";
import type { BootstrapPayload } from "@/platform/yard/bootstrap-payload";
import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";
import { formatSyncError } from "@/domain/sync/format-sync-error";
import { isBodyConditionMutationType } from "@/domain/sync/body-condition-mutations";
import { assertYardMutationCommandSupported } from "@/domain/sync/yard-mutation-inventory";
import { isUntrustedServerId } from "@/domain/sync/is-trusted-server-id";
import type { PushMutationResult, YardApi } from "./yard-api";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import {
  commandApiUrl,
  getSupabaseAnonKey,
} from "@/platform/auth/auth-config";
import { commandFetchYardHub } from "@/platform/auth/command-auth-api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function bearerHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getSessionSnapshot().accessToken;
  const anon = getSupabaseAnonKey();
  if (anon) headers.apikey = anon;
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (anon) headers.Authorization = `Bearer ${anon}`;
  return headers;
}

function tryParseApiError(text: string): { message?: string; code?: string } | null {
  try {
    return JSON.parse(text) as { message?: string; code?: string };
  } catch {
    return null;
  }
}

async function pushMutationViaLocalDevStub(mutation: OutboxMutation): Promise<PushMutationResult> {
  const res = await fetch("/api/v1/yard/mutations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mutation),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(formatSyncError(text || `Local yard stub failed (${res.status})`));
  }
  return res.json() as Promise<PushMutationResult>;
}

export const liveYardApi: YardApi = {
  async fetchBootstrap(companyId, depotId, role: YardRole) {
    if (usesCommandYardApi()) {
      const token = getSessionSnapshot().accessToken;
      if (!token || token.startsWith("mock_")) {
        throw new Error("Sign in required to load live yard data");
      }
      const hub = await commandFetchYardHub(token, depotId);
      return mapYardHubToBootstrap(hub, companyId, depotId, role);
    }

    if (isProductionBuild()) {
      throw new Error(
        "Command API is required for yard bootstrap in production. Set VITE_COMMAND_API_BASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
    }

    const base = getApiBaseUrl();
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    const url = `${base}/v1/yard/bootstrap?companyId=${encodeURIComponent(companyId)}&depotId=${encodeURIComponent(depotId)}&role=${encodeURIComponent(role)}`;
    return parseJson<BootstrapPayload>(
      await fetch(url, { credentials: "include", headers: bearerHeaders() }),
    );
  },

  async pushMutation(mutation: OutboxMutation): Promise<PushMutationResult> {
    if (usesCommandYardApi()) {
      assertYardMutationCommandSupported(mutation.type);
      const token = getSessionSnapshot().accessToken;
      if (!token || token.startsWith("mock_")) {
        throw new Error("Sign in required to sync yard actions to Command");
      }
      const res = await fetch(commandApiUrl("/yard/mutations"), {
        method: "POST",
        headers: bearerHeaders(),
        body: JSON.stringify({
          type: mutation.type,
          companyId: mutation.companyId,
          depotId: mutation.depotId,
          userId: mutation.userId,
          localOperationId: mutation.localOperationId,
          payload: mutation.payload,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const parsed = tryParseApiError(text);
        if (
          import.meta.env.DEV &&
          res.status === 501 &&
          parsed?.code === "mutation_not_supported" &&
          isBodyConditionMutationType(mutation.type)
        ) {
          return pushMutationViaLocalDevStub(mutation);
        }
        throw new Error(formatSyncError(text || `Yard mutation failed (${res.status})`));
      }
      const body = await res.json().catch(() => ({})) as { serverId?: string; ok?: boolean; skipped?: boolean };
      if (body.skipped) {
        return { serverId: body.serverId ?? mutation.localOperationId };
      }
      const serverId = body.serverId ?? mutation.localOperationId;
      if (isUntrustedServerId(serverId)) {
        throw new Error("Command did not persist this yard action — handler may not be deployed yet");
      }
      return { serverId };
    }

    const base = getApiBaseUrl();
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    const res = await fetch(`${base}/v1/yard/mutations`, {
      method: "POST",
      credentials: "include",
      headers: bearerHeaders(),
      body: JSON.stringify(mutation),
    });
    return parseJson<PushMutationResult>(res);
  },

  async healthCheck() {
    if (usesCommandYardApi()) {
      const token = getSessionSnapshot().accessToken;
      if (!token || token.startsWith("mock_")) {
        return { ok: false, mode: "command-unauthenticated" };
      }
      try {
        await commandFetchYardHub(token);
        return { ok: true, mode: "command" };
      } catch {
        // Hub may 403 for some roles — still prove Command is reachable via auth/me shape
        const res = await fetch(commandApiUrl("/auth/me"), {
          headers: bearerHeaders(),
        });
        return { ok: res.ok, mode: "command" };
      }
    }

    const base = getApiBaseUrl();
    if (!base) return { ok: false, mode: "unconfigured" };
    return parseJson<{ ok: boolean; mode: string }>(
      await fetch(`${base}/v1/yard/health`, { credentials: "include", headers: bearerHeaders() }),
    );
  },
};
