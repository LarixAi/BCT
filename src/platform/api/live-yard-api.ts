import { getApiBaseUrl, usesCommandYardApi } from "./config";
import { mapYardHubToBootstrap } from "./map-yard-hub";
import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";
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

    const base = getApiBaseUrl();
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    const url = `${base}/v1/yard/bootstrap?companyId=${encodeURIComponent(companyId)}&depotId=${encodeURIComponent(depotId)}&role=${encodeURIComponent(role)}`;
    return parseJson<BootstrapPayload>(
      await fetch(url, { credentials: "include", headers: bearerHeaders() }),
    );
  },

  async pushMutation(mutation: OutboxMutation): Promise<PushMutationResult> {
    if (usesCommandYardApi()) {
      const token = getSessionSnapshot().accessToken;
      if (!token || token.startsWith("mock_")) {
        return { serverId: `cmd_local_${mutation.localOperationId}` };
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
        throw new Error(text || `Yard mutation failed (${res.status})`);
      }
      const body = await res.json().catch(() => ({})) as { serverId?: string; ok?: boolean };
      return { serverId: body.serverId ?? mutation.localOperationId };
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
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    return parseJson<{ ok: boolean; mode: string }>(
      await fetch(`${base}/v1/yard/health`, { credentials: "include", headers: bearerHeaders() }),
    );
  },
};
