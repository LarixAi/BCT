import { getSupabaseClient } from "@/lib/supabase/client";

/** Supabase access token for Command API calls (driver session). */
export async function getCommandAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
