/**
 * Yard auth mode — mock-first, live when Command URL + anon key are set.
 * Aligns with Admin: VITE_API_URL + VITE_SUPABASE_ANON_KEY.
 */
export function getCommandApiUrl(): string | null {
  const url =
    import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_COMMAND_API_BASE_URL ??
    null;
  return url && String(url).length > 0 ? String(url).replace(/\/$/, "") : null;
}

export function getSupabaseAnonKey(): string | null {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? null;
  return key && String(key).length > 0 ? String(key) : null;
}

/** Supabase project URL for Realtime (derived from VITE_API_URL when needed). */
export function resolveSupabaseProjectUrl(): string | null {
  const direct = import.meta.env.VITE_SUPABASE_URL ?? null;
  if (direct && String(direct).length > 0) return String(direct).replace(/\/$/, "");
  const api = getCommandApiUrl();
  if (!api) return null;
  const match = api.match(/^(https:\/\/[^/]+\.supabase\.co)/);
  return match?.[1] ?? null;
}

/** True when Yard should use local mock sign-in (no Command backend). */
export function isMockAuth(): boolean {
  if (import.meta.env.VITE_USE_MOCK_AUTH === "true") return true;
  if (import.meta.env.VITE_USE_MOCK_AUTH === "false") {
    return !(getCommandApiUrl() && getSupabaseAnonKey());
  }
  // Default: live when both env vars present, otherwise mock
  return !(getCommandApiUrl() && getSupabaseAnonKey());
}

/** Resolve `/auth/...` against Nest-style origin or Supabase Edge Function base. */
export function commandApiUrl(path: string): string {
  const base = getCommandApiUrl();
  if (!base) throw new Error("VITE_API_URL is not configured");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base.includes("/functions/v1/")) {
    return `${base}/api${normalized}`;
  }
  return `${base}/api${normalized}`;
}
