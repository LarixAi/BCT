/**
 * Live API is the default. Mock is opt-in for isolated tests only (VITE_USE_MOCK_API=true).
 */
import { getCommandApiUrl, getSupabaseAnonKey, isMockAuth } from "@/platform/auth/auth-config";

export function isMockApi(): boolean {
  if (import.meta.env.VITE_USE_MOCK_API === "true") return true;
  if (import.meta.env.VITE_USE_MOCK_API === "false") return false;
  if (!isMockAuth() && getCommandApiUrl() && getSupabaseAnonKey()) return false;
  return false;
}

/** Legacy yard stub base (`/v1/yard/...`). Prefer Command URL when live. */
export function getApiBaseUrl(): string | null {
  const command = getCommandApiUrl();
  if (command && !isMockAuth()) return command;
  const url = import.meta.env.VITE_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

export function usesCommandYardApi(): boolean {
  return !isMockAuth() && !!getCommandApiUrl() && !!getSupabaseAnonKey();
}
