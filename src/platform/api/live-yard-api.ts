import { getApiBaseUrl } from "./config";
import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { YardRole } from "@/types/permissions";
import type { OutboxMutation } from "@/types/sync";
import type { PushMutationResult, YardApi } from "./yard-api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const liveYardApi: YardApi = {
  async fetchBootstrap(companyId, depotId, role: YardRole) {
    const base = getApiBaseUrl();
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    const url = `${base}/v1/yard/bootstrap?companyId=${encodeURIComponent(companyId)}&depotId=${encodeURIComponent(depotId)}&role=${encodeURIComponent(role)}`;
    return parseJson<BootstrapPayload>(await fetch(url, { credentials: "include" }));
  },

  async pushMutation(mutation: OutboxMutation): Promise<PushMutationResult> {
    const base = getApiBaseUrl();
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    const res = await fetch(`${base}/v1/yard/mutations`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mutation),
    });
    return parseJson<PushMutationResult>(res);
  },

  async healthCheck() {
    const base = getApiBaseUrl();
    if (!base) throw new Error("VITE_API_BASE_URL is not configured");
    return parseJson<{ ok: boolean; mode: string }>(await fetch(`${base}/v1/yard/health`, { credentials: "include" }));
  },
};
