import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, resolveSupabaseProjectUrl } from "@/platform/auth/auth-config";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = resolveSupabaseProjectUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: { params: { eventsPerSecond: 8 } },
    });
  }
  return client;
}

export async function bindSupabaseSession(accessToken: string | null): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  if (accessToken) {
    await supabase.realtime.setAuth(accessToken);
  }
}
