/**
 * API mode is mock-first so the app runs fully offline / without a backend.
 *
 * Live mode when:
 * - Command auth is configured (VITE_API_URL + VITE_SUPABASE_ANON_KEY), or
 * - Explicit VITE_USE_MOCK_API=false + VITE_API_BASE_URL (legacy yard stub)
 */
import { getCommandApiUrl, getSupabaseAnonKey, isMockAuth } from "@/platform/auth/auth-config";

export function isMockApi(): boolean {
  if (import.meta.env.VITE_USE_MOCK_API === "true") return true;
  if (!isMockAuth() && getCommandApiUrl() && getSupabaseAnonKey()) return false;
  if (import.meta.env.VITE_USE_MOCK_API === "false" && import.meta.env.VITE_API_BASE_URL) {
    return false;
  }
  return true;
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
